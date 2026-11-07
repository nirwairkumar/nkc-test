"""
TestoZa weekly scoreboard numbers (READ-ONLY).

Run every Sunday night or Monday morning from the repo root:

    python TestoZa/Growth-Reset-Nov2026/scripts/weekly_numbers.py          # last 6 weeks
    python TestoZa/Growth-Reset-Nov2026/scripts/weekly_numbers.py 10       # last 10 weeks

It reads SUPABASE_URL and SUPABASE_SERVICE_KEY from backend/.env and only READS data
(GET requests and the same report functions the admin dashboard uses). It prints counts
only: no names, emails or phone numbers.

Weeks run Monday to Sunday, Indian time. The current week is marked "so far".

Columns
  answer sheets   tests submitted by someone other than the test's creator (incl. no-login candidates)
  conductors      educators whose tests got 1+ answer sheets that week (team accounts left out)
  5+              of those, educators with 5 or more answer sheets that week
  new / back      conductors seen for the first time / seen in an earlier week
  new educators   new accounts with role Teacher, Institution or Other (team + candidates left out)
  mkt visitors    people who landed on a marketing page (homepage, guides, /quiz-creator, ...)
  ChatGPT         visitors sent by AI assistants
  made-with       visits from the "Powered by TestoZa" links (utm_source=powered_by)
  referred        educators who joined through an invite link
"""

import collections
import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ENV = ROOT / "backend" / ".env"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
EDUCATOR_ROLES = {"Teacher", "Institution", "Other"}


def load_env():
    vals = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals["SUPABASE_URL"].rstrip("/"), vals["SUPABASE_SERVICE_KEY"]


URL, KEY = load_env()
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def rpc(fn, params):
    req = urllib.request.Request(f"{URL}/rest/v1/rpc/{fn}", data=json.dumps(params).encode(), headers=HDR, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def fetch_all(path, page=1000):
    out, off = [], 0
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={**HDR, "Range-Unit": "items", "Range": f"{off}-{off + page - 1}"})
        with urllib.request.urlopen(req, timeout=120) as r:
            rows = json.loads(r.read())
        out += rows
        if len(rows) < page:
            return out
        off += page


def ist_date(ts):
    return dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(IST).date()


def monday(d):
    return d - dt.timedelta(days=d.weekday())


def iso_ist(d):
    return dt.datetime(d.year, d.month, d.day, tzinfo=IST).isoformat()


def breakdown(dim, frm, to):
    try:
        return {r["key"]: r["visitors"] for r in rpc("analytics_report_breakdown", {"p_from": frm, "p_to": to, "p_site": None, "p_dim": dim, "p_limit": 50})}
    except Exception:
        return {}


def main():
    n_weeks = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    today = dt.datetime.now(IST).date()
    this_monday = monday(today)
    weeks = [this_monday - dt.timedelta(weeks=i) for i in range(n_weeks - 1, -1, -1)]
    start = weeks[0]
    # Look back further so "new vs back" knows who conducted before the first week shown.
    history_start = dt.date(2026, 7, 1)

    team = {r["user_id"] for r in rpc("analytics_team_user_ids", {})}
    tests = {t["id"]: t["created_by"] for t in fetch_all("tests?select=id,created_by")}
    profiles = fetch_all("profiles?select=id,designation,email,created_at")
    subs = fetch_all(f"user_tests?select=user_id,test_id,created_at&created_at=gte.{iso_ist(history_start).replace('+', '%2B')}")
    anon = fetch_all(f"anon_test_attempts?select=test_id,submitted_at&status=eq.submitted&submitted_at=gte.{iso_ist(history_start).replace('+', '%2B')}")
    try:
        referrals = fetch_all("referrals?select=created_at")
    except Exception:
        referrals = []

    per_week = collections.defaultdict(collections.Counter)
    for s in subs:
        creator = tests.get(s["test_id"])
        if not creator or creator in team or s["user_id"] == creator or s["user_id"] in team:
            continue
        per_week[monday(ist_date(s["created_at"]))][creator] += 1
    for a in anon:
        creator = tests.get(a["test_id"])
        if creator and creator not in team:
            per_week[monday(ist_date(a["submitted_at"]))][creator] += 1

    new_edu = collections.Counter()
    for p in profiles:
        if p["id"] in team or (p.get("email") or "").lower().endswith("@guest.testoza.com"):
            continue
        if p.get("designation") in EDUCATOR_ROLES and p.get("created_at"):
            new_edu[monday(ist_date(p["created_at"]))] += 1

    ref = collections.Counter(monday(ist_date(r["created_at"])) for r in referrals if r.get("created_at"))

    seen = set()
    for wk in sorted(per_week):
        if wk < start:
            seen |= set(per_week[wk])

    print(f"TestoZa weekly numbers (Mon-Sun, IST). Today {today:%a %d %b %Y}.\n")
    head = f"{'week of':<12}{'answer':>8}{'conduct':>9}{'5+':>5}{'new':>5}{'back':>6}{'new':>6}{'mkt':>7}{'Chat':>7}{'made':>6}{'refer':>7}"
    sub = f"{'':<12}{'sheets':>8}{'-ors':>9}{'':>5}{'':>5}{'':>6}{'educ.':>6}{'visit':>7}{'GPT':>7}{'with':>6}{'red':>7}"
    print(head)
    print(sub)
    print("-" * len(head))
    for wk in weeks:
        cnt = per_week.get(wk, collections.Counter())
        active = set(cnt)
        five = sum(1 for v in cnt.values() if v >= 5)
        new = len(active - seen)
        back = len(active & seen)
        seen |= active
        frm, to = iso_ist(wk), iso_ist(wk + dt.timedelta(days=7))
        landing = breakdown("landing_type", frm, to)
        channel = breakdown("channel", frm, to)
        utm = breakdown("utm_source", frm, to)
        label = f"{wk:%d %b}" + (" *" if wk == this_monday else "")
        print(f"{label:<12}{sum(cnt.values()):>8}{len(active):>9}{five:>5}{new:>5}{back:>6}{new_edu.get(wk, 0):>6}"
              f"{landing.get('Marketing', 0):>7}{channel.get('AI assistants', 0):>7}{utm.get('powered_by', 0):>6}{ref.get(wk, 0):>7}")
    print("\n* = this week so far.  Copy the last full week into 04-Weekly-scoreboard.md.")


if __name__ == "__main__":
    main()
