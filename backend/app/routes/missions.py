import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from .. import supabase_client as db
from ..schemas import MissionCreate, MissionUpdate

router = APIRouter(prefix="/api/missions", tags=["missions"])


class AcceptBody(BaseModel):
    user_id: int


class PhotoEntryBody(BaseModel):
    photo_date: str
    photo_url: str


def _to_out(m: dict) -> dict:
    end = m.get("end_date", "")
    if isinstance(end, str) and end:
        delta = (datetime.date.fromisoformat(end) - datetime.date.today()).days
    else:
        delta = 0
    return {
        "id": m["id"],
        "title": m["title"],
        "sponsor_name": m["sponsor_name"],
        "participant_name": m["participant_name"],
        "reward_amount": m.get("reward_amount", 0),
        "target_improvement_percentage": m.get("target_improvement_percentage", 10),
        "start_date": str(m.get("start_date", "")),
        "end_date": str(end),
        "rules": m.get("rules"),
        "status": m.get("status", "pending"),
        "verification_method": m.get("verification_method", "bank"),
        "photo_subject": m.get("photo_subject"),
        "photo_frequency": m.get("photo_frequency", "daily"),
        "total_photos_required": m.get("total_photos_required", 0),
        "expire_days": m.get("expire_days", 15),
        "days_left": max(0, delta),
        "created_at": str(m.get("created_at", "")),
    }


@router.post("")
def create_mission(payload: MissionCreate):
    data = {
        "title": payload.title,
        "sponsor_name": payload.sponsor,
        "participant_name": payload.participant,
        "reward_amount": payload.reward,
        "target_improvement_percentage": payload.targetImprovement,
        "start_date": payload.startDate,
        "end_date": payload.endDate,
        "rules": payload.rules,
        "verification_method": payload.verificationMethod,
        "photo_subject": payload.photoSubject,
        "photo_frequency": payload.photoFrequency,
        "total_photos_required": payload.totalPhotosRequired,
        "expire_days": payload.expireDays,
        "status": "pending",
    }
    m = db.create_mission(data)
    return _to_out(m)


@router.get("")
def list_missions(user_id: int = Query(None)):
    missions = db.list_missions(user_id=user_id)
    return [_to_out(m) for m in missions]


@router.get("/available")
def list_available_missions():
    """Missions that are still pending (not accepted yet)."""
    missions = db.list_available_missions()
    return [_to_out(m) for m in missions]


@router.post("/{mission_id}/accept")
def accept_mission(mission_id: int, body: AcceptBody):
    m = db.get_mission(mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    if m.get("accepted_by") is not None or m.get("status") != "pending":
        raise HTTPException(409, "Mission already claimed")
    db.update_mission(mission_id, {
        "accepted_by": body.user_id,
        "status": "active",
        "participant_name": "",
    })
    m = db.get_mission(mission_id)
    return _to_out(m)


class CancelBody(BaseModel):
    user_id: int


@router.post("/{mission_id}/cancel")
def cancel_mission(mission_id: int, body: CancelBody):
    m = db.get_mission(mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    db.update_mission(mission_id, {
        "accepted_by": None,
        "status": "pending",
    })
    return {"success": True}


@router.delete("/{mission_id}")
def delete_mission(mission_id: int):
    m = db.get_mission(mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    db.delete_mission(mission_id)
    return {"success": True}


@router.get("/{mission_id}/photo-entries")
def list_photo_entries(mission_id: int):
    entries = db.list_photo_entries(mission_id)
    return [{"photo_date": e["photo_date"], "photo_url": e["photo_url"]} for e in entries]


@router.post("/{mission_id}/photo-entries")
def add_photo_entry(mission_id: int, body: PhotoEntryBody):
    db.create_photo_entry({
        "mission_id": mission_id,
        "photo_date": body.photo_date,
        "photo_url": body.photo_url,
    })
    return {"success": True}


@router.delete("/{mission_id}/photo-entries/{photo_date}")
def remove_photo_entry(mission_id: int, photo_date: str):
    db.delete_photo_entries(mission_id, photo_date)
    return {"success": True}


@router.get("/{mission_id}")
def get_mission(mission_id: int):
    m = db.get_mission(mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    return _to_out(m)


@router.patch("/{mission_id}")
def patch_mission(mission_id: int, payload: MissionUpdate):
    m = db.get_mission(mission_id)
    if not m:
        raise HTTPException(404, "Mission not found")
    update = {}
    if payload.title is not None:
        update["title"] = payload.title
    if payload.status is not None:
        update["status"] = payload.status
    if payload.rules is not None:
        update["rules"] = payload.rules
    if update:
        db.update_mission(mission_id, update)
    m = db.get_mission(mission_id)
    return _to_out(m)
