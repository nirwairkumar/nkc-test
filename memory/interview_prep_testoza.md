# 🎯 TestoZa — Technical Interview Preparation Guide

> **Platform:** TestoZa (testoza.com)  
> **Built By:** Nirwair Kumar Chaudhary  
> **Stage:** MVP Live  
> **Domain:** EdTech / AI-Powered Assessment Platform  

---

## 🌐 WEB SERVER USED

| Layer | Technology |
|-------|-----------|
| **Backend WSGI/ASGI Server** | **Uvicorn** (ASGI server for Python) |
| **Framework** | FastAPI (Python) |
| **Containerization** | Docker (multi-stage build) |
| **Hosting** | Google Cloud Run (serverless containers) |
| **CDN / Proxy** | Cloudflare (DNS, DDoS, caching, SSL termination) |
| **Frontend Hosting** | Vercel / Cloudflare Pages |

**Key point:** Uvicorn is an ASGI (Asynchronous Server Gateway Interface) server, unlike traditional WSGI servers like Gunicorn. This makes it natively async and ideal for FastAPI.

---

## 🏗️ HIGH-LEVEL ARCHITECTURE

```
User Browser
     │
     ▼
Cloudflare (DNS + CDN + DDoS Protection + SSL Termination)
     │
     ├──── Frontend ──── Vercel/Cloudflare Pages
     │                   React + Vite SPA
     │
     └──── Backend API ── Google Cloud Run (Docker Container)
                          FastAPI + Uvicorn
                              │
                              ▼
                         Supabase (BaaS)
                         ├── PostgreSQL (Database)
                         ├── Auth (JWT-based)
                         └── Storage (File/Image uploads)
```

---

## 💻 COMPLETE TECH STACK

### Frontend
| Technology | Version / Detail |
|-----------|---------|
| React | v18.3.1 |
| TypeScript | v5.8.3 |
| Vite | v5.4.19 (Build tool) |
| TailwindCSS | v3.4.17 |
| ShadCN UI | Radix UI-based component library |
| React Router DOM | v6.30.1 (client-side routing) |
| Axios | v1.13.4 (API client) |
| React Hook Form + Zod | Form validation |
| React Query (TanStack) | v5.83.0 (server state management) |
| KaTeX + mhchem | Math & chemistry rendering |
| Framer Motion | Animations |
| TipTap | Rich text editor |
| Recharts | Data visualization |
| Supabase JS | v2.87.1 (OAuth/Auth client) |

### Backend
| Technology | Detail |
|-----------|--------|
| Python | v3.11 |
| FastAPI | Async REST API framework |
| Uvicorn | ASGI server |
| Pydantic v2 | Data validation & settings |
| Supabase Python SDK | Database + Auth client |
| Google Generative AI SDK | Gemini 2.0 Flash integration |
| PyMuPDF (fitz) | PDF parsing for AI import |
| Pillow + OpenCV | Image processing for vision pipeline |
| youtube-transcript-api | YouTube lecture-to-test |
| yt-dlp | YouTube data extraction |
| httpx | Async HTTP client |

### Infrastructure & DevOps
| Service | Role |
|---------|------|
| Google Cloud Run | Serverless container hosting (auto-scaling) |
| Docker | Multi-stage containerization |
| Cloudflare | CDN, DDoS protection, DNS, SSL |
| Supabase | PostgreSQL + Auth + Storage (BaaS) |
| Vercel / CF Pages | Frontend deployment |
| Git (GitHub) | Multi-repo version control (Root + Frontend + Backend) |

---

## 📁 PROJECT STRUCTURE

### Repository Structure (Multi-Repo)
```
nkc-test (Root Repo)
├── frontend/           ← Separate Git repo (sub-module style)
├── backend/            ← Separate Git repo
├── infrastructure/     ← Deployment guides, Cloudflare workers
├── memory/             ← Internal notes & docs
├── plans/              ← Feature planning docs
└── mcp-servers/        ← MCP tools (Google Ads MCP)
```

