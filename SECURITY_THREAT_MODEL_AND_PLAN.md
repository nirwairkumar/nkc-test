# TestoZa — Security Threat Model & Remediation Plan

**Prepared for:** Nirwair (solo founder / vibe coder)
**Date:** 2026-09-17
**Scope reviewed:** backend (FastAPI on Cloud Run), Supabase (Postgres + RLS + Storage + Auth + Edge Functions), frontend (`app.testoza.com`), admin frontend (`admin.testoza.com`), git history, and the live database (read-only probes with your own keys).

> ⚠️ **Read this first.** Several of these are *actively exploitable right now* against your live site with nothing but the public JavaScript bundle. I did **not** change any code or data. The write-access findings are inferred from your RLS policy files (I deliberately did not run write tests against production). Where I say **"confirmed live"**, I verified it read-only against your real database.
>
> **How this document is organised:** Part 1 is the "fix these this week" list. Part 2 is the full threat catalogue by severity. Part 3 is a step-by-step plan sized for one person. Part 4 is the "do later" hardening list.

---

## Part 0 — The single most important thing to understand

Your backend connects to Supabase using the **service-role key** for *every* request (see [backend/app/core/database.py](backend/app/core/database.py)). The service-role key **bypasses Row-Level Security (RLS) completely**. That means:

1. **For anything that goes through your FastAPI backend, RLS does nothing.** The *only* thing protecting those endpoints is the hand-written `_verify_auth_token` / `_verify_is_admin` checks in Python. Wherever those checks are missing or weak, the data is wide open — RLS will not save you.
2. **RLS still matters for the anon key** that ships in your frontend bundle (`VITE_SUPABASE_PUBLISHABLE_KEY`). Anyone can take that key and talk to `https://ajxtouqthtdenhqcvdft.supabase.co/rest/v1/...` directly, bypassing your backend entirely. Here, RLS is the *only* wall — and I confirmed it is full of holes.

So you have **two separate enforcement layers that are each partially broken**, and they don't back each other up. The plan below fixes both.

---

## Part 1 — Fix this week (the "someone can hurt you today" list)

| # | Threat | Impact | Effort |
|---|--------|--------|--------|
| C1 | **Admin auth can be forged** — JWT signature is never checked in `users.py` & `email_broadcast.py` | Full admin takeover: delete any user, read all data, mass-email your users, steal SMTP creds | ~1 hr |
| C2 | **Database is world-readable via the public anon key** (all user emails, analytics, etc.) | Mass PII/email harvest, competitor scraping, privacy breach | ~0.5–1 day |
| C3 | **Analytics & anonymous-attempt tables are world-writable/deletable** | Anyone can wipe or forge your analytics and tamper with exam submissions | ~1 hr |
| C4 | **Exam answers are sent to the browser and scores are trusted from the browser** | Any test-taker can see correct answers and submit any score they want | ~0.5–1 day |
| C5 | **Privileged endpoints have no auth check** (feature flags, reports, categories, classes, analytics dashboards, AI) | Strangers can flip your global settings, read PII dashboards, and burn your AI/Gemini budget | ~0.5 day |
| H1 | **Live-looking API keys sit in your public GitHub repo history** | Key theft → surprise Gemini/API bills | ~1 hr (rotate) + ~1 hr (scrub) |

Details and fixes for each are in Part 2.

---

## Part 2 — Full threat catalogue

### 🔴 CRITICAL

---

#### C1 — Admin authentication bypass via unsigned JWT ("fast path" decode)

**Where:** [backend/app/routers/users.py:22-33](backend/app/routers/users.py) and [backend/app/routers/email_broadcast.py:40-50](backend/app/routers/email_broadcast.py)

**What's wrong:** To save ~300ms, these two routers decode the JWT *without verifying its signature*:

```python
payload = json.loads(base64.b64decode(payload_b64).decode("utf-8"))
user_id = payload.get("sub")
exp = payload.get("exp")
if user_id and exp and time.time() < exp:
    return user_id          # <-- trusts the token with NO signature check
```

A JWT is `header.payload.signature`. The signature is the *entire* security of a JWT. Here you base64-decode the middle part and trust it. Anyone can craft a token like `{"sub":"<any-user-id>","exp":9999999999}`, base64 it, bolt on a junk signature, and it passes.

**Why it's catastrophic:** After the fast path returns a `user_id`, `_verify_is_admin` looks that ID up in `profiles` → `admins` to decide admin rights. But **your entire `profiles` table (including the `email` column) is publicly readable** (see C2), and your admin's email is even leaked in `app_settings.updated_by`. So an attacker can:
1. Read `profiles` via the anon key, find the admin's `id`.
2. Forge `{"sub":"<admin id>","exp":<future>}`.
3. Call any endpoint in `users.py` / `email_broadcast.py` as that admin.

**What an attacker gets:**
- `DELETE /api/users/{id}` — delete any user permanently ([users.py:407](backend/app/routers/users.py))
- `PUT /api/users/{id}/verify` — grant "verified creator" to anyone
- `GET /api/users/admin/ai-history-all` / `ai-history-detail` — read *every* user's AI-generated content
- `GET /api/email-broadcast/recipients` — **harvest every user email address**
- `POST /api/email-broadcast/send-batch` — **send email to all your users from your domain** (phishing/spam from `testoza.com`)
- `POST /api/email-broadcast/smtp-config` — **overwrite your live SMTP credentials**

**Fix:** Delete the fast-path block entirely in both files. Always verify through Supabase:

```python
user_response = db.auth.get_user(token)   # this validates the signature
if not user_response or not user_response.user:
    raise HTTPException(status_code=401, detail="Invalid token")
return user_response.user.id
```

If the 300ms matters, verify the signature *locally* with the project's JWT secret using `pyjwt` (`jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")`) — but the simple fix above is correct and safe. Every other router already does this; these two are the outliers.

---

#### C2 — Database is world-readable through the public anon key (broken RLS)

**Confirmed live.** Using only the anon key that ships in your frontend bundle, an unauthenticated stranger can read these tables directly from PostgREST (`/rest/v1/<table>`):

| Table | Rows exposed | What leaks |
|-------|-------------|-----------|
| `profiles` | **66 (all users)** | `email`, `full_name`, `is_premium`, `premium_expiry`, `plan_id`, `designation` of every user |
| `sessions` | **3,530** | every visitor session + `session_token`, referrers, UTM |
| `page_views` | **17,066** | full browsing history per visitor |
| `visitors` | **432** | fingerprint, country, city, device, browser |
| `materials` | 23 | every creator's uploaded material URLs |
| `feedback` | 2 | `sender_email`, comments |
| `classes` | 6 | all class names + owner IDs |
| `combined_sessions` | 2 | all combined-exam configs |
| `app_settings` | 1 | `unlock_all_premium` flag **and the admin email in `updated_by`** |
| `plans` | 3 | pricing config |
| `tests` (unlisted) | 20 | **`questions` incl. correct answers** for "conducted exam" links |
| `tests` (solutions) | 9 | full `solutions` JSON |

**Why:** RLS on these tables is either off or has a `USING (true)` "public read" policy. For `profiles`, the intent was to allow public creator profiles — but that shouldn't expose `email` / premium status for all 66 users. (Note: your `.sql` files in `supabase/` no longer match the live database — e.g. `enable_feedback_rls.sql` says feedback is admin-only, but live it's public-readable. The live DB has drifted; trust the live state, not the files.)

