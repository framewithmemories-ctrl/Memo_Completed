# 01 — Project Architecture

**Project:** Memories — Photo Frames & Custom Gift Shop
**Audit date:** June 2026
**Type:** Full‑stack e‑commerce + AI web application (single‑page storefront + admin panel)

---

## 1. High‑level architecture

```
┌────────────────────────┐        HTTPS / REST (/api/*)        ┌────────────────────────┐
│      React 19 SPA       │  ───────────────────────────────▶  │   FastAPI (Python 3.11) │
│  (CRA + CRACO, Tailwind)│  ◀───────────────────────────────  │      server.py          │
│  AuthContext/CartContext│            JSON + JWT               │   APIRouter prefix /api │
└────────────────────────┘                                     └───────────┬────────────┘
        │                                                                    │ Motor (async)
        │ REACT_APP_BACKEND_URL                                              ▼
        │                                                        ┌────────────────────────┐
        │                                                        │        MongoDB          │
        ▼                                                        │  (UUID string _ids)     │
  Browser (customers + /admin)                                   └────────────────────────┘
                                                       Google Gemini (google-genai SDK)
                                                       Google Places API (reviews, optional)
```

- **Frontend** talks to the backend **only** through `REACT_APP_BACKEND_URL` and every backend route is prefixed with `/api` (Kubernetes ingress routes `/api` → port 8001, everything else → port 3000).
- **Backend** is a single `server.py` FastAPI app that mounts one `APIRouter(prefix="/api")`.
- **Auth** is custom JWT (PyJWT, HS256, 7‑day expiry) sent as `Authorization: Bearer <token>`. Passwords are bcrypt‑hashed.
- **AI** is direct Google Gemini via the `google-genai` SDK (helper: `gemini_helper.py`) using the customer's own `GEMINI_API_KEY` (no Emergent proxy).

---

## 2. Frontend

| Aspect | Detail |
|---|---|
| Framework | React `^19.0.0` |
| Build tool | `react-scripts 5.0.1` wrapped by **CRACO** (`craco.config.js`) |
| Styling | Tailwind CSS + `tailwindcss-animate`; shadcn/ui components in `src/components/ui/` |
| Icons | `lucide-react` |
| Routing | `react-router-dom ^7` — routes: `/`, `/about`, `/admin` |
| State | React Context: `AuthContext` (auth/session), `CartContext` (cart) |
| HTTP | `axios` (global `Authorization` header set from AuthContext) |
| Toasts | `sonner` |
| SEO | `react-helmet-async` |
| Dev server | port 3000 (supervisor‑managed, hot reload) |

Entry: `src/index.js` → `src/App.js` (contains `Header`, `Home` composition, `SEOHead`, `WhatsAppFloat`, routing).

---

## 3. Backend

| Aspect | Detail |
|---|---|
| Framework | FastAPI `0.110.1` on Uvicorn `0.25.0` |
| Server bind | `0.0.0.0:8001` (supervisor‑managed, hot reload via watchfiles) |
| DB driver | `motor 3.3.1` (async) / `pymongo 4.5.0` |
| Models | Pydantic v2 |
| Auth | `PyJWT` (HS256) + `bcrypt` |
| AI | `google-genai 1.31.0` (helper `gemini_helper.py`) |
| Image | `Pillow` (upload handling) |
| CORS | `CORSMiddleware`, origins from `CORS_ORIGINS` env |
| Structure | Single file `server.py` (~1800 lines) + `gemini_helper.py` |

**Startup hook:** `startup_seed_admin()` seeds/updates the admin account (from `ADMIN_USERNAME`/`ADMIN_PASSWORD`) into the `admins` collection with a bcrypt hash.

**Auth dependencies:**
- `get_current_user` — validates a `role=user` JWT, loads the user doc.
- `require_admin` — validates a `role=admin` JWT.
- `verify_user_access` — ensures the caller owns `{user_id}` (wallet/photo routes).

---

## 4. Database

- **MongoDB**, database name from `DB_NAME` env.
- IDs are **application‑generated UUID strings** stored in a `id` field (NOT Mongo `ObjectId`); responses map cleanly to Pydantic models.
- **12 collections** in use (see `02_DATABASE_SCHEMA.md`): `users`, `admins`, `products`, `orders`, `reviews`, `user_photos`, `wallet_transactions`, `designs`, `chat_sessions`, `ai_cache`, `ai_usage_log`, `admin_audit_log`.
- ⚠️ **No indexes are created in code** (`create_index` is not called anywhere). Email uniqueness is enforced only by an app‑level lookup in `/auth/register`.

---

## 5. APIs (overview)

~50 endpoints under `/api`, grouped as:
- **Storefront/public:** products, gift‑suggestions (Gemini), chat (Gemini), reviews, google‑reviews, config, store‑info, orders, designs, upload‑image.
- **Auth:** register, login, me, change‑password.
- **User‑scoped:** photos CRUD, wallet (balance/add‑money/convert‑points/pay/transactions).
- **Admin:** login, stats, reviews moderation, orders, users, wallet adjust, password reset, audit‑log, ai‑usage, product CRUD, AI description generation.

Full request/response detail in `03_API_DOCUMENTATION.md`.

---

## 6. Folder structure

```
/app
├── backend/
│   ├── server.py                # All FastAPI routes, models, auth, startup seed
│   ├── gemini_helper.py         # google-genai wrapper (thinking disabled for 2.5, model fallback)
│   ├── requirements.txt         # Python deps (pip freeze)
│   ├── Dockerfile               # Standalone backend image
│   ├── .dockerignore
│   ├── .env                     # Secrets/config (not committed)
│   ├── .env.example
│   └── tests/                   # pytest folder
├── frontend/
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js               # Header, Home page composition, routing
│   │   ├── context/
│   │   │   ├── AuthContext.js    # session, login/register/changePassword/logout
│   │   │   └── CartContext.js    # cart state
│   │   ├── hooks/use-toast.js
│   │   └── components/
│   │       ├── ui/               # shadcn/ui primitives
│   │       ├── MainComponents.js # HeroSection, AboutUsSection, ProductGrid (Shop)
│   │       ├── EnhancedAIGiftFinder.js
│   │       ├── AdminPanel.js
│   │       ├── AccountButton.js  # login/profile/photos/wallet/orders dialog
│   │       ├── DigitalWallet.js
│   │       ├── ProfilePhotoStorage.js
│   │       ├── EnhancedCheckoutPage.js
│   │       ├── ReviewSystemEnhanced.js
│   │       ├── AboutUsPage.js
│   │       ├── SearchComponent.js
│   │       ├── ShopMegaMenu.js   # NEW (created, not yet wired — see TODO)
│   │       └── <legacy/unused>   # Fixed*, CheckoutPage, UserProfile*, ReviewSystem, etc.
│   ├── package.json
│   ├── craco.config.js
│   ├── tailwind.config.js
│   └── .env                      # REACT_APP_BACKEND_URL
├── docker-compose.yml            # mongo + backend (no frontend service)
├── DEPLOYMENT.md
├── memory/                       # PRD.md, CHANGELOG.md, test_credentials.md
├── test_reports/                 # testing-agent iteration reports
└── PROJECT_DOCUMENTATION/        # this audit
```

> Note: several `Fixed*`, `Enhanced*`/`*Simple` duplicate components exist and appear to be **legacy/dead code** (see `09_BUGS.md` and `08_TODO.md`).
