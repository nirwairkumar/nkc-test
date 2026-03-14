from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db, supabase
from supabase import Client
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

# ─── Test Funnel Stats ─────────────────────────────────────────
@router.get("/tests/funnel")
async def get_test_funnel(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Returns aggregate funnel stats:
    Total Tests Started -> Submitted -> Abandoned, Average Completion %
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Get all registrations in the time period
        regs = supabase.table("test_registrations")\
            .select("id, status, completion_percentage")\
            .gte("started_at", start_date)\
            .execute()

        data = regs.data or []
        total_started = len(data)
        total_submitted = sum(1 for r in data if r.get("status") == "submitted")
        total_abandoned = sum(1 for r in data if r.get("status") == "abandoned")
        total_in_progress = sum(1 for r in data if r.get("status") == "in_progress")

        avg_completion = 0
        if data:
            avg_completion = round(
                sum(float(r.get("completion_percentage") or 0) for r in data) / len(data), 1
            )

        # Completion rate
        completion_rate = round((total_submitted / total_started * 100), 1) if total_started > 0 else 0

        return {
            "total_started": total_started,
            "total_submitted": total_submitted,
            "total_abandoned": total_abandoned,
            "total_in_progress": total_in_progress,
            "avg_completion_percentage": avg_completion,
            "completion_rate": completion_rate,
        }
    except Exception as e:
        print(f"Error in test funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Abandonment Breakdown ─────────────────────────────────────
@router.get("/tests/abandonment")
async def get_abandonment_analysis(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Returns abandonment reasons and completion % distribution.
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        abandoned = supabase.table("test_registrations")\
            .select("completion_percentage, abandoned_reason")\
            .eq("status", "abandoned")\
            .gte("started_at", start_date)\
            .execute()

        data = abandoned.data or []

        # Reason breakdown
        reasons = {}
        for r in data:
            reason = r.get("abandoned_reason") or "unknown"
            reasons[reason] = reasons.get(reason, 0) + 1

        # Completion percentage distribution (buckets: 0-10, 10-25, 25-50, 50-75, 75-99)
        buckets = {"0-10%": 0, "10-25%": 0, "25-50%": 0, "50-75%": 0, "75-99%": 0}
        for r in data:
            pct = float(r.get("completion_percentage") or 0)
            if pct < 10:
                buckets["0-10%"] += 1
            elif pct < 25:
                buckets["10-25%"] += 1
            elif pct < 50:
                buckets["25-50%"] += 1
            elif pct < 75:
                buckets["50-75%"] += 1
            else:
                buckets["75-99%"] += 1

        return {
            "total_abandoned": len(data),
            "reasons": reasons,
            "drop_off_buckets": buckets,
        }
    except Exception as e:
        print(f"Error in abandonment analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Test Matrix (detailed per-test stats) ─────────────────────
@router.get("/tests/matrix")
async def get_test_matrix(
    days: int = 30,
    limit: int = 50,
    db: Client = Depends(get_db)
):
    """
    Returns detailed per-test statistics:
    - Test title, creator, creation date
    - Start count, submit count, abandon count, avg completion %
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Fetch all registrations
        regs = supabase.table("test_registrations")\
            .select("test_id, user_id, status, completion_percentage, started_at")\
            .gte("started_at", start_date)\
            .execute()
        reg_data = regs.data or []

        # Aggregate per test_id
        test_map = {}
        for r in reg_data:
            tid = r.get("test_id")
            if tid not in test_map:
                test_map[tid] = {
                    "starts": 0,
                    "submitted": 0,
                    "abandoned": 0,
                    "in_progress": 0,
                    "total_pct": 0,
                    "anonymous_count": 0,
                }
            test_map[tid]["starts"] += 1
            test_map[tid]["total_pct"] += float(r.get("completion_percentage") or 0)
            status = r.get("status", "")
            if status == "submitted":
                test_map[tid]["submitted"] += 1
            elif status == "abandoned":
                test_map[tid]["abandoned"] += 1
            elif status == "in_progress":
                test_map[tid]["in_progress"] += 1
            # Check if anonymous (user_id is null or empty)
            if not r.get("user_id"):
                test_map[tid]["anonymous_count"] += 1

        # Fetch test details for the relevant test_ids
        test_ids = list(test_map.keys())
        tests_details = {}
        if test_ids:
            tests_res = supabase.table("tests")\
                .select("id, title, created_by, creator_name, created_at")\
                .in_("id", test_ids[:limit])\
                .execute()
            for t in (tests_res.data or []):
                tests_details[t["id"]] = t

        # Build result
        result = []
        for tid, stats in test_map.items():
            test_info = tests_details.get(tid, {})
            avg_pct = round(stats["total_pct"] / stats["starts"], 1) if stats["starts"] > 0 else 0
            result.append({
                "test_id": tid,
                "title": test_info.get("title", "Unknown / Deleted Test"),
                "creator_name": test_info.get("creator_name", "Unknown"),
                "created_by": test_info.get("created_by"),
                "test_created_at": test_info.get("created_at"),
                "starts": stats["starts"],
                "submitted": stats["submitted"],
                "abandoned": stats["abandoned"],
                "in_progress": stats["in_progress"],
                "avg_completion": avg_pct,
                "anonymous_count": stats["anonymous_count"],
                "completion_rate": round((stats["submitted"] / stats["starts"] * 100), 1) if stats["starts"] > 0 else 0,
            })

        # Sort by starts descending
        result.sort(key=lambda x: x["starts"], reverse=True)
        return result[:limit]

    except Exception as e:
        print(f"Error in test matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── User Matrix (detailed per-user stats) ─────────────────────
@router.get("/users/matrix")
async def get_user_matrix(
    days: int = 30,
    limit: int = 50,
    db: Client = Depends(get_db)
):
    """
    Returns per-user statistics:
    - User name, email
    - Total tests taken, submitted, abandoned
    - Last active date
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        regs = supabase.table("test_registrations")\
            .select("user_id, test_id, status, completion_percentage, started_at")\
            .gte("started_at", start_date)\
            .execute()
        reg_data = regs.data or []

        user_map = {}
        for r in reg_data:
            uid = r.get("user_id") or "anonymous"
            if uid not in user_map:
                user_map[uid] = {
                    "tests_started": 0,
                    "submitted": 0,
                    "abandoned": 0,
                    "in_progress": 0,
                    "total_pct": 0,
                    "last_active": r.get("started_at"),
                    "tests": [],
                }
            user_map[uid]["tests_started"] += 1
            user_map[uid]["total_pct"] += float(r.get("completion_percentage") or 0)
            user_map[uid]["tests"].append(r.get("test_id"))
            status = r.get("status", "")
            if status == "submitted":
                user_map[uid]["submitted"] += 1
            elif status == "abandoned":
                user_map[uid]["abandoned"] += 1
            elif status == "in_progress":
                user_map[uid]["in_progress"] += 1
            # Track last activity
            if r.get("started_at") and r["started_at"] > (user_map[uid]["last_active"] or ""):
                user_map[uid]["last_active"] = r["started_at"]

        # Fetch user profiles for non-anonymous
        real_user_ids = [uid for uid in user_map if uid != "anonymous"]
        profiles_map = {}
        if real_user_ids:
            profiles_res = supabase.table("profiles")\
                .select("id, full_name, email")\
                .in_("id", real_user_ids[:limit])\
                .execute()
            for p in (profiles_res.data or []):
                profiles_map[p["id"]] = p

        result = []
        for uid, stats in user_map.items():
            profile = profiles_map.get(uid, {})
            avg_pct = round(stats["total_pct"] / stats["tests_started"], 1) if stats["tests_started"] > 0 else 0
            result.append({
                "user_id": uid,
                "full_name": profile.get("full_name", "Anonymous" if uid == "anonymous" else "Unknown User"),
                "email": profile.get("email", "—"),
                "tests_started": stats["tests_started"],
                "submitted": stats["submitted"],
                "abandoned": stats["abandoned"],
                "in_progress": stats["in_progress"],
                "avg_completion": avg_pct,
                "last_active": stats["last_active"],
                "unique_tests": len(set(stats["tests"])),
            })

        result.sort(key=lambda x: x["tests_started"], reverse=True)
        return result[:limit]

    except Exception as e:
        print(f"Error in user matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Test Creation Stats ───────────────────────────────────────
@router.get("/tests/creation")
async def get_test_creation_stats(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Returns stats about test creation:
    - Total tests created, by whom, when
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        tests = supabase.table("tests")\
            .select("id, title, created_by, creator_name, created_at, is_public, visibility")\
            .gte("created_at", start_date)\
            .order("created_at", desc=True)\
            .execute()

        data = tests.data or []

        # Daily creation counts for trend
        daily_counts = {}
        for t in data:
            day = t.get("created_at", "")[:10]
            daily_counts[day] = daily_counts.get(day, 0) + 1

        daily_trend = [{"date": k, "count": v} for k, v in sorted(daily_counts.items())]

        return {
            "total_created": len(data),
            "tests": data,
            "daily_trend": daily_trend,
        }
    except Exception as e:
        print(f"Error in test creation stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Visitor Location Stats ───────────────────────────────────
@router.get("/visitors/locations")
async def get_visitor_locations(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Returns aggregated location data from the visitors table.
    Shows which countries and cities users are accessing from.
    """
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        visitors = supabase.table("visitors")\
            .select("country, city")\
            .gte("last_seen_at", start_date)\
            .execute()

        data = visitors.data or []

        # Aggregate by country
        country_counts = {}
        city_counts = {}
        for v in data:
            country = v.get("country") or "Unknown"
            city = v.get("city") or "Unknown"
            country_counts[country] = country_counts.get(country, 0) + 1
            if city != "Unknown":
                city_key = f"{city}, {country}"
                city_counts[city_key] = city_counts.get(city_key, 0) + 1

        # Sort by count descending
        countries = sorted(
            [{"name": k, "visitors": v} for k, v in country_counts.items()],
            key=lambda x: x["visitors"], reverse=True
        )
        cities = sorted(
            [{"name": k, "visitors": v} for k, v in city_counts.items()],
            key=lambda x: x["visitors"], reverse=True
        )[:20]  # Top 20 cities

        return {
            "total_located": len(data),
            "unknown_count": country_counts.get("Unknown", 0),
            "countries": countries,
            "top_cities": cities,
        }
    except Exception as e:
        print(f"Error in visitor locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
