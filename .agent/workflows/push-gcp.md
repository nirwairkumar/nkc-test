---
description: Push all changes to the GCP migration branch across all repositories
---

# Push to GCP Migration Branch

This workflow automates the process of staging, committing, and pushing changes specifically to the `gcp-migration` branch. Use this when working on the GCP transition.

### Steps:

1. **Staging and Committing (Root)**
   - Staging all changes in the root directory.
   - User will be prompted for a commit message.

2. **Pushing Backend (GCP Branch)**
// turbo
```bash
cd backend && git checkout gcp-migration && git add . && git commit -m "{{message}}" && git push origin gcp-migration
```

3. **Pushing Frontend (GCP Branch)**
// turbo
```bash
cd frontend && git checkout gcp-migration && git add . && git commit -m "{{message}}" && git push origin gcp-migration
```

4. **Pushing Root (GCP Branch)**
// turbo
```bash
git checkout gcp-migration && git add . && git commit -m "{{message}}" && git push origin gcp-migration
```

---
**Usage**: Call this workflow specifically for GCP migration work.
