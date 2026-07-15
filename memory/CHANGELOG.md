# Changelog — Memories Photo Frames & Gift Shop

## June 2026

### Sprint: Gemini reliability fixes + 7-day AI trend (tested e2e)
- FIXED truncation bug: `gemini-2.5-flash` spends `max_output_tokens` on internal "thinking", truncating answers (Gift Finder was cut to ~230 chars). `gemini_helper._call` now sets `ThinkingConfig(thinking_budget=0)` for 2.5 models → full output (Gift Finder now ~4000 chars, Product Description full).
- FIXED dead fallback model: `gemini-2.0-flash` returns `limit: 0` (not enabled) on this free-tier key, so transient 503s on 2.5-flash always failed → silent fallback text. Changed fallback to `gemini-2.5-flash-lite` (own free-tier quota); both models overridable via `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL`.
- Verified ALL 3 Gemini features live & non-truncated: Gift Finder (live), Product Description (live), Review Highlights (cached, regenerates ~daily / on review-count change).
- Added 7-day call trend to the AI Usage card: `GET /api/admin/ai-usage` now returns `daily_7d` (zero-filled). Frontend renders a dependency-free stacked bar sparkline (purple=live, green=cached) with day labels, peak indicator and legend. Verified e2e (7 bars).

### Sprint: AI Usage Counter (tested e2e)
- New `GET /api/admin/ai-usage` returns today's + all-time Gemini stats: total calls, live, cache_hit, errors, cache-hit rate, and a per-feature breakdown for today.
- Lightweight non-blocking tracking via `record_ai_usage(feature, status)` → `ai_usage_log` collection. Instrumented all 3 Gemini call sites: gift_finder, review_highlights (live + cache_hit), product_description.
- Admin Dashboard now shows an "AI Usage (Gemini)" card (Calls Today, Cache-Hit Rate, Live Calls, Errors + all-time summary). Verified e2e: triggered a live description + cached highlights → card shows 2 calls / 50% cache-hit.

### Sprint: Force-change + Audit Log view + Gemini scope (tested e2e)
- Added `force_change` to admin reset: sets `must_change_password=true`. New `POST /api/auth/change-password` (user) clears the flag. AccountButton now shows a mandatory "Set a New Password" gate on login when flagged — verified e2e through the UI (login → gate → update → account access).
- Admin → Settings now shows an "Admin Audit Log" card (`GET /api/admin/audit-log`) listing recent password resets with actor, target, generated/forced flags and reason.
- Added `must_change_password` field to User model.
- Gemini integration scope (unchanged this sprint, confirmed): 3 features via `gemini_helper.py` (google-genai SDK, model `gemini-2.5-flash` default, fallback `gemini-2.0-flash`, retries + graceful None fallback): (1) AI Gift Finder, (2) Storefront Review Highlights (cached, only runs with ≥3 reviews), (3) Admin Product Description generator.

