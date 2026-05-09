# Test Card Clone Feature Documentation

**Date:** May 09, 2026

## Overview
A "Clone" (Fork) feature has been implemented allowing subscribed Teachers and Institutions to copy public test cards into their own private creator dashboards. This enables educators to use existing public tests as a foundational template, which they can independently modify, conduct, and analyze without affecting the original creator's data or polluting public feeds.

## 1. Database Schema Changes
A new migration (`supabase/migrations/20260509_add_clone_columns.sql`) was created to support tracking cloned tests.

**Added Columns to `tests` table:**
- `is_cloned` (BOOLEAN): Defaults to `FALSE`. Used to quickly filter out cloned tests from public feeds.
- `cloned_from_id` (UUID): Foreign key referencing the original test `id`. Used for attribution and tracing.

**Indexes:**
- Added partial indexes on `is_cloned` and `cloned_from_id` to ensure optimal performance when filtering out cloned content.

## 2. Backend Implementation (FastAPI)

### Clone Endpoint (`POST /tests/{test_id}/clone`)
Located in `backend/app/routers/tests/write.py`, this endpoint securely handles the deep copying of a test.

**Validation & Security Constraints:**
- **Visibility:** Only tests with `visibility = 'public'` can be cloned.
- **Ownership:** Creators cannot clone their own tests.
- **Premium Check:** The user must have an active premium subscription. The backend validates this by checking either `app_settings.unlock_all_premium` or the user's `profiles.premium_expiry`.

**Data Isolation:**
- Generates a deep copy of the test but actively strips out identity and conduct fields (`created_at`, `slug`, `og_image`, `class_id`, `custom_id`, creator branding).
- Safely strips `conduct_exam` from the `settings` JSON to ensure the cloner starts with a clean slate.
- Enforces `is_public = False`, `visibility = "private"`, and `is_cloned = True` on the new clone.

### Profile Feed Isolation
To ensure a creator's public profile page is not polluted by cloned tests, an exclusion filter was added.
- **Endpoint Updated:** `creators.py` (`GET /creators/{creator_id}`) and `tests/read.py` (`GET /tests/user/{user_id}`).
- **Logic:** Appends `.eq("is_cloned", False)` to the query when `profile_view=true` is requested.

## 3. Frontend Implementation (React/TypeScript)

### Access Control Logic
The clone button is explicitly restricted and only visible to users who meet the following criteria:
1. They are not the owner of the test (`isOwnTest = false`).
2. They have a Creator role. This is validated by checking if `profile.designation` is `'Teacher'` or `'Institution'`, or if `profile.is_creator === true`. Students are strictly excluded from seeing the clone feature.

### UI Components
1. **Clone Button placement:**
   - Integrated into both `IndependentTestCard.tsx` (Feed) and `TestCard.tsx` (Creator Profile).
   - The button uses a `GitFork` icon.
   - It is intentionally placed in the `CardFooter`, right beside the Upvote/Downvote actions and just before the "Open/Resume" button, providing a consistent user experience.

2. **`CloneTestDialog.tsx` (Confirmation Modal):**
   - Displays a clean preview of what cloning means (creating a private copy, requires premium).
   - Evaluates the user's `isPremium` status. If the user is not subscribed, the dialog acts as a paywall, showing a Crown icon and redirecting them to the `/pricing` page.

3. **Dashboard Badging:**
   - Updated `UserTestCard.tsx` to display a subtle violet "Clone" badge with a `GitFork` icon so the user can easily identify which tests in their private dashboard were cloned from others.

4. **API Integration (`testsApi.ts`):**
   - Added `cloneTest()` utility to dispatch the POST request.
   - Upgraded `fetchTestsByCreator` to accept a `profileView` parameter to support the backend isolation logic.

## Summary of Usage
- **Who can see the button?** Teachers and Institutions browsing *other* creators' public tests.
- **What happens on click?** A confirmation modal appears. If they are Premium, it clones. If not, it redirects to the pricing page.
- **Where does the clone go?** Straight to the cloner's `ManageTests` dashboard as a private, independent test. It will never appear on their public profile page.