### Backend Structure
```
backend/
├── app/
│   ├── main.py         ← FastAPI app entry point, middleware, router registration
│   ├── core/
│   │   ├── config.py   ← Pydantic settings (env vars)
│   │   └── database.py ← Supabase client (singleton pattern)
│   ├── routers/        ← 20+ API route modules
│   │   ├── auth.py
│   │   ├── tests/      ← read.py, write.py (test CRUD)
│   │   ├── attempts.py
│   │   ├── users.py
│   │   ├── ai.py       ← AI chatbot, PDF importer, YouTube generator
│   │   ├── results.py
│   │   ├── categories.py
│   │   ├── pricing.py
│   │   ├── analytics/
│   │   ├── posts.py
│   │   ├── social.py
│   │   └── sitemap.py
│   ├── schemas/        ← Pydantic models
│   ├── services/       ← Business logic layer
│   └── utils/
├── ai_preview_importer/ ← PDF vision pipeline
├── Dockerfile           ← Multi-stage Docker build
├── Procfile             ← uvicorn app.main:app
└── requirements.txt
```

### Frontend Structure
```
frontend/src/
├── App.tsx             ← Routes, lazy loading, providers
├── Layout.tsx          ← Navbar, footer, auth guards
├── pages/              ← 49 page components
├── components/         ← Reusable UI components
│   ├── TestBuilder.tsx ← Main test creation UI
│   ├── AuthForm.tsx    ← Login/Signup
│   ├── Navbar.tsx
│   └── ui/             ← ShadCN base components
├── contexts/
│   ├── AuthContext.tsx ← Global auth state
│   └── TestContext.tsx ← Live exam state
├── lib/
│   ├── apiClient.ts    ← Axios instance with interceptors
│   ├── testsApi.ts     ← Test CRUD API calls
│   ├── testResilience.ts ← AnswerVault (IndexedDB), retry logic
│   └── authApi.ts
└── hooks/              ← Custom React hooks
```

---

## 🔐 AUTHENTICATION SYSTEM

### Flow: Email/Password
1. User submits email + password → POST `/api/auth/login`
2. Backend verifies with Supabase Auth
3. Returns `access_token` + `refresh_token` (JWT)
4. Frontend stores tokens in `localStorage`
5. Every API request attaches `Authorization: Bearer <token>`

### Flow: Google OAuth (Social Login)
1. User clicks "Sign in with Google" → `supabase.auth.signInWithOAuth()`
2. Supabase redirects to Google consent screen
3. Google redirects back to `/auth/callback?code=...`
4. `AuthCallback.tsx` exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
5. Tokens stored in `localStorage`; user redirected to dashboard or onboarding

### JWT Verification (Backend)
```python
def get_current_user(credentials: HTTPAuthorizationCredentials):
    token = credentials.credentials
    user = db.auth.get_user(token)  # Supabase verifies JWT
    return user.user
```

### Token Refresh Strategy (3-Layer)
1. **Supabase SDK** `refreshSession()` — primary method
2. **Backend** `/auth/refresh` endpoint — legacy fallback
3. **Custom Event** `testoza:session-expired` — graceful exam fallback (never hard-redirects during a live exam)

### Proactive Token Refresh
- During live exams, a background interval refreshes JWT every **45 minutes** to prevent expiry during 2-3 hour exams.

---

## 🗄️ DATABASE DESIGN (Supabase PostgreSQL)

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (designation, name, avatar, premium status) |
| `tests` | Test metadata (title, sections, config, creator, slug) |
| `questions` | Questions linked to tests (type, options, correct answer, marking) |
| `attempts` | User test attempts (answers, score, time taken) |
| `categories` | Test categories/tags |
| `admins` | Admin email list |
| `posts` | News/blog posts |
| `plans` | Subscription/pricing plans |
| `promo_codes` | Discount codes |
| `combined_sessions` | Multi-paper combined test sessions |
| `materials` | Study materials per class |

### Supabase Client Pattern
- Single **global service-role client** (singleton) — created once at startup
- Bypasses RLS on backend (Python logic handles authorization)
- User identity validated via `get_current_user()` JWT check before any write
- 60-second timeout configured via `httpx.Client`

---

## 🧠 AI SYSTEM ARCHITECTURE

### Three AI Features

#### 1. PDF → Test Importer (Vision Pipeline)
- User uploads PDF
- **PyMuPDF** extracts pages as images
- **OpenCV** preprocesses images for clarity
- Images sent to **Gemini Vision** (multimodal) with structured prompt
- Gemini returns JSON with questions, options, correct answers
- Backend validates and stores test in DB

