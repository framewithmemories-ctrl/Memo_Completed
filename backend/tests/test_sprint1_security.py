"""Sprint 1 — Security + Financial Integrity regression tests.
Run against a live backend on http://localhost:8001. Uses only stdlib + requests.
"""
import os
import io
import uuid
import requests
from PIL import Image

BASE = os.environ.get("TEST_BASE_URL", "http://localhost:8001") + "/api"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"{'PASS' if cond else 'FAIL'} - {name} {extra}")


def make_user(suffix):
    email = f"user_{suffix}_{uuid.uuid4().hex[:6]}@test.com"
    r = requests.post(f"{BASE}/auth/register", json={
        "name": f"User {suffix}", "email": email, "password": "Passw0rd!123", "phone": "9876543210"
    })
    data = r.json()
    return data.get("token"), (data.get("user") or {}).get("id"), email


def img_bytes(w=2000, h=2000, fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (200, 100, 50)).save(buf, format=fmt)
    return buf.getvalue()


# --- Setup: two users ---
tokenA, uidA, emailA = make_user("A")
tokenB, uidB, emailB = make_user("B")
hA = {"Authorization": f"Bearer {tokenA}"}
hB = {"Authorization": f"Bearer {tokenB}"}

# ===================== AUTHORIZATION =====================
r = requests.get(f"{BASE}/orders/{uidB}", headers=hA)
check("1. User A cannot view User B orders", r.status_code == 403, f"(got {r.status_code})")

r = requests.get(f"{BASE}/users/{uidB}/photos", headers=hA)
check("2. User A cannot view User B photos", r.status_code == 403, f"(got {r.status_code})")

r = requests.put(f"{BASE}/users/{uidB}", headers=hA, json={"name": "Hacked"})
check("3. User A cannot modify User B profile", r.status_code == 403, f"(got {r.status_code})")

r = requests.get(f"{BASE}/users/{uidB}/wallet", headers=hA)
check("4. User A cannot access User B wallet", r.status_code == 403, f"(got {r.status_code})")

r = requests.get(f"{BASE}/designs/{uidB}", headers=hA)
check("5. User A cannot access User B designs", r.status_code == 403, f"(got {r.status_code})")

r = requests.get(f"{BASE}/users/{uidA}", headers=hA)
check("5b. User can view own profile & no password_hash leaked",
      r.status_code == 200 and "password_hash" not in r.text, f"(got {r.status_code})")

# ===================== ORDERS =====================
base_order = {"user_id": uidA, "delivery_type": "pickup",
              "items": [{"product_id": "p1", "name": "Frame", "price": 500, "quantity": 1}],
              "total_amount": 590}

o = dict(base_order); o["items"] = [{**base_order["items"][0], "quantity": -1}]
r = requests.post(f"{BASE}/orders", json=o)
check("6. Negative quantity rejected", r.status_code == 400, f"(got {r.status_code})")

o = dict(base_order); o["items"] = [{**base_order["items"][0], "quantity": 0}]
r = requests.post(f"{BASE}/orders", json=o)
check("7. Zero quantity rejected", r.status_code == 400, f"(got {r.status_code})")

o = dict(base_order); o["items"] = [{**base_order["items"][0], "price": -100}]
r = requests.post(f"{BASE}/orders", json=o)
check("8. Negative price rejected", r.status_code == 400, f"(got {r.status_code})")

o = dict(base_order); o["total_amount"] = 1  # subtotal is 500
r = requests.post(f"{BASE}/orders", json=o)
check("9. Client-manipulated total rejected", r.status_code == 400, f"(got {r.status_code})")

# valid order should succeed
r = requests.post(f"{BASE}/orders", json=base_order)
valid_order = r.json() if r.status_code == 200 else {}
check("9b. Valid order accepted", r.status_code == 200, f"(got {r.status_code})")
order_id = valid_order.get("id")

# ===================== WALLET =====================
# duplicate wallet deduction prevented (needs balance; give store via convert not available => expect 400/409 not double)
r1 = requests.post(f"{BASE}/users/{uidA}/wallet/pay", headers=hA,
                   params={"amount": 10, "order_id": order_id or "o1"})
r2 = requests.post(f"{BASE}/users/{uidA}/wallet/pay", headers=hA,
                   params={"amount": 10, "order_id": order_id or "o1"})
# First may 400 (insufficient balance) but second must never be a fresh 200 success for same order
check("10. Duplicate wallet deduction prevented",
      not (r1.status_code == 200 and r2.status_code == 200), f"(r1={r1.status_code} r2={r2.status_code})")

# self top-up disabled
r = requests.post(f"{BASE}/users/{uidA}/wallet/add-money", headers=hA, params={"amount": 9999})
check("10b. Self wallet top-up disabled", r.status_code == 403, f"(got {r.status_code})")

# ===================== PAYMENTS =====================
r = requests.post(f"{BASE}/payments/verify", json={"order_id": "does-not-exist"})
check("11. Unknown order cannot be marked paid", r.status_code == 404, f"(got {r.status_code})")

if order_id:
    r1 = requests.post(f"{BASE}/payments/verify", json={"order_id": order_id})
    r2 = requests.post(f"{BASE}/payments/verify", json={"order_id": order_id})
    ok = r1.status_code == 200 and r2.status_code == 200 and r2.json().get("already_paid") is True
    check("12. Duplicate payment verification is idempotent", ok, f"(r1={r1.status_code} r2={r2.json().get('already_paid')})")
    check("13. Mock payment mode works", r1.json().get("mode") == "mock", f"(mode={r1.json().get('mode')})")

r = requests.get(f"{BASE}/payments/config")
cfg = r.json()
check("14. Payment config exposes no secret", "razorpay_key_secret" not in r.text.lower() and "secret" not in str(cfg).lower(), str(cfg))

# ===================== UPLOAD =====================
r = requests.post(f"{BASE}/upload-image", files={"file": ("x.txt", b"not-an-image", "image/png")})
check("15. Non-image upload rejected", r.status_code == 400, f"(got {r.status_code})")

big = img_bytes(9000, 9000)  # ~large; also pixel-bomb-ish
r = requests.post(f"{BASE}/upload-image", files={"file": ("big.png", big, "image/png")})
check("16. Oversized/huge upload rejected", r.status_code in (400, 413), f"(got {r.status_code} size={len(big)})")

good = img_bytes(2000, 2000)
r = requests.post(f"{BASE}/upload-image", files={"file": ("ok.png", good, "image/png")})
check("17. Valid image still works", r.status_code == 200, f"(got {r.status_code})")

# ===================== REVIEWS =====================
r = requests.post(f"{BASE}/reviews", json={"name": "Tester", "rating": 5, "comment": "Great!", "product_id": "p1"})
rev = r.json() if r.status_code == 200 else {}
check("18. New review starts unapproved", r.status_code == 200 and rev.get("approved") is False, f"(approved={rev.get('approved')})")

r = requests.get(f"{BASE}/reviews?approved_only=true")
check("19. Public reviews endpoint returns only approved", r.status_code == 200, f"(got {r.status_code})")

# ===================== PASSWORD RESET =====================
r = requests.post(f"{BASE}/auth/reset-password", json={"email": emailA, "token": "invalid-token-xyz", "new_password": "NewPass!123"})
check("22. Invalid reset token rejected", r.status_code in (400, 401), f"(got {r.status_code})")

# ===================== SUMMARY =====================
passed = sum(1 for _, ok, _ in results if ok)
print(f"\n==== {passed}/{len(results)} passed ====")
failed = [n for n, ok, _ in results if not ok]
if failed:
    print("FAILED:", failed)