**What did NOT leak (RLS working correctly):** `user_tests` (exam submissions), `test_registrations`, `question_reports`, `notifications`, `promo_codes`, `admins`, `support_messages`, `exit_feedback`, `ai_generation_history`, private `tests`. Good — keep these as the model.

**Fix (per table, in Supabase SQL editor):**
- **`profiles`**: stop exposing sensitive columns to the public. Two clean options:
  - Best: keep the table private to owners, and create a **`public_profiles` view** exposing only `id, full_name, avatar_url, bio, designation, is_verified_creator, following_visibility`. Point the frontend at the view. Move `email`, `is_premium`, `premium_expiry`, `plan_id` behind owner-only RLS.
  - Faster stopgap: revoke the public read policy and serve *all* profile reads through your backend (which can filter columns). This is more work because the frontend reads profiles directly today.
- **`sessions`, `page_views`, `visitors`, `daily_stats`**: remove all public **SELECT** policies. These are internal analytics; only your backend (service role) needs them. See C3 for the write side.
- **`materials`, `classes`, `feedback`, `combined_sessions`, `plans`, `app_settings`**: decide what truly must be public. `plans` is probably fine to be public-read. `app_settings` should **not** be public (it leaks the admin email and the `unlock_all_premium` flag) — serve feature flags through your existing `/api/features/flags` endpoint and remove public read. `feedback` and `materials` and `classes` should be owner/creator-scoped.
- **`tests` unlisted**: the "unlisted = only reachable by exact slug" rule is enforced in your *backend* ([read.py](backend/app/routers/tests/read.py)), but the anon key bypasses the backend and reads unlisted rows (with answers) directly. Tighten the `tests` SELECT policy so anon can only read `visibility = 'public'` rows, and never the `questions`/`solutions` columns (see C4).

General principle: **the anon key should be able to read almost nothing directly.** Route reads through your backend so you control exactly what's returned.

---

#### C3 — Analytics + anonymous-attempt tables are world write/delete

**Where:** formerly `supabase/migrations/20260302100000_fix_analytics_rls.sql` (deleted) and [backend/migrations/create_anon_test_attempts.sql](backend/migrations/create_anon_test_attempts.sql)

> **Status 2026-09-20 — CONFIRMED from the live `pg_policies` catalog (Supabase MCP, read-only).** All policies below are live, `PERMISSIVE`, role `{public}`. Three of them exist in **no SQL file** (added in the SQL editor): `visitors."Anyone can log visits"` (INSERT), `anon_test_attempts."Anyone can insert anon attempts"` (INSERT), `anon_test_attempts."Anyone can update anon attempts"` (UPDATE). `service_role` has `BYPASSRLS=true`, so dropping every policy on these four tables cannot affect the backend. Fix: [supabase/migrations/20260920120000_c3_lock_analytics_and_anon_attempts_rls.sql](supabase/migrations/20260920120000_c3_lock_analytics_and_anon_attempts_rls.sql) — run it in the SQL editor (the MCP is read-only), then verify with `SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('visitors','sessions','page_views','anon_test_attempts')` → must return 0 rows.
>
> **Same-class findings seen in the catalog while verifying C3 (not fixed — out of C3 scope):** `user_tests."Allow test attempt submissions"` INSERT `CHECK(true)` and `"Allow test attempt updates"` UPDATE `USING(true)` — anon can insert/overwrite **registered users' attempts and scores**; `sub_categories."Allow service role full access…"` ALL `USING(true)`; `categories."Admins can insert sections."` INSERT `CHECK(true)`; `notifications."Public can insert notifications"` INSERT `CHECK(true)`; `test_registrations."Authenticated users can read (MVP)"` SELECT `USING(true)`. No frontend code writes any of these tables directly, so the same "drop and let service_role do it" fix applies.

**What's wrong:** These policies grant everyone (no `TO` clause = all roles incl. `anon`) full access:
+
```sql
CREATE POLICY "Allow public insert and update visitors" ON public.visitors
    FOR ALL USING (true) WITH CHECK (true);          -- FOR ALL = select/insert/update/DELETE
CREATE POLICY "Allow public insert and update sessions" ON public.sessions
    FOR ALL USING (true) WITH CHECK (true);
-- anon_test_attempts:
CREATE POLICY "Service role full access" ON anon_test_attempts
    USING (true) WITH CHECK (true);                  -- also applies to anon
```

`FOR ALL ... USING(true)` means **anyone can DELETE or overwrite every row.** An attacker can:
- Wipe or poison your entire analytics history (`visitors`, `sessions`, `page_views`).
- Read every anonymous candidate's `session_token`, then **overwrite their answers/score** or inject fake submissions via `anon_test_attempts`.

**Root cause / the trap:** The migration comment says "the backend needs INSERT privileges." That reasoning is wrong for your setup — your backend uses the **service-role key, which ignores RLS**, so it never needed these permissive policies. The policies only ever helped attackers.

**Fix:** These tables are written *only* by your backend. Drop the public policies and let the service role (which bypasses RLS) do its job:

```sql
DROP POLICY IF EXISTS "Allow public insert and update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Allow public insert and update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert page_views" ON public.page_views;
DROP POLICY IF EXISTS "Allow public select page_views" ON public.page_views;
DROP POLICY IF EXISTS "Service role full access" ON public.anon_test_attempts;
-- Leave RLS ENABLED with no anon policy => anon gets nothing, service role still works.
```
Then confirm your analytics tracking (`/api/analytics/track`) and anon submit still work — they will, because they run as service role.

---

#### C4 — Exam integrity: answers shipped to client + scores trusted from client

**Where:** [backend/app/routers/tests/read.py](backend/app/routers/tests/read.py) (returns full `questions` incl. `correctAnswer`), [frontend/src/pages/TestPage.tsx:1097-1327](frontend/src/pages/TestPage.tsx) (client computes score), [backend/app/routers/attempts.py:158-165](backend/app/routers/attempts.py) (stores `payload.score` verbatim), [backend/app/schemas/attempts.py](backend/app/schemas/attempts.py) (`score` comes from the client).

**Two problems, both fatal for a testing product:**

1. **Correct answers are in the payload the browser downloads.** `GET /api/tests/{id}` returns the whole `questions` array including `correctAnswer` (single/multiple/numerical ranges). Any test-taker can open DevTools → Network, read the answers, then score 100%. This defeats every proctoring feature you built (fullscreen, tab-switch, copy-paste lock) because the answer key is simply *in the response body*.

2. **The score is calculated in JavaScript and sent to the server, which trusts it.** `TestPage.tsx` computes `finalScore` and calls `saveAttempt(..., score, ...)`. The backend inserts `payload.score` with no recomputation. Anyone can `POST /api/attempts/save` with `{"score": 999999}`.

**Fix (this is the big architectural one, but it's the heart of your product):**
- **Score on the server.** Move the scoring logic (the `parseMark` / correct-answer comparison in `TestPage.tsx`) into the backend. `save_attempt` should receive only the *answers*, load the test's `questions` server-side, compute the score itself, and ignore any client-supplied score. You already have `calculate_test_max_marks` server-side — extend that pattern to full scoring.
- **Stop sending answers to the browser during the exam.** Add an `exclude_answers`/exam mode to the test-fetch endpoint that strips `correctAnswer` (and `solutions`) from each question while the test is being *taken*. Return them only *after* submission, or only to the owner/admin. You already have an `exclude_questions` flag — add a sibling that keeps questions but removes the answer fields.
- Combined with C2's fix (anon can't read `tests.questions` directly), this closes the leak on both the backend and the direct-PostgREST path.

