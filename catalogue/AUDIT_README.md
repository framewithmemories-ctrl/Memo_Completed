# Existing Catalogue Audit

The repository contains a read-only audit tool for the **existing MongoDB product catalogue**.

## Important

This audit does not import Modern Gifts products and does not change, delete, or migrate any existing product.

It exists because the storefront may already contain hundreds of products, and we need to understand that catalogue before replacing or importing anything.

## Run

From the repository root:

```bash
pip install pymongo
MONGO_URL='your-mongodb-connection-string' DB_NAME='your-database-name' python tools/audit_catalogue.py --json-out catalogue/audit-report.json --csv-out catalogue/audit-products.csv
```

The script reports:

- total product count
- missing names, SKUs, prices, images and categories
- missing V2 fields
- duplicate names, SKUs and slugs
- publication/active status
- customization configuration coverage
- product quality classification: `ready`, `needs_cleanup`, `duplicate_review`, `invalid`
- category distribution

**Never commit a real MongoDB connection string or generated report containing private customer data.** Product audit output should only be shared if it contains no secrets or sensitive customer information.

## Next decision

After the audit, classify the existing catalogue into:

1. Keep as-is
2. Convert to V2
3. Clean up manually
4. Archive/remove from storefront
5. Replace with a new Memories product

Only after this classification should we begin large-scale catalogue expansion.
