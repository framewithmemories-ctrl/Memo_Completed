# Memories Catalogue

This folder is the source-of-truth for the Memories product catalogue.

## Why this exists

Products must be data, not hard-coded React components. The storefront already reads products from the Product V2 API, so adding or changing hundreds of products should not require frontend code changes.

## Files

- `products.template.json` — complete Product V2 shape with one example product.
- `categories.json` — controlled category taxonomy for the Memories catalogue.
- `recipients.json` — recipient taxonomy used by search and Gift Finder.
- `occasions.json` — occasion taxonomy used by search and Gift Finder.
- `tags.json` — reusable merchandising/customization tags.

## Import workflow

1. Copy `products.template.json` to a working catalogue JSON file.
2. Add Memories-owned product names, descriptions, prices, SKUs, images and customization rules.
3. Validate the JSON locally.
4. Run `python tools/import_catalogue.py --file catalogue/products.json --base-url <BACKEND_URL> --admin-user <ADMIN_USER> --admin-password <ADMIN_PASSWORD>`.
5. The importer logs each SKU and result and can safely skip existing SKUs unless `--update` is supplied.

Do not copy another store's copyrighted product descriptions or images without permission. Reference sites may be used for product/category research; the actual Memories catalogue should use Memories pricing, descriptions, SKUs and licensed/owned imagery.

## Product rules

- `sku` must be stable and unique.
- `slug` should be omitted unless a specific URL is required; the backend will generate it from the product name.
- `image_url` remains required for backward compatibility. `media.primary_image` should normally contain the same URL.
- Use `variants` for purchasable price-changing choices.
- Use `customization` to describe customer inputs; do not hard-code product IDs in the frontend.
- Keep `base_price` as the lowest valid server-authoritative product price.
- `compare_at_price` is optional and should only be used when there is a genuine reference/MRP price.
- `status.published=false` keeps a product out of the public catalogue while it is being prepared.

## Recommended first catalogue

Build the first production catalogue in batches (for example 25–50 products per batch), verify images/prices/customization, then expand. The same import mechanism supports hundreds of products later.
