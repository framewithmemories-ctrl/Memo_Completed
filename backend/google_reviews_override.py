"""Production override for the public Google Reviews endpoint.

The legacy route in server.py is intentionally left untouched for backward
compatibility. production_app imports this module after server.py is loaded;
this module removes the old route and registers the genuine Google Places API
implementation with a 72-hour MongoDB cache.
"""

import os
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from server import app, db

GOOGLE_PLACE_ID = os.environ.get("GOOGLE_PLACE_ID", "").strip() or "ChIJ9dQb1b33qDsRTLJ9I1nkuqo"
CACHE_KEY = "google_reviews"
CACHE_TTL_SECONDS = 72 * 60 * 60

# Remove the legacy /api/google-reviews handler before registering the real one.
app.router.routes = [route for route in app.router.routes if route.path != "/api/google-reviews"]


def _google_reviews_url(place_id: str) -> str:
    configured = os.environ.get("GOOGLE_REVIEWS_URL", "").strip()
    return configured or f"https://search.google.com/local/reviews?placeid={place_id}"


@app.get("/api/google-reviews")
async def google_reviews():
    """Return genuine Google reviews, refreshed at most once every 72 hours."""
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    place_id = os.environ.get("GOOGLE_PLACE_ID", "").strip() or GOOGLE_PLACE_ID
    google_url = _google_reviews_url(place_id)

    if not api_key:
        return {
            "configured": False,
            "rating": 0,
            "total": 0,
            "google_url": google_url,
            "reviews": [],
        }

    now = datetime.now(timezone.utc)
    cache = await db.google_reviews_cache.find_one({"key": CACHE_KEY}, {"_id": 0})
    if cache:
        try:
            fetched_at = datetime.fromisoformat(str(cache.get("fetched_at", "")).replace("Z", "+00:00"))
            if fetched_at.tzinfo is None:
                fetched_at = fetched_at.replace(tzinfo=timezone.utc)
            if (now - fetched_at).total_seconds() < CACHE_TTL_SECONDS:
                return {
                    "configured": True,
                    "rating": cache.get("rating", 0),
                    "total": cache.get("total", 0),
                    "google_url": cache.get("google_url", google_url),
                    "reviews": cache.get("reviews", []),
                    "cached": True,
                    "fetched_at": fetched_at.isoformat(),
                }
        except Exception:
            pass

    try:
        endpoint = f"https://places.googleapis.com/v1/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(endpoint, headers=headers)

        if response.status_code != 200:
            await db.google_reviews_cache.delete_one({"key": CACHE_KEY})
            return {
                "configured": False,
                "rating": 0,
                "total": 0,
                "google_url": google_url,
                "reviews": [],
                "error": f"google_http_{response.status_code}",
            }

        result = response.json()
        reviews = []
        for review in result.get("reviews", []):
            text_obj = review.get("originalText") or review.get("text") or {}
            author = review.get("authorAttribution") or {}
            text = text_obj.get("text", "")
            if not text:
                continue
            reviews.append({
                "author_name": author.get("displayName", "Google customer"),
                "rating": review.get("rating", 0),
                "text": text,
                "relative_time": review.get("relativePublishTimeDescription", ""),
                "profile_photo_url": author.get("photoUri", ""),
                "google_review_url": review.get("googleMapsUri", google_url),
            })

        payload = {
            "key": CACHE_KEY,
            "rating": result.get("rating", 0),
            "total": result.get("userRatingCount", 0),
            "google_url": result.get("googleMapsUri", google_url),
            "reviews": reviews,
            "fetched_at": now.isoformat(),
        }
        await db.google_reviews_cache.replace_one({"key": CACHE_KEY}, payload, upsert=True)

        return {
            "configured": True,
            "rating": payload["rating"],
            "total": payload["total"],
            "google_url": payload["google_url"],
            "reviews": reviews,
            "cached": False,
            "fetched_at": now.isoformat(),
        }
    except Exception:
        # Do not silently fall back to fabricated content. Remove expired data
        # so the storefront can accurately say that Google is unavailable.
        await db.google_reviews_cache.delete_one({"key": CACHE_KEY})
        return {
            "configured": False,
            "rating": 0,
            "total": 0,
            "google_url": google_url,
            "reviews": [],
            "error": "google_reviews_unavailable",
        }
