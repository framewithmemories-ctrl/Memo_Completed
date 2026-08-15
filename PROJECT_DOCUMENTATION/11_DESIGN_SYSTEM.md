# 11 — Memories Visual Design System

## Purpose

The storefront should feel like a joyful, trustworthy personalized-gifting brand: colourful because the products and memories are colourful, but calm enough that the products remain the visual focus.

## Brand assessment

The supplied Memories logo is a strong brand asset. It combines a camera, photo-frame/creative gesture and gift icon, while the MEMORIES wordmark uses a bold red/coral + blue identity. The multicolour camera lens adds the playful/photo-gifting character. It is distinctive and clearly appropriate for a photo-frame and personalized-gift ecommerce business.

Design rating of the current logo: **8.5/10**.

Strengths:
- Immediately communicates photography + gifts.
- Red/coral and blue provide strong recognition.
- Multicolour lens gives the brand a joyful, creative cue.
- Wordmark and slogan make the business purpose clear.

Opportunities for later brand-polish work:
- The logo has several visual elements, so surrounding UI should stay clean rather than competing with it.
- Small-size usage should use an approved simplified mark if legibility becomes an issue.
- Keep the tagline readable and do not force it into very small header placements.

## Recommended Memories web palette

Memories is **not a jewellery/luxury-gold brand**. Gold/champagne should therefore be an occasional premium accent, never the dominant visual language.

Use the logo's red/coral and blue as the primary brand anchors, with warm white/ivory and charcoal as the neutral foundation.

Approximate logo-derived reference colours (to be refined from the master brand artwork if an official palette is supplied):
- Memories Coral/Red: `#EF4038`
- Memories Blue: `#1050B8`
- Warm White: `#FFFCF8`
- Charcoal: `#242424`
- Soft Blush: `#FFF1F3` (supporting background only)
- Soft Blue Tint: `#EEF5FF` (supporting background only)
- Premium Champagne: `#D6B46A` (small, semantic premium accent only)

The coral and blue should carry the brand. Warm white/ivory provides breathing room. Product photography should provide most of the remaining colour.

## Visual target

**Premium + joyful + warm + trustworthy.**

Avoid both extremes:
- Not a jewellery-style gold/black luxury store.
- Not a rainbow/gradient-heavy novelty site.

The desired impression is a polished personalized-gift store where colourful products and customer memories are the stars.

## Current frontend assessment

The existing homepage is approximately **7/10 visually**. It has strong energy and clearly communicates colourful gifting, but it currently uses many simultaneous gradients, animations and accent colours. The later visual-polish phase should simplify this hierarchy rather than adding more colour.

## Design rules

- Product images remain the primary source of visual colour.
- Use coral/red and blue for brand CTAs, links, active states and key accents.
- Use blush/blue tints for occasional section backgrounds, not every section.
- Use green only for semantic success/WhatsApp states.
- Use champagne/gold only for genuinely premium semantics.
- Avoid rainbow gradients as a default UI treatment.
- Avoid arbitrary per-product UI colours.
- Keep cards clean and product-focused.
- Use soft shadows and restrained borders.
- Keep animations subtle and purposeful.
- Do not change typography, spacing, card treatment, header/navigation or responsive behaviour merely to support catalogue growth.
- New catalogue/filter/admin components must consume centralized CSS/Tailwind tokens rather than hard-coded colours.
- The Memories logo and this palette are the visual source of truth.

## Catalogue visual rules

Every product should support:
1. One clear primary image.
2. Optional gallery images.
3. Consistent aspect-ratio handling in cards.
4. A graceful missing/slow-image state.
5. Status affecting visibility rather than adding visual noise.
6. Semantic badges such as Bestseller, New, Sale and Premium using the brand token system.

## QA gate

Before merging storefront/admin UI work:
- Verify desktop and mobile layouts.
- Verify readable contrast and keyboard focus.
- Verify long product names/descriptions do not break cards.
- Verify missing/slow images have a graceful state.
- Verify no global CSS regression.
- Compare major storefront screens against the visual target above.
