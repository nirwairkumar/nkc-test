# TestoZa Team: team.testoza.com

The employee dashboard. Full design: [`TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md`](../TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md).

- Employees sign in with a **login ID + password + 6-digit authenticator code**. There is no sign-up and no Google sign-in.
- Accounts are created in **admin.testoza.com → Team**.
- The API lives at `/api/staff/*` in the backend (`backend/app/routers/staff/`). Every route checks the session cookie, the 2-step code and the permission.
- The session is an `HttpOnly` cookie (`__Host-tz_team`). This app never handles tokens.

## Run locally

```bash
npm install
npm run dev            # http://localhost:8097  (the backend allows this origin)
```

The app calls `http://localhost:8000/api` on localhost, or `VITE_API_URL` if set. Everywhere else it calls `https://apigcp.testoza.com/api`, which is fixed to match the CSP.

## Deploy (Cloudflare Pages)

| Setting | Value |
|---|---|
| Root directory | `frontend-staff` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Custom domain | `team.testoza.com` |
| Environment variables | none |

`public/_headers` sets the security headers: CSP, HSTS, noindex and no framing. **If you add a script, font or image from another site, the CSP will block it. Keep it that way.**

## Rules for changing this app

- Keep dependencies few, with exact versions. Each package is code that runs with an employee's access.
- Don't add analytics, chat widgets, fonts or CDNs.
- Show user-written text as text. Never use `dangerouslySetInnerHTML`, and never auto-link URLs.
- A new page needs a new permission in `backend/app/routers/staff/deps.py` (`PERMISSIONS`) and a `require_staff("…")` on its routes.
