# Memories — Photo Frames & Custom Gift Shop (PRD)

## Original Problem Statement
Build "Memories Photo Frames & Custom Gift Shop": AI gift finder, drag-and-drop photo
upload, advanced photo customizer, interactive checkout, wallet/rewards, review system,
and a full Admin Panel to control all features. User demanded: secure authentication,
a fully working user personal page, and a working admin panel (both were broken).

## Stack
- Frontend: React, Tailwind, Shadcn UI, React Router
- Backend: FastAPI, MongoDB (Motor, UUID ids), Pydantic
- Integrations: Emergent LLM (AI gift suggestions)
- Auth: Custom JWT (PyJWT) + bcrypt password hashing

## Auth Architecture (added June 2026)
- Customers: `users` collection. Endpoints: POST /api/auth/register, POST /api/auth/login,
  GET /api/auth/me. JWT role=user, 7-day expiry, sent as `Authorization: Bearer` header.
- Admin: `admins` collection, seeded on startup from env ADMIN_USERNAME/ADMIN_PASSWORD
  (admin / memories2024). POST /api/admin/login returns JWT role=admin.
- All /api/admin/* protected with require_admin dependency (401 no token, 403 user token).
- Frontend: AuthContext (src/context/AuthContext.js) stores token+user in localStorage,
  sets axios default Authorization, restores session via /auth/me.
- AccountButton (src/components/AccountButton.js): header dialog — Login/Sign Up tabs when
  logged out; Profile/Photos/Wallet/Orders tabs when logged in.
- AdminPanel uses adminAuthConfig() to send the admin JWT explicitly (overrides user token).

## Implemented (verified)
- AI Gift Finder (Emergent LLM), Reviews (DB-backed), Wallet/Photos (localStorage by user id),
  Photo Customizer (orientation), branding, checkout.
- Admin Panel backend (18 APIs) + frontend E2E (dashboard, orders w/ totals+customer,
  reviews moderation, users, products delete).
- JWT auth for users + admin; admin RBAC enforced. 27/27 backend pytest pass.

## Known/By-design
- DigitalWallet & ProfilePhotoStorage are localStorage-based keyed by user id (not backend APIs).
- Admin "Top Products" on dashboard is static placeholder data.
- Product EDIT in admin is disabled ("coming soon"); DELETE works.

## Backlog (P1/P2)
- P1: Wire DigitalWallet/ProfilePhotoStorage to existing backend wallet/photo APIs (persist server-side).
- P1: Admin product create/edit forms (backend update/create endpoints exist).
- P2: Real "Top Products" analytics from orders aggregation.
- P2: Password reset / email verification; brute-force lockout.
- P2: Order detail view + invoices in admin.

## Credentials
See /app/memory/test_credentials.md
