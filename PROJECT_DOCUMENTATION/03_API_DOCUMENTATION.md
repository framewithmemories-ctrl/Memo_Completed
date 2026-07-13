# 03 — API Documentation

Base URL: `${REACT_APP_BACKEND_URL}` — **all routes are prefixed with `/api`.**
Auth: JWT `Authorization: Bearer <token>` (HS256, 7‑day expiry). Roles: `user`, `admin`.

Legend for **Auth**: 🌐 public · 👤 user JWT · 🔑 owner (`verify_user_access`) · 🛡️ admin JWT

> ⚠️ Security note: a few write endpoints are currently **public** that arguably should be protected (`POST /products`, `POST /users`, `PUT /users/{id}`). See `09_BUGS.md`.

---

## Health / catalog

### GET `/api/` 🌐
Health/hello. → `{"message": ...}`

### GET `/api/products` 🌐 → `List[Product]`

### POST `/api/products` 🌐 ⚠️(unprotected) → `Product`
Body = `ProductCreate` (name, description, category, base_price, sizes[], materials[], colors[], image_url).

### GET `/api/products/{product_id}` 🌐 → `Product` (404 if missing)

---

## Users / designs / uploads

### POST `/api/users` 🌐 → `User` — Body `UserCreate`.
### GET `/api/users/{user_id}` 🌐 → `User`.
### PUT `/api/users/{user_id}` 🌐 ⚠️ — profile update (dict body).
### POST `/api/designs` 🌐 → `CustomDesign` — Body `CustomDesignCreate`.
### GET `/api/designs/{user_id}` 🌐 → list of designs.
### POST `/api/upload-image` 🌐 — multipart file upload (Pillow processing). Returns image metadata/base64.

---

## AI — Gift Finder (Gemini)

### POST `/api/gift-suggestions` 🌐
Request:
```json
{
  "answers": {"recipient":"wife","occasion":"anniversary","age_group":"Adult (31-50)",
              "interests":["photography"],"budget":"2000","relationship":"wife"},
  "aiEnhanced": true,
  "previewPhoto": null
}
```
Response (**structured**, grounded in real catalog products with real images):
```json
{
  "suggestions": [
    {
      "product": {"id":"uuid","name":"LED Photo Frame","description":"…",
                  "base_price":1999.0,"image_url":"https://…","category":"led"},
      "reasoning": "…why it fits…",
      "confidence": 95,
      "price_range": "Rs.1999",
      "customization": "Engrave the couple's names",
      "aiTag": "✨ AI Pick"
    }
  ],
  "quiz_data": {...}, "enhanced": true, "photo_analyzed": false,
  "shop_info": {"name":"…","phone":"…","address":"…","specialties":[…]}
}
```
On AI failure → **HTTP 502** (frontend then renders its own varied structured fallback). Records `ai_usage_log` (`gift_finder`, live/error).

---

## AI — Chat assistant (Gemini)

### POST `/api/chat` 🌐
Request: `{ "session_id": "client-uuid", "message": "Gift for mom under 1500?" }`
Response: `{ "reply": "…", "session_id": "…", "ai": true }`
- Multi‑turn: uses last 8 messages from `chat_sessions`, persists last 40.
- Grounded in shop catalog + shop info; concise plain‑text replies.
- If `GEMINI_API_KEY` missing or Gemini fails → graceful WhatsApp fallback reply, `ai:false`.
- Records `ai_usage_log` (`chat`, live/error).

### GET `/api/chat/{session_id}` 🌐
→ `{ "session_id": "...", "messages": [{"role","content"}, ...] }` (history restore).

---

## Orders

### POST `/api/orders` 🌐 → `Order`
Body `OrderCreate` (user_id, items[], total_amount, delivery_type, delivery_address?, pickup_slot?). Computes `points_earned` = 3% of total; updates user points.

### GET `/api/orders/{user_id}` 🌐 → list of that user's orders.

---

## Reviews

