# Security Hardening Plan — TestoZa Backend

## Threat Assessment Summary

I analyzed all 5 threats from the security report against your **current** infrastructure. Here is the verdict:

| # | Threat | Still Valid? | Severity |
|---|--------|-------------|----------|
| 1 | Hardcoded Secrets in Cloud Run | ✅ YES | 🔴 Critical |
| 2 | Public Unauthenticated Access | ⚠️ Partially | 🟡 Medium |
| 3 | Default Service Account | ✅ YES | 🟡 Medium |
| 4 | Placeholder Image & Build Config | ❌ NO — Fixed | ✅ Resolved |
| 5 | Port 8080 / Running as Root | ✅ YES | 🟠 High |
| NEW | No `.dockerignore` file | ✅ YES | 🔴 Critical |
| NEW | 5 Tables with RLS Disabled | ✅ YES | 🔴 Critical |

---

## Fixes Already Done In Code (by Antigravity)

- ✅ Created `.dockerignore` — stops `.env`, `.git/`, etc. from leaking into the Docker image
- ✅ Hardened `Dockerfile` — added non-root `appuser` to prevent root-level exploits
- ✅ Generated a real `SECRET_KEY` in `.env` — replaced the placeholder

---

## Remaining Fixes — YOUR ACTION NEEDED

### 1. 🔴 Move Secrets to GCP Secret Manager

**Step-by-step:**
1. Go to: https://console.cloud.google.com/security/secret-manager?project=nkc-test-2-0
2. Enable the Secret Manager API if not already enabled
3. Create secrets for each key:
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY`
   - `SECRET_KEY`
   - `RAZORPAY_KEY_ID` (if applicable)
   - `RAZORPAY_KEY_SECRET` (if applicable)
4. In Cloud Run → Edit Service → "Variables & Secrets" tab:
   - Click "Reference a Secret" instead of plain "Value"
   - Select the secret you created and the version (use "latest")
5. Deploy the new revision

---

### 2. 🟡 Create a Dedicated Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=nkc-test-2-0
2. Click **Create Service Account**
3. Name: `cloudrun-backend`
4. Grant these roles:
   - `Secret Manager Secret Accessor`
   - `Cloud Run Invoker`
5. In Cloud Run → Edit Service → "Security" tab → change the service account to `cloudrun-backend`

---

### 3. 🔴 Enable RLS on 5 Exposed Tables

> **WARNING**: Enable RLS ONLY after adding policies, or your app will break.

These tables currently have RLS **disabled** and are fully exposed:
- `public.tests`
- `public.test_results`
- `public.support_messages`
- `public.test_votes`
- `public.question_reports`

**Discuss with Antigravity before running this.** We need to add the correct policies first.

---

## Status Tracking

- [x] `.dockerignore` created
- [x] Dockerfile non-root user added
- [x] `SECRET_KEY` replaced with secure random value
- [ ] GCP Secret Manager migration
- [ ] Dedicated Service Account
- [ ] RLS policies for 5 tables
