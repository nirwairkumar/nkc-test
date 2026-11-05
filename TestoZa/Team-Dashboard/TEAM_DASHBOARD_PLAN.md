# TestoZa Team Dashboard — plan and structure

**Address:** `team.testoza.com`  ·  **Written:** 5 Nov 2026  ·  **Status:** Phase 1 built and tested locally, not yet deployed (see section 12)

This document explains how the employee dashboard is designed, why each piece exists, and how to run it day to day. Read section 1 for the summary; the rest is reference.

---

## 1. Summary

You (the owner) add an employee in **admin.testoza.com → Team**. You give them:

- a **login ID** (for example `priya.s`) and a **temporary password**, shown once;
- **permissions**: only the modules they need, such as Support or Analytics;
- an optional **access end date** (for example, the last day of an internship).

The employee opens **team.testoza.com** and signs in with that login ID and password. On their first login they must:

1. change the temporary password;
2. scan a QR code with an authenticator app on their phone (Google Authenticator or Microsoft Authenticator).

After that, every login needs: **login ID + password + 6-digit code from the phone**.

They see only the modules you gave them. Everything they open or change is written to an **activity log** that you can read in the admin panel and that they cannot edit or delete.

Employees **cannot** sign up and **cannot** use Google sign-in. Only you can create an employee account.

### Decisions you made (5 Nov 2026)

| Question | Your answer |
|---|---|
| Address | `team.testoza.com` (not `dashboard.`, which educators confuse with their own dashboard) |
| 6-digit phone code | Mandatory for every employee |
| Email permission | View history and results only, for now |
| Notifications | Team inbox now; sending notifications to users comes later and needs your approval |
| How employees sign in | Login ID + password only. No Google sign-in, no sign-up page |

---

## 2. How big companies do this, and what we copy

