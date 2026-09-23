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