#### 2. YouTube Lecture → Test/Notes
- User provides YouTube URL
- **youtube-transcript-api** extracts transcript
- Transcript sent to **Gemini 2.0 Flash** with prompt
- Returns structured questions or revision notes

#### 3. AI Mentor Chatbot (Post-Exam)
- Activates on Results page after exam
- Frontend sends: user message + full test context (questions, answers, scores, topic analysis)
- Backend fetches user's **last 10 attempts** from DB
- System prompt is dynamically built with:
  - Test overview & score card
  - Topic performance matrix (🟢 Strong / 🟡 Moderate / 🔴 Weak)
  - Mistake Ledger (wrong answers with correct answer)
  - Historical performance trends
  - Mentor persona rules
- Response streamed back from **Gemini 2.0 Flash**
- Renders with **Markdown + LaTeX** in the UI

---

## 🧪 TEST ENGINE & EXAM SYSTEM

### Question Types
- **Single Choice (MCQ)** — one correct answer
- **Multiple Correct (MCQ+)** — multiple correct, partial marking
- **Numerical (Integer)** — range-based evaluation
- **Image-based** — question or options as images

### Marking System
- Custom marks per question
- Custom negative marking (supports fractions like 1/4)
- Partial marking for multiple-correct questions
- Section-wise scoring
- Override marking per individual question

### Proctoring Features
- Full-screen enforcement
- Tab-switch detection
- Strict mode (auto-submit on violation)
- Warning mode (multi-warning system)
- Disable copy/paste, right-click

### Exam Resilience (Critical for Indian Competitive Exams)
| Mechanism | Technology |
|-----------|-----------|
| **AnswerVault** | IndexedDB — persists answers locally every 30s |
| **Session Recovery** | Reload test → auto-restore from IndexedDB |
| **Proactive Token Refresh** | Background interval every 45 minutes |
| **Exponential Retry** | 5 retries: 1s, 2s, 4s, 8s, 15s |
| **Transient 500/503 Retry** | 2 retries: 800ms, 2000ms (for cold starts) |
| **Session Expired Event** | `testoza:session-expired` custom DOM event |

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Frontend
| Optimization | Detail |
|-------------|--------|
| **Code Splitting** | 11 manual Vite chunks (react, ui, charts, editor, motion, etc.) |
| **Lazy Loading** | All 49 pages lazy-loaded via `React.lazy()` + `Suspense` |
| **Image Optimization** | PNG → WebP, 89.6% size reduction (3.2MB → 332KB) |
| **Brotli + Gzip** | 60-80% JS/CSS compression |
| **Non-blocking CSS** | Async CSS delivery via custom Vite plugin |
| **Route Prefetching** | `usePrefetch` hook — loads route chunk on hover |
| **Caching** | JS/CSS: 1 year immutable; Images: 30 days |
| **Font Optimization** | `font-display: swap`, preconnect to Google Fonts |
| **Lazy Image Loading** | Intersection Observer |

### Backend
| Optimization | Detail |
|-------------|--------|
| **GZip Middleware** | Compresses all responses > 1KB (~70% test JSON) |
| **Singleton DB Client** | One Supabase client shared across all requests |
| **Parallel DB calls** | `Promise.all()` for concurrent user data fetch |
| **API Cache Headers** | `no-store` on `/api/*` to prevent CDN caching of user data |

### Core Web Vitals Impact
- **LCP**: 30-50% faster
- **FCP**: 20-40% faster
- **CLS**: Improved with explicit image dimensions

---

## 🌐 DEPLOYMENT & INFRASTRUCTURE