| Industry practice | What it means | What TestoZa does |
|---|---|---|
| **Separate staff logins from customer logins** (Google, Microsoft and Stripe use a separate staff login system, often called a workforce identity provider) | A customer account can never become a staff account by mistake, and a staff password can't be used on the customer site. | Staff accounts live in their own table (`staff_accounts`), not in Supabase Auth. A staff login ID cannot sign in to testoza.com, and an educator account cannot sign in to team.testoza.com. |
| **Least privilege / role-based access (RBAC)** | Give each person only what their job needs, and deny everything else by default. | 7 small permissions, plus ready-made role presets. Anything not ticked is refused **by the server**, not just hidden in the screen. |
| **Multi-factor authentication (MFA)** | A password alone is not enough. | Mandatory 6-digit authenticator code (TOTP, the same standard as Google Authenticator). |
| **Audit log** (required for SOC 2 and ISO 27001 certification) | A record of who did what and when, which nobody can rewrite. | `staff_audit_log`. The database refuses edits and deletes even from the server, so a hacked server can't hide its tracks. |
| **Short sessions, instant revoke** | Stolen sessions expire fast, and a fired employee is cut off immediately. | Signs out after 30 minutes idle and after 12 hours in total. Suspending an employee ends their sessions within seconds. |
| **Separate internal app** | Internal tools live on their own domain, are not indexed, and load nothing from third parties. | team.testoza.com is its own Cloudflare Pages project. It sets a strict security policy for the browser, loads no outside scripts and has no Supabase key. |
| **Data minimisation** | Staff see the least personal data needed for the task. | Support shows the writer's name and message. Email and phone are masked (`ra•••@gmail.com`) unless you tick "See contact details". |
| **Maker–checker (four-eyes rule)** | Risky actions need a second person. | Not used for email yet: on 5 Nov 2026 you chose "same as admin" so the work can be handed over now. Instead, team sends have hard limits (links only to testoza.com or YouTube, tests only to their own address, 10 sends a day) and admin → History names the sender. Approval before sending can be added later if a send ever goes wrong. User notifications are still phase 2. |
| **Joiner–Mover–Leaver process** | A checklist for hiring, role changes and exits. | See section 9. Access end dates switch accounts off automatically. |
| **Zero-trust access** (Google's BeyondCorp approach) | The login page itself is hidden from the internet. | Optional extra layer (section 10): Cloudflare Access in front of team.testoza.com, free for up to 50 people. |

---

## 3. Architecture

```
 Employee's browser                         Owner's browser
 team.testoza.com                           admin.testoza.com
 (Cloudflare Pages: frontend-staff/)        (Cloudflare Pages: frontend-admin/)
        │  cookie (HttpOnly, never readable by JavaScript)  │  Supabase admin token (existing)
        ▼                                                   ▼
 ┌───────────────────────── apigcp.testoza.com (backend-proxy Worker) ─────────────────────────┐
 │                                    Cloud Run backend (FastAPI)                               │
 │   /api/staff/*          staff-only routes                 /api/staff-admin/*  owner only     │
 │     1. Origin must be team.testoza.com                      verify_is_admin (existing)       │
 │     2. session cookie → staff_sessions row                  add / edit / suspend staff,      │
 │     3. account active, not expired                          reset password / 2-step,         │
 │     4. 2-step done (stage = full)                           read the activity log            │
 │     5. permission ticked for this route                                                      │
 │     6. write to the activity log                                                             │
 └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                ▼
                         Supabase Postgres (service key, server only)
          staff_accounts · staff_sessions · staff_audit_log  (+ support, feedback, analytics, email)
```

**Why the server checks everything:** the backend talks to the database with the service key, which bypasses all database row rules. That makes the backend's own checks the only lock on the door. Each staff route declares the permission it needs (`require_staff("support.reply")`), so a new route is refused unless someone deliberately allows it.

**Why a cookie and not a token in the browser:** the customer app keeps its login token in `localStorage`, where any injected script could read it. The team app never sees its session at all. The session is an `HttpOnly; Secure; SameSite=Strict` cookie named `__Host-tz_team`, which JavaScript cannot read. In the database we store only a SHA-256 hash of the session, so even a database leak does not reveal usable sessions.

---

## 4. Permissions

| Permission | What the employee can do | What they still can't do |
|---|---|---|
| `inbox.view` | **Team inbox**: see new help messages, feedback and ratings as they arrive, with a count badge | Open full conversations unless Support is also ticked |
| `support.view` | Read help conversations: name, topic, message, screenshot, their account (role, number of tests) | See full email or phone |
| `support.reply` | Reply to a writer (the reply goes to their Help page and email); mark resolved or reopen | Delete anything |
| `support.contact` | See the writer's full email address and phone number | — |
| `feedback.view` | Read platform feedback and after-exam emoji ratings | — |
| `analytics.view` | Visitors, sign-ups, traffic sources and growth: numbers only, no personal data | See the people list, sessions or anyone's identity |
| `email.view` | **See emails and results**: the Playbook, the email library, past sends with their results, the automatic emails | See people lists, compose, send, or open Email Settings |
| `email.send` | **Write and send emails**: everything in admin → Email except Settings. Pick people, write, preview, send a test, send, pause and resume, edit the library, add an address to the never-email list | See full email addresses (masked like `as•••@gmail.com`; a full address typed into search still finds the person). Link anywhere except testoza.com and YouTube. Send a test anywhere except their own login email or an @testoza.com address. More than 20 tests an hour or 10 sends a day. Open Settings, take an address off the never-email list, switch automatic emails on or off |

`support.reply` and `support.contact` include `support.view` automatically. `email.send` includes `email.view`.

Every email send from the team site goes through the same server code as admin, so the one-email-a-week rule, the monthly cap, the SES warm-up and unsubscribes apply unchanged. The send loop runs in the browser, as in admin: if the team site signs the person out while a send waits for the next hour, they sign in again and press Resume in History.

### Role presets (shortcuts in the admin panel)

| Preset | Permissions |
|---|---|
| Support agent | inbox, support.view, support.reply, feedback |
| Growth assistant | inbox, analytics, email.view, feedback |
| Email sender | inbox, analytics, email.view, email.send, feedback |
| Analyst | analytics, email.view |
| Custom | whatever you tick |

### Never available to staff (no permission exists for these)

Users list or export, Feature Control, Pricing, Promo codes, Migration & Seed, deleting tests or messages, Email Settings (SMTP passwords), un-suppressing addresses, adding or editing staff, and the activity log. These remain admin-panel only.

---

## 5. Login flow

### First login

```
team.testoza.com
  │  login ID + temporary password
  ▼
[Change password]   12+ characters, not the login ID, not a common password
  ▼
[Set up 2-step]     scan QR in Google/Microsoft Authenticator → type the 6-digit code
  ▼
Home (only the modules they have)
```

### Every later login

```
login ID + password  →  6-digit code  →  Home
```

### Rules

- **Wrong password 5 times:** the account locks for 15 minutes, and you see "locked" in the admin panel. An unknown login ID gets the same message, so nobody can test which IDs exist.
- **Wrong 6-digit code 5 times:** that sign-in attempt is cancelled and counts as a failure.
- **A code can be used only once** (replay protection), and is accepted within ±30 seconds of the phone's clock.
- **Lost phone:** you click **Reset 2-step** in the admin panel. At the next login the employee scans a new QR code.
- **Forgot password:** you click **Reset password** and get a new temporary password to give them. There is no email reset link, because those links are a common way attackers take over accounts.
- **Sessions:** sign-out after 30 minutes idle and after 12 hours in total. A half-finished login (password correct, code not yet entered) expires after 10 minutes. The inbox badge refreshes every minute in the background, but those refreshes don't count as activity, so an unattended open screen still signs out.
- **After the 6-digit code is accepted**, the server issues a brand-new session ID. This blocks "session fixation", where an attacker plants a session ID before you log in.

---

## 6. Attacks and defences

| Attack | Defence |
|---|---|
| Password guessing / brute force | 5 tries then a 15-minute lock per account (stored in the database, so it holds across servers), 20 tries per 15 minutes per network, and slow password hashing |
| Password reused from another site and leaked | The 6-digit code is still needed |
| Phishing page that copies the login | The code changes every 30 s, the session is short, and the address `team.` is easy to tell apart from `testoza.com`. Phase 2: passkeys, which phishing can't capture |
| Stolen database backup | Passwords stored as scrypt hashes (salted and slow to crack), 2-step secrets encrypted with AES-256-GCM using a key that isn't in the database, sessions stored as hashes only |
| Script injected into the page (XSS) steals the login | Session cookie is HttpOnly. Strict browser security policy: scripts load only from team.testoza.com, with no inline scripts and no third-party code. React escapes all text. User messages are shown as plain text, never as HTML |
| Another site tricks the browser into acting (CSRF) | SameSite=Strict cookie, and the server rejects any request whose `Origin` isn't team.testoza.com, including our own other subdomains |
| Page shown inside another site (clickjacking) | `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| Employee leaves or is fired | Suspend = cut off within seconds. The access end date switches the account off by itself |
| Employee snoops on data | Only the data their permission allows. Every conversation opened and every reply is logged with time, IP and device |
| Employee or attacker hides their tracks | The activity log can't be edited or deleted: a database trigger refuses it, even for the server |
| Checking which login IDs exist | Same error and the same timing for wrong ID, wrong password and locked account |
| Search engines index the login page | `X-Robots-Tag: noindex`, `robots.txt` disallow, and a name that isn't "testoza dashboard" |
| Malicious npm package | The team app has 6 runtime packages with exact versions locked in package-lock.json. No Supabase client, no analytics, no chat widgets |

---

## 7. Database structure

SQL file: `supabase/migrations/20261105120000_staff_team.sql` (you paste it into the Supabase SQL editor).

### `staff_accounts`, one row per employee

| Column | Meaning |
|---|---|
| `id` | uuid |
| `login_id` | lowercase, 3–32 characters (`a-z 0-9 . _ -`), unique, never reused |
| `full_name`, `contact_email` | For your records. Email is **not** used to sign in |
| `role_label` | "Support agent", "Custom", … |
| `permissions` | text[], for example `{inbox.view,support.view,support.reply}` |
| `status` | `active` · `suspended` · `removed` |
| `expires_at` | Access end date (optional) |
| `password_hash` | `scrypt$…`. The password itself is never stored |
| `must_change_password` | true after creation or a reset |
| `totp_secret` / `totp_pending` | 2-step secret, encrypted (`v1.` AES-GCM) |
| `totp_enabled_at`, `totp_last_step` | When 2-step was set up, and the last code used (replay guard) |
| `failed_attempts`, `locked_until` | Lockout |
| `last_login_at`, `last_login_ip` | Shown in the admin panel |
| `created_by`, `created_at`, `updated_at`, `password_changed_at` | Who created the account and when things changed |

### `staff_sessions`, one row per login

`id`, `staff_id`, `token_hash` (SHA-256 of the cookie), `stage` (`mfa` → `full`), `mfa_attempts`, `created_at`, `last_seen_at`, `expires_at`, `ip`, `user_agent`, `revoked_at`, `revoked_reason`.

### `staff_audit_log`, append-only

`id`, `created_at`, `actor_type` (`staff` | `admin` | `anonymous`), `actor_id`, `actor_label` (login ID or admin email), `action` (for example `support.reply`, `auth.login_failed`, `staff.suspend`), `target_type`, `target_id`, `detail` (json), `ip`, `user_agent`.

A trigger raises an error on any UPDATE or DELETE.

### Changes to existing tables

- `support_replies.staff_id` records which employee wrote a reply. Replies still show to the user as "TestoZa".
- `support_messages.resolved_by_staff` records which employee resolved a message. `resolved_by` can only point at a customer account, so it stays empty for staff.

### Security on all three new tables

Row-level security is on with no policies, and all rights are revoked from `anon` and `authenticated`. Only the backend (service key) can touch them, so the public Supabase key reads nothing.

---

## 8. Code structure

### Backend (`backend/`)

```
app/core/staff_security.py       password hashing (scrypt), 6-digit codes (TOTP, RFC 6238),
                                 secret encryption (AES-GCM), session tokens, temp passwords
app/routers/staff/__init__.py    mounts everything below
app/routers/staff/deps.py        require_staff(permission): origin → cookie → session → account →
                                 stage → permission; audit() helper; PERMISSIONS catalogue
app/routers/staff/auth.py        /api/staff/auth: login, me, password, 2fa/setup, 2fa/verify, logout
app/routers/staff/inbox.py       /api/staff/inbox                       inbox.view
app/routers/staff/support.py     /api/staff/support/messages[/{id}[/reply]]   support.*
app/routers/staff/feedback.py    /api/staff/feedback                    feedback.view
app/routers/staff/analytics.py   /api/staff/analytics/{overview,growth} analytics.view
app/routers/staff/email.py       /api/staff/email/*  (same functions as admin email_broadcast.py / email_auto.py)
                                 email.view: overview, templates, preview, campaigns, auto
                                 email.send: audience, test, templates edit, campaigns send/pause, suppressions
app/routers/staff/admin.py       /api/staff-admin/*  (owner): catalog, accounts CRUD, reset password,
                                 reset 2-step, sign out everywhere, sessions, activity log
app/core/config.py               + https://team.testoza.com in ALLOWED_ORIGINS, STAFF_ORIGINS
tests/test_staff_team.py         login, lockout, 2-step, permissions, origin check, audit, admin
```

### Team app (`frontend-staff/`, deployed to team.testoza.com)

```
frontend-staff/
  index.html                 no inline scripts
  public/_headers            security headers (CSP, HSTS, noindex, no-frame, no-cache for HTML)
  public/robots.txt          Disallow: /
  src/main.tsx, App.tsx      routes; every page behind the session gate
  src/lib/api.ts             fetch with credentials: 'include'; no tokens in JS
  src/lib/session.tsx        who am I, next step (change password / 2-step), 30-min idle sign-out
  src/components/            Shell (sidebar + top bar), ui (buttons, cards, inputs), Qr, Toast
  src/pages/auth/            Login, ChangePassword, TwoStepSetup, TwoStepVerify
  src/pages/                 Home, Inbox, Support, Feedback, Analytics, Email, Account
```

### Admin panel (`frontend-admin/`)

```
src/pages/team/TeamPanel.tsx     list, add member, presets + permission ticks, end date,
                                 suspend / reset password / reset 2-step / sign out everywhere
src/pages/team/ActivityLog.tsx   who did what, filter by person
src/pages/team/api.ts
AdminDashboard.tsx               new "Team" item in the sidebar
```

---

## 9. Running it: Joiner, Mover, Leaver

**Joiner (new employee):**

1. Admin → Team → **Add member**: choose a login ID, name, preset and end date.
2. Copy the temporary password. Send the login ID and password **separately**, for example the ID on WhatsApp and the password by phone call. Never send both in one message.
3. They log in, set their own password and set up 2-step. You'll see "2-step ✓" next to their name.

**Mover (job changes):** edit their permissions. This takes effect on their next click; they don't need to log in again.

**Leaver (employee exits):** click **Suspend**. They are signed out within seconds. Keep the account suspended rather than removed, so the activity log stays linked to a name.

**Monthly (5 minutes):** open Team and check that everyone listed should still have access. Skim the activity log for anything odd, such as logins at 3 a.m. or 200 conversations opened in a day.

---

## 10. Deployment steps (one time)

Order matters: **database → backend → admin panel → team app.**

1. **SQL:** paste `supabase/migrations/20261105120000_staff_team.sql` into the Supabase SQL editor and run it.
2. **Backend:** push (auto-deploys in about 5 minutes). Optional but recommended: set a Cloud Run variable `STAFF_SECRET_KEY` (32 random bytes, base64) **before** anyone sets up 2-step. If it isn't set, the key is derived from the Supabase service key. Changing either one later means everyone has to set up 2-step again.
3. **Admin panel:** push. The Team tab appears.
4. **Team app:** in Cloudflare, go to Workers & Pages → Create → Pages → connect the Git repository.
   - Root directory `frontend-staff`, build command `npm run build`, output `dist`.
   - Custom domain: `team.testoza.com`.
   - No environment variables are needed; the app calls `https://apigcp.testoza.com/api` in production.
5. **Check:** add yourself a test employee, log in at team.testoza.com from a private window, and confirm the 2-step setup works and that a module you didn't tick returns "not allowed".

### Optional extra layer: Cloudflare Access (free for up to 50 people)

Zero Trust → Access → Applications → add `team.testoza.com` → allow only your employees' personal emails. Before the login page even loads, Cloudflare emails each employee a one-time code. Attackers on the internet then can't see the login page at all. The cost is one more step for employees, so turn it on once you have more than 2–3 staff or handle more sensitive data.

---

## 11. Phase 2 (not built yet)

| Item | Why |
|---|---|
| **Email approval (optional)** | Sending is live for `email.send` since 5 Nov 2026. If you ever want a second pair of eyes: sends above N people wait for your Approve in admin (maker–checker) |
| **Send in-app notifications to users, with approval** | You chose "Both": the inbox now, sending later |
| **Educator Success list** | New educators with no exam yet, plus a call/WhatsApp button (needs `people.contact`). This is where an intern's time is actually worth most (see the note below) |
| **2-step for your own admin account** | admin.testoza.com is still password-only. It is now the biggest single risk: one admin password opens everything |
| **Alert email to you** when an employee logs in from a new device or country | Spots a stolen account early |
| **Passkeys** (fingerprint or face instead of a 6-digit code) | Phishing-proof |
| **Shared rate-limit store** (Upstash Redis, which the code already supports) | Lockout counters survive restarts and multiple servers |

---

## 12. What was tested (5 Nov 2026)

- **Backend:** 24 automated tests in `backend/tests/test_staff_team.py` cover:
  - the RFC 6238 test codes, replay refusal, password hashing and policy, and the encryption binding;
  - admin-only management and temporary passwords that are never stored;
  - the wrong-site check, cookie flags, a half session that can't open modules, and the session switch after the code;
  - the 5-try lock, unknown IDs answering exactly like real ones, and 5 wrong codes;
  - permissions refused and logged, and permission changes taking effect on the next click;
  - masking, opened conversations being logged, replies recorded against the employee, and the admin reply path unchanged;
  - suspend, the access end date, the 30-minute idle limit, and password/2-step resets.

  The full backend suite gives 235 passed and 2 failed. Both failures are the old, unrelated `test_exam_sessions` negative-marking ones.
- **In a real browser (Chrome):** the built app was served with the production security headers, against the real backend code running locally on a test database.
  - We walked through the first login (temporary password → own password → QR set-up → 6-digit code), Home, Inbox, Support (masked email; a planted `<script>` shown as plain text; reply and resolve), Analytics, Email history, sign-out, and a link opened after sign-out.
  - The browser blocked nothing from the app. The only blocked items were the Grammarly extension's styles. The reply box also tells Grammarly not to read it.
- **Not yet checked live:** that the `backend-proxy` Worker in front of apigcp.testoza.com passes the `Set-Cookie` and `Cookie` headers through. A normal proxy does. If signing in at team.testoza.com loops back to the login page, check this first.

### A note on the data (blunt)

On 5 Nov 2026 there were **8 help messages in total since February, and 0 waiting**. There have been 7 email campaigns. Support and email-viewing alone won't fill an intern's day. Phase 1 gives you a safe foundation to grant access. The intern's highest-value work is still calling new educators within 24 hours to get their first exam conducted, and that needs the Educator Success list in phase 2.
