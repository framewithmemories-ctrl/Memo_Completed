"""Admin-only catalogue audit and media management endpoints.

Loaded by admin_boot after the main FastAPI app is created. This module is
read-mostly: the audit never mutates catalogue data; media updates are explicit.
"""
from collections import Counter
from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from server import app, db, require_admin


class ProductMediaUpdate(BaseModel):
    primary_image: Optional[str] = None
    gallery: list[str] = Field(default_factory=list)
    video_url: Optional[str] = None


@app.get("/api/admin/catalogue-audit")
async def catalogue_audit(admin=Depends(require_admin)):
    docs = await db.products.find({}).to_list(5000)
    issues = []
    image_counts = Counter()
    categories = Counter()
    statuses = Counter()
    customization_count = 0
    variant_count = 0

    for p in docs:
        pid = p.get("id", "")
        name = p.get("name", "Unnamed product")
        media = p.get("media") or {}
        primary = media.get("primary_image") or p.get("image_url") or ""
        gallery = media.get("gallery") or []
        if primary:
            image_counts[primary] += 1
        categories[p.get("category") or "Uncategorised"] += 1
        status = p.get("status") or {}
        statuses["active" if status.get("active", True) else "inactive"] += 1
        if (p.get("customization") or {}).get("enabled"):
            customization_count += 1
        if p.get("variants"):
            variant_count += len(p.get("variants") or [])

        item_issues = []
        if not p.get("name"):
            item_issues.append("missing_name")
        if not p.get("category"):
            item_issues.append("missing_category")
        if not p.get("base_price") or float(p.get("base_price", 0)) <= 0:
            item_issues.append("missing_price")
        if not p.get("sku"):
            item_issues.append("missing_sku")
        if not p.get("slug"):
            item_issues.append("missing_slug")
        if not primary:
            item_issues.append("missing_primary_image")
        if item_issues:
            issues.append({"id": pid, "name": name, "issues": item_issues})

    duplicate_images = [
        {"image_url": url, "count": count}
        for url, count in image_counts.items() if count > 1
    ]
    missing_image = sum(1 for p in docs if not ((p.get("media") or {}).get("primary_image") or p.get("image_url")))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_products": len(docs),
        "active_products": statuses.get("active", 0),
        "inactive_products": statuses.get("inactive", 0),
        "products_with_variants": sum(1 for p in docs if p.get("variants")),
        "total_variants": variant_count,
        "customizable_products": customization_count,
        "products_with_primary_image": len(docs) - missing_image,
        "missing_primary_image": missing_image,
        "duplicate_image_urls": len(duplicate_images),
        "duplicate_images": duplicate_images[:100],
        "categories": dict(categories),
        "issues_count": len(issues),
        "issues": issues[:500],
        "source_note": "This audit reads the current MongoDB products collection only. It does not count arbitrary image URLs or frontend assets.",
    }


@app.put("/api/admin/products/{product_id}/media")
async def update_product_media(product_id: str, payload: ProductMediaUpdate, admin=Depends(require_admin)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    media = {
        "primary_image": (payload.primary_image or "").strip() or None,
        "gallery": [u.strip() for u in payload.gallery if isinstance(u, str) and u.strip()],
        "video_url": (payload.video_url or "").strip() or None,
    }
    update = {"media": media}
    if media["primary_image"]:
        # Keep legacy image_url synchronized so old cards and integrations continue to work.
        update["image_url"] = media["primary_image"]
    await db.products.update_one({"id": product_id}, {"$set": update})
    return {"success": True, "product_id": product_id, "media": media}
