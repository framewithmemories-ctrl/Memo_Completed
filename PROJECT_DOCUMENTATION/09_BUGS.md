# 09 — Bugs & Risks

Severity: **🔴 High** (security/data/broken UX), **🟠 Medium** (correctness/robustness), **🟡 Low** (cleanup/polish).
Status reflects the audit snapshot (June 2026). No code was changed during this audit.

---

## 🔴 High

1. **Unauthenticated write endpoints.**
   - `POST /api/products` (line ~452) creates products with **no auth** (a separate admin‑protected `POST /api/admin/products` exists).
   - `POST /api/users` and `PUT /api/users/{user_id}` allow creating/updating user records without a token.
   - **Risk:** anyone can inject catalog items or mutate user profiles. **Fix:** add `require_admin` / owner checks (or remove the public product create).

2. **CORS `*` with credentials.**
   - `allow_origins` defaults to `*` (from `CORS_ORIGINS`), while `allow_credentials=True`. Browsers reject `*`+credentials, and `*` is unsafe for production. **Fix:** set `CORS_ORIGINS` to the explicit production domain(s).

3. **Shop dropdown "missing" (user‑reported).**
   - Current header renders a plain `Shop` anchor — there is **no dropdown** in the shipped code. `ShopMegaMenu.js` exists but is not wired. **Fix:** wire the mega‑menu (see 08_TODO). This also resolves the reported "flicker on hover".

---

## 🟠 Medium

4. **Gift Finder legacy render path.**
   - The frontend still contains a branch that renders a single card with a **hardcoded image** and truncates text to ~500 chars behind an `alert()`. This was the root of the user‑reported "same image / special characters / feels unchanged". Backend is fixed (structured JSON + real images); the legacy branch should be removed and cards updated for `price_range`/`customization`. (Tracked in 08_TODO.)

5. **No MongoDB indexes / no unique email constraint.**
   - Email uniqueness relies on an app‑level check in `/auth/register`; a race or a direct `POST /api/users` can create duplicates. Query performance also degrades at scale. **Fix:** add indexes (see 02/10).

6. **Mock money flows.**
   - Wallet `add-money` and checkout do not use a real payment gateway; balances can be topped up without payment. Acceptable for demo, **not for production**. **Fix:** integrate Stripe (already in deps) for top‑up/checkout.

7. **Wallet/photo amounts via query params without strong validation.**
   - `add-money?amount=`, `pay?amount=`, `convert-points?points=` accept scalars; ensure server‑side validation (positive, numeric, balance checks) is complete and consistent.

8. **Deprecated FastAPI startup/shutdown events.**
   - `@app.on_event(...)` is deprecated; may warn/break on future FastAPI upgrades. **Fix:** use lifespan context.

9. **Two Gemini SDKs + Emergent libs installed.**
   - `google-genai` (used) and `google-generativeai` (unused) both present; `emergentintegrations`/`litellm`/`openai` remain though the app migrated off the proxy. Bloats the image and the Dockerfile still adds an extra index URL. **Fix:** prune deps.

---

## 🟡 Low

10. **Legacy/duplicate components** inflate the bundle and cause confusion (`Fixed*`, `*Simple`, `Enhanced*` duplicates). Remove after confirming they're unimported.

11. **Admin Settings toggles & export buttons are non‑functional stubs.** They imply behavior that doesn't exist (may mislead operators).

12. **No pagination** on admin lists (fixed `limit` only) — large datasets will be truncated silently.

13. **AI free‑tier fragility.** During testing, `gemini-2.5-flash` returned transient `503`; the fallback model handles most cases but sustained launch traffic on a free tier may raise error rates. Monitor via AI Usage card; consider billing/paid tier before scaling.

14. **Guest orders** use `user_id:"guest"` with no linkage to a later account.

---

## Not reproduced / clarified
- **"Menu flickers on hover until I click"** — no hover dropdown exists in the current preview code, so this cannot originate from shipped code; likely an older/separately deployed build. Building the hover‑stable `ShopMegaMenu` (with close‑delay) is the intended resolution.

---

## Audit update — 24 Aug 2026
The current `main` branch has already fixed several items listed above, including protected product/user writes and database indexes. This document is being refreshed as part of the production security lockdown; it should not be treated as the authoritative current status until the new `PROJECT_STATUS.md` is published.
