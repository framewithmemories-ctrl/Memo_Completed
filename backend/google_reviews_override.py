"""Production Google Reviews endpoint.

Uses the Google Places API (New) at request time so the storefront shows
current first-party Google review content. The API key stays server-side.
"""

import os
import time

import httpx

from server import app

GOOGLE_PLACE_ID = os.environ.get("GOOGLE_PLACE_ID", "").strip() or "ChIJ9dQb1b33qDsRTLJ9I1nkuqo"
GOOGLE_REVIEWS_CACHE_TTL = 600  # 10 minutes; keeps repeated page loads fast while warm.
_reviews_cache = {}

# Remove the legacy /api/google-reviews handler before registering the real one.
app.router.routes = [route for route in app.router.routes if route.path != "/api/google-reviews"]


def _google_reviews_url(place_id: str) -> str:
    configured = os.environ.get("GOOGLE_REVIEWS_URL", "").strip()
    return configured or f"https://search.google.com/local/reviews?placeid={place_id}"


def _api_key() -> str:
    # Accept the common names so a correctly configured Render secret is not
    # ignored simply because it was named GOOGLE_API_KEY or GOOGLE_MAPS_API_KEY.
    for name in ("GOOGLE_PLACES_API_KEY", "GOOGLE_API_KEY", "GOOGLE_MAPS_API_KEY"):
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


@app.get("/api/google-reviews")
async def google_reviews():
    """Return current genuine Google reviews from the configured Place ID."""
    api_key = _api_key()
    place_id = os.environ.get("GOOGLE_PLACE_ID", "").strip() or GOOGLE_PLACE_ID
    google_url = _google_reviews_url(place_id)

    if not api_key:
        return {
            "configured": False,
            "rating": 0,
            "total": 0,
            "google_url": google_url,
            "reviews": [],
            "error": "missing_google_places_api_key",
            "configuration_hint": "Set GOOGLE_PLACES_API_KEY on the backend service.",
        }

    cache_key = place_id
    cached = _reviews_cache.get(cache_key)
    if cached and time.monotonic() - cached["timestamp"] < GOOGLE_REVIEWS_CACHE_TTL:
        return {**cached["data"], "cached": True}

    try:
        endpoint = f"https://places.googleapis.com/v1/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(endpoint, headers=headers)

        if response.status_code != 200:
            detail = ""
            try:
                detail = response.json().get("error", {}).get("message", "")
            except Exception:
                pass
            return {
                "configured": False,
                "rating": 0,
                "total": 0,
                "google_url": google_url,
                "reviews": [],
                "error": f"google_http_{response.status_code}",
                "detail": detail,
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
                "author_uri": author.get("uri", ""),
                "rating": review.get("rating", 0),
                "text": text,
                "relative_time": review.get("relativePublishTimeDescription", ""),
                "profile_photo_url": author.get("photoUri", ""),
                "google_review_url": review.get("googleMapsUri", google_url),
                "flag_content_uri": review.get("flagContentUri", ""),
            })

        data = {
            "configured": True,
            "rating": result.get("rating", 0),
            "total": result.get("userRatingCount", 0),
            "google_url": result.get("googleMapsUri", google_url),
            "reviews": reviews,
            "cached": False,
            "review_order": "Google relevance order",
        }
        _reviews_cache[cache_key] = {"timestamp": time.monotonic(), "data": data}
        return data
    except Exception:
        return {
            "configured": False,
            "rating": 0,
            "total": 0,
            "google_url": google_url,
            "reviews": [],
            "error": "google_reviews_unavailable",
        }
