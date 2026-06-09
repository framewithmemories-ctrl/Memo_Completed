# Memories — Backend Deployment Guide

FastAPI + MongoDB backend for the Memories Photo Frames & Gift Shop.

## 1. Folder structure
```
backend/
├── server.py            # FastAPI app (all routes, models, auth). App object: `app`
├── requirements.txt     # Python dependencies (pip freeze)
├── .env                 # Your real secrets (NOT committed) — copy from .env.example
├── .env.example         # Template of all required/optional env vars
├── Dockerfile           # Container build (Python 3.11-slim, uvicorn on :8001)
├── .dockerignore
└── tests/               # pytest suite (optional)
docker-compose.yml       # backend + MongoDB (one command to run everything)
```

## 2. Environment variables (.env)
| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URL` | yes | Mongo connection string (e.g. `mongodb://mongo:27017` in compose, or an Atlas URI) |
| `DB_NAME` | yes | Database name (e.g. `memories`) |
| `CORS_ORIGINS` | yes | `*` or your frontend domain |
| `JWT_SECRET` | yes | 64-char random hex. Generate: `openssl rand -hex 32` |
| `ADMIN_USERNAME` | yes | Admin login username (default `admin`) |
| `ADMIN_PASSWORD` | yes | Admin login password (seeded on startup) |
| `EMERGENT_LLM_KEY` | optional | For AI Gift Finder (Emergent proxy). Blank = AI finder disabled |
| `GOOGLE_PLACES_API_KEY` | optional | Live Google reviews. Blank = mock fallback |
| `GOOGLE_PLACE_ID` | optional | Your business Place ID |
| `GOOGLE_REVIEWS_URL` | optional | "Read all on Google" link |
| `SHOP_WHATSAPP_NUMBER` | optional | WhatsApp number for order notifications (digits + country code) |

> The admin account is auto-seeded into the `admins` collection on startup from
> `ADMIN_USERNAME` / `ADMIN_PASSWORD` (bcrypt-hashed). Change the password before going live.

## 3. Run with Docker (recommended)
```bash
cp backend/.env.example backend/.env      # then edit secrets in backend/.env
docker compose up --build -d
# Backend: http://localhost:8001    Mongo: localhost:27017
docker compose logs -f backend            # watch logs
```

## 4. Run without Docker
```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt
cp .env.example .env                      # edit secrets
# Make sure MongoDB is running and MONGO_URL points to it
uvicorn server:app --host 0.0.0.0 --port 8001
```

## 5. API base URL
- All endpoints are prefixed with **`/api`**.
- Self-hosted base URL: `http://<your-host>:8001/api`
- Behind a reverse proxy/domain: `https://api.yourdomain.com/api`
- The React frontend expects `REACT_APP_BACKEND_URL` set to the host **without** `/api`
  (the frontend appends `/api` itself). Example: `REACT_APP_BACKEND_URL=https://api.yourdomain.com`
- Interactive docs once running: `http://<your-host>:8001/docs`

## 6. Key endpoints
```
Auth:      POST /api/auth/register | POST /api/auth/login | GET /api/auth/me
Admin:     POST /api/admin/login   (returns JWT, role=admin)
           GET  /api/admin/stats | /api/admin/orders | /api/admin/users | /api/admin/reviews
           PUT  /api/admin/orders/{id}/status | /api/admin/reviews/{id}/approve | .../pin
           POST /api/admin/products | PUT/DELETE /api/admin/products/{id}
           POST /api/admin/users/{id}/wallet/adjust   (credit/debit + mandatory reason)
Store:     GET  /api/products | GET /api/reviews | POST /api/reviews
           GET  /api/google-reviews | GET /api/config
Orders:    POST /api/orders | GET /api/orders/{user_id}
Wallet:    GET  /api/users/{id}/wallet | POST .../add-money | .../convert-points | .../pay
           GET  /api/users/{id}/wallet/transactions
Photos:    GET/POST /api/users/{id}/photos | DELETE .../{photoId} | PUT .../favorite | .../use
AI:        POST /api/gift-suggestions   (requires EMERGENT_LLM_KEY)
```
All `/api/admin/*` (except `/admin/login`) require `Authorization: Bearer <admin JWT>`.
Wallet/photo routes require the owner's `Authorization: Bearer <user JWT>`.

## 7. Database schema (MongoDB collections)
IDs are UUID strings (field `id`), not Mongo `_id`. Datetimes are UTC.

**users**
```
id, name, email (unique), phone, password_hash (bcrypt), role ("user"),
wallet_balance (float), store_credits (float), total_spent (float),
reward_points (int), tier (str), created_at
```
**admins**
```
id, username (unique), email, password_hash (bcrypt), role ("super_admin"), created_at
```
**products**
```
id, name, description, category, base_price (float),
sizes[], materials[], colors[], image_url, created_at
```
**orders**
```
id, user_id, items: [{ product_id, name, price, quantity, image, category }],
total_amount (float), delivery_type ("delivery"|"pickup"),
delivery_address: { name, phone, email, address, instructions },
status ("pending"|"processing"|"completed"|"cancelled"|"refunded"),
points_earned (int), created_at
```
**reviews**
```
id, user_id, customer_name, rating (1-5), comment, product_id,
approved (bool), pinned (bool), verified (bool), created_at
```
**wallet_transactions**
```
id, user_id, type ("credit"|"debit"|"conversion"), amount (float),
description, category ("topup"|"purchase"|"rewards"|"admin_adjustment"|...),
balance_after (float), is_points (bool), credit_earned (float), created_at
```
**saved_photos**
```
id, user_id, name, image_data (base64), image_url, dimensions { width, height },
size (MB float), tags[], notes, favorite (bool), usage_count (int), created_at
```

No migrations are required — collections are created on first write and the admin is seeded on startup.

## 8. Important notes
- **`emergentintegrations`** (AI Gift Finder) is not on public PyPI; it installs from the extra index
  in the Dockerfile and only works with an `EMERGENT_LLM_KEY` via Emergent's proxy. For fully
  independent AI, replace that call in `server.py` with your own OpenAI/Anthropic/Gemini SDK + key.
- Set a strong `JWT_SECRET` and `ADMIN_PASSWORD` before production.
- For a managed DB (MongoDB Atlas), set `MONGO_URL` to the Atlas SRV URI and remove the `mongo`
  service from docker-compose.
