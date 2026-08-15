# 12 — Admin Product V2 Editor

## Objective

Replace the current basic product form with a reusable Product V2 editor that can manage the full catalogue without code changes per product.

## Editor sections

1. Basic — name, SKU, category, subcategory, short/full description.
2. Pricing — selling price, compare-at price, variants and variant SKUs.
3. Customize — photo count and customer input fields generated from Product V2 customization flags.
4. Media — primary image, gallery and optional video.
5. Discover — tags, occasions, recipients, sizes, materials and colors.
6. Fulfilment — production time, pickup and delivery.
7. Marketing — featured, bestseller, new arrival and trending.
8. SEO — title and meta description.
9. Publication — active/published state.

## Visual direction

The editor uses the existing Memories component library and CSS tokens. It should feel like a clean, practical ecommerce admin rather than a second storefront. Customer-facing visual identity remains logo-led red/coral + blue with warm neutral surfaces and restrained blush accents.

## Preview workflow

A code change cannot by itself provide a live browser preview from GitHub. For each visual implementation we will use one of two preview gates:

- **Design gate:** review a UI mockup/wireframe before merging major visual changes.
- **Staging gate:** once a staging deployment is connected, review the real built page at desktop/tablet/mobile sizes before merging to the stable branch.

No visual redesign should be merged solely from code inspection when a staging preview is available.
