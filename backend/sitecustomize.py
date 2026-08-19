"""Lightweight startup hook for the CMS API.

Python imports sitecustomize automatically during interpreter startup when this
module is on sys.path. The existing server.py remains untouched while the CMS
routes are registered on its FastAPI app as soon as the app is constructed.
"""
from datetime import datetime, timezone
import uuid

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials


CMS_DEFAULT_HOME = {"hero_title": "", "hero_subtitle": "", "hero_image_url": ""}
CMS_DEFAULT_ANNOUNCEMENT = {
    "announcement_text": "",
    "popup_description": "",
    "popup_image_url": "",
    "popup_enabled": True,
}


def _server():
    import server
    return server


async def _admin_guard(request: Request):
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return await _server().require_admin(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))


def _clean(data: dict, allowed: set) -> dict:
    return {k: data.get(k) for k in allowed if k in data}


async def _get_cms():
    db = _server().db
    offers = await db.cms_offers.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


async def _create_offer(payload: dict = Body(...)):
    db = _server().db
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
    await db.cms_offers.insert_one(offer)
    offer.pop("_id", None)
    return {"success": True, "offer": offer}


async def _update_offer(offer_id: str, payload: dict = Body(...)):
    db = _server().db
    update = _clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"})
    if "title" in update and not str(update["title"]).strip():
        raise HTTPException(status_code=400, detail="Offer title is required")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.cms_offers.update_one({"id": offer_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


async def _delete_offer(offer_id: str):
    result = await _server().db.cms_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


async def _save_homepage(payload: dict = Body(...)):
    data = _clean(payload, set(CMS_DEFAULT_HOME))
    data.update({"key": "homepage", "updated_at": datetime.now(timezone.utc).isoformat()})
    await _server().db.cms_content.update_one({"key": "homepage"}, {"$set": data}, upsert=True)
    return {"success": True, "homepage": data}


async def _save_announcement(payload: dict = Body(...)):
    data = _clean(payload, set(CMS_DEFAULT_ANNOUNCEMENT))
    data.update({"key": "announcement", "updated_at": datetime.now(timezone.utc).isoformat()})
    await _server().db.cms_content.update_one({"key": "announcement"}, {"$set": data}, upsert=True)
    return {"success": True, "announcement": data}


async def _public_cms():
    now = datetime.now(timezone.utc)
    raw = await _server().db.cms_offers.find({"active": True}, {"_id": 0}).sort("updated_at", -1).to_list(500)
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
    home = await _server().db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await _server().db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


_ORIGINAL_INIT = FastAPI.__init__


def _patched_init(self, *args, **kwargs):
    _ORIGINAL_INIT(self, *args, **kwargs)
    if getattr(self, "_memories_cms_registered", False):
        return
    self._memories_cms_registered = True
    admin_deps = [Depends(_admin_guard)]
    self.add_api_route("/api/admin/cms", _get_cms, methods=["GET"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/admin/cms/offers", _create_offer, methods=["POST"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/admin/cms/offers/{offer_id}", _update_offer, methods=["PUT"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/admin/cms/offers/{offer_id}", _delete_offer, methods=["DELETE"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/admin/cms/homepage", _save_homepage, methods=["PUT"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/admin/cms/announcement", _save_announcement, methods=["PUT"], dependencies=admin_deps, tags=["CMS"])
    self.add_api_route("/api/cms", _public_cms, methods=["GET"], tags=["CMS"])


FastAPI.__init__ = _patched_init
