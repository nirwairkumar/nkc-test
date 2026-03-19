# Walkthrough: Background Auth Token Refresh

The silent token refresh feature has been fully implemented! This prevents active sessions from failing when a user spends over 1 hour taking a test or building one.

## Changes Made

1. **Backend**: Added `POST /api/auth/refresh` endpoint in [auth.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/routers/auth.py) that utilizes `supabase.auth.refresh_session()`.
2. **Frontend API ([authApi.ts](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/lib/authApi.ts))**: Added a [refreshToken](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/lib/authApi.ts#29-34) method.
3. **Frontend Interceptor ([apiClient.ts](file:///d:/Yuga%20Yatra/nkc-Test-platform/frontend/src/lib/apiClient.ts))**: Re-wrote the Axios response interceptor:
   - Catches `401 Unauthorized` responses globally.
   - Pauses other outgoing requests to prevent multiple refresh calls (using a `failedQueue`).
   - Requests a new session via `/api/auth/refresh` using the saved `testoza_refresh_token`.
   - On success, seamlessly updates `localStorage` and replays the failed requests.
   - On failure (e.g., refresh token expired after extreme inactivity), it forces a clean logout and returns the user to `/login`.

## Manual Verification Steps

You can verify the interceptor works seamlessly by artificially expiring your token:

1. Log into your dashboard (`/my-tests` or `/dashboard`).
2. Open Chrome DevTools (F12) -> **Application** Tab -> **Local Storage**.
3. Find the key `testoza_token` and double click its value. 
4. **Delete** a few characters from the end of the token string and press Enter (this makes the token cryptographically invalid, simulating an expiration).
5. **Without reloading the page**, click a button that fetches data (e.g., click "Settings", or try to create/edit a test, or save solutions).
6. **Expected Result**: 
   - Your action will succeed perfectly! 
   - Behind the scenes (in the Network tab), you will see the first request fail with a `401`, immediately followed by a successful `POST /api/auth/refresh`, and then a successful replay of your original request. 
   - Check Local Storage again, and you'll see your `testoza_token` was automatically fixed/updated!