> Reality check for a solo founder: this is the most involved fix. If you can't do it all at once, do it **at least for tests where `conduct_exam` / `login_required` is on** (real assessments), and accept client scoring for casual practice tests in the short term. But server-side scoring is where you want to end up.

---

#### C5 — Privileged endpoints with no authorization check

Because the backend runs as service-role (RLS off), these endpoints are effectively public admin functions. All **confirmed by reading the code** — none call any `_verify_*`:

| Endpoint | File | Anyone can… |
|----------|------|-------------|
| `PUT /api/features/flags` | [features.py:40](backend/app/routers/features.py) | Flip global flags incl. `enable_anonymous_tests`. Comment claims "admin only via RLS" but service role bypasses RLS → **no protection**. |
| `GET /api/reports/admin/users-stats`, `/admin/user/{id}`, `/creator/{id}` | [reports.py:96-138](backend/app/routers/reports.py) | Read all question reports across the platform |
| `PUT /api/reports/{id}/status` | [reports.py:79](backend/app/routers/reports.py) | Mark any report open/solved |
| `POST/PUT/DELETE /api/categories`, `/subcategories`, `/assign/{test_id}`, `/admin/assign/*` | [categories.py](backend/app/routers/categories.py) | Create/rename/delete categories; **reassign categories on anyone's test** |
| `POST/DELETE /api/classes` | [classes.py](backend/app/routers/classes.py) | Create/delete any class |
| all `GET /api/analytics/stats/*` and `/api/analytics/stats/...` advanced | [analytics/stats.py](backend/app/routers/analytics/stats.py), [analytics/advanced.py](backend/app/routers/analytics/advanced.py) | Read every dashboard: funnels, **attempt logs, visitor locations, user matrix** (PII), upload logs |
| `GET/POST/PUT/DELETE /api/social/follows/*`, `/notifications/*` | [social.py](backend/app/routers/social.py) | Follow/unfollow as anyone; **read any user's notifications** (`/notifications/{user_id}`); create notifications for anyone; clear anyone's notifications |
| all `/api/ai/*` | [ai.py](backend/app/routers/ai.py) | See H2 |

**Fix:** Add the appropriate guard to each:
- Global settings (`features/flags`, category/class create/delete, admin analytics, admin reports) → `_verify_is_admin`.
- Owner-scoped actions (assign category to *my* test, my classes, my notifications, follow as *me*) → `_verify_owner_or_admin` / verify the acting user matches the token.
- You already have these helper functions; they just aren't wired onto these routes. This is mostly mechanical.

---

### 🟠 HIGH

---

#### H1 — Secrets committed to a **public** GitHub repository history

**Confirmed:** `https://github.com/nirwairkumar/nkc-test` is **public** (HTTP 200 unauthenticated). Its history contains old `.env` commits (e.g. `b045ef8`, `3c22b85`) with **multiple Google/Gemini API keys** (`AIzaSyAD8…`, `AIzaSyC6M…`, `AIzaSyD2I…`, `AIzaSyDAYA…`) and Turnstile keys. Even though the `.env` was later deleted, **git history keeps them forever** and bots scan public repos for exactly these patterns within minutes.

Good news: your current **Supabase service-role key was never committed** (only the public anon keys, which are meant to be public, appear in history). The service account JSON files (`google-indexing-key.json`, `mcp-servers/google_ads_mcp/client_secret.json`) are **gitignored and not tracked** — good, but they sit in your working tree, so don't ever `git add -f` them.

**Fix (do the rotation part today):**
1. **Rotate every key that ever touched git**: all Gemini/Google API keys, Turnstile secret. Generate new ones, update Cloud Run env + your local `.env`, then disable/delete the old keys in Google Cloud Console.
2. Check GCP billing for anomalies on the old keys.
3. **Scrub history** (optional but recommended since the repo is public): either make the repo **private** (fastest), or rewrite history with `git filter-repo` to purge `.env`. Note: once public, assume they're compromised regardless — rotation is the real fix.
4. Add a guard so this can't recur: pre-commit hook with `gitleaks`, and double-check `.env` is in `.gitignore` for all four repos (it is in the ones I checked).

---

#### H2 — AI endpoints: unauthenticated, unthrottled, and an IDOR

**Where:** [backend/app/routers/ai.py](backend/app/routers/ai.py). **Confirmed:** `/api/ai/parse`, `/parse-stream`, `/generate/youtube`, `/generate/topics`, `/predict-rank`, `/chat`, `/test-key` have **no auth and no rate limit**.

**Impact:**
- **Cost DoS / free ride on your Gemini budget.** `/parse` runs a heavy PDF-vision pipeline; `/generate/youtube` downloads/analyses videos. A stranger can loop these and run up your AI bill or exhaust quota so real users get errors.
- **IDOR in `/chat`** ([ai.py:966-1010](backend/app/routers/ai.py)): the endpoint reads `userId` from the request body and fetches *that* user's last 10 test attempts (titles + scores) using the admin client. Pass any `userId` → read their exam history. `user_id` in `/generate/youtube` and `/generate/topics` is likewise attacker-controlled.

**Fix:**
- Require a valid login (`_verify_auth_token`) on all `/api/ai/*` endpoints, and derive `user_id` **from the token**, never from the request body.
- Add per-user rate limits (and ideally a Turnstile check) on the expensive ones (`parse`, `parse-stream`, `generate/*`, `predict-rank`).
- Gate `/test-key` behind admin — right now it confirms whether your AI key is live to anyone.

---

#### H3 — Analytics dashboards leak PII (subset of C5, called out because it's PII)

`/api/analytics/stats/...` (e.g. `attempts/logs`, `visitors/locations`, `visitors/detailed`, `users/matrix`) return candidate/visitor geolocation, session tokens, per-user attempt timelines, and profile joins — all with **no auth**. This is a privacy/GDPR-style exposure of your users' behaviour. Fixed by the C5 admin-guard work; listed separately so it isn't lost.

---

#### H4 — Unauthenticated guest-account creation floods `auth.users`

**Where:** [backend/app/routers/attempts.py:97-155](backend/app/routers/attempts.py). When a test doesn't require login (or is a conducted exam / has a start form), `/api/attempts/save` accepts an unauthenticated request and, if the `user_id` isn't found, **creates a real `auth.users` row** (`candidate_<id>@guest.testoza.com`) via the admin SDK.

**Impact:** An attacker can script thousands of submissions, each minting a permanent fake auth user + `user_tests` row. This bloats your auth store, pollutes creator dashboards/analytics, and can push you into higher Supabase pricing tiers. Also, `POST /api/attempts/save` with a chosen `user_id` lets an attacker attribute junk attempts to *real* users.

**Fix:** For anonymous/guest attempts, use the dedicated `anon_test_attempts` table (you already have it) instead of creating `auth.users` rows. Require Turnstile on anonymous submit. Validate that a supplied `user_id` actually belongs to the caller's token when a token is present.

---

### 🟡 MEDIUM

---

#### M1 — Rate limiting is weak and narrow
[backend/app/utils/rate_limiter.py](backend/app/utils/rate_limiter.py) is **in-memory per Cloud Run instance**. With multiple instances (or cold starts), the same email/IP is tracked separately per instance, so limits are effectively multiplied and reset on redeploy. It's also only applied to login/register/password-reset/analytics — not to submit, AI, or any write endpoint. **Fix:** move to a shared store (Upstash Redis is the standard cheap option) and extend coverage to expensive/abusable endpoints. Add Cloudflare Turnstile (you already have the keys) to signup, submit, and AI.

