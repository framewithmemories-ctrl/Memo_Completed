"""Customer important-event reminders for birthdays, anniversaries and other special dates."""
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from server import app, db, verify_user_access


class ImportantEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    person_name: str = Field(min_length=1, max_length=100)
    event_type: str = Field(default="Other", max_length=40)
    event_date: date
    notes: Optional[str] = Field(default="", max_length=500)
    reminder_days: int = Field(default=7, ge=0, le=365)
    recurring: bool = True


class ImportantEventUpdate(ImportantEventCreate):
    pass


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@app.get("/api/users/{user_id}/important-events")
async def list_important_events(user_id: str, owner=Depends(verify_user_access)):
    events = await db.important_events.find({"user_id": user_id}).sort("event_date", 1).to_list(200)
    return [_serialize(e) for e in events]


@app.post("/api/users/{user_id}/important-events")
async def create_important_event(user_id: str, payload: ImportantEventCreate, owner=Depends(verify_user_access)):
    event = {
        "id": __import__("uuid").uuid4().hex,
        "user_id": user_id,
        **payload.dict(),
        "event_date": payload.event_date.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.important_events.insert_one(event)
    return _serialize(event)


@app.put("/api/users/{user_id}/important-events/{event_id}")
async def update_important_event(user_id: str, event_id: str, payload: ImportantEventUpdate, owner=Depends(verify_user_access)):
    result = await db.important_events.update_one(
        {"id": event_id, "user_id": user_id},
        {"$set": {**payload.dict(), "event_date": payload.event_date.isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Important event not found")
    event = await db.important_events.find_one({"id": event_id, "user_id": user_id})
    return _serialize(event)


@app.delete("/api/users/{user_id}/important-events/{event_id}")
async def delete_important_event(user_id: str, event_id: str, owner=Depends(verify_user_access)):
    result = await db.important_events.delete_one({"id": event_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Important event not found")
    return {"success": True}
