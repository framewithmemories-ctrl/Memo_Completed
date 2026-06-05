"""
E2E backend tests for sprint features:
- Wallet backend sync + owner-only RBAC (401/403)
- Photos backend sync + owner-only RBAC
- Admin wallet adjust (credit/debit, mandatory reason audit, debit > balance)
- Admin product CRUD (create/edit/delete)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://photo-frames-dash.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_USER = "admin"
ADMIN_PASS = "memories2024"


# ---------- session-scoped fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _register(s, email_prefix="TEST_walletu"):
    email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com".lower()
    r = s.post(f"{API}/auth/register", json={
        "name": "TEST Wallet User",
        "email": email,
        "password": "secret123",
    }, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    return data["user"]["id"], data["token"], email


@pytest.fixture(scope="session")
def user_a(s):
    uid, tok, em = _register(s, "TEST_wA")
    return {"id": uid, "token": tok, "email": em}


@pytest.fixture(scope="session")
def user_b(s):
    uid, tok, em = _register(s, "TEST_wB")
    return {"id": uid, "token": tok, "email": em}


def _bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


# ============ WALLET RBAC ============
class TestWalletRBAC:
    def test_get_wallet_no_token_401(self, user_a):
        r = requests.get(f"{API}/users/{user_a['id']}/wallet", timeout=15)
        assert r.status_code in (401, 403)

    def test_get_wallet_other_user_403(self, user_a, user_b):
        r = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_b["token"]), timeout=15)
        assert r.status_code == 403

    def test_get_wallet_admin_token_403(self, user_a, admin_token):
        # admin token has role='admin' not 'user' -> verify_user_access rejects
        r = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 403

    def test_get_wallet_owner_200(self, user_a):
        r = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "balance" in d
        assert isinstance(d["balance"], (int, float))


# ============ WALLET ADD MONEY + PERSISTENCE ============
class TestWalletAddMoney:
    def test_add_money_and_persist(self, s, user_a):
        # initial
        r0 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]), timeout=15)
        assert r0.status_code == 200
        start = r0.json()["balance"]

        # add 1000
        r1 = requests.post(f"{API}/users/{user_a['id']}/wallet/add-money?amount=1000",
                           headers=_bearer(user_a["token"]), timeout=15)
        assert r1.status_code == 200, r1.text

        # verify balance increased
        r2 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["balance"] == start + 1000

        # transaction recorded
        r3 = requests.get(f"{API}/users/{user_a['id']}/wallet/transactions",
                          headers=_bearer(user_a["token"]), timeout=15)
        assert r3.status_code == 200
        txs = r3.json()
        assert isinstance(txs, list) and len(txs) >= 1
        latest = txs[0]
        assert latest.get("amount") == 1000
        assert latest.get("type") == "credit"

    def test_add_money_other_user_403(self, user_a, user_b):
        r = requests.post(f"{API}/users/{user_a['id']}/wallet/add-money?amount=10",
                          headers=_bearer(user_b["token"]), timeout=15)
        assert r.status_code == 403


# ============ PHOTOS RBAC + CRUD ============
class TestPhotosCRUD:
    @pytest.fixture(scope="class")
    def created_photo(self, user_a):
        payload = {
            "user_id": user_a["id"],
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            "name": "TEST_photo.png",
            "dimensions": {"width": 1, "height": 1},
            "size": 0.01,
            "tags": [],
        }
        r = requests.post(f"{API}/users/{user_a['id']}/photos", json=payload,
                          headers=_bearer(user_a["token"]), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == user_a["id"]
        return d

    def test_save_photo_no_token_401(self, user_a):
        r = requests.post(f"{API}/users/{user_a['id']}/photos",
                          json={"user_id": user_a["id"], "image_data": "x", "name": "n"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_save_photo_other_user_403(self, user_a, user_b):
        r = requests.post(f"{API}/users/{user_a['id']}/photos",
                          json={"user_id": user_a["id"], "image_data": "x", "name": "n"},
                          headers=_bearer(user_b["token"]), timeout=15)
        assert r.status_code == 403

    def test_get_photos_owner_persistence(self, user_a, created_photo):
        r = requests.get(f"{API}/users/{user_a['id']}/photos",
                         headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 200
        photos = r.json()
        assert any(p["id"] == created_photo["id"] for p in photos)

    def test_get_photos_other_user_403(self, user_a, user_b):
        r = requests.get(f"{API}/users/{user_a['id']}/photos",
                         headers=_bearer(user_b["token"]), timeout=15)
        assert r.status_code == 403

    def test_toggle_favorite(self, user_a, created_photo):
        r = requests.put(f"{API}/users/{user_a['id']}/photos/{created_photo['id']}/favorite",
                         headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 200

    def test_use_photo_for_order(self, user_a, created_photo):
        r = requests.put(f"{API}/users/{user_a['id']}/photos/{created_photo['id']}/use",
                         headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 200

    def test_delete_photo(self, user_a, created_photo):
        r = requests.delete(f"{API}/users/{user_a['id']}/photos/{created_photo['id']}",
                            headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 200
        # verify gone
        r2 = requests.get(f"{API}/users/{user_a['id']}/photos",
                          headers=_bearer(user_a["token"]), timeout=15)
        assert all(p["id"] != created_photo["id"] for p in r2.json())


# ============ ADMIN WALLET ADJUST ============
class TestAdminWalletAdjust:
    def test_user_token_cannot_adjust(self, user_a):
        r = requests.post(f"{API}/admin/users/{user_a['id']}/wallet/adjust",
                          json={"type": "credit", "amount": 100, "reason": "x"},
                          headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 403

    def test_no_token_401(self, user_a):
        r = requests.post(f"{API}/admin/users/{user_a['id']}/wallet/adjust",
                          json={"type": "credit", "amount": 100, "reason": "x"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_empty_reason_400(self, user_a, admin_token):
        r = requests.post(f"{API}/admin/users/{user_a['id']}/wallet/adjust",
                          json={"type": "credit", "amount": 100, "reason": "   "},
                          headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 400

    def test_credit_increases_balance(self, user_a, admin_token):
        # baseline
        b0 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]),
                          timeout=15).json()["balance"]
        r = requests.post(f"{API}/admin/users/{user_a['id']}/wallet/adjust",
                          json={"type": "credit", "amount": 500, "reason": "Goodwill refund"},
                          headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        b1 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]),
                          timeout=15).json()["balance"]
        assert b1 == b0 + 500
        # audit trail
        txs = requests.get(f"{API}/users/{user_a['id']}/wallet/transactions",
                           headers=_bearer(user_a["token"]), timeout=15).json()
        assert any(t.get("category") == "admin_adjustment"
                   and "Goodwill refund" in t.get("description", "")
                   for t in txs)

    def test_debit_decreases_balance(self, user_a, admin_token):
        b0 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]),
                          timeout=15).json()["balance"]
        r = requests.post(f"{API}/admin/users/{user_a['id']}/wallet/adjust",
                          json={"type": "debit", "amount": 50, "reason": "Penalty"},
                          headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        b1 = requests.get(f"{API}/users/{user_a['id']}/wallet", headers=_bearer(user_a["token"]),
                          timeout=15).json()["balance"]
        assert b1 == b0 - 50

    def test_debit_more_than_balance_400(self, user_b, admin_token):
        # user_b has 0 balance, debit 999
        r = requests.post(f"{API}/admin/users/{user_b['id']}/wallet/adjust",
                          json={"type": "debit", "amount": 9999, "reason": "over"},
                          headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 400


# ============ ADMIN PRODUCT CRUD ============
class TestAdminProductCRUD:
    @pytest.fixture(scope="class")
    def new_product(self, admin_token):
        payload = {
            "name": f"TEST Product {uuid.uuid4().hex[:6]}",
            "description": "test desc",
            "category": "Photo Frames",
            "base_price": 299.0,
            "sizes": [{"name": "Small", "price_modifier": 0}],
            "materials": [{"name": "Wood", "price_modifier": 0}],
            "colors": [{"name": "Brown", "hex": "#8B4513"}],
            "image_url": "https://example.com/test.jpg",
        }
        r = requests.post(f"{API}/admin/products", json=payload,
                          headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()
        assert "id" in p and p["name"] == payload["name"]
        return p

    def test_create_no_admin_token_401_403(self):
        r = requests.post(f"{API}/admin/products", json={"name": "x"}, timeout=15)
        assert r.status_code in (401, 403, 422)

    def test_create_user_token_403(self, user_a):
        r = requests.post(f"{API}/admin/products",
                          json={"name": "x", "description": "d", "category": "c",
                                "base_price": 1, "sizes": [], "materials": [], "colors": [],
                                "image_url": "u"},
                          headers=_bearer(user_a["token"]), timeout=15)
        assert r.status_code == 403

    def test_created_product_in_listing(self, new_product):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("products", [])
        assert any(p.get("id") == new_product["id"] for p in items)

    def test_update_product(self, new_product, admin_token):
        r = requests.put(f"{API}/admin/products/{new_product['id']}",
                         json={"name": new_product["name"] + " UPD", "base_price": 399.0},
                         headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200
        # verify on listing
        all_p = requests.get(f"{API}/products", timeout=15).json()
        items = all_p if isinstance(all_p, list) else all_p.get("products", [])
        match = [p for p in items if p["id"] == new_product["id"]]
        assert match and match[0]["base_price"] == 399.0
        assert "UPD" in match[0]["name"]

    def test_delete_product(self, new_product, admin_token):
        r = requests.delete(f"{API}/admin/products/{new_product['id']}",
                            headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200
        # ensure removed
        all_p = requests.get(f"{API}/products", timeout=15).json()
        items = all_p if isinstance(all_p, list) else all_p.get("products", [])
        assert not any(p["id"] == new_product["id"] for p in items)
