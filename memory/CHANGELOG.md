# Changelog — Memories Photo Frames & Gift Shop

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
- P1: Post-checkout invoice/bill screen (order number, itemized bill, totals, delivery) with Print + WhatsApp share.
- P1: Cart page layout fix (not fully visible; "cart disappears into void" before order render).
- UI: fix overly-dark black hover states; AI Analyzer details cut off; "Back to Home" on About Us page.
- Reviews: hybrid Google reviews (live Google Places API top ~5 + "Read all on Google" button + admin-curated/pinned fallback). NEEDS Google Cloud API key + Place ID from user.
- P2: password reset, real "Top Products" analytics.
