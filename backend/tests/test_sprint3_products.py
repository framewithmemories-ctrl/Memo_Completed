"""Sprint 3 — Product Schema V2 (data foundation) tests. Hits live server on :8001."""
import os
import uuid
import requests

BASE = os.environ.get("TEST_BASE_URL", "http://localhost:8001") + "/api"
results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"{'PASS' if cond else 'FAIL'} - {name} {extra}")


# Admin login
r = requests.post(f"{BASE}/admin/login", json={"username": "admin", "password": "admin_temp_password_123"})
admin_token = r.json().get("token")
ah = {"Authorization": f"Bearer {admin_token}"}
check("0. Admin login works", bool(admin_token), f"(got {r.status_code})")

# --- Legacy-shape product create still works (backward compatible) ---
legacy = {"name": f"Legacy Frame {uuid.uuid4().hex[:5]}", "description": "A classic frame",
          "category": "frames", "base_price": 499, "image_url": "https://x/img.jpg",
          "sizes": [{"label": "8x10"}], "materials": [{"label": "Wood"}], "colors": [{"label": "Brown"}]}
r = requests.post(f"{BASE}/admin/products", json=legacy, headers=ah)
p = r.json() if r.status_code == 200 else {}
check("1. Legacy product create still works", r.status_code == 200, f"(got {r.status_code})")
check("2. Slug auto-generated from name", bool(p.get("slug")) and " " not in p.get("slug", " "), f"(slug={p.get('slug')})")
check("3. media.primary_image backfilled from image_url",
      (p.get("media") or {}).get("primary_image") == legacy["image_url"])
check("4. V2 defaults present (status.active, customization.enabled)",
      (p.get("status") or {}).get("active") is True and (p.get("customization") or {}).get("enabled") is False)
pid, pslug = p.get("id"), p.get("slug")

# --- Full V2 product create with variants/classification/marketing ---
v2 = {"name": f"Photo Cushion {uuid.uuid4().hex[:5]}", "description": "Custom photo cushion",
      "category": "cushions", "base_price": 699, "image_url": "https://x/c.jpg",
      "short_description": "Soft custom cushion", "subcategory": "photo-cushions",
      "tags": ["photo", "gift"], "occasions": ["birthday"], "recipients": ["friend"],
      "compare_at_price": 999,
      "variants": [{"name": "Small", "price_delta": 0}, {"name": "Large", "price_delta": 200}],
      "customization": {"enabled": True, "photo_upload": True, "min_photos": 1, "max_photos": 3},
      "marketing": {"bestseller": True}, "seo": {"title": "Photo Cushion"}}
r = requests.post(f"{BASE}/admin/products", json=v2, headers=ah)
pv = r.json() if r.status_code == 200 else {}
check("5. V2 product with variants creates", r.status_code == 200, f"(got {r.status_code})")
check("6. Variants persisted with ids", len(pv.get("variants", [])) == 2 and all(v.get("id") for v in pv.get("variants", [])))
check("7. Classification fields persisted", pv.get("tags") == ["photo", "gift"] and pv.get("compare_at_price") == 999)
large_variant = next((v for v in pv.get("variants", []) if v["name"] == "Large"), None)

# --- Read by id and by slug ---
r1 = requests.get(f"{BASE}/products/{pid}")
r2 = requests.get(f"{BASE}/products/{pslug}")
check("8. Product fetch by id works", r1.status_code == 200)
check("9. Product fetch by slug works", r2.status_code == 200 and r2.json().get("id") == pid, f"(got {r2.status_code})")

# --- List still works and normalizes ---
r = requests.get(f"{BASE}/products")
check("10. Product list returns normalized products", r.status_code == 200 and all(x.get("slug") for x in r.json()))

# --- Variant-aware server pricing: order with valid variant price passes, underpriced variant rejected ---
uid = f"guest_{uuid.uuid4().hex[:6]}"
if large_variant:
    base = pv["base_price"]
    # correct price for Large = base + 200
    ok_item = [{"product_id": pv["id"], "variant_id": large_variant["id"], "name": pv["name"],
                "price": base + 200, "quantity": 1}]
    r = requests.post(f"{BASE}/payments/create-order", json={
        "user_id": uid, "items": ok_item, "delivery_type": "pickup"})
    check("11. Variant order with correct price accepted", r.status_code == 200, f"(got {r.status_code})")

    # underpriced variant (paying base only, ignoring +200 delta) rejected
    bad_item = [{"product_id": pv["id"], "variant_id": large_variant["id"], "name": pv["name"],
                 "price": base, "quantity": 1}]
    r = requests.post(f"{BASE}/payments/create-order", json={
        "user_id": uid, "items": bad_item, "delivery_type": "pickup"})
    check("12. Underpriced variant rejected", r.status_code == 400, f"(got {r.status_code})")

    # invalid variant id rejected
    bad_v = [{"product_id": pv["id"], "variant_id": "nope", "name": pv["name"], "price": base + 200, "quantity": 1}]
    r = requests.post(f"{BASE}/payments/create-order", json={
        "user_id": uid, "items": bad_v, "delivery_type": "pickup"})
    check("13. Invalid variant id rejected", r.status_code == 400, f"(got {r.status_code})")

# --- Admin update keeps slug in sync when name changes ---
r = requests.put(f"{BASE}/admin/products/{pid}", json={"name": "Renamed Legacy Frame ABC"}, headers=ah)
check("14. Admin update works", r.status_code == 200)
r = requests.get(f"{BASE}/products/{pid}")
check("15. Slug updated on rename", r.json().get("slug") == "renamed-legacy-frame-abc", f"(slug={r.json().get('slug')})")

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n==== {passed}/{len(results)} passed ====")
failed = [n for n, ok, _ in results if not ok]
if failed:
    print("FAILED:", failed)
