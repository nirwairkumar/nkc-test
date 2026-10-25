"""
Move the base64 pictures in existing tests to Storage (one-off, 2026-10-25).

New saves are converted by app/services/question_images.py; this converts tests saved
before that. Run from backend/ with the production .env:

    python scripts/move_inline_images.py             # dry run: reads only, changes nothing
    python scripts/move_inline_images.py --apply     # move them
    python scripts/move_inline_images.py --restore   # put every moved test back

--apply and --restore need supabase/migrations/20261025150000_move_question_images.sql.

For each test, --apply:
  1. converts a copy of questions / sections / institution_logo, uploading each picture;
  2. downloads every new URL and checks the bytes are the original picture;
  3. checks nothing else changed: putting the original data URLs back into the copy gives
     exactly the stored test;
  4. calls swap_test_inline_images, which saves the old values to tests_image_backup and
     writes the new ones in one transaction, and only if the test hasn't changed since it
     was read. A test that fails any check is left as it is and listed at the end.
"""

import argparse
import copy
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx

from app.core.config import settings
from app.core.database import supabase
from app.services.question_images import (
    IMAGE_FIELDS, find_images, plan_image, public_url, store_image, swap_in_urls,
)

COLS = "id, title, " + ", ".join(IMAGE_FIELDS)


def size(values):
    return len(json.dumps([values.get(f) for f in IMAGE_FIELDS], ensure_ascii=False).encode())


def kb(n):
    return f"{n / 1024:,.0f} KB"


def put_back(value, originals):
    """Undo swap_in_urls: each URL we created back to its data URL."""
    if isinstance(value, str):
        for url, data_url in originals.items():
            if url in value:
                value = value.replace(url, data_url)
        return value
    if isinstance(value, dict):
        return {k: put_back(v, originals) for k, v in value.items()}
    if isinstance(value, list):
        return [put_back(v, originals) for v in value]
    return value


def list_tests(apply_mode):
    try:
        return supabase.rpc("tests_with_inline_images").execute().data or []
    except Exception as e:
        if apply_mode:
            sys.exit(f"tests_with_inline_images() is missing; run the SQL file first. ({e})")
    # Dry run before the SQL: scan every test.
    print("(SQL not applied yet: scanning every test)")
    found, start = [], 0
    while True:
        rows = supabase.table("tests").select(COLS).order("id").range(start, start + 19).execute().data or []
        found += [{"id": r["id"], "fingerprint": None, "row": r} for r in rows if find_images(r)]
        if len(rows) < 20:
            return found
        start += 20


def verify_download(client, url, data):
    res = client.get(url)
    return res.status_code == 200 and res.content == data


def move(apply_mode):
    tests = list_tests(apply_mode)
    print(f"{len(tests)} tests hold base64 pictures\n")
    totals = {"tests": 0, "pictures": 0, "before": 0, "after": 0}
    uploaded, verified, problems = set(), set(), []
    http = httpx.Client(timeout=60.0)

    for item in tests:
        row = item.get("row") or supabase.table("tests").select(COLS).eq("id", item["id"]).limit(1).execute().data[0]
        title = (row.get("title") or "")[:48]
        original = {f: row.get(f) for f in IMAGE_FIELDS}
        found = find_images(original)
        plans = {b64: p for b64, p in ((b64, plan_image(b64)) for b64 in found) if p}
        stays = len(found) - len(plans)
        urls = {b64: public_url(path) for b64, (path, _, _) in plans.items()}
        converted = {f: swap_in_urls(original[f], urls) for f in IMAGE_FIELDS}
        before, after = size(original), size(converted)
        note = f" ({stays} stay inline)" if stays else ""
        print(f"{row['id']}  {title:<48}  {len(plans):>3} pictures{note}  {kb(before):>10} -> {kb(after)}")

        if not plans:
            continue
        if apply_mode:
            todo = [(path, data, ct) for path, data, ct in plans.values() if path not in uploaded]
            with ThreadPoolExecutor(max_workers=6) as pool:
                stored = list(pool.map(lambda p: (p[0], store_image(supabase, *p)), todo))
            uploaded.update(path for path, ok in stored if ok)
            failed = [path for path, ok in stored if not ok]
            if failed:
                problems.append((row["id"], title, f"{len(failed)} uploads failed"))
                continue

            check = [(public_url(path), path, data) for path, data, _ in plans.values() if path not in verified]
            with ThreadPoolExecutor(max_workers=6) as pool:
                good = list(pool.map(lambda c: (c[1], verify_download(http, c[0], c[2])), check))
            verified.update(path for path, ok in good if ok)
            if any(not ok for _, ok in good):
                problems.append((row["id"], title, "a downloaded picture didn't match"))
                continue

            originals = {urls[b64]: found[b64] for b64 in plans}
            if put_back(copy.deepcopy(converted), originals) != original:
                problems.append((row["id"], title, "something besides pictures would change"))
                continue

            result = supabase.rpc("swap_test_inline_images", {
                "p_id": row["id"], "p_fingerprint": item["fingerprint"],
                "p_questions": converted["questions"], "p_sections": converted["sections"],
                "p_logo": converted["institution_logo"],
            }).execute().data
            if result != "moved":
                problems.append((row["id"], title, f"not moved: {result}"))
                continue

        totals["tests"] += 1
        totals["pictures"] += len(plans)
        totals["before"] += before
        totals["after"] += after

    verb = "Moved" if apply_mode else "Would move"
    print(f"\n{verb} {totals['pictures']} pictures in {totals['tests']} tests: "
          f"{kb(totals['before'])} -> {kb(totals['after'])}")
    if apply_mode:
        print(f"Uploaded {len(uploaded)} files to test-images")
    if problems:
        print(f"\n{len(problems)} tests left as they were:")
        for test_id, title, why in problems:
            print(f"  {test_id}  {title}  {why}")


def restore():
    rows = supabase.table("tests_image_backup").select("test_id").execute().data or []
    print(f"{len(rows)} tests in tests_image_backup")
    for r in rows:
        result = supabase.rpc("restore_test_inline_images", {"p_id": r["test_id"]}).execute().data
        print(f"  {r['test_id']}  {result}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="move the pictures")
    mode.add_argument("--restore", action="store_true", help="put every moved test back")
    args = parser.parse_args()

    if not settings.SUPABASE_SERVICE_KEY:
        sys.exit("SUPABASE_SERVICE_KEY is not set in backend/.env")
    print(f"Project: {urlparse(settings.SUPABASE_URL).hostname}")
    if args.restore:
        restore()
    else:
        move(args.apply)
