# 08 — TODO (Unfinished Features)

Status at audit time. Priority: **P0** = blocks the current sprint / user‑reported, **P1** = important pre‑launch, **P2** = nice‑to‑have / later.

---

## In‑progress (current sprint — partially built)

- [ ] **P0 — Shop mega‑menu (frontend wiring).** `ShopMegaMenu.js` is **created but not imported/used** in the header (`App.js` still renders the plain "Shop" link). Needs: replace the Shop nav item with `<ShopMegaMenu />`, and add a `shop-filter` `CustomEvent` listener in `ProductGrid` (`MainComponents.js`) to set the category filter + scroll to `#shop`.
- [ ] **P0 — AI Chat widget (frontend).** Backend `/api/chat` + `/api/chat/{session_id}` are **done and tested**. Missing: floating chat panel component wired into the storefront (session_id in localStorage, message list, send box, WhatsApp fallback state).
- [ ] **P0 — Gift Finder card polish.** Backend now returns **structured** suggestions with real images (done). Frontend still needs to: render `price_range` + `customization` per card and remove the legacy string‑branch single‑card + `alert("View Full AI Analysis")` path.
- [ ] **P1 — AI Usage error‑rate alert.** Add a visible warning banner on the admin AI Usage card when today's error rate crosses a threshold (data already returned by `/api/admin/ai-usage`).

## Integrations pending inputs
- [ ] **P2 — Real Google Reviews.** Wire once the user provides `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACE_ID`. Backend already supports live mode with mock fallback.

## Backend / platform
- [ ] **P1 — MongoDB indexes.** Create indexes (esp. unique `users.email`, unique `chat_sessions.session_id`) — currently none.
- [ ] **P1 — Protect currently‑public write endpoints.** `POST /api/products`, `POST /api/users`, `PUT /api/users/{id}` are unauthenticated (see 09_BUGS).
- [ ] **P1 — Migrate deprecated `@app.on_event("startup"/"shutdown")`** to FastAPI lifespan handlers.
- [ ] **P2 — Trim dependencies.** Remove unused `emergentintegrations`, `litellm`, `openai`, `google-generativeai` (app uses `google-genai`); drop the extra‑index install from the Dockerfile.
- [ ] **P2 — Rate limiting / lockout** on `/admin/login` and `/auth/login`.
- [ ] **P2 — Pagination** for admin users/orders/reviews.

## Frontend / cleanup
- [ ] **P1 — Remove dead/legacy components** after confirming they're unimported: `Fixed*` (Components/Header/HeaderNavigation/AIGiftFinder/CheckoutSystem/ReviewSystem), `CheckoutPage`, `EnhancedCheckout`, `ReviewSystem`, `UserProfile`, `UserProfileSimple`, `EnhancedUserProfile`, `AdvancedPhotoCustomizer`, `DragDropPhotoUpload`.
- [ ] **P1 — Frontend Docker + Nginx** service (docker‑compose currently has no frontend service).

## Product features (backlog)
- [ ] **P1 — Real payment gateway** (Stripe present in deps but not wired to checkout/wallet top‑up — currently mock).
- [ ] **P2 — Self‑service "forgot password" email flow** (Resend/SendGrid). Only admin‑initiated reset exists today.
- [ ] **P2 — Order confirmation email/SMS**, order tracking.
- [ ] **P2 — Product detail pages** + product image upload (object storage) in admin.
- [ ] **P2 — Product wishlist**, guest→account order linking.
- [ ] **P2 — Admin CSV export** (Orders/Users buttons are stubs) and functional Settings toggles.

## Deferred P1 Backlog (as of 2026-07)
- [ ] Razorpay production checkout: add backend endpoint to CREATE a Razorpay order (returns razorpay_order_id) before opening the modal. Frontend adapter + POST /api/payments/verify are already in place (mock mode working).
- [ ] SMTP email delivery (Resend/SendGrid) for /api/auth/forgot-password (currently logs token server-side).

## Deployment configs added (2026-07)
- frontend/vercel.json — SPA rewrite: all non-static routes -> /index.html.
- backend/Procfile — `web: uvicorn server:app --host 0.0.0.0 --port $PORT` (Render binds via $PORT; no app.run in server.py, so CLI controls the port).
