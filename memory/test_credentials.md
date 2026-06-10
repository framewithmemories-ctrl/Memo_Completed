# Test Credentials — Memories Photo Frames & Gift Shop

## Admin Panel (route: /admin)
- Username: `admin`
- Password: `memories2024`
- Login endpoint: `POST /api/admin/login` (returns JWT with role=admin)
- Admin APIs require `Authorization: Bearer <admin_token>` header.

## Customer / User Auth (header Account button on home page)
- Register: `POST /api/auth/register` { name, email, password, phone? }
- Login: `POST /api/auth/login` { email, password }
- Current user: `GET /api/auth/me` (Bearer user token)
- Example test user (create via register, or use any):
  - Email: `customer@example.com`
  - Password: `secret123`

## Admin-Initiated Password Reset (Admin → Users tab → "Reset Password")
- Endpoint: `POST /api/admin/users/{user_id}/reset-password` (admin Bearer)
  - Body `{ "new_password": "..." }` to set a specific password (min 6 chars), OR
  - Body `{ "reason": "..." }` (no password) to auto-generate a 12-char temp password, returned in response as `temporary_password` for the admin to share with the user.
  - Body `{ "force_change": true }` requires the user to set a new password on next login (sets `must_change_password=true`).
- Every reset is logged to `admin_audit_log`; view via `GET /api/admin/audit-log` (admin Bearer) or in Admin → Settings → Admin Audit Log.

## Force Password Change & Self-Service Change
- `POST /api/auth/change-password` (user Bearer) { current_password, new_password } → updates hash, clears `must_change_password`.
- On login, `user.must_change_password` drives a mandatory "Set a New Password" gate in the AccountButton dialog before the user can access account tabs.

## Notes
- JWT secret in backend/.env (JWT_SECRET). Tokens valid 7 days.
- Passwords hashed with bcrypt. Admin stored in `admins` collection, customers in `users` collection.
- User token role=user cannot access /api/admin/* (returns 403).
