"""
Sprint 3 backend tests:
- POST /api/orders + GET /api/orders/{user_id}: persistence, points (3%) & tier update
- GET /api/google-reviews: returns mock fallback when not configured
- PUT /api/admin/reviews/{id}/pin: admin-only, sorts pinned-first in GET /api/reviews
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


@pytest.fixture(scope="session")
def user(s):
    email = f"TEST_sprint3_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "TEST Sprint3 User",
        "email": email,
        "password": "secret123",
    }, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"id": d["user"]["id"], "token": d["token"], "email": email}


def _bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


# ============ ORDERS ============
class TestOrders:
    def test_create_order_persists_and_returns_invoice_fields(self, s, user):
        payload = {
            "user_id": user["id"],
            "items": [
                {
                    "product_id": "prod_test",
                    "name": "Wooden Photo Frame",
                    "quantity": 2,
                    "price": 500.0,
                }
            ],
            "total_amount": 1100.0,
            "delivery_type": "delivery",
            "delivery_address": {
                "name": "TEST Sprint3 User",
                "email": user["email"],
                "phone": "9999999999",
                "address": "123 Test Street, Coimbatore",
            },
        }
        r = s.post(f"{API}/orders", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["total_amount"] == 1100.0
        # 3% of total_amount
        assert d.get("points_earned") == int(1100.0 * 0.03)
        order_id = d["id"]

        # Verify GET /api/orders/{user_id} returns it
        r2 = s.get(f"{API}/orders/{user['id']}", timeout=15)
        assert r2.status_code == 200
        orders = r2.json()
        assert any(o["id"] == order_id for o in orders), f"Order {order_id} not found in user orders"

        # Verify points updated on user (via /auth/me)
        me = s.get(f"{API}/auth/me", headers=_bearer(user["token"]), timeout=15)
        assert me.status_code == 200
        u = me.json()["user"]
        assert u.get("points", 0) >= int(1100.0 * 0.03)

    def test_orders_empty_for_new_user(self, s):
        # Random non-existent user_id returns empty list
        r = s.get(f"{API}/orders/nonexistent-{uuid.uuid4().hex[:6]}", timeout=15)
        assert r.status_code == 200
        assert r.json() == []


# ============ GOOGLE REVIEWS ============
class TestGoogleReviews:
    def test_google_reviews_mock_fallback(self, s):
        r = s.get(f"{API}/google-reviews", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("configured") is False, "Expected mock (configured=false) when keys empty"
        assert "rating" in d and isinstance(d["rating"], (int, float))
        assert "total" in d and isinstance(d["total"], int)
        assert "google_url" in d and d["google_url"].startswith("http")
        reviews = d.get("reviews", [])
        assert isinstance(reviews, list) and len(reviews) >= 3
        for rev in reviews:
            assert "author_name" in rev and rev["author_name"]
            assert "rating" in rev
            assert "text" in rev


# ============ ADMIN PIN REVIEW ============
class TestPinReview:
    @pytest.fixture(scope="class")
    def created_review(self, user):
        payload = {
            "name": "TEST Sprint3 User",
            "rating": 5,
            "comment": "Test pin review created by sprint3 tests.",
        }
        r = requests.post(f"{API}/reviews", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        return r.json()

    def test_pin_no_token_401_or_403(self, created_review):
        r = requests.put(
            f"{API}/admin/reviews/{created_review['id']}/pin?pinned=true",
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_pin_user_token_403(self, created_review, user):
        r = requests.put(
            f"{API}/admin/reviews/{created_review['id']}/pin?pinned=true",
            headers=_bearer(user["token"]),
            timeout=15,
        )
        assert r.status_code == 403

    def test_pin_admin_success_and_listing_pinned_first(self, created_review, admin_token):
        r = requests.put(
            f"{API}/admin/reviews/{created_review['id']}/pin?pinned=true",
            headers=_bearer(admin_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["pinned"] is True

        # Listing should put pinned first
        r2 = requests.get(f"{API}/reviews?limit=20&offset=0", timeout=15)
        assert r2.status_code == 200
        reviews = r2.json().get("reviews", [])
        assert reviews, "expected at least one review"
        # First entry should be a pinned review
        assert reviews[0].get("pinned") is True, f"first review not pinned: {reviews[0]}"

    def test_pin_nonexistent_404(self, admin_token):
        r = requests.put(
            f"{API}/admin/reviews/does-not-exist-xyz/pin?pinned=true",
            headers=_bearer(admin_token),
            timeout=15,
        )
        assert r.status_code == 404

    def test_unpin_admin_success(self, created_review, admin_token):
        r = requests.put(
            f"{API}/admin/reviews/{created_review['id']}/pin?pinned=false",
            headers=_bearer(admin_token),
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["pinned"] is False
