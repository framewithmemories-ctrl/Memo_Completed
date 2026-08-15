#!/usr/bin/env python3
"""Import a Memories Product V2 JSON catalogue through the admin API.

Examples:
  python tools/import_catalogue.py --file catalogue/products.json --base-url https://api.example.com --admin-user admin --admin-password '***'
  python tools/import_catalogue.py --file catalogue/products.json --base-url https://api.example.com --admin-user admin --admin-password '***' --update

The script intentionally uses Python's standard library only. It validates the
catalogue before making writes and never prints the admin password or token.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

REQUIRED = ("name", "description", "category", "base_price", "image_url")


def request_json(url: str, method: str = "GET", payload: dict | None = None, token: str | None = None):
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {"detail": raw}
        return exc.code, data


def validate(products: list[dict]) -> list[str]:
    errors: list[str] = []
    skus: set[str] = set()
    names: set[str] = set()
    for i, p in enumerate(products, 1):
        label = f"product #{i}"
        if not isinstance(p, dict):
            errors.append(f"{label}: must be an object")
            continue
        for key in REQUIRED:
            if key not in p or p[key] in (None, ""):
                errors.append(f"{label}: missing {key}")
        if not isinstance(p.get("base_price"), (int, float)) or p.get("base_price", 0) <= 0:
            errors.append(f"{label}: base_price must be > 0")
        sku = str(p.get("sku", "")).strip()
        if sku:
            if sku in skus:
                errors.append(f"{label}: duplicate SKU {sku}")
            skus.add(sku)
        name = str(p.get("name", "")).strip().lower()
        if name:
            if name in names:
                errors.append(f"{label}: duplicate product name {p.get('name')}")
            names.add(name)
        variants = p.get("variants", []) or []
        if not isinstance(variants, list):
            errors.append(f"{label}: variants must be a list")
        else:
            variant_ids: set[str] = set()
            for v in variants:
                if not isinstance(v, dict) or not v.get("name"):
                    errors.append(f"{label}: every variant needs a name")
                    continue
                vid = v.get("id")
                if vid and vid in variant_ids:
                    errors.append(f"{label}: duplicate variant id {vid}")
                if vid:
                    variant_ids.add(vid)
                delta = v.get("price_delta", 0)
                if not isinstance(delta, (int, float)) or delta < 0:
                    errors.append(f"{label}: variant price_delta must be >= 0")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--admin-user", required=True)
    parser.add_argument("--admin-password", required=True)
    parser.add_argument("--update", action="store_true", help="Update an existing SKU instead of skipping it")
    args = parser.parse_args()

    path = Path(args.file)
    try:
        products = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Catalogue read error: {exc}", file=sys.stderr)
        return 2
    if not isinstance(products, list):
        print("Catalogue must be a JSON array.", file=sys.stderr)
        return 2

    errors = validate(products)
    if errors:
        print("Catalogue validation failed:")
        for error in errors:
            print(f"- {error}")
        return 2

    base = args.base_url.rstrip("/")
    status, login = request_json(
        f"{base}/api/admin/login",
        "POST",
        {"username": args.admin_user, "password": args.admin_password},
    )
    if status != 200 or not login.get("token"):
        print(f"Admin login failed (HTTP {status}).", file=sys.stderr)
        return 3
    token = login["token"]

    status, existing = request_json(f"{base}/api/products")
    if status != 200 or not isinstance(existing, list):
        print(f"Could not read existing products (HTTP {status}).", file=sys.stderr)
        return 3
    by_sku = {str(p.get("sku")): p for p in existing if p.get("sku")}

    created = updated = skipped = failed = 0
    for product in products:
        sku = str(product.get("sku", ""))
        current = by_sku.get(sku) if sku else None
        if current and not args.update:
            print(f"SKIP {sku}: already exists")
            skipped += 1
            continue

        if current and args.update:
            status, result = request_json(
                f"{base}/api/admin/products/{current['id']}",
                "PUT",
                product,
                token,
            )
            if status in (200, 204):
                print(f"UPDATE {sku}: ok")
                updated += 1
            else:
                print(f"FAIL {sku}: HTTP {status} {result}")
                failed += 1
        else:
            status, result = request_json(f"{base}/api/admin/products", "POST", product, token)
            if status in (200, 201):
                print(f"CREATE {sku}: ok")
                created += 1
            else:
                print(f"FAIL {sku}: HTTP {status} {result}")
                failed += 1

    print(f"Summary: created={created}, updated={updated}, skipped={skipped}, failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
