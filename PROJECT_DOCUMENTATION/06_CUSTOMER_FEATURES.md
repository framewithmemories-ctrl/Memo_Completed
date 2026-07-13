# 06 — Customer Features

Storefront route: `/` (single‑page). Auth via header account dialog (`AccountButton`).

---

## Existing features ✅

### Browsing & catalog
- Hero section with rotating imagery and CTAs.
- **Shop / Product grid** with category filter (All, Frames, Mugs, T‑Shirts, Acrylic, Corporate) and product cards.
- Header **product search** (`SearchComponent`).
- About Us section + dedicated `/about` page.

### AI features (Gemini, customer's own key)
- **AI Gift Finder** — short quiz → **structured recommendation cards** grounded in the real catalog, each with a matching product image, confidence score, price range, customization idea, and add‑to‑cart / customize actions. (Backend upgraded to structured JSON; frontend card polish for price_range/customization is pending — see TODO.)
- **AI Chat assistant ("Memo")** — backend live (`/api/chat`, multi‑turn, catalog‑grounded). Frontend chat widget is **in progress** (not yet wired — see TODO).
- **AI Review Highlights** — "what customers love" bullets on the storefront (cached).

### Personalization & photos
- **Photo customizer** (frame style/size/border/orientation) with live preview.
- **Saved photos** (upload/list/favorite/use/delete) persisted server‑side per user.

### Accounts & wallet
- Register / login (JWT); profile view.
- **Forced password change** gate when an admin resets the password.
- **Digital wallet** — balance, add money (mock top‑up), convert points → credits, transaction history.
- Rewards points (3% of order value earned on orders).

### Checkout & orders
- Cart (CartContext) + **checkout** with delivery/pickup.
- **Post‑checkout invoice** (itemized, subtotal/delivery/tax/total) with **Print** and **WhatsApp share**.
- Order history in the account dialog.

### Reviews & trust
- Submit reviews (moderated); view approved + **pinned/featured** reviews.
- **Google reviews** section (live when configured; mock fallback otherwise).
- Floating **WhatsApp** contact button; click‑to‑call.

---

## Missing / partial features ⚠️ (see 08_TODO.md)

- **Shop mega‑menu dropdown** — requested (per screenshot); `ShopMegaMenu.js` created but **not wired** into the header; category deep‑linking/filter not yet connected.
- **AI Chat widget UI** — backend ready; floating chat panel not yet added to the storefront.
- **Gift Finder card polish** — show `price_range` + `customization`; remove legacy single‑card/`alert()` fallback path.
- **Real payment gateway** — checkout/wallet top‑up are mock (Stripe is in requirements but not wired to the customer flow).
- **Self‑service password reset (email)** — only admin‑initiated reset exists; no "forgot password" email flow.
- **Email/SMS notifications** — no order confirmation emails/SMS.
- **Order tracking** beyond status text; no shipment tracking.
- **Product detail pages** — products are cards only; no dedicated PDP with reviews/variants.
- **Granular catalog categories** — mega‑menu sub‑items currently map to the 4–6 existing filters; deeper categories need catalog expansion.
- **Wishlist / favorites for products** (photo favorites exist, product wishlist does not).
- **Guest→account order linking** (guest orders use `user_id:"guest"`).
