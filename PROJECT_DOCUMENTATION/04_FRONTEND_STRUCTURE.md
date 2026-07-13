# 04 — Frontend Structure

Framework: React 19 + CRACO + Tailwind + shadcn/ui. HTTP via axios using `REACT_APP_BACKEND_URL`.

---

## Routing (`src/App.js`, `react-router-dom v7`)
| Path | Element | Notes |
|---|---|---|
| `/` | `Home` | Storefront SPA (all sections) |
| `/about` | `AboutUsPage` | Standalone about page |
| `/admin` | `AdminPanel` | Admin login + dashboard |

Anchor sections on `/`: `#home`, `#shop`, `#customizer`, `#ai-finder`, `#reviews`.

---

## Contexts (`src/context/`)
- **AuthContext.js** — session state (`user`, `token`, `loading`), restores session via `/auth/me`, mirrors legacy `localStorage` profile keys. Exposes `login`, `register`, `changePassword`, `logout`, `isAuthenticated`. Also exports `formatApiError` (safely renders FastAPI error detail arrays).
- **CartContext.js** — cart items, add/remove, totals (used by ProductGrid, checkout, AI finder).

## Hooks
- `src/hooks/use-toast.js` — toast helper (project also uses `sonner` directly).

---

## Active components (`src/components/`)
| Component | Role |
|---|---|
| `MainComponents.js` | `HeroSection`, `AboutUsSection`, **`ProductGrid`** (the Shop section, category filter, add‑to‑cart) |
| `EnhancedAIGiftFinder.js` | AI Gift Finder quiz → recommendation cards (add‑to‑cart / customize) |
| `AdminPanel.js` | Admin login + Dashboard/Orders/Reviews/Products/Users/Settings tabs; AI Usage card; audit log; password reset dialog |
| `AccountButton.js` | Header account dialog: Login/Sign‑up; Profile/Photos/Wallet/Orders; **forced password‑change gate** |
| `DigitalWallet.js` | Wallet UI (balance, add money, convert points, transactions) |
| `ProfilePhotoStorage.js` | Saved photos (upload/list/favorite/use/delete) |
| `EnhancedCheckoutPage.js` | Checkout + invoice + WhatsApp share |
| `ReviewSystemEnhanced.js` | Reviews list/submit + Google reviews + AI highlights |
| `AboutUsPage.js` | About page |
| `SearchComponent.js` | Header product search |
| `ShopMegaMenu.js` | **NEW** Shop mega‑menu (created; not yet wired into header — see TODO) |

## Legacy / likely‑unused components (dead code candidates)
`FixedComponents.js`, `FixedHeader.js`, `FixedHeaderNavigation.js`, `FixedAIGiftFinder.js`, `FixedCheckoutSystem.js`, `FixedReviewSystem.js`, `CheckoutPage.js`, `EnhancedCheckout.js`, `ReviewSystem.js`, `UserProfile.js`, `UserProfileSimple.js`, `EnhancedUserProfile.js`, `AdvancedPhotoCustomizer.js`, `DragDropPhotoUpload.js`.
→ These are superseded by the `Enhanced*`/active versions. Confirm imports before deletion (see `08_TODO.md`).

---

## Admin pages/tabs (`AdminPanel.js`)
- **Login** (username/password → `/admin/login`, JWT stored; `adminAuthConfig()` sends admin Bearer).
- **Dashboard:** stat cards, Recent Orders, Top Products, **AI Usage (Gemini)** card with 7‑day trend sparkline.
- **Orders:** list + status update.
- **Reviews:** approve / pin / delete.
- **Products:** create / edit / delete + AI description generation.
- **Users:** list, wallet adjust dialog, **reset‑password dialog** (specific/temp + force‑change checkbox).
- **Settings:** placeholders + **Admin Audit Log** table.

---

## Key data‑testids (for QA)
- Header/account: `account-button`, `login-form`, `login-email-input`, `login-password-input`, `login-submit-button`.
- Forced change: `force-change-password-form`, `fc-current-input`, `fc-next-input`, `fc-confirm-input`, `fc-submit-button`.
- Admin reset: `reset-password-{userId}`, `reset-password-input`, `reset-force-change-checkbox`, `reset-password-submit`, `reset-temp-password`.
- AI usage: `ai-usage-card`, `ai-calls-today`, `ai-cache-rate`, `ai-usage-trend`, `ai-trend-bar-{date}`.
- Audit log: `audit-log-card`, `audit-row-{id}`.
- Shop mega‑menu (new): `shop-menu-trigger`, `shop-mega-panel`, `shop-mega-item-*`.

---

## Notable frontend behaviors
- Session persisted in `localStorage` (`memoriesAuth`), background‑validated via `/auth/me`.
- Global axios `Authorization` header set from AuthContext; `AdminPanel` overrides with its own admin token config.
- Gift Finder: consumes structured `suggestions` array (real product images per card). A legacy string branch + `alert()` still exists as a fallback (see TODO/BUGS).
