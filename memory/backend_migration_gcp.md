# Backend Migration: Railway to GCP Cloud Run

## Date: 2026-05-06

### Overview
Successfully migrated the FastAPI backend from Railway to Google Cloud Run to handle higher scale (500+ concurrent users) and bypass memory limitations.

### Infrastructure Changes
- **Backend Host**: Google Cloud Run
- **Database**: Supabase (PostgreSQL) - No changes to the database.
- **Authentication**: Supabase Auth - No changes to the auth structure.
- **Domain/Proxy**: Cloudflare is used to proxy traffic to the Cloud Run instance.

### Frontend Updates
- Updated the API endpoint to point to the new GCP-hosted backend.
- Backend API key has been securely updated in the frontend environment.
- Pushed changes to `https://github.com/nirwairkumar/nkc-test-2.0-frontend.git` (Revision `26a3a3a`) to trigger redeployment.

### Verification
- Backend is confirmed running on Cloud Run.
- Frontend push completed.
- Integration test pending final confirmation from the user on the live site.
