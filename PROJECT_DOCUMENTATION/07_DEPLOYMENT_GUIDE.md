# 07 — Deployment Guide

The app is designed to run **independently** of the Emergent preview environment (standalone Docker + external MongoDB). Target: Hostinger VPS + domain `memoriesngifts.com`, with MongoDB Atlas.

---

## 1. Environment variables

### Backend (`backend/.env`)
| Key | Purpose | Required |
|---|---|---|
| `MONGO_URL` | MongoDB connection string | ✅ |
| `DB_NAME` | Database name | ✅ |
| `JWT_SECRET` | JWT signing secret (use a long random value) | ✅ |
| `ADMIN_USERNAME` | Seeded admin username | ✅ |
| `ADMIN_PASSWORD` | Seeded admin password | ✅ |
| `CORS_ORIGINS` | Comma‑separated allowed origins (set your real domain in prod) | ✅ |
| `GEMINI_API_KEY` | Google Gemini key (AI features) | ✅ for AI |
| `GEMINI_MODEL` | Primary model (default `gemini-2.5-flash`) | optional |
| `GEMINI_FALLBACK_MODEL` | Fallback model (default `gemini-2.5-flash-lite`) | optional |
| `SHOP_WHATSAPP_NUMBER` | WhatsApp number for CTAs (default 918148040148) | optional |
| `GOOGLE_PLACES_API_KEY` | Live Google reviews | optional |
| `GOOGLE_PLACE_ID` | Business Place ID | optional |
| `GOOGLE_REVIEWS_URL` | Direct "read reviews" link | optional |
| `EMERGENT_LLM_KEY` | Legacy (unused after Gemini migration) | remove for prod |

### Frontend (`frontend/.env`)
| Key | Purpose |
|---|---|
| `REACT_APP_BACKEND_URL` | Public backend URL (e.g. `https://api.memoriesngifts.com`) |
| `WDS_SOCKET_PORT` | Dev‑server websocket port (dev only) |

> ⚠️ Never commit real secrets. Do not add default values in code for `MONGO_URL`/`DB_NAME`.

---

## 2. Docker

**Files:** `backend/Dockerfile`, `docker-compose.yml` (+ `backend/.dockerignore`).

`docker-compose.yml` currently defines **mongo + backend** (no frontend service). Backend overrides `MONGO_URL=mongodb://mongo:27017`, `DB_NAME=memories`.

```bash
# From /app
docker compose up -d --build        # starts mongo + backend on :8001
docker compose logs -f backend
```

Backend image (`backend/Dockerfile`): Python 3.11‑slim, installs Pillow/bcrypt build deps, `pip install -r requirements.txt` (uses an extra index for `emergentintegrations` — can be dropped post‑Gemini migration), runs `uvicorn server:app --host 0.0.0.0 --port 8001`.

> The **frontend is not yet dockerized**. Build it separately: `cd frontend && yarn install && yarn build` → serve the `build/` folder via Nginx/static host. (See TODO to add a frontend Dockerfile + Nginx.)

---

## 3. Hostinger VPS deployment (outline)

1. **Provision** a VPS (Ubuntu 22.04+), install Docker + Docker Compose, Nginx, Certbot.
2. **DNS:** point `memoriesngifts.com` (frontend) and `api.memoriesngifts.com` (backend) A‑records to the VPS IP.
3. **Backend:**
   - Copy repo, create `backend/.env` with production values (Atlas `MONGO_URL`, strong `JWT_SECRET`, `CORS_ORIGINS=https://memoriesngifts.com`).
   - `docker compose up -d --build` (or run backend container behind Nginx reverse proxy on `api.` subdomain).
4. **Frontend:**
   - Set `frontend/.env` → `REACT_APP_BACKEND_URL=https://api.memoriesngifts.com`.
   - `yarn build`; serve `build/` via Nginx (`root .../build; try_files $uri /index.html;`).
5. **Nginx reverse proxy** for backend: proxy `https://api.memoriesngifts.com` → `http://127.0.0.1:8001`. Ensure `/api` prefix is preserved.
6. **TLS:** `certbot --nginx` for both domains.
7. **Verify:** `curl https://api.memoriesngifts.com/api/` and load the site; log in to `/admin`.

---

## 4. MongoDB Atlas setup

1. Create a free/shared cluster; create a DB user + password.
2. Network access: allow the VPS IP (avoid `0.0.0.0/0` in production).
3. Get the SRV connection string → set `MONGO_URL` (e.g. `mongodb+srv://user:pass@cluster/…?retryWrites=true&w=majority`), set `DB_NAME`.
4. **Create indexes** (not created by the app) — see `10_PRODUCTION_CHECKLIST.md`.
5. On first backend start, the admin account is auto‑seeded from `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

---

## 5. Post‑deploy smoke test
```bash
curl https://api.memoriesngifts.com/api/                      # health
curl https://api.memoriesngifts.com/api/products              # catalog
curl -X POST https://api.memoriesngifts.com/api/admin/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"<admin>","password":"<pwd>"}'           # admin JWT
```
Then open the site, run the Gift Finder, and confirm AI Usage shows a live call in `/admin`.
