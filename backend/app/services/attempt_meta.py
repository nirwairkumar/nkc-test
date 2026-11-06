"""
What a submitted paper says about itself, cleaned before it is stored: its start and submit
times, and the exam rules the candidate broke.

Times. The exam page sends `startedAt` and `submittedAt` read from the candidate's own
device. Result screens compute "time taken" as `created_at - startedAt`, a server time minus
a device time, so a phone whose clock runs fast showed "—" and one running slow added the
error to the time. The gap between the device's two times is right whatever the device's
clock says, so `anchor_times` keeps that gap and moves it onto the server's clock. The
device's own values stay in `device_startedAt` / `device_submittedAt`.

Rule breaks. In a proctored exam the page logs each time the candidate leaves the exam
screen or full screen, and why it auto-submitted the paper. They used to be dropped, so
`violation_count` was 0 on every link-exam paper and a paper the platform auto-submitted
looked to the examiner like a candidate who gave up after two seconds.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

# What TestPage.tsx sends in `violations[].type` and `auto_submit_reason`.
RULE_BREAKS = {"left_exam_screen", "exited_full_screen"}

MAX_LOG = 50              # rule breaks kept per paper (the newest)
MAX_COUNTED = 1000        # rule breaks read from one payload
MAX_EXAM_SECONDS = 24 * 3600  # longer is a start time left over from an earlier sitting


def _parse(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def anchor_times(meta: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    """Keep the time the device measured and put it on the server clock (in place)."""
    started = _parse(meta.get("startedAt"))
    submitted = _parse(meta.get("submittedAt"))
    if started is None or submitted is None:
        return meta
    taken = (submitted - started).total_seconds()
    if taken < 0 or taken > MAX_EXAM_SECONDS:
        return meta
    now = now or datetime.now(timezone.utc)
    meta["device_startedAt"] = meta["startedAt"]
    meta["device_submittedAt"] = meta["submittedAt"]
    meta["submittedAt"] = _iso(now)
    meta["startedAt"] = _iso(now - timedelta(seconds=taken))
    meta["time_taken_seconds"] = round(taken)
    return meta


def take_rule_breaks(meta: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Move the page's rule-break list out of the metadata (in place) and return what the
    `violation_count` and `violation_log` columns get. Unknown kinds are dropped, and so is
    an `auto_submit_reason` that is not one of them.
    """
    raw = meta.pop("violations", None)
    log: List[Dict[str, Any]] = []
    if isinstance(raw, list):
        for item in raw[-MAX_COUNTED:]:
            if not isinstance(item, dict) or item.get("type") not in RULE_BREAKS:
                continue
            at = _parse(item.get("at"))
            log.append({"type": item["type"], "at": _iso(at) if at else None})
    if meta.get("auto_submit_reason") not in RULE_BREAKS:
        meta.pop("auto_submit_reason", None)
    return len(log), log[-MAX_LOG:]
