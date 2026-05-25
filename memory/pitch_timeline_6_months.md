# TestoZa — 6-Month Investor Roadmap
### AI-Powered CBT & Mentorship Platform for India's ₹10,000 Cr+ Test-Prep Market

**Platform:** [testoza.com](https://testoza.com) &nbsp;|&nbsp; **Stage:** MVP Live &nbsp;|&nbsp; **Team:** IIT Madras Founders &nbsp;|&nbsp; **Completion:** ~90% Core Features Done

---

## 🏗️ What Is Already Built (Current State)

| Module | Feature | Status |
| :--- | :--- | :---: |
| **AI Test Creation** | PDF / PPT / Image → Structured Test (AI-OCR) | ✅ Live |
| **AI Test Creation** | YouTube Lecture → Revision Notes / Live Test | ✅ Live |
| **AI Test Creation** | English-to-Hindi Bilingual Transliteration (Touch-friendly) | ✅ Live |
| **Test Builder** | Single Choice, Multiple Correct, Numerical Range Questions | ✅ Live |
| **Test Builder** | Section-wise Tests, Custom Marks, Negative Marking, Image Support | ✅ Live |
| **Exam Engine** | Full-Screen Enforcement, Tab-Switch Detection, Auto-Submit | ✅ Live |
| **Exam Engine** | Screen Wake Lock API (Device Stays Awake During Exam) | ✅ Live |
| **Exam Engine** | Local Session Save & Resume on Disconnect | ✅ Live |
| **Results & Analysis** | Section-wise Scoring, Partial Marking, Attempt History | ✅ Live |
| **AI Mentor** | Gemini-Powered Personalized Error Analysis per Question | ✅ Live |
| **AI Mentor** | 7-Day Revision Action Plan based on Weakness | ✅ Live |
| **AI Mentor** | Historical Trend Analysis (Last 10 Tests) | ✅ Live |
| **Admin Panel** | Analytics Dashboard, Pricing Control, Promo Codes, Feature Flags | ✅ Live |
| **Community** | News Feed, Post Editor, Verified Creator Profile | ✅ Live |
| **Discovery** | Tag/Category/Title Search, Infinite Scroll, Featured Tests | ✅ Live |
| **Monetization** | Pricing Page, Premium Page, Token System (Structure Ready) | ✅ Live |
| **Infrastructure** | FastAPI Backend on GCP Cloud Run + Supabase (Auth + DB + Storage) | ✅ Live |

---

## 🚀 6-Month Growth & Commercialization Plan

### Month 1 — AI Engine Hardening & Quality Assurance
*Goal: Reach production-grade reliability across all AI features*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Fine-tune AI-OCR pipeline accuracy for handwritten & printed papers | Near-perfect test digitization from scanned sheets | **≥ 99% parsing accuracy** |
| 2 | Optimize LaTeX math rendering across all mobile screen sizes | Zero broken formula displays in test cards | **0 rendering errors** on test devices |
| 3 | Stress-test Gemini AI Mentor on 100+ test result scenarios | Consistent, hallucination-free feedback | **< 2s average response time** |
| 4 | Improve AI Test Importer speed and reliability | Fast, dependable file-to-test conversion | **< 60s for 100-question paper** |

---

### Month 2 — Admin Panel Enhancement (Multi-Tenant Control Center)
*Goal: Give platform operators complete, scalable institutional control*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Build Multi-Tenant Coaching Center Management Dashboard | Activate, monitor & deactivate coaching center accounts | **1 admin manages 1,000+ centers** |
| 2 | Build Token & Billing Ledger | Track & audit AI credits issued per institution | **100% automated billing** — zero manual invoices |
| 3 | Add per-center Proctor Rule Configurator | Admins customize strictness per exam type | Configurable per test — strict / warning / off |
| 4 | Add GCP Cloud Run Telemetry Panel | Real-time server health, request rate, error alerts | **< 5 min** incident detection & alert time |
| 5 | Upgrade Feature Flag Control | Toggle features on/off per plan tier without re-deploy | Instant feature control via Admin Panel |

---

### Month 3 — Test Analysis Enhancement (Deep Student Intelligence)
*Goal: Transform basic scorecards into a premium educational analytics suite*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Add Time-Spent-Per-Question Tracking | Show students where they rushed or hesitated | Temporal chart in every result page |
| 2 | Build Concept-Level Mastery Heatmaps | Map performance to specific sub-topics (e.g., *Physics > Rotational Dynamics*) | Topic-level breakdown in every report |
| 3 | Add Cohort & Percentile Comparison | Show student's rank within their center & nationwide | Live percentile updated post-submission |
| 4 | Build Educator Batch Analytics Dashboard | Teachers see entire batch's weak topics at a glance | Actionable class-level insight per test |
| 5 | AI Growth Playbook Enhancement | Auto-generate mock questions for detected weak areas | Personalized practice pack per student |

---

### Month 4 — Security Hardening & Proctoring Finalization
*Goal: Achieve certified, zero-tolerance exam integrity for enterprise clients*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Standardize all violations to Full-Screen Blocking Alerts | One consistent, impossible-to-ignore warning UI | **100%** of violations trigger modal alert |
| 2 | Harden anti-back-navigation & session lock | Prevent URL reload / backward navigation exploits | **0 navigation escape vectors** in conduct mode |
| 3 | Add Developer Console Injection Detection | Flag attempts to open browser dev tools mid-exam | Logged & auto-flagged in proctor report |
| 4 | Add per-attempt Proctor Log Report | Give educators a full violation audit trail per student | Downloadable violation log per attempt |
| 5 | Pilot with 10 coaching centers for feedback | Validate proctoring experience in real environments | **≥ 90% satisfaction** from pilot institute admins |

---

### Month 5 — Low-Bandwidth Optimization & Scale Testing
*Goal: Serve 50,000+ concurrent users reliably, including on rural 3G networks*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Run high-concurrency load tests on GCP Cloud Run | Identify and resolve horizontal scaling bottlenecks | **50,000+ concurrent sessions** — zero crashes |
| 2 | Aggressively compress all assets & lazy-load components | Fast initial page load on slow networks | **< 2 seconds** on 3G connection |
| 3 | Enhance Offline Tolerance Engine | Save exam answers locally if connection drops | **0 answers lost** on network interruption |
| 4 | Optimize Supabase query performance (index tuning) | Reduce database latency under heavy load | **< 200ms** average DB query time |
| 5 | Enable CDN caching for static assets via Cloudflare | Speed up platform globally, especially in Tier 3 regions | **99.99% uptime** guarantee during peak exams |

---

### Month 6 — Commercial Launch & Market Penetration
*Goal: Turn active users into paying customers and aggressively scale onboarding*

| # | What We Will Do | Target Outcome | Success Metric |
| :- | :--- | :--- | :--- |
| 1 | Launch Multi-Tier Subscription Plans (Free / Basic / Pro) | Activate recurring revenue engine | **₹500–₹2,000/month** per coaching center |
| 2 | Launch Pay-Per-Test Token Packs for B2C users | Flexible monetization for individuals & freelance tutors | First **₹5 Lakh** in total GMV |
| 3 | Onboard 100+ Coaching Centers (Tier 2/3 towns) | Prove business model at scale | **100 paying institutions** by Month 6 |
| 4 | Launch Self-Serve Onboarding (< 15-min setup) | Reduce CAC (Customer Acquisition Cost) to near zero | Fully automated — **no sales calls needed** |
| 5 | Set up Referral & Creator Incentive Program | Organic, community-driven growth | **30%+ of new sign-ups** via referral |

---

## 📊 Key Milestones at a Glance

| Month | Theme | Primary Output | Key Metric |
| :---: | :--- | :--- | :--- |
| **1** | AI Hardening | Production-grade AI pipeline | 99% OCR accuracy |
| **2** | Admin Enhancement | Multi-tenant SaaS control center | 1 admin → 1,000 centers |
| **3** | Analytics Depth | Premium student intelligence suite | Concept-level mastery maps live |
| **4** | Security & Trust | Enterprise-grade cheat-proof exam | 0 navigation exploits |
| **5** | Scale & Access | Rural 3G + 50k concurrency ready | <2s load on 3G |
| **6** | Revenue | Commercial launch & 100+ clients | ₹5 Lakh+ GMV |

---

## 💰 6-Month Budget Summary

| Category | Item | 6-Month Total (₹) |
| :--- | :--- | ---: |
| AI & Automation | Gemini API Credits (PDF → Test + AI Mentor) | ₹36,000 |
| Security & CDN | Cloudflare Pro (DDoS + Rural Fast Load) | ₹10,920 |
| Monitoring | Sentry Error Tracking | ₹18,000 |
| Development | Cursor Pro IDE | ₹10,920 |
| Communications | Email Infrastructure (Verification + Notifications) | ₹2,520 |
| Research | Low-Bandwidth Proctoring Research (One-Time) | ₹15,000 |
| Validation | Field Visits to Tier 2/3 Institutes (3 Trips) | ₹18,000 |
| **TOTAL** | | **₹1,11,360** |

> **Capital Efficiency Note:** 100% of existing MVP was built using founder sweat equity. Every rupee of seed funding is deployed on scaling, market validation, and enterprise feature depth — **not foundational code.**

---

## 🎯 Why Invest Now?

| Factor | Detail |
| :--- | :--- |
| **Product Readiness** | ~90% complete. No build risk — only scale and commercialization risk. |
| **Market Size** | ₹10,000+ Crore test-prep market. 500,000+ coaching centers. 250M+ students. |
| **Defensible Moat** | Proprietary AI-OCR + local knowledge graph + trust-based B2B2C model. |
| **Rural-First Tech** | Runs on low-end smartphones. 3G-optimized. Wake Lock + offline tolerance. |
| **Unit Economics** | SaaS gross margins >85%. Token model = zero marginal cost per transaction. |
| **Team** | IIT Madras founders. Deep technical + market expertise. Full-stack execution. |
