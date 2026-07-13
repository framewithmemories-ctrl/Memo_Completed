# 02 — Database Schema

**Database:** MongoDB (name from `DB_NAME`). IDs are **UUID strings** in an `id` field (not Mongo `ObjectId`). Datetimes are stored as ISO strings or `datetime` depending on the writer.

> ⚠️ **No indexes are declared in code.** `create_index` is not called anywhere. See `10_PRODUCTION_CHECKLIST.md`.

---

## Collections (12)

| Collection | Purpose | Written by |
|---|---|---|
| `users` | Customer + profile + wallet balance | register, admin, wallet, photos |
| `admins` | Admin accounts (seeded on startup) | startup seed, admin login |
| `products` | Catalog | seed, admin product CRUD |
| `orders` | Customer orders | POST /orders |
| `reviews` | Customer reviews (moderated) | POST /reviews, admin moderation |
| `user_photos` | Saved customer photos (base64) | photo endpoints |
| `wallet_transactions` | Wallet ledger (audit trail) | wallet endpoints, admin adjust |
| `designs` | Saved custom designs | POST /designs |
| `chat_sessions` | AI assistant conversation history | POST /chat |
| `ai_cache` | Cached AI output (review highlights) | /reviews/highlights |
| `ai_usage_log` | Gemini usage tracking (live/cache_hit/error) | record_ai_usage() |
| `admin_audit_log` | Sensitive admin actions (password resets) | admin reset-password |

---

## 1. `users`
```json
{
  "id": "b6a…uuid",
  "name": "Dinesh",
  "email": "dinesh@example.com",
  "phone": "9999999999",
  "address": null,
  "preferences": null,
  "points": 0,
  "tier": "Silver",
  "wallet_balance": 0.0,
  "store_credits": 0.0,
  "total_spent": 0.0,
  "role": "user",
  "must_change_password": false,
  "password_hash": "$2b$…",          // added at register/reset (not in User model)
  "password_reset_at": "2026-06-10T…", // set on admin reset
  "created_at": "2026-06-05T…"
}
```
- Validation: `email` normalized to lowercase; password min 6 chars, ≤72 bytes (bcrypt).
- Uniqueness: enforced only by app lookup in `/auth/register` (⚠️ no unique index).

## 2. `admins`
```json
{
  "id": "admin_001",
  "username": "admin",
  "email": "admin@memories.com",
  "password_hash": "$2b$…",
  "role": "super_admin",
  "created_at": "2026-06-…"
}
```
- Seeded on startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD`; password auto‑synced if env changes.

## 3. `products`
```json
{
  "id": "uuid",
  "name": "LED Photo Frame",
  "description": "…",
  "category": "led",             // frames | mugs | t-shirts | acrylic | led | corporate
  "base_price": 1999.0,
  "sizes":   [{"name":"8x10","price_add":0}],
  "materials":[{"name":"Wood","price_add":0}],
  "colors":  [{"name":"Natural","price_add":0}],
  "image_url": "https://…",
  "created_at": "…"
}
```

## 4. `orders`
```json
{
  "id": "uuid",
  "user_id": "uuid | guest",
  "items": [{ "name": "...", "quantity": 1, "price": 899, ... }],
  "total_amount": 1229.0,
  "status": "pending",          // pending | processing | completed | cancelled | refunded
  "delivery_type": "delivery",  // pickup | delivery
  "delivery_address": {"name":"…","email":"…","phone":"…", ...},
  "pickup_slot": null,
  "points_earned": 36,          // 3% of total
  "created_at": "…"
}
```

## 5. `reviews`
```json
{
  "id": "uuid",
  "name": "Priya",
  "rating": 5,                  // 1..5
  "comment": "Loved it!",
  "photos": [],
  "product_id": null,
  "approved": false,            // admin moderates
  "pinned": false,              // admin pins to top
  "created_at": "…"
}
```

## 6. `user_photos`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "family.jpg",
  "image_data": "<base64>",     // stored inline
  "image_url": null,
  "dimensions": {"width":2000,"height":1500},
  "size": 2.4,                  // MB
  "tags": [], "notes": null,
  "favorite": false,
  "usage_count": 0,
  "last_used": null,
  "created_at": "…"
}
```

## 7. `wallet_transactions`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "credit",             // credit | debit | conversion
  "amount": 500.0,
  "description": "Admin credit: refund",
  "category": "admin_adjustment", // topup | purchase | rewards | conversion | admin_adjustment
  "order_id": null,
  "status": "completed",
  "balance_after": 1500.0,
  "is_points": false,
  "credit_earned": null,
  "created_at": "…"
}
```

## 8. `designs`
```json
{ "id":"uuid","user_id":"uuid","product_id":"uuid","image_data":"<base64>","customizations":{…},"preview_url":null,"created_at":"…" }
```

## 9. `chat_sessions`
```json
{
  "session_id": "client-uuid",
  "messages": [
    {"role":"user","content":"…","ts":"…"},
    {"role":"assistant","content":"…","ts":"…"}
  ],                            // capped to last 40
  "updated_at": "…"
}
```

## 10. `ai_cache`
```json
{ "key":"review_highlights", "text":"- …\n- …", "review_count": 12, "updated_at":"…" }
```

## 11. `ai_usage_log`
```json
{ "feature":"gift_finder", "status":"live", "date":"2026-06-10", "created_at":"…" }
// feature ∈ {gift_finder, review_highlights, product_description, chat}
// status  ∈ {live, cache_hit, error}
```

## 12. `admin_audit_log`
```json
{
  "id":"uuid","action":"password_reset","actor":"admin",
  "target_user_id":"uuid","target_user_email":"…",
  "generated":true,"force_change":true,"reason":"…","created_at":"…"
}
```

---

## Relationships (logical — no DB‑level FKs)
- `users.id` → referenced by `orders.user_id`, `user_photos.user_id`, `wallet_transactions.user_id`, `designs.user_id`, `admin_audit_log.target_user_id`.
- `products.id` → referenced by `reviews.product_id`, `designs.product_id`, `orders.items[].*`.
- `chat_sessions.session_id` → client‑generated, not tied to a user.

## Validation rules (app‑level)
- Review `rating`: 1–5 (Pydantic `ge/le`).
- Password: min 6 chars, ≤72 bytes.
- Wallet adjust: amount > 0, reason required, debit ≤ balance.
- Email: lowercased, checked unique at register.

## Recommended indexes (not yet present)
- `users.email` **unique**
- `users.id`, `products.id`, `orders.id` (lookup)
- `orders.user_id`, `wallet_transactions.user_id`, `user_photos.user_id`
- `reviews.approved`, `reviews.pinned`
- `chat_sessions.session_id` **unique**
- `ai_usage_log.date`, `admin_audit_log.created_at`