### Sprint: Build fix + Admin Password Reset (tested e2e)
- Fixed P0 build blocker: the function `usePhotoForOrder` in ProfilePhotoStorage.js (a plain handler, not a hook) tripped ESLint rules-of-hooks → renamed to `applyPhotoToOrder`.
- Removed broken `/app/frontend/.eslintrc.json` (extended `react-app`, which isn't installed → "Failed to load config" build error). react-scripts 5 already bundles its own eslint config.
- Removed file-level `/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */` comments across 10 files — those rules don't exist in bundled react-hooks 4.x and caused "Definition for rule was not found" errors. Kept valid `react/no-unescaped-entities` disables in App.js & EnhancedCheckoutPage.js.
- Verified no React duplicate-`key` warnings fire at runtime (all `.map()` renders are keyed).
- NEW Admin-initiated password reset (option a, no email dependency): `POST /api/admin/users/{id}/reset-password` (set specific or auto-generate temp pwd) + `GET /api/admin/audit-log`. Admin UI: Users tab → "Reset Password" dialog with copy-to-clipboard. Confirmed e2e: generated temp password successfully logs the user in.

## June 2026

### Sprint: Auth + Admin Panel (tested, 27/27)
- JWT auth (bcrypt + PyJWT) for users (register/login/me) and admin (seeded admin/memories2024).
- All /api/admin/* protected with require_admin (401 no token, 403 user token).
- Replaced the broken stub profile (alert + external /profile-modal.js) with real React AuthContext + AccountButton (Login/Sign Up; Profile/Photos/Wallet/Orders tabs).
- Admin Panel E2E fixed: order totals + customer names; Orders tab refresh bug; product delete; Back to Website.

### Sprint: Backend Sync + Admin Controls (tested, 51/51)
- Wallet & Photos now persist in the BACKEND (cross-device), not localStorage:
  - DigitalWallet.js -> /api/users/{id}/wallet (balance, add-money, convert-points, transactions).
  - ProfilePhotoStorage.js -> /api/users/{id}/photos (real file upload via FileReader base64, list/delete/favorite/use).
  - All wallet/photo routes protected by verify_user_access (owner-only; 401/403 enforced).
- Admin wallet adjust: POST /api/admin/users/{id}/wallet/adjust — credit OR debit, MANDATORY reason (audit trail, category 'admin_adjustment'); rejects empty reason and debit>balance. UI in Admin Users tab.
- Admin product CRUD: POST /api/admin/products (create) + PUT (edit, matched_count fix) + DELETE. UI: Add Product / Edit / Delete dialogs in Admin Products tab.

## Remaining (next batch)
- Reviews: inject live Google credentials (see "Google Reviews Setup" below).
- P2: password reset, real "Top Products" analytics.
- Pre-existing (non-blocking): duplicate React `key` warning on home product grid; react-helmet UNSAFE_componentWillMount warning.

### Sprint: Batch 2 — Checkout Invoice + UI fixes (tested, 59/59)
- Post-checkout INVOICE screen: order id, itemized bill, subtotal/delivery/tax/total, delivery info, reward points, with **Print Invoice** (isolated print window) + **Share on WhatsApp** (wa.me with order summary) + Continue Shopping.
- Orders now PERSIST to backend (POST /api/orders) and show in Account → Orders; logged-in wallet pay debits backend wallet.
- Cart "void" fixed: removed redundant double `bg-black` overlay in CartIcon; softened all dialog overlays (black/80 → black/60).
- Hybrid Google reviews: GET /api/google-reviews (httpx + MOCK fallback) + "Read all reviews on Google" button + admin-curated PINNED reviews (Review.pinned, admin pin endpoint, pinned-first sort, "Featured" badge).
- About Us "Back to Home" button.
- AI Gift Finder option text no longer cut off (whitespace-normal).

## Google Reviews Setup (action for user)
Inject into /app/backend/.env then `sudo supervisorctl restart backend`:
- GOOGLE_PLACES_API_KEY="<your Google Cloud API key with Places API enabled>"
- GOOGLE_PLACE_ID="<your business Place ID>"
- GOOGLE_REVIEWS_URL="<optional: direct link to your Google reviews>"
When set, /api/google-reviews returns configured=true with live top-5 reviews; otherwise it serves mock data.

## 2026-06 — Razorpay payment adapter
- Added POST /api/payments/verify (backend/server.py): mock + production modes.
  - mock: bypasses signature, sets order status=processing, payment_status=paid.
  - production: HMAC-SHA256 over "razorpay_order_id|razorpay_payment_id" using RAZORPAY_KEY_SECRET; 400 on mismatch.
- Added GET /api/payments/config (exposes mode + key_id in production only).
- Added .env: PAYMENT_MODE="mock", RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
- Imported native hmac (no razorpay SDK). Verified via curl: mock verify->processing, 404 unknown order, HMAC compare_digest logic confirmed.

## 2026-06 — Razorpay frontend wiring
- EnhancedCheckoutPage.js: added "Pay Online (Razorpay)" payment method.
  - Loads window.Razorpay checkout.js dynamically (production only).
  - Mock mode (PAYMENT_MODE=mock / no key): simulates success instantly.
  - On success calls POST /api/payments/verify {order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature} then shows invoice.
  - Fetches GET /api/payments/config on mount for mode + key_id.
- Button label switches to "Pay Now" for online payments. Verified webpack compiled successfully.

## 2026-07 — Live MongoDB Atlas wiring
- Pointed backend MONGO_URL to Atlas (cluster0.og8ervc), DB_NAME="memories". Password URL-encoded (@ -> %40).
- Required Atlas Network Access allow-list 0.0.0.0/0 (initial TLSV1_ALERT_INTERNAL_ERROR was IP-block, resolved after whitelist).
- Verified: connected to MongoDB 8.0.27, admin account seeded, /api/config responds from Atlas.
- A3 startup index script built all indexes on live cluster (23 total incl _id_; 13 custom): users(email unique,id), products(id), orders(user_id), wallet_transactions(user_id), user_photos(user_id), reviews(approved), ai_usage_log(date), admin_audit_log(created_at), chat_sessions(session_id unique,user_id), password_reset_tokens(expires_at TTL,email).
