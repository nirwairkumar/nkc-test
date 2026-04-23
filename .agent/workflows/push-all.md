---
description: Push all changes to the three project repositories (Root, Frontend, and Backend)
---

# Sync and Push All Repositories

This workflow automates the process of staging, committing, and pushing changes across the multi-repository setup.

### Steps:

1. **Staging and Committing (Root)**
   - Staging all changes in the root directory.
   - User will be prompted for a commit message.

2. **Pushing Backend**
// turbo
```bash
cd backend && git add . && git commit -m "{{message}}" && git push origin main
```

3. **Pushing Frontend**
// turbo
```bash
cd frontend && git add . && git commit -m "{{message}}" && git push origin main
```

4. **Pushing Root**
// turbo
```bash
git add . && git commit -m "{{message}}" && git push origin main
```

---
**Usage**: Call this workflow when multiple components have been modified.