### Backend Deployment (Google Cloud Run)
```dockerfile
FROM python:3.11-slim AS builder   # Stage 1: install deps
FROM python:3.11-slim              # Stage 2: lean runtime
USER appuser                       # Non-root for security
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
- Port: `$PORT` (Cloud Run dynamic, default 8080)
- Auto-scales to zero when idle
- Cold-start handled by client-side retry logic

### CORS Configuration
```python
origins = [
    "https://testoza.com",
    "https://www.testoza.com",
    "http://localhost:5173",
]
```

### Middleware Stack (Backend)
1. `GZipMiddleware` — response compression
2. `CORSMiddleware` — cross-origin handling
3. Custom `add_security_headers_middleware` — cache-control on all `/api/*` routes
4. `HTTPBearer` — JWT token extraction

---

## 🔄 KEY DESIGN DECISIONS

### Why FastAPI over Django/Flask?
- Native async support (ASGI)
- Auto-generated API docs (Swagger/ReDoc at `/api/docs`)
- Pydantic for type-safe validation
- Much faster than Django for pure API

### Why Supabase over raw Postgres?
- Built-in Auth (JWT, OAuth, magic links)
- Built-in Storage (S3-compatible)
- Real-time capabilities (future use)
- No need to manage database server

### Why Vite over CRA?
- 10-100x faster dev server (ESM-based)
- Native code splitting & tree shaking
- Better TypeScript support

### Why Google Cloud Run over Railway/Heroku?
- True serverless (scales to zero)
- No cold-start cost at low traffic
- Docker-native — no platform lock-in
- Google's infrastructure (same as Gemini API)

### Onboarding Redirect Guard
- New users (no `designation`) are sent to `/onboarding`
- Auth callback pages (`/auth/callback`, `/login`) are excluded from redirect
- Prevents infinite redirect loop during OAuth flow

---

## 🛡️ SECURITY PRACTICES

| Practice | Implementation |
|----------|---------------|
| **JWT Verification** | Backend validates every token via Supabase |
| **Service Role Key** | Only on backend — never exposed to frontend |
| **Non-root Docker user** | `appuser` in container |
| **CORS whitelist** | Only testoza.com domains allowed in production |
| **No-cache headers** | All API responses have `Cache-Control: no-store` |
| **RLS Bypass** | Backend uses service key — authorization logic in Python |

---

## 📊 API STRUCTURE (20+ Routers)

| Prefix | Router | Purpose |
|--------|--------|---------|
| `/api/auth` | auth.py | Login, register, refresh, OAuth |
| `/api/tests` | tests/ | CRUD for tests & questions |
| `/api/attempts` | attempts.py | Start, save, submit attempts |
| `/api/results` | results.py | Fetch attempt results & analysis |
| `/api/users` | users.py | Profile management |
| `/api/ai` | ai.py | Chat, PDF import, YouTube import |
| `/api/categories` | categories.py | Tags and categories |
| `/api/pricing` | pricing.py | Plans, subscriptions, promo codes |
| `/api/social` | social.py | Likes, follows |
| `/api/analytics` | analytics/ | Admin analytics dashboard |
| `/api/posts` | posts.py | News/blog posts |
| `/api/combined-sessions` | combined_sessions.py | Multi-paper exams |
| `/api/materials` | materials.py | Study materials |
| `/api/storage` | storage.py | File uploads |
| `/api/support` | support.py | Support tickets |
| `/api/features` | features.py | Feature flags (admin-controlled) |

---

## ❓ EXPECTED INTERVIEW QUESTIONS

---

### 🔹 BASIC / INTRO QUESTIONS

1. **What is TestoZa and what problem does it solve?**
   > An AI-powered assessment platform for students, teachers, and coaching institutes. Solves the gap between basic tools (Google Forms) and expensive LMS platforms by offering structured tests, AI-powered generation, secure proctoring, and creator-based publishing.

2. **What is the current status of the platform?**
   > MVP is live at testoza.com. Built independently as a solo developer.

3. **Who are the target users?**
   > Students, Teachers, Coaching Institutes, Schools, and EdTech Creators.

4. **What makes TestoZa different from Google Forms or other platforms?**
   > Partial marking, negative marking, section-wise evaluation, secure proctoring, AI test generation, creator profiles, and a community/social model.

---

### 🔹 TECH STACK QUESTIONS

5. **Why did you choose FastAPI over Django or Flask?**
   > FastAPI is async-native (ASGI), auto-generates docs, and has Pydantic built-in for validation. Much faster for REST APIs than Django's synchronous model.

6. **What is the difference between WSGI and ASGI?**
   > WSGI is synchronous — one request at a time per worker. ASGI is asynchronous — handles concurrent I/O without blocking (ideal for WebSockets, streaming, and async DB queries).

7. **What web server is used?**
   > **Uvicorn** — an ASGI server. The command is `uvicorn app.main:app`. Cloudflare handles SSL termination and CDN at the edge.

8. **Why Supabase over Firebase or a raw PostgreSQL setup?**
   > Supabase provides PostgreSQL (relational, unlike Firebase), built-in Auth with JWT & OAuth, and S3-compatible storage — all in one. Avoids managing a separate auth server.

9. **Why Vite over Create React App?**
   > Vite uses native ES modules in development — near-instant HMR. CRA bundles everything with webpack which becomes slow as the project grows.

10. **How does your frontend communicate with the backend?**
    > Via Axios (`apiClient.ts`) with a `Bearer <JWT>` token in the Authorization header. JWT is stored in `localStorage`.

---

### 🔹 ARCHITECTURE QUESTIONS

11. **Walk me through the full request lifecycle when a student submits a test.**
    > Student clicks submit → `POST /api/attempts` with answer payload → Backend validates JWT → Stores answers in Supabase `attempts` table → Returns score and result → Frontend redirects to `/results`.

12. **How do you handle authentication in your app?**
    > JWT-based. Supabase issues tokens on login. Backend verifies token on every request using `supabase.auth.get_user(token)`. Tokens are refreshed proactively and via interceptors.

13. **What is your database design for storing test questions?**
    > Tests table stores metadata. Questions table stores individual questions linked by `test_id` with fields for type (MCQ/Numerical/Multi-correct), options (JSONB array), correct answer, and per-question marking config.

14. **How does your multi-repo structure work?**
    > Root repo tracks frontend and backend as git submodules. Each has its own git history and remote on GitHub. The root repo commits updated submodule references.

15. **How does Google Cloud Run auto-scale?**
    > Cloud Run is serverless — it spins up container instances on demand and scales to zero when there's no traffic. Each instance runs uvicorn serving FastAPI requests.

---

### 🔹 AI QUESTIONS

16. **How does the PDF-to-Test feature work?**
    > PyMuPDF extracts PDF pages as images → OpenCV preprocesses → Gemini Vision API analyzes each page with a structured prompt → Returns JSON with questions, options, answers → Backend validates and stores in DB.

17. **Which AI model do you use and why?**
    > Google Gemini 2.0 Flash — for speed and multimodal capability (can understand images + text). The Flash variant gives low latency even with large context blocks.

18. **What is In-Context Learning vs Fine-tuning?**
    > Fine-tuning trains the model on your data permanently. In-Context Learning injects context (student data, mistakes, history) directly into the system prompt at inference time. TestoZa uses the latter for the AI mentor.

19. **How does the AI chatbot avoid hallucinations?**
    > The exact question text, student's chosen answer, and correct answer are injected directly into the system prompt. The AI is constrained to cite this data — it cannot make up generic advice.

---

### 🔹 SECURITY QUESTIONS

20. **How do you protect API routes?**
    > All sensitive routes use `Depends(get_current_user)` which validates the JWT via Supabase. The service role key is only on the backend — never sent to the browser.

21. **What is the difference between anon key and service role key in Supabase?**
    > Anon key has limited public access (governed by RLS policies). Service role key bypasses all RLS — used only on backend for admin-level DB access.

22. **How do you prevent CORS issues?**
    > CORS middleware on FastAPI whitelists only `testoza.com` and `localhost` origins in production.

---

### 🔹 PERFORMANCE QUESTIONS

23. **How do you prevent slow initial page load?**
    > Lazy loading all 49 pages with `React.lazy()`, code splitting into 11 chunks, WebP images (89.6% smaller), Brotli compression, async CSS delivery, and route prefetching on hover.

24. **How does the AnswerVault work?**
    > It's an IndexedDB wrapper (`testResilience.ts`). Answers are auto-saved every 30s to IndexedDB under key `{userId}_{testId}`. On page reload, the system checks IndexedDB and offers to restore saved answers.

25. **How do you handle API failures during an exam?**
    > Three strategies: exponential retry (5 attempts), transient 500/503 retry (for Cloud Run cold starts), and if all fail, a `testoza:session-expired` custom DOM event is dispatched — the exam UI catches this and shows a dialog instead of forcing logout.

---

### 🔹 EXAM/TEST ENGINE QUESTIONS

26. **Explain how partial marking works.**
    > For Multiple-Correct questions, if a student selects some (but not all) correct answers without selecting wrong ones, they get a fraction of the marks (e.g., 2/3 × total marks). The marking engine calculates this per question.

27. **How does the proctoring system work?**
    > Full-screen API enforcement, `visibilitychange` event for tab switches, Strict Mode auto-submits on violation, Warning Mode gives configurable warnings before submit. All implemented client-side in `TestPage.tsx`.

28. **How does a combined exam (multi-paper) work?**
    > `combined_sessions` table tracks a group of tests. User completes Paper 1, gets a break screen, then Paper 2 starts. Combined scoring aggregates individual paper scores.

---

### 🔹 DEPLOYMENT QUESTIONS

29. **Walk me through deploying a code change to production.**
    > Commit to frontend/backend git repo → Push to GitHub → Cloud Run automatically detects push and builds Docker image → Deploys new revision → Old revision handles traffic until new one is healthy → Zero-downtime rollover.

30. **What is your Docker setup?**
    > Multi-stage build: Stage 1 installs Python dependencies in a virtual env. Stage 2 copies only the venv and app code into a minimal `python:3.11-slim` image. Non-root `appuser` for security. Exposes port 8080.

31. **How does Cloudflare fit into your architecture?**
    > Acts as a reverse proxy in front of the frontend. Handles SSL termination, DDoS protection, CDN caching (static assets cached at edge), and can run Cloudflare Workers for dynamic SEO tasks.

---

### 🔹 BUSINESS / PRODUCT QUESTIONS

32. **What is the Creator Model on TestoZa?**
    > Teachers/institutions can create and publish tests publicly. They get a verified creator badge and a creator profile page. Verified status is granted by admin. Tests can be discovered via search/tags.

33. **What is the pricing model?**
    > Freemium — basic access is free. Premium subscription unlocks advanced features. Admin can issue promo codes. `plans` and `promo_codes` tables manage this.

34. **What is your SEO strategy?**
    > Dynamic XML sitemaps for tests/categories/tags/creators, Schema.org structured data (Quiz type), unique meta tags per test page (title, description, OG tags), `robots.txt` configuration, and Cloudflare Workers for edge SEO injection.

35. **What are you planning for the next version?**
    > Student-Teacher social community, messaging system, leaderboards, PWA, AI-based weakness analysis, and an advanced analytics dashboard.

---

### 🔹 PROBLEM-SOLVING / DEBUGGING QUESTIONS

36. **What was the hardest bug you fixed?**
    > The Google OAuth infinite redirect loop. New users had no `designation`, so `Layout.tsx` kept redirecting them to `/onboarding`, but the redirect also fired during `/auth/callback` itself — before the session exchange completed. Fixed by adding an `isAuthFlow` check that excludes auth pages from the redirect guard.

37. **How did you handle session exhaustion in the Supabase client?**
    > Previously, a new Supabase client was created per request — causing connection exhaustion. Switched to a single global singleton client shared across all requests.

38. **How do you handle cold starts on Cloud Run?**
    > The API client (`apiClient.ts`) has a built-in transient retry: 500/503 errors trigger up to 2 retries with 800ms and 2000ms delays. This is transparent to the user.

---

## 📌 QUICK REFERENCE: ONE-LINER ANSWERS

| Question | Answer |
|---------|--------|
| Frontend framework | React + TypeScript + Vite |
| CSS framework | TailwindCSS + ShadCN |
| Backend framework | FastAPI (Python) |
| Web server | Uvicorn (ASGI) |
| Database | PostgreSQL via Supabase |
| Auth method | JWT (Supabase Auth) |
| AI model | Google Gemini 2.0 Flash |
| Cloud hosting | Google Cloud Run (Docker) |
| CDN | Cloudflare |
| State management | React Context + TanStack Query |
| Exam backup | AnswerVault (IndexedDB) |
| Routing | React Router DOM v6 |
| API client | Axios with request/response interceptors |
| Image format | WebP (optimized from PNG) |
| Build tool | Vite with manual chunk splitting |
| Version control | Git (multi-repo: root + frontend + backend) |

---

*Last Updated: June 2026 | By: Antigravity AI Assistant*
