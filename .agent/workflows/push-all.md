---
description: Push all changes to the four project repositories (Root, Frontend, Backend, and Frontend Admin)
---

# Sync and Push All Repositories

This workflow automates the process of staging, committing, and pushing changes across the multi-repository setup.

> **A push is a deploy.** Pushing `backend`, `frontend` or `frontend-admin` starts that app's deployment automatically.
> The backend deploy takes several minutes, so when a change needs **"deploy backend first"**, push the backend,
> **wait 5 minutes**, then push the frontend / admin. Otherwise the new frontend goes live calling backend code
> that isn't deployed yet.

### Order

- **Backend changed AND frontend/admin depend on it** (new endpoint, new field, changed response):
  backend → wait 5 min → frontend → frontend-admin → root.
- **Only one side changed** (frontend-only, admin-only, backend-only): push it straight away, no wait.
- **Worker changes** ship after the frontend they depend on.
- Root (monorepo) push does not deploy anything; push it last.

### Steps:

1. **Staging and Committing (Root)**
   - Staging all changes in the root directory.
   - User will be prompted for a commit message.

2. **Pushing Backend** (deploy starts on push)
// turbo
```bash
cd backend && git add . && git commit -m "{{message}}" && git push origin main
```

3. **Wait 5 minutes** if the frontend/admin changes need the new backend. Skip if they don't.

4. **Pushing Frontend** (deploy starts on push)
// turbo
```bash
cd frontend && git add . && git commit -m "{{message}}" && git push origin main
```

5. **Pushing Frontend Admin** (deploy starts on push)
// turbo
```bash
cd frontend-admin && git add . && git commit -m "{{message}}" && git push origin main
```

6. **Pushing Root**
// turbo
```bash
git add . && git commit -m "{{message}}" && git push origin main
```

---
**Usage**: Call this workflow when multiple components have been modified.
