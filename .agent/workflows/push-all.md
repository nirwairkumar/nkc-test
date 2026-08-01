---
description: Push all changes to the four project repositories (Root, Frontend, Backend, and Frontend Admin)
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

4. **Pushing Frontend Admin**
// turbo
```bash
cd frontend-admin && git add . && git commit -m "{{message}}" && git push origin main
```

5. **Pushing Root**
// turbo
```bash
git add . && git commit -m "{{message}}" && git push origin main
```

---
**Usage**: Call this workflow when multiple components have been modified.
