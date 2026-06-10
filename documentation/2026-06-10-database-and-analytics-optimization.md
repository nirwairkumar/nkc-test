# Database and Analytics Egress Optimization Guide

This document explains the database egress and query optimization strategies implemented on the TestoZa platform. It is designed to help new team members and interns understand how we handle analytics tracking, list projections, and egress footprint control.

---

## 1. Analytics & Tracking Egress Control

### The Challenge
A high-traffic platform tracks user footprints (page views, session start/end, bounce rate) continuously. However, if not designed carefully, this tracking can consume massive database egress. 

### The Solutions Implemented

#### A. Lifetime Visits (`total_visits`) vs. Page Views (`total_page_views`)
* **`total_visits`**: Represents the count of unique, separate sessions/visits a visitor makes over their lifetime.
* **`total_page_views`**: Represents individual page loads across all visits.
* **Optimization**: 
  * Previously, `total_visits` was incrementing on every single page view event.
  * We modified the backend tracking logic (`backend/app/routers/analytics/track.py`) to verify if the incoming event belongs to an existing session. 
  * `total_visits` is incremented **only** when a **new session** is created for an existing visitor.

#### B. Eliminating Returned Payload Egress (`returning='minimal'`)
* By default, Supabase (PostgREST) returns the complete updated/inserted row payload (`RETURNING *`) after executing `INSERT` or `UPDATE` statements. For pages receiving thousands of hits, returning full user-agent details, city/country data, and session states wastes significant bandwidth.
* **Optimization**: We pass `returning='minimal'` to all tracking writes in the backend where the return data is not consumed:
  ```python
  # Zero payload returned to backend server:
  db.table("visitors").update(update_payload, returning='minimal').eq("id", visitor_id).execute()
  db.table("page_views").insert(page_view_payload, returning='minimal').execute()
  ```
* This reduces the network return size of these queries to exactly **0 bytes** of representation, conserving database egress.

#### C. Lazy-Loading Detailed Paths
* In the **Admin Analytics Dashboard**, list views fetch a summary of visitors.
* Rather than fetching all visitor history details (like timeline page paths) in the primary query, visitor page views are fetched on-demand:
  * The primary fetch returns `page_views: []`.
  * When the admin clicks **"View Pages"**, the frontend lazy-loads the timeline for that specific user via a lightweight dedicated endpoint:
    `GET /api/analytics/visitors/{visitor_id}/pages`

---

## 2. Test Listings & Search Projections

### The Challenge
The `tests` table in the database contains two heavy JSON columns:
1. `questions`: Contains full questions data, multiple choices, correct options, LaTeX, solutions, and hints.
2. `sections`: Contains instructions, sectional boundaries, and structural settings.

If a dashboard loads these arrays when simply displaying a list of test cards, it will retrieve megabytes of unnecessary JSON data, saturating database egress limits.

### The Solutions Implemented

#### A. Strict Column Projections
For list feeds, creator dashboards, and admin tables, we explicitly query only the required metadata columns:
* **Creator Dashboard (`/my-tests` -> `UserTestManager.tsx`)**:
  ```python
  # read.py - get_user_tests
  query_default = db.table("tests")\
      .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, total_max_marks, ...")
  ```
* **Admin Dashboard (`/manage-tests` -> `ManageTests.tsx`)**:
  ```python
  # admin.py - get_all_tests
  query = db.table("tests")\
      .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, classes(name)")
  ```

#### B. SQL Search Function Optimization
When searching for tests, we execute the Postgres RPC function `search_tests_ranked`. 
* The RPC function returns a virtual table matching a strictly defined signature (excluding the `questions` and `sections` fields).
* This keeps search queries blazing fast and egress-friendly.

---

## 3. Best Practices for Developers & Interns

When writing database queries or modifying the API, follow these guidelines to keep egress footprint minimal:

1. **Never use `select("*")` on Large Tables**: Always explicitly specify the exact fields you need (e.g., `.select("id, title, created_at")`).
2. **Always use `returning='minimal'` on blind writes**: When creating or updating records where you don't need the return response to update state, make sure to add `returning='minimal'`.
3. **Use Triggers for Counts**: Do not select list arrays just to get their count. Use pre-calculated columns updated by database triggers (e.g., `total_questions`, `total_max_marks`).
4. **Lazy-Load Lists**: Use pagination (range queries) and load heavy detailed views only on-demand when a user explicitly opens a detail page.
