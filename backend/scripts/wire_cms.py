from pathlib import Path

server = Path(__file__).resolve().parents[1] / 'server.py'
text = server.read_text(encoding='utf-8')

if 'CMS Content Management Endpoints' in text:
    raise SystemExit(0)

cms = r'''
# ============================ CMS Content Management Endpoints ============================
CMS_DEFAULT_HOME = {"hero_title": "", "hero_subtitle": "", "hero_image_url": ""}
CMS_DEFAULT_ANNOUNCEMENT = {"announcement_text": "", "popup_description": "", "popup_image_url": "", "popup_enabled": True}


def _cms_clean(data: dict, allowed: set) -> dict:
    return {k: data.get(k) for k in allowed if k in data}


@api_router.get("/admin/cms")
async def admin_get_cms(admin=Depends(require_admin)):
    offers = await db.cms_offers.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    home = await db.cms_content.find_one({"key": "homepage"}, {"_id": 0})
    announcement = await db.cms_content.find_one({"key": "announcement"}, {"_id": 0})
    return {"offers": offers, "homepage": {**CMS_DEFAULT_HOME, **(home or {})}, "announcement": {**CMS_DEFAULT_ANNOUNCEMENT, **(announcement or {})}}


@api_router.post("/admin/cms/offers")
async def admin_create_cms_offer(payload: dict, admin=Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    title = str(payload.get("title", "")).strip()
    if not title:
        raise HTTPException(status_code=400, detail="Offer title is required")
    offer = {"id": str(uuid.uuid4()), **_cms_clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"}), "created_at": now, "updated_at": now}
    await db.cms_offers.insert_one(offer)
    offer.pop("_id", None)
    return {"success": True, "offer": offer}


@api_router.put("/admin/cms/offers/{offer_id}")
async def admin_update_cms_offer(offer_id: str, payload: dict, admin=Depends(require_admin)):
    update = _cms_clean(payload, {"title", "discount", "description", "starts_at", "ends_at", "active", "show_on_homepage", "show_in_popup"})
    if "title" in update and not str(update["title"]).strip():
        raise HTTPException(status_code=400, detail="Offer title is required")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.cms_offers.update_one({"id": offer_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


@api_router.delete("/admin/cms/offers/{offer_id}")
async def admin_delete_cms_offer(offer_id: str, admin=Depends(require_admin)):
    result = await db.cms_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"success": True}


@api_router.put("/admin/cms/homepage")
async def admin_save_cms_homepage(payload: dict, admin=Depends(require_admin)):
    data = _cms_clean(payload, set(CMS_DEFAULT_HOME))
    data.update({"key": "homepage", "updated_at": datetime.now(timezone.utc).isoformat()})
    await db.cms_content.update_one({"key": "homepage"}, {"$set": data}, upsert=True)
    return {"success": True, "homepage": data}


@api_router.put("/admin/cms/announcement")
async def admin_save_cms_announcement(payload: dict, admin=Depends(require_admin)):
    data = _cms_clean(payload, set(CMS_DEFAULT_ANNOUNCEMENT))
    data.update({"key": "announcement", "updated_at": datetime.now(timezone.utc).isoformat()})
    await db.cms_content.update_one({"key": "announcement"}, {"$set": data}, upsert=True)
    return {"success": True, "announcement": data}


@api_router.get("/cms")
async def get_public_cms():
    now = datetime.now(timezone.utc)
    raw_offers = await db.cms_offers.find({"active": True}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    offers = []
    for item in raw_offers:
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


'''

# The existing server registers api_router near the bottom. Insert CMS routes immediately
# before that registration so FastAPI includes them in the router.
marker = 'app.include_router(api_router)'
if marker not in text:
    raise SystemExit('CMS insertion marker not found: app.include_router(api_router)')

server.write_text(text.replace(marker, cms + marker, 1), encoding='utf-8')
print('CMS backend routes wired.')
