# Cleanup Walkthrough

## What Changed

### Files Moved to `recycle/`
All removed files are safely in `recycle/` — nothing was deleted.

| Location | Files Moved | Why |
|---|---|---|
| [recycle/backend/tests_legacy.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/recycle/backend/tests_legacy.py) | 1 file (515 lines) | Not imported anywhere |
| `recycle/backend/answer_resolution/` | 4 files | Module never called by any router |
| `recycle/backend/ai_preview_importer_old/` | 17 files | Old v1/v2/enhanced pipelines; only `pdf_vision_pipeline.py` is active |
| `recycle/backend/stale_files/` | 4 files (`=5.3.0`, `cf-requirements.txt`, `wrangler.toml`, `test_app.py`) | Broken pip artifact, Cloudflare configs |
| `recycle/frontend_lib/image-utils.ts` | 1 file | Not imported by any component |
| `recycle/root_scripts/` | 15 files | One-off debug/migration/tracing scripts |

### Code Fixes

**[requirements.txt](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/requirements.txt)** — Removed 5 unused deps:

```diff
-email-validator
-python-jose[cryptography]
-passlib[bcrypt]
-pytest
-pdfplumber
```

**[main.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/main.py)** — Removed duplicate imports of `analytics` (3→1) and `classes` (2→1)

**[rate_limiter.py](file:///d:/Yuga%20Yatra/nkc-Test-platform/backend/app/utils/rate_limiter.py)** — Fixed memory leak: added global cleanup every 5 minutes to purge stale client IP entries

### Deleted (not recoverable)
- Frontend stale build artifacts: `build_error.txt`, `div_closes.txt`, `div_opens.txt`, `lint_errors.txt`, `lint_output.txt`, `tsc_errors.txt`, `tsc_output.txt`, `response.json`, `test.html`, vite timestamp files (~800KB total)

## Expected Impact on Railway
- **~20-30MB less RAM** from removed pip dependencies
- **Memory stabilization** from rate_limiter fix (no more unbounded dict growth)
- **Faster deploys** with fewer files and dependencies to install