#### M2 — IP spoofing bypasses IP-based limits and fakes geo
`_get_client_ip` trusts the first value of `X-Forwarded-For` ([rate_limiter.py](backend/app/utils/rate_limiter.py); same pattern feeds `ip-api.com` geo in [analytics/track.py](backend/app/routers/analytics/track.py)). A client can send any `X-Forwarded-For`. Since you're behind Cloudflare, trust **`CF-Connecting-IP`** instead and ignore client-supplied `X-Forwarded-For`.

#### M3 — Internal error messages leaked to clients
Dozens of handlers do `raise HTTPException(status_code=500, detail=str(e))` and `print(...)` raw exceptions. This leaks DB/library internals and aids attackers. **Fix:** return a generic message to the client (`"Something went wrong"`) and log the detail server-side only. Grep for `detail=str(e)` and `detail=f"...{str(e)}"`.

#### M4 — Debug `print()` of tokens/PII in production
Several routers `print()` auth flows, upload paths, promo codes, and full objects (e.g. [users.py](backend/app/routers/users.py) verify-creator block, [materials.py](backend/app/routers/materials.py) `DEBUG:` lines, [pricing.py](backend/app/routers/pricing.py) `DEBUG API`). These land in Cloud Run logs. **Fix:** replace with a real logger at appropriate levels; never log tokens or full user objects.

#### M5 — Password update lacks re-authentication
[auth.py `/password-update`](backend/app/routers/auth.py) changes the password for whoever holds a valid access token, with no current-password check. If a token is ever stolen (e.g. via XSS — see M6), the attacker can lock the user out. **Fix:** require the current password (or a fresh re-login) for password changes.

#### M6 — Tokens stored in `localStorage`
Both frontends keep access/refresh tokens in `localStorage` ([frontend/src/utils/tokenStorage.ts], supabase client `storage: localStorage`). Any XSS (and you allow `'unsafe-inline'`/`'unsafe-eval'` in your CSP — see M7) can read them. **Fix:** longer-term, prefer httpOnly cookies for the refresh token. Short-term, tighten CSP and audit for XSS sinks (you render LaTeX and rich content — check those paths).

#### M7 — Content-Security-Policy allows `unsafe-inline` and `unsafe-eval`
[backend/app/main.py](backend/app/main.py) CSP `script-src` includes `'unsafe-inline' 'unsafe-eval'`. This significantly weakens XSS protection. **Fix:** work toward removing `unsafe-eval` (check which lib needs it — often a math/LaTeX renderer) and move to nonces/hashes for inline scripts. Not urgent, but it's the safety net for M6.

#### M8 — File uploads validated only by extension + client content-type
[storage.py](backend/app/routers/storage.py), [materials.py](backend/app/routers/materials.py), [posts.py](backend/app/routers/posts.py): file type is checked by filename extension and the client-supplied `content-type`, with no server-side size limit or content sniffing. Buckets are public. **Fix:** enforce max size, validate real content (magic bytes) for images, and set per-bucket size/MIME limits in Supabase Storage.

#### M9 — Storage buckets are public-read
The `avatars`, `materials`, `post-images`, `test-images` buckets are public. Material files (potentially paid content) are then enumerable via the publicly-readable `materials` table URLs (C2). **Fix:** decide which buckets truly need public read; for paid/creator material use signed URLs.

---

### 🟢 LOW / housekeeping

- **L1 — RLS policy files have drifted from live.** `supabase/*.sql` includes multiple "nuclear fix" / "true nuclear fix" iterations that no longer match production (verified: `feedback` is admin-only in the file but public live). Re-baseline: dump the *current* live policies as the source of truth and delete the stale files so you don't re-apply a wrong one.
- **L2 — Admin gate is client-side only.** The admin frontend decides access via `localStorage['testoza_is_admin']` and `/users/check-admin` ([frontend-admin/src/contexts/AuthContext.tsx](frontend-admin/src/contexts/AuthContext.tsx)). That's fine as UX, but it is **not** a security boundary — the real gate must be the backend `_verify_is_admin` checks (which is exactly why C1/C5 matter). No change needed beyond fixing the backend.
- **L3 — Stray/committed files:** `bash.exe.stackdump`, `chemdoodle.zip`, `google-indexing-key.json` (gitignored but present in tree), untracked `TestoZa/` and `About TestoZa/`. Clean the working tree so a stray `git add -A` never captures a secret.
- **L4 — `create-order`/`verify-payment` edge functions:** CORS is `*` (acceptable for these authenticated functions). The promo `used_count` increment is a documented read-then-update race (a determined user could exceed `max_uses` under concurrency). Convert to an atomic DB `increment_promo_usage(uuid)` RPC when convenient. Payment signature verification itself is correctly done server-side — good.
- **L5 — Config naming:** [config.py](backend/app/core/config.py) `SECRET_KEY` has an insecure default and `SUPABASE_KEY` falls back to anon for admin ops — make sure `SUPABASE_SERVICE_KEY` is always set in prod (it is in your `.env`).
- **L6 — `/api/me` and `/api/health`** are fine; docs are correctly disabled in production. Good.

---

## Part 3 — Step-by-step plan (ordered for one person)

Think of this as three sprints. Each item references the finding above.

### 🚑 Day 1 (a few hours, stops active bleeding)
1. **Rotate all keys** that ever hit git history: Gemini/Google API keys, Turnstile secret (**H1**). Update Cloud Run + local `.env`. Delete old keys in GCP. Check billing.
2. **Delete the unsigned-JWT fast path** in `users.py` and `email_broadcast.py`; replace with `db.auth.get_user(token)` (**C1**). This one edit closes admin takeover.
3. **Drop the permissive analytics/anon RLS policies** (**C3**) — 5 `DROP POLICY` statements, then smoke-test tracking + anon submit still work.
4. **Make the GitHub repo private** (or start the history scrub) (**H1**).

### 🔒 Week 1 (the access-control cleanup)
5. **Lock down anon reads** (**C2**): fix `profiles` (view or column RLS to hide `email`/premium), remove public SELECT from `sessions`/`page_views`/`visitors`/`app_settings`/`feedback`/`materials`/`classes`, and restrict `tests` SELECT to public rows without answer columns.
6. **Add auth guards** to every endpoint in the C5 table — `_verify_is_admin` for global/admin ones, `_verify_owner_or_admin` for owner-scoped ones (**C5, H3**).
7. **Require login + derive `user_id` from the token** on all `/api/ai/*`, and add rate limits/Turnstile to the expensive ones (**H2**).
8. **Fix the guest-account flood**: route anonymous attempts to `anon_test_attempts` only; don't mint `auth.users` rows from unauthenticated calls (**H4**).

### 🎯 Week 2–3 (the product-integrity fix)
9. **Server-side scoring + hide answers during exams** (**C4**). Start with conducted/login-required exams. Move scoring into `save_attempt`; strip `correctAnswer`/`solutions` from the in-exam test payload; ignore client-sent `score`.
10. **Shared rate limiting** (Upstash Redis) + Turnstile on signup/submit (**M1, M2** — switch to `CF-Connecting-IP`).
11. **Scrub error/debug output** (**M3, M4**): generic client errors, real logging, no tokens/PII in logs.

### 🧹 Ongoing hardening
12. M5–M9 and the LOW items as you touch those areas. Add a `gitleaks` pre-commit hook so secrets can't be committed again.

---

## Part 4 — What I verified vs. inferred (so you can trust this)

