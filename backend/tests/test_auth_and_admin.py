"""
E2E backend tests for Memories shop:
- User auth (register/login/me)
- Admin auth + RBAC on /api/admin/* endpoints
- Admin data enrichment (orders -> total, customer.name)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://photo-frames-dash.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "memories2024"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def unique_email():
    # backend normalizes to lowercase
    return f"test_user_{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture(scope="session")
def registered_user(s, unique_email):
    r = s.post(f"{API}/auth/register", json={
        "name": "TEST User",
        "email": unique_email,
        "password": "secret123",
    }, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "user"
    return data


@pytest.fixture(scope="session")
def user_token(registered_user):
    return registered_user["token"]


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"admin login: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("success") is True
    assert "token" in data
    return data["token"]


# ---------- USER AUTH ----------
class TestUserAuth:
    def test_register_duplicate_returns_400(self, s, unique_email, registered_user):
        r = s.post(f"{API}/auth/register", json={
            "name": "Dup", "email": unique_email, "password": "secret123",
        }, timeout=15)
        assert r.status_code == 400

    def test_register_short_password_returns_400(self, s):
        r = s.post(f"{API}/auth/register", json={
            "name": "Short", "email": f"TEST_short_{uuid.uuid4().hex[:6]}@example.com", "password": "abc",
        }, timeout=15)
        assert r.status_code == 400

    def test_login_success(self, s, unique_email):
        r = s.post(f"{API}/auth/login", json={"email": unique_email, "password": "secret123"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == unique_email
        assert isinstance(d["token"], str) and len(d["token"]) > 10

    def test_login_wrong_password(self, s, unique_email):
        r = s.post(f"{API}/auth/login", json={"email": unique_email, "password": "WRONGPASS"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, s, user_token, unique_email):
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == unique_email

    def test_me_without_token(self, s):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ---------- ADMIN AUTH ----------
class TestAdminAuth:
    def test_admin_login_wrong(self, s):
        r = s.post(f"{API}/admin/login", json={"username": "admin", "password": "WRONG"}, timeout=15)
        assert r.status_code == 401

    def test_admin_login_correct(self, admin_token):
        assert admin_token and len(admin_token) > 10


# ---------- ADMIN RBAC ----------
ADMIN_GET_ENDPOINTS = [
    "/admin/stats",
    "/admin/orders",
    "/admin/reviews",
    "/admin/users",
]


class TestAdminRBAC:
    @pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
    def test_no_token_401(self, path):
        # use a fresh requests call without auth header
        r = requests.get(f"{API}{path}", timeout=15)
        assert r.status_code in (401, 403), f"{path} expected 401/403 got {r.status_code}"

    @pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
    def test_user_token_403(self, user_token, path):
        r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
        assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"

    @pytest.mark.parametrize("path", ADMIN_GET_ENDPOINTS)
    def test_admin_token_200(self, admin_token, path):
        r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200, f"{path} expected 200 got {r.status_code} body={r.text[:200]}"


# ---------- ADMIN DATA ENRICHMENT ----------
class TestAdminEnrichment:
    def test_stats_shape(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        # Either nested {stats:{...}} or flat - accept both. Ensure key fields present.
        # Recent orders should be enriched if present.
        recent = d.get("recent_orders") or d.get("stats", {}).get("recent_orders") or []
        for o in recent:
            assert "total" in o, f"order missing total: {o.keys()}"
            assert "customer" in o and "name" in o["customer"], f"order missing customer.name: {o}"
            assert o["total"] == o.get("total_amount")

    def test_orders_enriched(self, admin_token):
        r = requests.get(f"{API}/admin/orders", headers={"Authorization": f"Bearer {admin_token}"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        orders = d.get("orders", d if isinstance(d, list) else [])
        for o in orders[:10]:
            assert "total" in o
            assert "customer" in o and "name" in o["customer"]
            assert o["total"] == o.get("total_amount")

    def test_products_listing(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        # not enforcing schema, but should be JSON
        assert isinstance(r.json(), (list, dict))


# ---------- ADMIN WRITE RBAC (negative only - don't mutate prod data) ----------
class TestAdminWriteRBAC:
    def test_update_product_no_token(self):
        r = requests.put(f"{API}/admin/products/nonexistent", json={"name": "x"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_update_product_user_token(self, user_token):
        r = requests.put(f"{API}/admin/products/nonexistent",
                         json={"name": "x"},
                         headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
        assert r.status_code == 403

    def test_approve_review_no_token(self):
        r = requests.put(f"{API}/admin/reviews/nonexistent/approve?approved=true", timeout=15)
        assert r.status_code in (401, 403)

    def test_order_status_user_token(self, user_token):
        r = requests.put(f"{API}/admin/orders/nonexistent/status?status=shipped",
                         headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
        assert r.status_code == 403
