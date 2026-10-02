"""
Batches = the existing `classes` rows, plus a student list (roster) and PINs.

    GET    /api/batches                                  my batches with student counts
    GET    /api/batches/{class_id}                       one batch and its students
    PATCH  /api/batches/{class_id}                       rename
    POST   /api/batches/{class_id}/students              add or update students (by roll number)
    PATCH  /api/batches/{class_id}/students/{sid}        edit one student
    DELETE /api/batches/{class_id}/students/{sid}        remove one student
    POST   /api/batches/{class_id}/pins                  make new PINs -> returned ONCE, stored hashed

Create / delete a batch with the existing POST /api/classes and DELETE /api/classes/{id}.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from supabase import Client

from app.core.auth import is_admin_user, verify_auth_token
from app.core.database import get_db
from app.services import exam_sessions as rules
from app.services import exam_session_store as store
from app.services.exam_session_store import SessionError
from app.utils.rate_limiter import enforce_limit, write_per_user
from app.utils.safe_route import SafeRoute

logger = logging.getLogger(__name__)
router = APIRouter(route_class=SafeRoute)

MAX_IMPORT = 1000
STUDENT_COLS = "id, class_id, roll_no, full_name, parent_phone, pin_set_at, created_at"


class StudentIn(BaseModel):
    roll_no: str = Field(max_length=40)
    full_name: str = Field(max_length=120)
    parent_phone: Optional[str] = Field(default=None, max_length=30)


class ImportRequest(BaseModel):
    students: List[StudentIn] = Field(max_length=MAX_IMPORT)


class StudentPatch(BaseModel):
    roll_no: Optional[str] = Field(default=None, max_length=40)
    full_name: Optional[str] = Field(default=None, max_length=120)
    parent_phone: Optional[str] = Field(default=None, max_length=30)


class PinRequest(BaseModel):
    student_ids: Optional[List[str]] = None
    only_missing: bool = False


class RenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


def _owned_batch(request: Request, db: Client, class_id: str, writing: bool = False) -> Dict[str, Any]:
    uid = verify_auth_token(request, db)
    batch = store._first(db.table("classes").select("id, user_id, name, created_at").eq("id", class_id).limit(1).execute())
    if not batch or (batch.get("user_id") != uid and not is_admin_user(uid, db)):
        raise SessionError(404, "not_found", "This batch does not exist.")
    if writing:
        enforce_limit(write_per_user, uid, "Too many changes at once. Wait a moment.")
    return batch


def _student_out(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": s["id"],
        "roll_no": s.get("roll_no"),
        "full_name": s.get("full_name"),
        "parent_phone": s.get("parent_phone"),
        "has_pin": bool(s.get("pin_set_at")),
        "pin_set_at": s.get("pin_set_at"),
    }


def _bust_classes_cache():
    try:
        from app.routers.classes import _bust_classes_cache as bust
        bust()
    except Exception:
        pass


@router.get("")
async def list_batches(request: Request, as_user: Optional[str] = Query(default=None), db: Client = Depends(get_db)):
    uid = verify_auth_token(request, db)
    owner = as_user if (as_user and is_admin_user(uid, db)) else uid
    batches = (db.table("classes").select("id, name, created_at").eq("user_id", owner).order("name").execute()).data or []
    counts = store.roster_counts(db, [b["id"] for b in batches])
    sessions = (
        db.table("exam_sessions").select("class_id").eq("owner_id", owner).limit(5000).execute()
    ).data or []
    by_class: Dict[str, int] = {}
    for s in sessions:
        if s.get("class_id"):
            by_class[s["class_id"]] = by_class.get(s["class_id"], 0) + 1
    return [{**b, **counts.get(b["id"], {"students": 0, "with_pin": 0}), "sittings": by_class.get(b["id"], 0)} for b in batches]


@router.get("/{class_id}")
async def get_batch(class_id: str, request: Request, db: Client = Depends(get_db)):
    batch = _owned_batch(request, db, class_id)
    students = (
        db.table("roster_students").select(STUDENT_COLS).eq("class_id", class_id).order("roll_key").limit(MAX_IMPORT * 2).execute()
    ).data or []
    return {"id": batch["id"], "name": batch.get("name"), "students": [_student_out(s) for s in students]}


@router.patch("/{class_id}")
async def rename_batch(class_id: str, payload: RenameRequest, request: Request, db: Client = Depends(get_db)):
    _owned_batch(request, db, class_id, writing=True)
    name = rules.clean_name(payload.name)[:80]
    db.table("classes").update({"name": name}).eq("id", class_id).execute()
    _bust_classes_cache()
    return {"id": class_id, "name": name}


@router.post("/{class_id}/students")
async def import_students(class_id: str, payload: ImportRequest, request: Request, db: Client = Depends(get_db)):
    """Add new roll numbers and update names / phones of existing ones. Nothing is deleted."""
    batch = _owned_batch(request, db, class_id, writing=True)
    existing = {
        s["roll_key"]: s for s in ((
            db.table("roster_students").select("id, roll_key, full_name, parent_phone").eq("class_id", class_id).limit(MAX_IMPORT * 2).execute()
        ).data or [])
    }
    added = updated = 0
    skipped: List[Dict[str, Any]] = []
    seen = set()
    new_rows = []
    for index, student in enumerate(payload.students):
        roll = rules.clean_roll(student.roll_no)
        key = rules.roll_key(roll)
        name = rules.clean_name(student.full_name)
        phone = rules.clean_phone(student.parent_phone)
        if not key or not name:
            skipped.append({"row": index + 1, "reason": "Roll number and name are both needed"})
            continue
        if key in seen:
            skipped.append({"row": index + 1, "reason": f"Roll number {roll} appears twice"})
            continue
        seen.add(key)
        current = existing.get(key)
        if current:
            patch = {}
            if name != current.get("full_name"):
                patch["full_name"] = name
            if phone and phone != current.get("parent_phone"):
                patch["parent_phone"] = phone
            if patch:
                db.table("roster_students").update(patch).eq("id", current["id"]).execute()
                updated += 1
        else:
            new_rows.append({
                "class_id": class_id, "owner_id": batch["user_id"], "roll_no": roll, "roll_key": key,
                "full_name": name, "parent_phone": phone,
            })
    for start in range(0, len(new_rows), 200):
        chunk = new_rows[start:start + 200]
        db.table("roster_students").insert(chunk).execute()
        added += len(chunk)
    return {"added": added, "updated": updated, "skipped": skipped}


@router.patch("/{class_id}/students/{student_id}")
async def edit_student(class_id: str, student_id: str, payload: StudentPatch, request: Request, db: Client = Depends(get_db)):
    _owned_batch(request, db, class_id, writing=True)
    patch: Dict[str, Any] = {}
    if payload.full_name is not None:
        name = rules.clean_name(payload.full_name)
        if not name:
            raise SessionError(400, "name_required", "The name can't be empty.")
        patch["full_name"] = name
    if payload.roll_no is not None:
        roll = rules.clean_roll(payload.roll_no)
        if not rules.roll_key(roll):
            raise SessionError(400, "roll_required", "The roll number can't be empty.")
        patch["roll_no"] = roll
        patch["roll_key"] = rules.roll_key(roll)
    if payload.parent_phone is not None:
        patch["parent_phone"] = rules.clean_phone(payload.parent_phone)
    if not patch:
        raise SessionError(400, "nothing_to_change", "Nothing to change.")
    try:
        row = store._first(db.table("roster_students").update(patch).eq("id", student_id).eq("class_id", class_id).execute())
    except Exception as e:
        if store.is_unique_violation(e):
            raise SessionError(409, "duplicate_roll", "Another student in this batch already has that roll number.")
        raise
    if not row:
        raise SessionError(404, "not_found", "That student is not in this batch.")
    return _student_out(row)


@router.delete("/{class_id}/students/{student_id}")
async def remove_student(class_id: str, student_id: str, request: Request, db: Client = Depends(get_db)):
    _owned_batch(request, db, class_id, writing=True)
    db.table("roster_students").delete().eq("id", student_id).eq("class_id", class_id).execute()
    return {"deleted": True}


@router.post("/{class_id}/pins")
async def make_pins(class_id: str, payload: PinRequest, request: Request, db: Client = Depends(get_db)):
    """
    New 4-digit PINs. The clear PINs are in this response only — print or share them
    now. Asking again makes NEW PINs (the old ones stop working), which is how a lost
    slip is handled.
    """
    _owned_batch(request, db, class_id, writing=True)
    query = db.table("roster_students").select("id, roll_no, full_name, pin_set_at, roll_key").eq("class_id", class_id)
    if payload.student_ids:
        query = query.in_("id", payload.student_ids[:MAX_IMPORT])
    students = (query.order("roll_key").limit(MAX_IMPORT * 2).execute()).data or []
    if payload.only_missing:
        students = [s for s in students if not s.get("pin_set_at")]
    now = rules.iso(rules.now_utc())
    out = []
    for s in students:
        pin = rules.generate_pin()
        db.table("roster_students").update({"pin_hash": rules.hash_pin(pin), "pin_set_at": now}).eq("id", s["id"]).execute()
        out.append({"id": s["id"], "roll_no": s["roll_no"], "full_name": s["full_name"], "pin": pin})
    return {"pins": out, "made_at": now}
