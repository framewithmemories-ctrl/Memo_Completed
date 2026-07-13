# 05 — Admin Features

Admin panel route: `/admin`. Auth: `POST /api/admin/login` (username/password → admin JWT). Default seeded admin: `admin` / `memories2024` (from env; see `memory/test_credentials.md`). All `/api/admin/*` routes require `require_admin`.

---

## Existing features ✅

### Authentication & security
- Secure admin login (bcrypt‑hashed, seeded on startup; password auto‑synced from env).
- RBAC: `require_admin` rejects no‑token (401) and non‑admin/user tokens (403).
- **Admin‑initiated password reset** for any user: set a specific password OR auto‑generate a temporary one (shown once, copy‑to‑clipboard), with optional **"force change on next login"**. Every reset logged.
- **Admin Audit Log** view (Settings) — actor, target user, generated/forced flags, reason, timestamp.

### Dashboard & analytics
- Stat cards: total users, total orders, total revenue, pending reviews.
- Recent Orders list (real data).
- **Top Products** computed from real order aggregation.
- **AI Usage (Gemini)** card: calls today, cache‑hit rate, live calls, errors, all‑time summary, **7‑day trend sparkline** (live vs cached).

### Catalog management
- Product **create / edit / delete**.
- **AI product description generation** (Gemini) inside the product form.

### Orders
- List orders with customer name/email/phone and totals.
- Update order status (pending → processing → completed → cancelled …).

### Reviews moderation
- List reviews (all/pending/approved).
- Approve / reject, delete, and **pin** (featured, shown first on storefront).

### Users & wallet
- List users with wallet balance & total spent.
- **Wallet adjust** (credit/debit) with **mandatory reason** → written to `wallet_transactions` (audit trail); rejects debit > balance.

---

## Missing / partial features ⚠️ (see 08_TODO.md)

- **AI Usage error‑rate alert** — requested; not yet added to the AI Usage card.
- **Settings tab is mostly placeholder** — "Auto‑approve reviews", "Email notifications", "Maintenance mode" toggles are non‑functional; "Export Orders/Users" buttons are stubs (no CSV export).
- **No order detail view / printable invoice** in admin (invoice exists only on the customer checkout flow).
- **No product image upload in admin** — product `image_url` is a text field only (no file upload / object storage).
- **No admin management of AI cache** (e.g. force‑refresh review highlights).
- **No second‑admin management** (cannot create/disable additional admins from UI; single seeded admin).
- **No pagination** on users/orders/reviews (fixed `limit` query only).
- **No audit logging for non‑password admin actions** (wallet adjust logs to wallet_transactions, but product/review/order changes are not in `admin_audit_log`).
- **No rate limiting / brute‑force lockout** on `/admin/login`.
