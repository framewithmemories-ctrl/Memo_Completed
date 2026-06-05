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

## Notes
- JWT secret in backend/.env (JWT_SECRET). Tokens valid 7 days.
- Passwords hashed with bcrypt. Admin stored in `admins` collection, customers in `users` collection.
- User token role=user cannot access /api/admin/* (returns 403).
