# 10 — Production Launch Checklist

Target: `memoriesngifts.com` on Hostinger VPS + MongoDB Atlas. Check every item before go‑live.

---

## 1. Secrets & configuration
- [ ] `JWT_SECRET` set to a long, random, unique value (not the dev default).
- [ ] `ADMIN_USERNAME` / `ADMIN_PASSWORD` set to strong production credentials; update `memory/test_credentials.md` accordingly.
- [ ] `MONGO_URL` points to Atlas; `DB_NAME` set; **no default values in code**.
- [ ] `CORS_ORIGINS` = explicit production domain(s) (NOT `*`).
- [ ] `GEMINI_API_KEY` valid; `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` confirmed available on the key's tier.
- [ ] `REACT_APP_BACKEND_URL` = production API URL (e.g. `https://api.memoriesngifts.com`).
- [ ] Remove/rotate legacy `EMERGENT_LLM_KEY`; ensure no secrets are committed.

## 2. Security
- [ ] Protect/remove public write endpoints: `POST /api/products`, `POST /api/users`, `PUT /api/users/{id}`.
- [ ] Verify all `/api/admin/*` require admin JWT (spot‑check 401/403).
- [ ] Add rate limiting / lockout on `/admin/login` and `/auth/login`.
- [ ] HTTPS/TLS on both frontend and API (Certbot); HTTP→HTTPS redirect.
- [ ] Atlas network access restricted to the VPS IP (no `0.0.0.0/0`).
- [ ] Confirm bcrypt hashing on all password writes; JWT expiry (7 days) acceptable.

## 3. Database
- [ ] Create indexes:
  - `users.email` **unique**, `users.id`
  - `products.id`, `orders.id`, `orders.user_id`
  - `wallet_transactions.user_id`, `user_photos.user_id`
  - `reviews.approved`, `reviews.pinned`
  - `chat_sessions.session_id` **unique**
  - `ai_usage_log.date`, `admin_audit_log.created_at`
- [ ] Seed/verify admin account on first boot.
- [ ] Seed real product catalog (with real `image_url`s).
- [ ] Configure Atlas automated backups.

## 4. Payments & money flows
- [ ] Replace mock wallet top‑up / checkout with a real gateway (Stripe) before accepting real money.
- [ ] Validate all wallet math (credit/debit, points conversion, balance floors).

## 5. AI (Gemini)
- [ ] Confirm all 3 features work live in prod: Gift Finder, Product Description, Review Highlights, + Chat.
- [ ] Verify AI Usage card + 7‑day trend populate; add error‑rate alert.
- [ ] Decide free‑tier vs paid based on expected traffic; set budget/alerts.

## 6. Frontend
- [ ] Wire the Shop mega‑menu + category filtering; verify no hover flicker.
- [ ] Ship the AI Chat widget.
- [ ] Finalize Gift Finder cards (structured, real images, price_range, customization; remove `alert()` path).
- [ ] Remove dead/legacy components; run a production `yarn build` (no ESLint errors).
- [ ] Every interactive element has a `data-testid` (QA).
- [ ] Add a frontend Dockerfile + Nginx (or static host) and add to compose.
- [ ] Verify SEO tags, favicon, OG image, and `memoriesngifts.com` branding.

## 7. Reviews / integrations
- [ ] Add `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACE_ID` and confirm live Google reviews (mock fallback off).
- [ ] Verify WhatsApp CTAs use the correct production number.

## 8. Reliability & ops
- [ ] Migrate deprecated startup/shutdown events to lifespan.
- [ ] Centralized logging + error monitoring (e.g. Sentry) for backend & frontend.
- [ ] Health check endpoint monitored (`/api/`).
- [ ] Container restart policy + resource limits set.
- [ ] Load/smoke test key flows (browse → gift finder → cart → checkout → invoice; login → wallet; admin login → moderate).

## 9. Legal / content
- [ ] Privacy policy, terms, refund/return policy pages.
- [ ] Contact details, business address, GST/invoice compliance (India) on invoices.
- [ ] Cookie/consent notice if analytics added.

## 10. Post‑launch
- [ ] Verify backups restore.
- [ ] Rotate admin/test credentials created during development.
- [ ] Monitor AI usage & error rate for the first week.
- [ ] Confirm order → invoice → WhatsApp share works end‑to‑end on production domain.
