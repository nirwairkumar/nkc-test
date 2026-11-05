"""
Email on team.testoza.com: admin → Email (Playbook, People, Library, History, Automatic) for
employees, minus Settings.

  email.view — look                               email.send — write and send (implies email.view)
  GET   /email/overview                           POST  /email/audience              addresses masked
  GET   /email/templates                          POST  /email/test                  own / @testoza.com only
  POST  /email/preview     (sample person only)   POST  /email/templates  (+ PATCH, /duplicate, /restore)
  GET   /email/campaigns                          POST  /email/campaigns             10 a day per person
  GET   /email/campaigns/{id}  (no people list)   PATCH /email/campaigns/{id}        pause / resume
  GET   /email/auto                               POST  /email/campaigns/{id}/send-next
  POST  /email/auto/{kind}/preview                GET   /email/auto/log              addresses masked
                                                  GET   /email/suppressions          addresses masked
                                                  POST  /email/suppressions          stop an address

The work is done by the same functions admin uses (routers/email_broadcast.py, email_auto.py),
so the one-a-week rule, the monthly cap, the SES warm-up, unsubscribes and the never-email list
apply unchanged. On top, because a stolen team session must not become a spam or phishing tool:
  - links, buttons and bare web addresses may point only to testoza.com (any subdomain) or YouTube
  - a test email goes only to the employee's own login email or an @testoza.com address
  - people's addresses are masked everywhere (a full address typed into search still finds them)
  - per person: 20 test emails an hour, 10 sends a day
  - every change is in the activity log; the 'email.campaign.create' row is how admin → History
    names the team member who sent it
Owner-only (admin panel): Settings (mail service and password), taking an address off the
never-email list, switching automatic emails on or off.
"""

import re
import uuid
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from supabase import Client

from app.core.database import get_db
from app.routers import email_auto as auto
from app.routers import email_broadcast as eb
from app.services import email_render
from app.utils.rate_limiter import RateLimiter

from .deps import StaffContext, require_staff, staff_audit
from .modules import mask_email

router = APIRouter()

tests_per_staff = RateLimiter(requests=20, window=3600, name="staff_email_test")
sends_per_staff = RateLimiter(requests=10, window=86400, name="staff_email_send")

LINK_HOSTS = ("testoza.com", "youtube.com", "youtu.be")
TEST_DOMAIN = "testoza.com"
_ADDRESS = re.compile(r"([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})")


# ── guards ──────────────────────────────────────────────────────────────────────
def mask_text(text: Optional[str]) -> Optional[str]:
    """Addresses inside a mail server's words ("550 <asha@x.in> unknown") → as•••@x.in."""
    if not text:
        return text
    return _ADDRESS.sub(lambda m: f"{m.group(1)[:2]}•••@{m.group(2)}", text)


