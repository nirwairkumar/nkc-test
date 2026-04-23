# Project Repository Map

This document serves as the "Source of Truth" for the multi-repository structure of the NKC Test Platform. It ensures that any AI coding assistant or developer knows exactly where to push changes.

## 1. Root / Integration Repository
- **Local Path**: `d:\Yuga Yatra\nkc-Test-platform`
- **Remote (origin)**: `https://github.com/nirwairkumar/nkc-test.git`
- **Purpose**: Contains the full project structure, infrastructure files, and deployment configurations. Acts as the master integration repo.

## 2. Frontend Repository
- **Local Path**: `d:\Yuga Yatra\nkc-Test-platform\frontend`
- **Remote (origin)**: `https://github.com/nirwairkumar/nkc-test-2.0-frontend.git`
- **Purpose**: Dedicated repository for the React/Vite-based frontend application.

## 3. Backend Repository
- **Local Path**: `d:\Yuga Yatra\nkc-Test-platform\backend`
- **Remote (origin)**: `https://github.com/nirwairkumar/nkc-test-2.0-backend.git`
- **Purpose**: Dedicated repository for the FastAPI backend and database migrations.

---

## Sync Instructions
When making global changes:
1.  **Backend**: Push from `backend/` to `nkc-test-2.0-backend`.
2.  **Frontend**: Push from `frontend/` to `nkc-test-2.0-frontend`.
3.  **Root**: Push from the root directory to `nkc-test`.

> [!TIP]
> Use the `/push-all` workflow to automate this process in one command.