### POST `/api/reviews` 🌐 → `Review` — Body `ReviewCreate` (created `approved:false`).
### GET `/api/reviews` 🌐 — approved reviews (pinned first).
### GET `/api/reviews/highlights` 🌐 — cached AI "what customers love" (3 bullets). Regenerates ~daily / on review‑count change; requires ≥3 approved reviews + Gemini. Records `ai_usage_log` (`review_highlights`).
### GET `/api/reviews/stats` 🌐 — aggregate rating stats.
### GET `/api/google-reviews` 🌐 — live Google reviews if `GOOGLE_PLACES_API_KEY`+`GOOGLE_PLACE_ID` set, else **mock fallback** (`configured:false`).

---

## Public config / info

### GET `/api/config` 🌐 → `{ shop_whatsapp, business_name, ... }` (from env).
### GET `/api/store-info` 🌐 → shop details (hours, address, phone).

---

## Auth

### POST `/api/auth/register` 🌐
Body `{name,email,password,phone?}` → `{token, user}`. Password min 6 chars; email unique (app check).
### POST `/api/auth/login` 🌐
Body `{email,password}` → `{token, user}` (user includes `must_change_password`).
### GET `/api/auth/me` 👤 → `{user}`.
### POST `/api/auth/change-password` 👤
Body `{current_password,new_password}` → `{success, user}`. Verifies current, enforces min 6 / ≤72 bytes / different; clears `must_change_password`.

---

## User‑scoped (owner only) 🔑

Photos:
- POST `/api/users/{user_id}/photos` → `SavedPhoto`
- GET `/api/users/{user_id}/photos`
- DELETE `/api/users/{user_id}/photos/{photo_id}`
- PUT `/api/users/{user_id}/photos/{photo_id}/favorite`
- PUT `/api/users/{user_id}/photos/{photo_id}/use`

Wallet:
- GET `/api/users/{user_id}/wallet` → balance + summary
- POST `/api/users/{user_id}/wallet/add-money?amount=` (⚠️ mock top‑up, no gateway)
- POST `/api/users/{user_id}/wallet/convert-points?points=`
- GET `/api/users/{user_id}/wallet/transactions?limit=`
- POST `/api/users/{user_id}/wallet/pay?amount=&order_id=`

---

## Admin 🛡️ (`require_admin`)

### POST `/api/admin/login` 🌐 — Body `{username,password}` → `{success, admin, token}`.

Dashboard / moderation:
- GET `/api/admin/stats` → `AdminStats` (users, orders, revenue, pending reviews, products, recent orders, top products from real orders).
- GET `/api/admin/reviews?status=&limit=`
- PUT `/api/admin/reviews/{id}/approve?approved=`
- PUT `/api/admin/reviews/{id}/pin?pinned=`
- DELETE `/api/admin/reviews/{id}`
- GET `/api/admin/orders?status=&limit=`
- PUT `/api/admin/orders/{id}/status?status=`

Users:
- GET `/api/admin/users?limit=`
- POST `/api/admin/users/{user_id}/wallet/adjust` — Body `{amount, type:'credit'|'debit', reason}` (reason mandatory; logs `wallet_transactions`).
- POST `/api/admin/users/{user_id}/reset-password` — Body `{new_password?, reason?, force_change?}`. If no password → generates temp password (returned once). `force_change:true` sets `must_change_password`. Logs `admin_audit_log`.

Observability:
- GET `/api/admin/audit-log?limit=` → `{entries:[…]}`
- GET `/api/admin/ai-usage` → `{ai_configured, today:{live,cache_hit,error,total_calls,cache_hit_rate}, all_time:{…}, by_feature_today:{…}, daily_7d:[{date,live,cache_hit,error,total}]}`

Products (admin):
- POST `/api/admin/products` → `Product`
- POST `/api/admin/products/generate-description` — Body `{name, category?}` → `{description}` (Gemini; 503 if AI not configured; 502 on failure).
- PUT `/api/admin/products/{product_id}` — dict body.
- DELETE `/api/admin/products/{product_id}`

---

## Common error shapes
- `401` — missing/expired/invalid token (`{"detail":"…"}`).
- `403` — admin route hit with non‑admin token.
- `404` — resource not found.
- `400` — validation (password length, reason required, etc.).
- `502/503` — AI unavailable/not configured.
