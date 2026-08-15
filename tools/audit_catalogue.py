#!/usr/bin/env python3
"""Audit the existing Memories MongoDB product catalogue without modifying data.

Usage:
  MONGO_URL='...' DB_NAME='...' python tools/audit_catalogue.py

Optional:
  --json-out catalogue/audit-report.json
  --csv-out catalogue/audit-products.csv

The tool is read-only. It never inserts, updates, or deletes products.
"""

import argparse
import csv
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime

try:
    from pymongo import MongoClient
except ImportError:
    raise SystemExit("Missing dependency: pymongo. Install with: pip install pymongo")


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")


def has_value(value):
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-out")
    parser.add_argument("--csv-out")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise SystemExit("MONGO_URL and DB_NAME environment variables are required")

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    products = list(db.products.find({}))

    name_counts = Counter(str(p.get("name", "")).strip().lower() for p in products if p.get("name"))
    sku_counts = Counter(str(p.get("sku", "")).strip().lower() for p in products if p.get("sku"))
    slug_counts = Counter(str(p.get("slug", "")).strip().lower() for p in products if p.get("slug"))

    rows = []
    category_counts = Counter()
    status_counts = Counter()
    issue_counts = Counter()

    for p in products:
        name = str(p.get("name", "")).strip()
        sku = str(p.get("sku", "")).strip()
        category = str(p.get("category", "")).strip().lower()
        status = p.get("status") or {}
        published = status.get("published") if isinstance(status, dict) else None
        active = status.get("active") if isinstance(status, dict) else None
        image = (p.get("media") or {}).get("primary_image") if isinstance(p.get("media"), dict) else None
        image = image or p.get("image_url")
        customization = p.get("customization") or {}
        issues = []

        if not name: issues.append("missing_name")
        if not sku: issues.append("missing_sku")
        if not has_value(p.get("base_price")): issues.append("missing_price")
        if not image: issues.append("missing_image")
        if not category: issues.append("missing_category")
        if not has_value(p.get("short_description")): issues.append("missing_short_description")
        if not has_value(p.get("slug")): issues.append("missing_slug")
        if not has_value(p.get("seo")): issues.append("missing_seo")
        if not isinstance(customization, dict) or not customization.get("enabled"): issues.append("no_customization_config")
        if name and name_counts[name.lower()] > 1: issues.append("duplicate_name")
        if sku and sku_counts[sku.lower()] > 1: issues.append("duplicate_sku")
        if p.get("slug") and slug_counts[str(p.get("slug")).lower()] > 1: issues.append("duplicate_slug")

        category_counts[category or "(missing)"] += 1
        status_label = "published" if published is True else "draft" if published is False else "legacy/unspecified"
        if active is False: status_label += "+inactive"
        status_counts[status_label] += 1
        for issue in issues: issue_counts[issue] += 1

        if not issues:
            quality = "ready"
        elif any(x in issues for x in ("missing_name", "missing_price", "missing_image")):
            quality = "invalid"
        elif any(x.startswith("duplicate_") for x in issues):
            quality = "duplicate_review"
        else:
            quality = "needs_cleanup"

        rows.append({
            "id": p.get("id", ""),
            "name": name,
            "sku": sku,
            "slug": p.get("slug", ""),
            "category": category,
            "base_price": p.get("base_price", ""),
            "image_url": image or "",
            "published": published,
            "active": active,
            "customization_enabled": customization.get("enabled") if isinstance(customization, dict) else False,
            "quality": quality,
            "issues": ";".join(issues),
            "source_hint": "legacy_or_imported" if not p.get("sku") else "sku_product",
        })

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "read_only": True,
        "total_products": len(products),
        "quality": Counter(r["quality"] for r in rows),
        "issues": issue_counts,
        "categories": category_counts,
        "statuses": status_counts,
        "duplicate_names": {k: v for k, v in name_counts.items() if k and v > 1},
        "duplicate_skus": {k: v for k, v in sku_counts.items() if k and v > 1},
        "duplicate_slugs": {k: v for k, v in slug_counts.items() if k and v > 1},
    }

    report = json.loads(json.dumps(report, default=dict))
    print(json.dumps(report, indent=2, ensure_ascii=False))

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"summary": report, "products": rows}, f, indent=2, ensure_ascii=False)

    if args.csv_out:
        with open(args.csv_out, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["id"])
            writer.writeheader()
            writer.writerows(rows)

    client.close()


if __name__ == "__main__":
    main()
