"""Backend startup hook for the Memories CMS API.

This intentionally avoids modifying the large legacy server.py file. Python loads
sitecustomize automatically when the backend directory is on sys.path; the hook
patches APIRouter.include_router so the CMS routes are attached immediately
before the existing /api router is included in the FastAPI app.
"""
from datetime import datetime, timezone
import os
import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
import jwt as pyjwt


CMS_DEFAULT_HOME = {"hero_title": "", "hero_subtitle": "", "hero_image_url": ""}
CMS_DEFAULT_ANNOUNCEMENT = {
    "announcement_text": "",
    "popup_description": "",
    "popup_image_url": "",
    "popup_enabled": True,
}

_ORIGINAL_INCLUDE = APIRouter.include_router
_REGISTERED = set()


def _server():
    import server
    return server


def _admin_guard(request: Request):
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    server = _server()
    try:
        payload = pyjwt.decode(token, server.JWT_SECRET, algorithms=[server.JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def _clean(data, allowed):
    return {k: data.get(k) for k in allowed if k in data}


async def _get_cms(_admin=Depends(_admin_guard)):
    db = _server().db
    offers = await db.cms_offers.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {
        "offers": offers,
        "homepage": {**CMS_DEFAULT_HOME, **(home or {})},
        "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})},
    }


async def _create_offer(payload: dict = Body(...), _admin=Depends(_admin_guard)):
    title = str(payload.get("title", "")).strip()
    if not title:
        raise HTTPException(status_code=400, detail="Offer title is required")
    now = datetime.now(timezone.utc).isoformat()
    offer = {
        "id": str(uuid.uuid4()),
        **_clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"}),
        "created_at": now,
        "updated_at": now,
    }
    await _server().db.cms_offers.insert_one(offer)
    offer.pop("_id", None)
    return {"success": True, "offer": offer}


async def _update_offer(offer_id: str, payload: dict = Body(...), _admin=Depends(_admin_guard)):
    update = _clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"})
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await _server().db.cms_offers.update_one({"id": offer_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


async def _delete_offer(offer_id: str, _admin=Depends(_admin_guard)):
    result = await _server().db.cms_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


async def _save_homepage(payload: dict = Body(...), _admin=Depends(_admin_guard)):
    data = _clean(payload, set(CMS_DEFAULT_HOME))
    data.update({"key": "homepage", "updated_at": datetime.now(timezone.utc).isoformat()})
    await _server().db.cms_content.update_one({"key": "homepage"}, {"$set": data}, upsert=True)
    return {"success": True, "homepage": data}


async def _save_announcement(payload: dict = Body(...), _admin=Depends(_admin_guard)):
    data = _clean(payload, set(CMS_DEFAULT_ANNOUNCEMENT))
    data.update({"key": "announcement", "updated_at": datetime.now(timezone.utc).isoformat()})
    await _server().db.cms_content.update_one({"key": "announcement"}, {"$set": data}, upsert=True)
    return {"success": True, "announcement": data}


async def _public_cms():
    db = _server().db
    now = datetime.now(timezone.utc)
    raw = await db.cms_offers.find({"active": True}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    offers = []
    for item in raw:
        try:
            start = datetime.fromisoformat(item["starts_at"].replace("Z", "+00:00")) if item.get("starts_at") else None
            end = datetime.fromisoformat(item["ends_at"].replace("Z", "+00:00")) if item.get("ends_at") else None
            if start and start > now:
                continue
            if end and end < now:
                continue
        except (ValueError, TypeError):
            pass
        offers.append(item)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


def _patched_include(self, router, *args, **kwargs):
    if getattr(router, "prefix", "") == "/api" and id(router) not in _REGISTERED:
        _REGISTERED.add(id(router))
        router.add_api_route("/admin/cms", _get_cms, methods=["GET"], tags=["CMS"])
        router.add_api_route("/admin/cms/offers", _create_offer, methods=["POST"], tags=["CMS"])
        router.add_api_route("/admin/cms/offers/{offer_id}", _update_offer, methods=["PUT"], tags=["CMS"])
        router.add_api_route("/admin/cms/offers/{offer_id}", _delete_offer, methods=["DELETE"], tags=["CMS"])
        router.add_api_route("/admin/cms/homepage", _save_homepage, methods=["PUT"], tags=["CMS"])
        router.add_api_route("/admin/cms/announcement", _save_announcement, methods=["PUT"], tags=["CMS"])
        router.add_api_route("/cms", _public_cms, methods=["GET"], tags=["CMS"])
    return _ORIGINAL_INCLUDE(self, router, *args, **kwargs)


APIRouter.include_router = _patched_include