def _mask_person(p: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(p)
    if out.get("email"):
        out["email"] = mask_email(out["email"]) or ""
    return out


def _host_ok(host: str) -> bool:
    if host.startswith("mailto:"):
        return host[7:].split("?")[0].endswith("@" + TEST_DOMAIN)
    return any(host == h or host.endswith("." + h) for h in LINK_HOSTS)


def check_links(subject: Optional[str], body: Optional[str]) -> None:
    if not (subject or body):
        return
    bad = [h for h in email_render.link_hosts(subject or "", body or "") if not _host_ok(h)]
    if bad:
        raise HTTPException(status_code=400, detail=(
            f"Emails from the team site can link only to testoza.com or YouTube. Take out the link to "
            f"{bad[0]}, or ask the owner to send this one from admin."))


def own_address(ctx: StaffContext) -> Optional[str]:
    login = (ctx.account.get("login_id") or "").strip().lower()
    return login if "@" in login else None


def _test_to_ok(ctx: StaffContext, to: str) -> bool:
    to = to.strip().lower()
    return to == own_address(ctx) or to.endswith("@" + TEST_DOMAIN)


def _limit(limiter: RateLimiter, ctx: StaffContext, what: str) -> None:
    allowed, _, reset_in = limiter.check(ctx.id)
    if not allowed:
        wait = max(1, reset_in // 60)
        when = f"{wait} minutes" if wait < 120 else f"{max(1, wait // 60)} hours"
        raise HTTPException(status_code=429, detail=f"That's the most {what} for now. Try again in {when}.",
                            headers={"Retry-After": str(reset_in)})


# ── look (email.view) ───────────────────────────────────────────────────────────
@router.get("/email/overview")
def overview(ctx: StaffContext = Depends(require_staff("email.view")), db: Client = Depends(get_db)):
    data = eb.overview_report(db)
    # The SES sign-in name is a credential's half: the owner's business only.
    data["smtp"] = {k: v for k, v in (data.get("smtp") or {}).items() if k != "user"}
    data["team"] = {
        "can_send": ctx.has("email.send"),
        "test_to": own_address(ctx),
        "test_domain": TEST_DOMAIN,
        "link_hosts": list(LINK_HOSTS),
    }
    return data


@router.get("/email/templates")
def templates(ctx: StaffContext = Depends(require_staff("email.view")), db: Client = Depends(get_db)):
    return eb.templates_report(db)


@router.post("/email/preview")
def preview(payload: eb.PreviewRequest, ctx: StaffContext = Depends(require_staff("email.view")),
            db: Client = Depends(get_db)):
    if payload.user_id and not ctx.has("email.send"):
        raise HTTPException(status_code=403, detail="Previewing as a real person needs “Write and send emails”.")
    return eb.preview_email(db, payload, _mask_person)


@router.get("/email/campaigns")
def campaigns(request: Request, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
              ctx: StaffContext = Depends(require_staff("email.view")), db: Client = Depends(get_db)):
    data = eb.campaigns_report(db, limit, offset)
    if offset == 0:
        staff_audit(db, request, ctx, "email.view", detail={"report": "history"})
    return data


@router.get("/email/campaigns/{cid}")
def campaign(cid: uuid.UUID, request: Request, ctx: StaffContext = Depends(require_staff("email.view")),
             db: Client = Depends(get_db)):
    data = eb.campaign_report(db, str(cid))
    c = data.get("campaign") or {}
    c.pop("created_by", None)
    if isinstance(c.get("filter"), dict):
        c["filter"] = {k: v for k, v in c["filter"].items() if k not in ("add_ids", "skip_ids")}
    if ctx.has("email.send"):
        for r in data.get("recipients") or []:
            r["email"] = mask_email(r.get("email")) or ""
            r["error"] = mask_text(r.get("error"))
        staff_audit(db, request, ctx, "email.campaign.open", target_type="email_campaign", target_id=str(cid))
    else:
        rec = data.get("recipients") or []
        data["recipients"] = []
        data["counts"] = {
            "sent": sum(1 for r in rec if r.get("status") == "sent"),
            "failed": sum(1 for r in rec if r.get("status") == "failed"),
            "came_back": sum(1 for r in rec if r.get("status") == "sent" and r.get("came_back")),
            "clicked": sum(1 for r in rec if r.get("status") == "sent" and r.get("clicked")),
            "unsubscribed": sum(1 for r in rec if r.get("status") == "sent" and r.get("unsubscribed")),
        }
    data["can_send"] = ctx.has("email.send")
    return data


@router.get("/email/auto")
def auto_overview(ctx: StaffContext = Depends(require_staff("email.view")), db: Client = Depends(get_db)):
    return auto.auto_report(db)


@router.post("/email/auto/{kind}/preview")
def auto_preview(kind: str, ctx: StaffContext = Depends(require_staff("email.view"))):
    return auto.auto_preview(kind)


# ── write and send (email.send) ─────────────────────────────────────────────────
@router.post("/email/audience")
def audience(payload: eb.AudienceRequest, request: Request, ctx: StaffContext = Depends(require_staff("email.send")),
             db: Client = Depends(get_db)):
    data = eb.audience_report(db, payload) or {}
    for r in data.get("rows") or []:
        r["email"] = mask_email(r.get("email")) or ""
    if payload.filter.q and payload.offset == 0:
        staff_audit(db, request, ctx, "email.people.search", detail={"q": payload.filter.q[:120]})
    return data


@router.post("/email/test")
def send_test(payload: eb.TestSendRequest, request: Request, ctx: StaffContext = Depends(require_staff("email.send")),
              db: Client = Depends(get_db)):
    to = str(payload.to)
    if not _test_to_ok(ctx, to):
        mine = own_address(ctx)
        raise HTTPException(status_code=400, detail=(
            f"Test emails go to {mine} (your login) or an @{TEST_DOMAIN} address." if mine
            else f"Test emails go to an @{TEST_DOMAIN} address."))
    check_links(payload.subject, payload.body)
    _limit(tests_per_staff, ctx, "test emails")
    out = eb.send_test_email(db, payload, _mask_person)
    staff_audit(db, request, ctx, "email.test", detail={"to": to, "subject": payload.subject[:120]})
    return out


@router.post("/email/templates")
def template_create(payload: eb.TemplateFields, request: Request,
                    ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    check_links(payload.subject, payload.body)
    row = eb.template_create(db, payload)
    staff_audit(db, request, ctx, "email.template.create", target_type="email_template", target_id=row.get("key"),
                detail={"name": (payload.name or "")[:120]})
    return row


@router.patch("/email/templates/{key}")
def template_update(key: str, payload: eb.TemplateFields, request: Request,
                    ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    check_links(payload.subject, payload.body)
    row = eb.template_update(db, key, payload)
    changed = sorted(payload.model_dump(exclude_none=True).keys())
    staff_audit(db, request, ctx, "email.template.update", target_type="email_template", target_id=key,
                detail={"fields": changed})
    return row


@router.post("/email/templates/{key}/duplicate")
def template_duplicate(key: str, request: Request, ctx: StaffContext = Depends(require_staff("email.send")),
                       db: Client = Depends(get_db)):
    row = eb.template_duplicate(db, key)
    staff_audit(db, request, ctx, "email.template.duplicate", target_type="email_template", target_id=key,
                detail={"copy": row.get("key")})
    return row


@router.post("/email/templates/{key}/restore")
def template_restore(key: str, request: Request, ctx: StaffContext = Depends(require_staff("email.send")),
                     db: Client = Depends(get_db)):
    row = eb.template_restore(db, key)
    staff_audit(db, request, ctx, "email.template.restore", target_type="email_template", target_id=key)
    return row


@router.post("/email/campaigns")
def campaign_create(payload: eb.CampaignCreate, request: Request,
                    ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    check_links(payload.subject, payload.body)
    _limit(sends_per_staff, ctx, "sends today")
    row = eb.campaign_create(db, payload)
    staff_audit(db, request, ctx, "email.campaign.create", target_type="email_campaign", target_id=row["id"],
                detail={"name": row.get("name"), "planned": row.get("planned"), "template_key": row.get("template_key"),
                        "audience_label": row.get("audience_label"), "from_email": row.get("from_email"),
                        "reply_to": row.get("reply_to")})
    return {k: row.get(k) for k in ("id", "name", "planned", "status")}


@router.patch("/email/campaigns/{cid}")
def campaign_status(cid: uuid.UUID, payload: eb.CampaignPatch, request: Request,
                    ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    out = eb.campaign_set_status(db, str(cid), payload.status)
    staff_audit(db, request, ctx, "email.campaign.status", target_type="email_campaign", target_id=str(cid),
                detail={"status": payload.status})
    return out


@router.post("/email/campaigns/{cid}/send-next")
def send_next(cid: uuid.UUID, payload: eb.SendNextRequest, request: Request,
              ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    try:
        out = eb.campaign_send_next(db, str(cid), payload.n)
    except HTTPException as exc:
        if exc.status_code == 409:  # the send stopped and paused itself
            staff_audit(db, request, ctx, "email.campaign.stopped", target_type="email_campaign",
                        target_id=str(cid), detail={"reason": str(exc.detail)[:200]})
        raise
    out["errors"] = [mask_text(e) for e in out.get("errors") or []]
    if out.get("status") == "done":
        staff_audit(db, request, ctx, "email.campaign.done", target_type="email_campaign", target_id=str(cid))
    return out


@router.get("/email/auto/log")
def auto_log(kind: Optional[str] = None, status: Optional[Literal["sent", "failed", "skipped"]] = None,
             q: Optional[str] = Query(None, max_length=120), limit: int = Query(50, ge=1, le=100),
             offset: int = Query(0, ge=0), ctx: StaffContext = Depends(require_staff("email.send")),
             db: Client = Depends(get_db)):
    data = auto.auto_log(db, kind, status, q, limit, offset)
    for r in data.get("rows") or []:
        r["email"] = mask_email(r.get("email")) or ""
        r["error"] = mask_text(r.get("error"))
        r.pop("user_id", None)
    return data


@router.get("/email/suppressions")
def suppressions(q: Optional[str] = Query(None, max_length=120),
                 ctx: StaffContext = Depends(require_staff("email.send")), db: Client = Depends(get_db)):
    data = eb.suppressions_report(db, q)
    for r in data.get("rows") or []:
        r["email"] = mask_email(r.get("email")) or ""
        r.pop("user_id", None)
    return data


@router.post("/email/suppressions")
def suppress(payload: eb.SuppressRequest, request: Request, ctx: StaffContext = Depends(require_staff("email.send")),
             db: Client = Depends(get_db)):
    name = ctx.account.get("full_name") or ctx.label
    note = (payload.note or "").strip() or "Stopped by the team"
    out = eb.suppression_add(db, str(payload.email), f"{note} ({name}, team)"[:300])
    staff_audit(db, request, ctx, "email.suppress", detail={"email": str(payload.email).lower()})
    return {"email": mask_email(out["email"]), "reason": out["reason"]}
