# Implementation Plan - Supabase Proxy Refactor

This plan outlines the steps to move all Supabase interactions from the frontend to the backend to solve DNS-level blocking on mobile networks and improve security.

## User Review Required

> [!IMPORTANT]
> This is a major architectural change. The frontend will no longer communicate with `supabase.co` directly. All auth and database requests will be proxied through `api.testoza.com`.

## Proposed Changes

### Backend (FastAPI)

#### [NEW] [auth.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/routers/auth.py)
- Implement proxy endpoints for Supabase Auth:
  - `POST /api/auth/login` (Sign in with password)
  - `POST /api/auth/register` (Sign up)
  - `POST /api/auth/logout` (Sign out)
  - `GET /api/auth/me` (Get current user/session)
  - `POST /api/auth/password-reset` (Reset password request)
  - `POST /api/auth/password-update` (Update password)

#### [NEW] [storage.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/routers/storage.py)
- Implement proxy endpoints for Supabase Storage:
  - `POST /api/storage/upload` (Upload file to specific bucket)

#### [MODIFY] [main.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/main.py)
- Include new `auth` and `storage` routers.
- Update CORS configuration to allow specific origins (`testoza.com`).
- Clean up the existing `/api/login` and `/api/me` placeholders.

#### [MODIFY] [read.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/routers/tests/read.py)
- Add a new endpoint `POST /api/tests/batch` to fetch multiple tests by ID.

### Frontend (React)

#### [MODIFY] [apiClient.ts](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/lib/apiClient.ts)
- Update to manage authentication headers independently of the Supabase JS client.
- Always use the backend URL for all requests.

#### [MODIFY] [AuthContext.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/contexts/AuthContext.tsx)
- Replace direct `supabase.auth` calls with calls to the new backend `/api/auth` endpoints.
- Handle session state manually based on backend responses.

#### [MODIFY] [useAuthActions.ts](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/hooks/useAuthActions.ts)
- Update all auth actions to use the backend API.

#### [MODIFY] [ProfilePage.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/pages/ProfilePage.tsx) & [OnboardingPage.tsx](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/pages/OnboardingPage.tsx)
- Update profile and avatar update logic to use backend endpoints.

#### [DELETE] [supabaseClient.ts](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/lib/supabaseClient.ts)
- Remove the Supabase JS client configuration.

#### [REFACTOR] All Components
- Search and replace any remaining `supabase.` calls with backend API calls.

## Verification Plan

### Automated Tests
- Run `npm run build` in the frontend to ensure no type errors from missing `supabase` variables.

### Manual Verification
- Test User Login/Signup flow.
- Test Profile Update and Avatar Upload.
- Test Test Feed loading.
- Test creating a new test (Test Builder).
- Test Attempting a test and receiving results.