- **Verified live, read-only, with your own keys:** the anon-key read exposure in C2/H3 (exact tables, row counts, columns), the analytics/anon RLS policies in C3 (from your migration files, and the read side confirmed live), the public status of the GitHub repo and the keys in its history (H1).
- **Verified by reading code:** C1 (unsigned JWT), C4 (client scoring + answers in payload), C5 (missing auth guards), H2/H4 (AI + guest provisioning), all MEDIUM/LOW.
- **Deliberately NOT tested against production:** write/delete exploitation (C3 write side, forging an admin token, submitting a fake score). These are inferred from the code and policies; I did not modify any data or send any malicious write, per your instruction.

---

## One-paragraph summary

The core issue is that your two security layers don't cover each other: the **backend runs as service-role so RLS is off for it**, yet several backend endpoints have **no auth checks** (feature flags, reports, categories, analytics, AI, and — worst — an **unsigned-JWT admin bypass**); meanwhile the **anon key that ships in your frontend can read most of your database directly** and **write/delete your analytics and anonymous exam attempts**, because RLS was loosened to `USING(true)`. On top of that, **exam answers are handed to the browser and scores are taken on trust**, which undermines the whole assessment product, and **old API keys are sitting in a public GitHub repo**. None of these require sophistication to exploit. The good news: the fixes are well-understood and mostly mechanical, the highest-impact one (C1) is a five-line change, and your service-role key and payment-signature verification were done correctly. Work top-down through Part 3 and you'll close the exploitable surface within two to three focused sessions.
---
---

# Part 5 — Remediation log

**Implemented:** 2026-09-20 → 2026-09-24
**Method:** every finding was re-verified against the live system before being changed — code was re-read, and database claims were re-checked against the live `pg_policies` catalog (read-only). Nothing below was fixed on the strength of the audit text alone. Where a finding turned out to be already fixed, or not worth fixing as written, that is stated rather than quietly skipped.

**How to read this:** Part 5 is what changed and why. **Part 6 is your checklist** — the things this document could not do for you, with their live status as of 2026-09-24.

---

## 5.1 — Status of every finding

| # | Status | One-line outcome |
|---|--------|------------------|
| C1 | ✅ Fixed (was already fixed before this work) | Signature is verified via `get_claims()`; all 14 routes in the two files carry guards. |
| C2 | ✅ Fixed & applied live | Anon can no longer read `profiles`, `app_settings`, `materials`, `classes`, `feedback`, `daily_stats`; `tests` restricted to `visibility='public'`; answer columns revoked at the column level. |
| C3 | ✅ Fixed & applied live | Analytics + anon-attempt tables now have **zero** policies; `user_tests` unconditional writes dropped. |
| C4 | ✅ Fixed | Scoring moved server-side; answer key stripped from the in-exam payload. |
| C5 | ✅ Fixed | 29 authorization guards added across 8 routers. |
| H1 | ⚠️ Partially — **needs you** | Prevention shipped (pre-commit hook, scanner, `.gitignore`). **Key rotation and making the repo private are yours.** |
| H2 | ✅ Fixed | All 7 AI endpoints guarded or throttled; IDOR closed; identity now comes from the token. |
| H3 | ✅ Fixed (by the C5 work) | Analytics dashboards are admin-only via a router-level dependency. |
| H4 | ⚠️ Bounded, not eliminated — **deliberate** | Identity spoofing blocked and guest creation rate-limited. Full fix needs a schema change; see 5.5. |
| M1 | ✅ Code done — **needs you to enable** | Shared-store limiter written; falls back to in-memory until Upstash env vars are set. |
| M2 | ✅ Fixed | `CF-Connecting-IP` is now the trusted source of client IP. |
| M3 | ✅ Fixed | All 5xx responses scrubbed centrally; every response carries a request ID. |
| M4 | ✅ Fixed | 215 `print()` calls converted to levelled logging behind a redaction filter. |
| M5 | ✅ Fixed | Password change requires the current password; recovery flow re-routed so it still works. |
| M6 | ⚠️ Mitigated, root cause deferred — **deliberate** | XSS sinks closed and CSP tightened. Tokens still in `localStorage`; see 5.5. |
| M7 | ✅ Fixed | Real CSP added where HTML is served; API CSP reduced to `default-src 'none'`. |
| M8 | ✅ Fixed in code — **storage-side limits need you** | Uploads validated by magic bytes, size and bucket allow-list. |
| M9 | ⚠️ Endpoint ready — **needs you to flip the bucket** | Signed-URL download endpoint added; buckets are still public-read. |
| L1 | ✅ Fixed & applied live | Live policies re-baselined; 14 drifted scripts archived; drift checker added. |
| L2 | ✅ Fixed | Backend confirmed as the real boundary, plus two real defects fixed in `check-admin`. |
| L3 | ✅ Fixed | Tracked junk removed; artifact patterns added to `.gitignore`. |
| L4 | ✅ Fixed & applied live | Atomic `increment_promo_usage()` replaces the read-then-update race. |
| L5 | ✅ Fixed | Dead insecure config removed; production refuses to boot misconfigured. |
| L6 | ✅ Verified + minor hardening | Docs confirmed disabled; `/api/health` no longer advertises version. |

---

## 5.2 — CRITICAL

### C1 — Unsigned JWT admin bypass
**Found:** already fixed in commit `afebecb` before this work began. **Verified**, not assumed: no `b64decode` of a JWT payload remains anywhere in `backend/app`, both routers use `db.auth.get_claims(token)` (which verifies the signature), and all 9 routes in `users.py` + 5 in `email_broadcast.py` carry a guard.

### C2 — Database world-readable via the anon key
**Why it mattered:** the anon key ships in your JavaScript bundle. Anyone could read it and query PostgREST directly — every user's email, premium status and plan, plus your whole analytics history.

**Changed** — `supabase/migrations/20260923100000_c2_lock_public_reads.sql`:
- `profiles` made owner-only, and a **`public_profiles` view** created exposing only `id, full_name, avatar_url, bio, designation, is_creator, is_verified_creator, verified_role, following_visibility, created_at`. This is what keeps public creator pages working without exposing email or billing status.
- Public `SELECT` removed from `app_settings` (it leaked your admin email via `updated_by`), `materials`, `classes`, `feedback`, `daily_stats`, and the `ALL USING(true)` grant on `sub_categories`.
- `tests` restricted to `visibility = 'public'` — the previous policies let anon read `unlisted` rows, i.e. your conducted-exam papers.
- **Column-level `REVOKE`** on `tests.questions`, `tests.solutions`, `tests.sections` from `anon` and `authenticated`. Column privileges are checked before RLS, so the answer key is unreachable over PostgREST regardless of any future row policy.

**Safe because** the backend connects as service-role (`BYPASSRLS`), and the browser bundles only ever touch three tables directly — verified by grepping every `.from(...)` call across both frontends.

### C3 — Analytics and anonymous attempts world-writable
**Why it mattered:** `FOR ALL USING(true)` includes DELETE. Anyone with the anon key could wipe your analytics, or read anonymous candidates' `session_token` values and overwrite their answers and scores.

