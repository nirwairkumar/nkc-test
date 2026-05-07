# Implementation Plan: Supabase Egress Optimization (Zero Feature Loss)

After a deep scan of your backend codebase, I have found several endpoints that are pulling full tables or heavy JSON objects from the database to the Python server, only to discard most of the data before sending it to the frontend.

This plan details precise SQL selection updates to significantly reduce your Supabase bandwidth while maintaining **100% of the existing UI and functionality.**

## Optimization Targets

### 1. Analytics Aggregation (`backend/app/routers/analytics/stats.py`)
Currently, analytics endpoints pull every single row (visitors, page views, sessions) to the backend to calculate totals dynamically in Python.
*   **Change:** Refactor endpoints to use Postgres aggregation functions (e.g. `count="exact"` parameter in Supabase, or grouped counts via Supabase RPC). Wait, Supabase `select` method with `count="exact"` doesn't require fetching data if we set `head=True`.
*   **Endpoints Affected:** `/overview`, `/daily`, `/pages`, `/referrers`.
*   *(Note: This is the most critical fix. Instead of downloading 10,000 page view rows, we download a single integer: `{"count": 10000}`)*.

### 2. Leaderboards & Attempts (`backend/app/routers/attempts.py`)
*   **The Issue:** `get_test_attempts` reads `select("*")` which includes the massive `answers` JSON object for every student attempt on a test, then discards it for free users.
*   **Change:** Modify the query to `.select("id, test_id, user_id, score, created_at, metadata")`. Exclude the `answers` column entirely, as leaderboards only need scores and metadata (names).
*   **The Issue:** `get_batch_status` pulls `tests("*, questions, sections")` to calculate `total_max_marks`.
*   **Change:** Use a selective column list for testing or use cached max marks where possible, although this is harder to avoid if max_marks isn't stored statically. we will trim out unnecessary columns.

### 3. Combined Sessions (`backend/app/routers/combined_sessions.py`)
*   **The Issue:** Multiple lookup methods use `.select("*")` on `anon_test_attempts` and `test_registrations`.
*   **Change:** Replace `"*"` with the specific columns needed by the frontend dashboard (e.g. `id, test_id, user_id, status, score, completion_percent, started_at`). This removes any large JSON objects from egress traffic.

### 4. User Posts & Profiles (`backend/app/routers/posts.py`)
*   **The Issue:** The `/user/{user_id}` route fetches `select("*")` for all posts. Posts contain heavy HTML content.
*   **Change:** Replace `"*"` with `id, author_id, title, excerpt, created_at, tags, is_published, metadata`. This prevents downloading the body text for lists of posts.

## Verification Plan

### Automated/Manual Verification
1.  **Code Review:** Verify that every modified `.select()` statement includes all required columns so that the frontend Pydantic models and react pages do not break (Zero Feature Loss).
2.  **API Testing:** After implementation, I will run Python tests or local curl commands against the modified endpoints (`/analytics/overview`, `/attempts/test/{test_id}`) to verify they return valid HTTP 200 responses with the exact same JSON shape expected by the frontend.
3.  **Logs Verification:** Verify there are no `KeyError` or missing attribute errors in the backend console logs when these routes are hit.
