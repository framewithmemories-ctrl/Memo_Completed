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