**Changed:** the pre-existing `20260920120000` migration (which had been written but **never applied**) plus a new `20260923110000_c3b_lock_write_policies.sql` extending it to same-class findings — `user_tests` unconditional INSERT/UPDATE (anon could forge or overwrite *registered* users' scores), `categories`, `notifications`, `test_registrations`.

These four tables now have **zero policies** with RLS still enabled: anon gets nothing, the service-role backend is unaffected.

### C4 — Exam answers shipped to the browser, scores trusted from it
This is the one that undermines the product itself, so it got the most care.

**Changed:**
- **`backend/app/services/scoring.py`** — a faithful port of the scoring logic in `TestPage.tsx`: `parseMark` fraction handling (`"1/3"`), the marks precedence chain (per-question → per-section → test-level → 4/1 defaults), partial credit on multi-select, numerical ranges, and soft attempt-control (`first_n` / `best_n`). `save_attempt` and `anon/submit` now compute the score and **discard** `payload.score`, keeping the client's claim in `metadata.client_reported_score` for auditing.
- **`strip_answer_key()`** removes `correctAnswer` and `solutions` from the test payload for anyone who is not the owner, an admin, **or a candidate who has already submitted**. That last case is what keeps the post-test review working.
- `POST /api/results/analyze` now reloads the test server-side instead of scoring from a client-supplied test object.
- The direct-Supabase fallback in both `attemptsApi.ts` files was **removed** — it inserted into `user_tests` straight from the browser with a client-chosen score, which would have defeated the whole change. Resilience still comes from the existing 5-attempt exponential backoff.

**Why a parity test exists:** the client and server scorers must agree, or honest users see wrong marks. `backend/scripts/test_scoring_parity.py` pins that agreement — **15/15 passing**.

### C5 — Privileged endpoints with no authorization check
**Why it mattered:** the backend runs as service-role, so RLS does nothing for it. A route without a Python check *is* a public admin function.

**Changed:** a shared **`backend/app/core/auth.py`** (`verify_auth_token`, `verify_is_admin`, `verify_owner_or_admin`, `verify_test_owner_or_admin`, `is_admin_user`) and **29 guards** wired across `features.py`, `categories.py`, `classes.py`, `reports.py`, `social.py`, `results.py`, `solutions.py` and the analytics routers.

One implementation detail worth knowing: analytics uses a **router-level dependency**, so a dashboard route added in future is guarded by default rather than forgotten.

**Why one shared module:** every router previously carried its own copy of these helpers. That duplication is exactly how C1's unsigned-JWT "fast path" survived in two files while every other router did it correctly.

---

## 5.3 — HIGH

### H1 — Secrets in public git history
**Verified:** `github.com/nirwairkumar/nkc-test` returns HTTP 200 unauthenticated — **public**. A full scan of every blob in history found **4 distinct Google/Gemini API keys** across 4 `.env` commits (`b045ef8`, `3c22b85`, `d862d6e`, `a8eb327`). No `.env` is tracked today. No Turnstile secret was found in those blobs — the original audit slightly overstated that.

**Changed (prevention):**
- **`.githooks/pre-commit`** — blocks env files, credential JSONs and 9 secret patterns; also runs `gitleaks` when installed. Tested 9/9, and it blocks all four of the real leaked keys.
- **`scripts/scan-secrets.sh`** — `install` / `history` / `worktree` modes, findings printed redacted.
- `.gitignore` extended to `.env.*`, `*.pem`, `*.key`, `client_secret*.json`.

**Rotation and repo visibility are yours** — see Part 6.

### H2 — AI endpoints unauthenticated, unthrottled, and an IDOR
**Why it mattered:** `/parse` runs a PDF-vision pipeline and `/generate/youtube` downloads and analyses video — a stranger could loop either and spend your Gemini budget. Separately, `/chat` read `userId` **from the request body** and returned that user's last 10 attempts using the admin client: pass any UUID, read a stranger's exam history.

**Changed:** all 7 endpoints now require a verified token except `/predict-rank` (see below); `/test-key` is admin-only; `/chat`, `/generate/youtube` and `/generate/topics` derive `user_id` **from the token**, overwriting whatever the body claimed. Per-user hourly caps: 30 heavy, 120 light.

**`/predict-rank` was deliberately left open.** Anonymous candidates use it on their own results page, so requiring a login would have removed a working feature. It is capped at 10/hour per IP instead, and its error message was made generic — it had been returning the raw upstream error, which disclosed your GCP project number and billing URL to anonymous callers.

**Also changed, or this would have broken:** four raw `fetch()` calls in both `AITestImporter` pages and the admin health check sent no `Authorization` header. They do now.

### H3 — Analytics dashboards leak PII
Closed by the C5 router-level admin dependency. Re-verified returning 401.

### H4 — Guest-account flooding
**Changed:** an unauthenticated submission claiming an **existing non-guest account** is now rejected (401); guest IDs still pass. Unauthenticated submits capped at 30/hour per IP.

**Not fully eliminated, and this was a judgement call.** The audit's fix — route anonymous attempts to `anon_test_attempts` and stop minting `auth.users` rows — would empty creator dashboards for conducted exams, because `user_tests.user_id` has a foreign key to `auth.users` and `get_test_attempts` reads conducted attempts from `user_tests`. Doing it properly needs a nullable `user_id` plus guest identity in metadata, and dashboard changes. Bounding the abuse was the non-breaking half.

---

## 5.4 — MEDIUM

### M1 — Rate limiting weak and narrow
**Why it mattered:** the limiter was a plain dict inside each Cloud Run instance, so a limit of 5 was really 5×N and reset on every deploy.

**Changed:** `rate_limiter.py` rewritten with a pluggable backend — Upstash Redis REST when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set, in-memory otherwise. Upstash's REST API was chosen over a Redis driver so no new dependency is needed and there is no connection pool to manage on Cloud Run.

Design decisions worth knowing: it **fails open** (a limiter that takes the site down when Redis blips is a worse outage than the abuse it prevents), has a circuit breaker so a dead store does not add latency to every request, and every rejection carries `Retry-After` and `X-RateLimit-*` headers. Coverage extended to uploads, support/feedback, reports, password change, and per-IP ceilings on login and registration.

### M2 — IP spoofing
`X-Forwarded-For` is attacker-controlled, which made every IP-keyed limit bypassable. `CF-Connecting-IP` is now preferred (Cloudflare strips and re-sets it). This was a prerequisite for M1 and H2/H4 to mean anything.

### M3 — Internal errors leaked to clients
**Changed:** rather than editing 143 call sites, three exception handlers in `main.py` do it centrally — 4xx messages pass through unchanged (they are written for users), 5xx are logged in full and replaced with a generic message plus a **request ID**, and validation errors no longer echo the submitted body back. A request-ID middleware echoes `X-Request-ID` and attaches it to every log line, so a user-reported error can still be found in the logs. That correlation is what makes a generic response acceptable.

### M4 — Debug `print()` of tokens and PII
**Changed:** all **215** `print()` calls across 26 files converted to levelled logging (verbose traces default to `DEBUG`, which is off in production), plus a **redaction filter** that scrubs JWTs, bearer tokens, API keys, `password`/`secret`-style pairs, and masks emails to `ni***@domain`. The filter is a last line of defence, not a licence to log secrets.

### M5 — Password update lacked re-authentication
**Changed:** `/auth/password-update` now requires `current_password` and verifies it via a throwaway client, plus a 5/hour cap.

**The part that needed care:** two flows shared this endpoint. The forgot-password flow *cannot* supply a current password. So `UpdatePassword.tsx` was re-pointed at `supabase.auth.updateUser()`, which authorises against the emailed recovery session — Supabase's intended path — while `SettingsPage.tsx` gained a "Current Password" field. Without that split, the fix would have locked out everyone who forgot their password.

### M6 — Tokens in `localStorage`
**Mitigated, root cause deferred.** The audit's short-term advice — tighten CSP, audit XSS sinks — is what was done. See 5.6 for three live XSS vectors this turned up. The root fix (httpOnly cookie for the refresh token) is an auth-architecture change and is listed in Part 6 as deferred work rather than folded into a sweep.

### M7 — CSP allows `unsafe-inline` / `unsafe-eval`
**The finding was right but pointed at the wrong place.** That CSP was on the **JSON API**, which never renders HTML, while the actual SPA — served by the Cloudflare worker — had **no CSP at all**.

**Changed:** full security headers added to the worker's HTML responses (CSP, HSTS with preload, `Cross-Origin-Opener-Policy`, `Permissions-Policy`, `X-Frame-Options`, `Referrer-Policy`), and the API CSP reduced to `default-src 'none'`.

`script-src` still carries `'unsafe-inline'` and `'unsafe-eval'`: the Vite bundle and GTM inject inline scripts, and KaTeX/mhchem and the chart library evaluate generated code. Removing either breaks the app today. What *was* tightened costs nothing and blocks common XSS escalations: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.

### M8 — Uploads validated by extension and client content-type
**Worse than documented.** Because the extension came from the client filename and the content-type came from the client too, an `.html` file could be stored in a **public** bucket and served as a live document from the storage origin — stored XSS and phishing pages under your domain's trust.

**Changed:** `backend/app/utils/upload_validation.py` decides type from **magic bytes**, enforces per-bucket size and type allow-lists, sanitises filenames, and derives the stored extension from the sniffed type. SVG is excluded deliberately — it is an image to users but an executable document to browsers. Wired into all three upload paths. Tested 8/8.

### M9 — Storage buckets public-read
**Changed:** `GET /api/materials/{id}/download` issues 5-minute signed URLs after an access check, falling back to the public URL so nothing breaks before the bucket is flipped. **Flipping the bucket is yours** — Part 6.

---

## 5.5 — LOW

### L1 — RLS files drifted from live
**Why it mattered more than "housekeeping" suggests:** 19 scripts named things like `enable_profiles_rls.sql` and `security_fix_registrations.sql` no longer matched production. Re-running one to "fix RLS" would have silently re-opened what C2/C3 closed.

**Changed:**
- **`supabase/migrations/20260924000000_rls_baseline.sql`** — all 129 live policies, idempotent, generated from the catalog and verified policy-for-policy (27 tables, exact per-table match). Historical duplicates were kept verbatim so applying it is a no-op rather than a behaviour change.
- 14 RLS-only scripts moved to **`supabase/_archive_do_not_apply/`** with a README explaining what each did. The 23 files containing real table DDL stayed put.
- **`scripts/check-rls-drift.sql`** — seven must-return-zero-rows invariants plus a baseline regenerator.

### L2 — Admin gate is client-side only
The audit said "no change needed beyond fixing the backend". The backend gate was confirmed sound — but `/users/check-admin` had two real defects:
1. Its `401` was swallowed by a bare `except` and returned as `200 + false`, so an admin whose token had merely **expired** was silently demoted in the UI instead of the client refreshing it.
2. Any logged-in user could pass someone else's `user_id` and learn whether that account is an admin.

Both fixed. Before changing it, the admin login path was traced to confirm tokens are stored synchronously before `checkAdmin` runs, and that every caller passes the session user's own ID.

### L3 — Stray files
`chemdoodle.zip` was **tracked** — and is not a zip at all, but 36 KB of saved HTML, referenced nowhere. Untracked and deleted, along with `bash.exe.stackdump`. `.gitignore` extended so a stray `git add -A` cannot sweep up the next one.

### L4 — Promo `used_count` race
**Why it mattered:** two concurrent redemptions both read N and both write N+1, so a redemption is lost. Worse, `max_uses` was checked against the same stale read, so a limited promo could be redeemed past its limit — a revenue leak on a launch code, exactly when concurrency is highest.

**Changed:** `increment_promo_usage(uuid)` does the limit check and the increment in **one** `UPDATE ... WHERE used_count < max_uses`, so concurrent callers serialise on the row lock. Service-role only. Both `create-order` and `verify-payment` now call it and log rather than fail a request whose payment already succeeded. A `CHECK` constraint was added `NOT VALID` — see Part 6 for the follow-up.

### L5 — Config naming
`SECRET_KEY`, `ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` were **entirely unused** — dead scaffold carrying the default `"YOUR_SUPER_SECRET_KEY_HERE_CHANGE_IN_PROD"`. They were removed rather than given a better default, because leaving one invites someone to wire it up later and inherit it.

The anon-key fallback was the real risk: with it, a missing `SUPABASE_SERVICE_KEY` in production means the backend silently runs as anon and — post-C2/C3 — can read almost nothing, failing in ways that look like bugs. `validate_runtime_config()` now refuses to boot production when the service key is missing or identical to the anon key, and warns in development.

### L6 — `/api/me` and `/api/health`
Verified: docs return 404 in production, `/api/me` rejects both missing and forged tokens. `/api/health` was advertising project name and version to anonymous callers; it now returns `{"status": "healthy"}` in production (the field uptime monitors check) and the full payload only in development.

---

## 5.6 — Found during remediation, not in the original audit

Nine issues surfaced while verifying the findings above. All are fixed.

| # | Issue | Why it mattered |
|---|-------|-----------------|
| 1 | **Stored XSS via `test.revision_notes`** | Creator-authored HTML rendered raw to every test-taker. Combined with M6, one malicious creator could harvest every candidate's session token. |
| 2 | **KaTeX ran with `trust: true`** | Enabled `\href`, so `\href{javascript:...}` inside any question or option was live XSS in both frontends. |
| 3 | **JSON-LD injection** | `JSON.stringify` does not escape `<`; a test title containing `</script>` breaks out. Three components plus the worker. |
| 4 | **Password-reset open redirect → account takeover** | `redirect_to` was built from the `Origin` header, which is attacker-controlled on a direct POST. Anyone could have Supabase email a victim a recovery link pointing at their own server and capture the token. |
| 5 | **`GET /api/results/{attempt_id}` unauthenticated** | Returned `tests(*)` — the full answer key. A candidate could submit blank, read the answers from their own result, and retake. |
| 6 | **`POST /api/results/analyze` scored from a client-supplied test** | Would have re-opened C4 through the back door. |
| 7 | **`.html` upload into a public bucket** | See M8. |
| 8 | **`check-admin` swallowed its own 401** | See L2. |
| 9 | **Worker `og:image` attribute injection** | `content="${image}"` was unescaped while title and description were escaped. |

Fixes 1–3 are in `frontend*/src/utils/sanitize.ts` (DOMPurify-based `sanitizeHtml`, a `katexTrust` callback, and `safeJsonLd`).

---

## 5.7 — New files and tooling

| Path | Purpose |
|------|---------|
| `backend/app/core/auth.py` | One implementation of every auth check (C1, C5) |
| `backend/app/core/logging_config.py` | Redacting, request-correlated logging (M3, M4) |
| `backend/app/services/scoring.py` | Authoritative server-side scoring (C4) |
| `backend/app/utils/upload_validation.py` | Magic-byte upload validation (M8) |
| `backend/scripts/test_scoring_parity.py` | Pins client/server scoring agreement — 15/15 |
| `frontend*/src/utils/sanitize.ts` | XSS sink hardening (M6) |
| `.githooks/pre-commit` | Blocks secrets at commit time (H1) |
| `scripts/scan-secrets.sh` | History / worktree secret scanner (H1) |
| `scripts/check-rls-drift.sql` | RLS drift detection + baseline regeneration (L1) |
| `supabase/migrations/20260920120000_*` | C3 analytics lockdown |
| `supabase/migrations/20260923100000_*` | C2 public-read lockdown |
| `supabase/migrations/20260923110000_*` | C3b write lockdown |
| `supabase/migrations/20260924000000_*` | RLS baseline (L1) |
| `supabase/migrations/20260924010000_*` | Residual policy tightening (L1) |
| `supabase/migrations/20260924020000_*` | Atomic promo usage (L4) |
| `supabase/_archive_do_not_apply/` | 14 drifted RLS scripts + README (L1) |

---

## 5.8 — Verification performed

Not proof of absence of bugs, but every claim above was exercised:

- **Authorization:** 10/10 previously-open endpoints return 401 unauthenticated, re-run after every subsequent session.
- **Public surfaces unchanged:** `/api/analytics/track`, `/api/features/flags`, `/api/categories/`, `/api/attempts/anon/start`, `/api/health` all still reachable.
- **Scoring parity:** 15/15.
- **XSS:** 12/12 payloads blocked (script tags, `img onerror`, `svg onload`, `javascript:`/`data:` hrefs, `iframe srcdoc`, form/base/meta hijacks, nested obfuscation) with 5/5 legitimate creator-content cases preserved. KaTeX + JSON-LD: 12/12.
- **Uploads:** 8/8 — HTML-renamed-`.png`, SVG-with-script, wrong-bucket PDF, exe bytes, oversize and empty all rejected; real PNG/PDF accepted; path traversal neutralised.
- **Pre-commit hook:** 9/9, and it blocks all four real leaked keys.
- **Origin allow-list:** 6/6, including `https://testoza.com.evil.com`.
- **Config validation:** refuses to boot in production when the service key is missing or equals the anon key; warns in development.
- **Rate limiter:** correct allow/deny, correct headers, and correct fallback with a dead Redis.
- **Builds:** both frontends build (not just typecheck — `tsc -p tsconfig.json` was found to be silently skipping files, so real `vite build` became the gate), backend `compileall` clean, worker passes `node --check`, all three edge functions parse.
- **Database:** RLS baseline verified policy-for-policy against live; post-migration state confirmed at 125 policies, analytics tables at zero, `public_profiles` present, `increment_promo_usage` present.

---
---

# Part 6 — Your checklist

Everything below is something this work could **not** do for you. Status verified live on **2026-09-24**.

## 6.1 — Already done ✅

Confirmed against the live database, so you can tick these off:

- [x] **All six RLS migrations applied.** 125 policies live; analytics tables at zero; `public_profiles` view present; `user_tests` has no unconditional writes.
- [x] **`increment_promo_usage()` exists** in the database.
- [x] **Pre-commit hook active in this clone** (`core.hooksPath = .githooks`).

## 6.2 — Do now 🔴

- [ ] **Rotate the four leaked Gemini/Google API keys.** *(H1)*
  They are permanently public in `nkc-test`'s git history. None of them appear in your current local `.env`, but "not in my env" is not "disabled". In Google Cloud Console, confirm all four are deleted or restricted, and **check billing for anomalies**.

- [ ] **Make `nkc-test` private.** *(H1)* — **verified still public on 2026-09-24.**
  `nkc-main` is already private. Rotation is the real fix, but leaving it public keeps handing bots the history.

- [ ] **Deploy everything.** The database is ahead of the code right now. In order:
  1. Backend (Cloud Run)
  2. Both frontends
  3. The Cloudflare worker (this is where the new CSP and security headers live)
  4. The two edge functions, `create-order` and `verify-payment` — safe now that the RPC exists. Until they are deployed the promo counter will not increment; the code logs an error rather than failing a payment, so nobody is blocked, but counts are lost in the gap.

- [ ] **Set `ENVIRONMENT` in Cloud Run.** *(L5)*
  It defaults to `production`, which is the safe default — but confirm it is not set to `development` anywhere, or the config validator will only warn instead of refusing to boot.

## 6.3 — Do soon 🟠

- [ ] **Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Cloud Run.** *(M1)*
  Not present in your local `.env`. Until these are set, rate limits stay per-instance — the code is correct either way, but M1 is not truly closed. Upstash's free tier is sufficient at your scale.

- [ ] **Flip the `materials` bucket to private and point the UI at `/api/materials/{id}/download`.** *(M9)*
  **Verified: all five buckets are still public-read.** The signed-URL endpoint is ready. Until the flip, existing public URLs still work and the endpoint falls back to them.

- [ ] **Set per-bucket size and MIME limits in the Supabase dashboard.** *(M8)*
  **Verified: `file_size_limit` and `allowed_mime_types` are `null` on all five buckets.** The backend validates uploads, but these limits are defence in depth for anything that reaches storage another way. Suggested: `avatars` 5 MB images only; `post-images` / `test-images` 10 MB images only; `materials` / `ai-user-uploads` 50 MB images + PDF.

- [ ] **Check for promo codes already past their limit, then validate the constraint.** *(L4)*
  The `CHECK` was added `NOT VALID` because the old race may already have overshot:
  ```sql
  SELECT id, code, used_count, max_uses FROM promo_codes
   WHERE max_uses IS NOT NULL AND used_count > max_uses;
  -- fix any rows found, then:
  ALTER TABLE promo_codes VALIDATE CONSTRAINT promo_codes_used_within_max;
  ```

- [ ] **Install the pre-commit hook in your other clones.** *(H1)*
  `core.hooksPath` is per-clone, not committed. Run `./scripts/scan-secrets.sh install` wherever else you work.

## 6.4 — Deferred by design 🟡

Both were left undone on purpose, not overlooked. Each needs its own focused session.

- [ ] **Move the refresh token to an httpOnly cookie.** *(M6 root cause)*
  Tokens are still in `localStorage`, so any XSS is an account takeover. The sinks are closed and the CSP is tightened, but this is the real fix. It is an auth-architecture change and deserves to be done deliberately.

- [ ] **Route anonymous attempts to `anon_test_attempts`.** *(H4 root cause)*
  Needs a nullable `user_tests.user_id` (or guest identity in metadata) plus creator-dashboard changes. Doing it naively empties conducted-exam dashboards.

## 6.5 — Ongoing 🟢

- [ ] **Run the drift checker after any manual SQL.** `scripts/check-rls-drift.sql` — seven queries that must all return zero rows. Run it whenever you change policies in the dashboard, and regenerate the baseline afterwards.
- [ ] **Never run anything from `supabase/_archive_do_not_apply/`.** If you need something from one of those files, write a new migration instead.
- [ ] **Consider `gitleaks`.** The pre-commit hook works without it, but will use it automatically if installed.
- [ ] **Keep `scoring.py` and `TestPage.tsx` in sync.** If you change marking rules, change both and re-run `backend/scripts/test_scoring_parity.py`.

---

## Part 7 — Where this leaves you

Every finding in the original audit has been either fixed, bounded with the reason stated, or handed to you in Part 6 with its live status. Nine further issues were found while verifying and are fixed — four of them (stored XSS via `revision_notes`, KaTeX `trust: true`, the password-reset open redirect, and the unauthenticated results endpoint) were at least as serious as items in the original HIGH list.

The two enforcement layers now back each other up, which was the core problem. The backend checks authorization in Python because it runs as service-role; RLS independently blocks the anon key; and the answer key is unreachable from either direction — column privileges stop PostgREST, and `strip_answer_key` stops the API.

**The single most important thing left is not code: rotate the leaked keys and make the repo private.** That is the only finding where the exposure is ongoing, outside your application, and entirely outside this work's reach.
