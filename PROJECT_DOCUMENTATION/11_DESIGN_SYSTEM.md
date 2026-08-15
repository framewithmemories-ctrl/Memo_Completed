# 11 — Memories Visual Design System

## Purpose

Catalogue and backend work must not accidentally change the storefront's visual identity. Product data, filtering, imports and admin tooling are separate from the customer-facing design system.

## Current visual foundation

The frontend uses Tailwind CSS with CSS-variable design tokens in `frontend/src/index.css`. The current token system provides background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring and chart colors, plus shared radius tokens.

## Preservation rule

Until an explicit visual redesign task is approved:

- Do not replace the existing storefront palette globally.
- Do not introduce arbitrary per-product colors into the storefront UI.
- Do not change typography, spacing, button shape, card treatment, header/navigation styling or responsive breakpoints merely to support catalogue growth.
- Product images should remain the visual focus of catalogue cards.
- New catalogue/filter/admin components must consume the existing Tailwind/CSS-variable tokens instead of hard-coded colors.
- AI badges, availability labels and status indicators should use semantic existing tokens rather than creating a new palette.
- Admin UI may be denser than the storefront, but should still use the same token system.
- The Memories brand/logo and existing visual identity remain the source of truth; a FrameIt-like feature must use Memories branding rather than copying another company's branding.

## Current palette note

The base CSS variables currently use a neutral black/white shadcn-style palette. This is an implementation detail of the current codebase, not a declaration that Memories must permanently use a monochrome brand palette. A future brand-polish pass can define a deliberate Memories palette in one place without rewriting individual components.

## Catalogue visual rules

Every product should support:

1. One clear primary image.
2. Optional gallery images.
3. Consistent aspect-ratio handling in cards.
4. No broken-image layout when an optional gallery image is missing.
5. Product status should affect visibility, not create distracting visual noise.
6. Marketing flags such as bestseller/new arrival/featured should be semantic badges, not custom colors per product.

## QA gate

Before merging catalogue/admin UI work:

- Verify desktop and mobile layouts.
- Verify light/dark behavior where supported by the existing theme system.
- Verify keyboard focus and readable contrast.
- Verify long product names and descriptions do not break cards.
- Verify missing/slow images have a graceful state.
- Verify no global CSS regression was introduced.
