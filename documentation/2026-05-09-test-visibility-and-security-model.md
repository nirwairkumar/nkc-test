# Test Platform Visibility and Security Model

**Date:** May 9, 2026
**Topic:** Implementation of strict visibility guards and results access control.

---

## Overview
This document details the visibility and security model implemented for the test-cards of Test Platform. The system supports three distinct visibility states for tests (`Public`, `Private`, and `Conduct-Exam`) and strictly controls who can view the test, access the test taking environment, and view the submitted results.

These rules are enforced at both the Backend (FastAPI routing, Supabase data fetching, and Caching layer) and the Frontend (React UI and Client-side routing guards).

---

## 1. Visibility States

### Public (`visibility: 'public'`)
- **Access:** Available to anyone.
- **URL Routing:** Accessible via its standard slug (e.g., `/test/math-quiz`).
- **Creator Dashboard:** The test card is visible to the creator.
- **Results Tracking:** Results are private to the individual student taking the test. The "View Results" panel is still **visible** to the creator's dashboard all the time but only result shows for the students who have given the test in conducted mode (unlisted). And for students who is submitting the test in public test-cards should not reflect creator's dashboard result-page. (public tests, as they are not meant for individual student result tracking.)

### Private (`visibility: 'private'`)
- **Access:** Strictly restricted to any individual or user via any type of links (public-slug, UUID or conduct-slug). Only one person can see from their dashboard a who is the creator of the test.
- **URL Routing:** 
  - Attempts to access via slug (`/test/{slug}`) return a `404 Not Found`.
  - Attempts to access via UUID (`/test-intro/{uuid}`) return a `404 Not Found`.
  - Attempts to access via conduct-slug (`/test/{conduct_slug}`) return a `404 Not Found`.
  - create a new slug for private tests and access via that slug only(e.g., /test/unlisted-{private_slug}). set into <view> button on creator dashboard's cards of private tests.
  - share option should be disabled for private tests.
  - Old public slugs do not resolve to private tests.
- **Creator Dashboard:** The test is visible in the creator's dashboard only. The creator can preview the test via the new slug (e.g., /test/unlisted-{private_slug}) because the backend specifically grants an owner bypass.

### Conduct Exam Mode (`visibility: 'unlisted'`, `conduct_exam.enabled: true`)
- **Access:** Only Users/students can access this test by conduct mode link only. (the `conduct_slug`).
- **URL Routing:**
  - Accessible via exact slug match (`/test/{conduct_slug}`).
  - Attempts to access the test via its original public slug will fail.
  - Attempts to access the test via UUID (`/test-intro/{uuid}`) will also fail to all users and return a `404 Not Found`.
- **Creator Dashboard:** The test is segregated into an "Active Exams" or "Inactive Exams" section. 
- **Results Tracking:** The creator is granted exclusive access to view cohort results for exams in this mode.
- when creator choose to `exit and make public`: The test `visibility` changes to `public` and `conduct_exam.enabled` changes to `false`. Old conduct slug do not work and old slug `custom_slug` become the new slug. And it also removed from the "Active Exams" section. student given the test can see in their test-history and view result from there.
- when creator choose to `exit and make private`: The test `visibility` change to `private` and `conduct_exam.enabled` changes to `false`. Students can't see this test history in their test-history page.
---

## 2. Backend Enforcement Mechanisms

### Route: `/tests/slug/{slug}`
1. **Cache Layer Validation:** Before returning a cached test, the system inspects `visibility`. If a test is cached as `private`, it raises an immediate 404.
2. **Slug Matching:** For conduct-exam tests (unlisted), the system relies on the fact that the slug itself serves as the access key. If the slug matches, access is granted.
3. **Hard Blocking:** Any test returning `visibility == "private"` triggers an immediate 404, preventing slug-based enumeration or access via legacy links.

### Route: `/tests/{test_id}` (UUID)
1. **Owner Bypass:** The backend extracts the `Authorization: Bearer <token>` from incoming requests. If the requester's ID matches the test's `created_by` field, they are granted a bypass to view private and unlisted tests.
2. **Public Blocking:** If the requester is not the owner:
   - `private` tests raise a 404.
   - `unlisted` tests accessed by UUID raise a 404 (forcing students to use the specific conduct slug).

### Route: `/attempts/test/{test_id}` (Results Access)
1. **Ownership Check:** The endpoint verifies that the requester is the `created_by` owner of the requested test (or a platform admin).
2. **Mode Check:** The endpoint verifies that the test has `conduct_exam: true` in its settings. Requesting results for non-conduct tests yields a `403 Forbidden`.

---

## 3. Frontend UI & Routing Guards

### `TestIntroPage.tsx`
Provides a client-side safety net in the event of stale links or bypassed checks.
- If a test is `private` and the viewer is not the creator, renders a "Test Not Available" screen.
- If a test is `conduct_exam` and accessed via the wrong route pattern by a non-creator, renders an "Access Restricted" screen instructing the user to use the link provided by their examiner.

### `UserTestManager.tsx` & `UserTestCard.tsx`
- **Result Button Conditional Rendering:** The "View Results" action in dropdown menus and action bars is conditionally hidden unless `test.settings.conduct_exam.enabled === true`.
- **Active Exam Highlighting:** Conduct-exam tests feature dedicated "Results" buttons in the footer for faster access to cohort data.

### `TestSettingsPanel.tsx`
- "View Results" buttons within the settings interface are hidden for non-conduct tests, ensuring visual consistency with backend capabilities.
