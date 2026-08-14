"""Sprint 4 — Product Detail Page + Customization Engine (backend support) tests.
Hits live server on :8001."""
import os
import uuid
import requests

BASE = os.environ.get("TEST_BASE_URL", "http://localhost:8001") + "/api"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"{'PASS' if cond else 'FAIL'} - {name} {extra}")


# Admin login + seed a rich V2 product with variants + customization
r = requests.post(f"{BASE}/admin/login", json={"username": "admin", "password": "admin_temp_password_123"})
ah = {"Authorization": f"Bearer {r.json().get('token')}"}

prod = {
    "name": f"Premium Acrylic Photo Frame {uuid.uuid4().hex[:5]}",
    "description": "A premium acrylic frame for your best memories.",
    "short_description": "Crystal-clear acrylic photo frame",
    "category": "acrylic", "base_price": 899, "compare_at_price": 1199,
    "image_url": "https://x/primary.jpg",
    "media": {"primary_image": "https://x/primary.jpg", "gallery": ["https://x/g1.jpg", "https://x/g2.jpg"]},
    "variants": [{"name": "A4", "price_delta": 0}, {"name": "A3", "price_delta": 300}],
    "customization": {"enabled": True, "photo_upload": True, "min_photos": 1, "max_photos": 3,
                       "name": True, "date": True, "message": True, "quote": False, "logo_upload": False, "preview": True},
    "fulfilment": {"production_days": 2, "pickup_available": True, "delivery_available": True},
    "marketing": {"bestseller": True},
    "seo": {"title": "Premium Acrylic Frame", "meta_description": "Buy premium acrylic frames"},
    "tags": ["frame", "acrylic"], "occasions": ["anniversary"],
}
r = requests.post(f"{BASE}/admin/products", json=prod, headers=ah)
p = r.json() if r.status_code == 200 else {}
slug, pid = p.get("slug"), p.get("id")

# 1. fetch by slug
r = requests.get(f"{BASE}/products/{slug}")
check("1. Product page fetch by slug works", r.status_code == 200 and r.json().get("id") == pid, f"(got {r.status_code})")

# 2. invalid slug 404
r = requests.get(f"{BASE}/products/this-does-not-exist-xyz")
check("2. Invalid slug returns 404", r.status_code == 404, f"(got {r.status_code})")

# 3. variant data returned
d = requests.get(f"{BASE}/products/{slug}").json()
check("3. Variant data returned", len(d.get("variants", [])) == 2)
a3 = next((v for v in d["variants"] if v["name"] == "A3"), None)

# 4/5. variant pricing authoritative
ok = [{"product_id": pid, "variant_id": a3["id"], "name": d["name"], "price": 899 + 300, "quantity": 1}]
r = requests.post(f"{BASE}/payments/create-order", json={"user_id": "guest_x", "items": ok, "delivery_type": "pickup"})
check("4. Correct variant price accepted", r.status_code == 200, f"(got {r.status_code})")
bad = [{"product_id": pid, "variant_id": a3["id"], "name": d["name"], "price": 899, "quantity": 1}]
r = requests.post(f"{BASE}/payments/create-order", json={"user_id": "guest_x", "items": bad, "delivery_type": "pickup"})
check("5. Underpriced variant rejected", r.status_code == 400, f"(got {r.status_code})")

# 6/7. customization config returned + disabled product works
check("6. Customization config returned", d.get("customization", {}).get("enabled") is True and d["customization"]["max_photos"] == 3)
simple = {"name": f"Plain Mug {uuid.uuid4().hex[:4]}", "description": "d", "category": "mugs", "base_price": 199, "image_url": "https://x/m.jpg"}
r = requests.post(f"{BASE}/admin/products", json=simple, headers=ah)
sp = r.json()
check("7. Product with customization disabled works", sp.get("customization", {}).get("enabled") is False)

# 8. photo min/max present
check("8. Photo min/max configuration respected", d["customization"]["min_photos"] == 1 and d["customization"]["max_photos"] == 3)

# 9. invalid variant rejected (backend authoritative)
r = requests.post(f"{BASE}/payments/create-order", json={
    "user_id": "guest_x", "items": [{"product_id": pid, "variant_id": "bad", "name": "x", "price": 1199, "quantity": 1}],
    "delivery_type": "pickup"})
check("9. Invalid customization/variant rejected", r.status_code == 400, f"(got {r.status_code})")

# 10. legacy product still renders (no variants/customization -> defaults)
r = requests.get(f"{BASE}/products/{sp['slug']}")
check("10. Legacy/simple product renders with defaults",
      r.status_code == 200 and (r.json().get("media") or {}).get("primary_image") == "https://x/m.jpg")

# 11. product_id review filter works (Sprint 4 backend addition)
requests.post(f"{BASE}/reviews", json={"name": "Buyer", "rating": 5, "comment": "Lovely!", "product_id": pid})
r = requests.get(f"{BASE}/reviews", params={"product_id": pid, "approved_only": False})
check("11. Reviews filter by product_id works", r.status_code == 200 and all(
    rv.get("product_id") == pid for rv in r.json().get("reviews", [])), f"(got {r.status_code})")

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n==== {passed}/{len(results)} passed ====")
failed = [n for n, ok, _ in results if not ok]
if failed:
    print("FAILED:", failed)
