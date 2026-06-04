# Refined Pitch Deck: TestoZa
## Slide-by-Slide Content Guide for Incubator Submission

This document outlines the updated slide-by-slide structure for TestoZa's pitch deck. It builds on your previous Canva slides, incorporating the updated metrics, ~90% complete product features, and concrete commercialization plans from the `memory` folder.

---

### Slide 1: Cover & Vision
* **Title:** TestoZa
* **Subtitle:** The AI-Powered "Zero-Code" CBT & Mentor Ecosystem
* **Tagline:** Empowering local educators to digitize tests in minutes and provide every student with an AI personal mentor.
* **Presenters:** 
  * Nirwair Kr. Chaudhry (Founder & CEO)
  * Om Shende (Founder & Product Lead)
  * Manish Nayak (Founder & Technical Lead)
* **Institutional Association:** Nirmaan Pre-Incubator, IIT Madras (May 2026)
* **Current Stage:** MVP Live (90% Core Features Completed)

> [!NOTE]
> Keep the visual style clean, modern, and high-contrast. Use a bold, tech-forward font like *Outfit* or *Inter*.

---

### Slide 2: The Founders (IIT Madras Team)
* **Nirwair Kr. Chaudhry | Founder & CEO**
  * *Background:* 4th Year B.Tech, Civil Engineering, IIT Madras.
  * *Focus:* Market validation, pricing frameworks, financial planning, and partnerships.
* **Om Shende | Founder & Product Lead**
  * *Background:* 4th Year B.Tech in Civil Eng. & Integrated M.Tech in Data Science, IIT Madras.
  * *Focus:* Product UX, Gemini AI integrations, and section-wise grading mechanics.
* **Manish Nayak | Founder & Technical Lead**
  * *Background:* 4th Year B.Tech in Civil Eng. & Integrated M.Tech in Data Science, IIT Madras.
  * *Focus:* Secure database architectures (Supabase), proctoring boundaries, and system infrastructure.

---

### Slide 3: The Core Problem
* **The "Simulated Reality Gap":** India’s competitive exams (JEE, NEET, SSC, Banking) are now fully Computer-Based Tests (CBT).
* **The Rural & Tier 2/3 Disadvantage:** 500,000+ local coaching centers (the backbone of student preparation) still rely on analog pen-and-paper exams. Why? Legacy LMS tools are too complex and expensive.
* **The Result:** 
  * Students study on paper but face high anxiety and failure rates when confronting digital testing portals for the first time.
  * Educators waste hundreds of hours manually typing, formatting, and grading tests.

---

### Slide 4: The Solution (The TestoZa Ecosystem)
* **TestoZa is a unified, "digital twin" community platform for local educators.**
* **Core Capabilities:**
  * **AI PDF-to-Test Parser:** Upload scanned paper notes, images, or PDFs; our AI structures them into interactive mock tests with formulas (LaTeX) in under 60 seconds.
  * **1:1 Exam Simulation:** High-fidelity, mobile-first replica of national exam agency environments with active proctoring (Tab switching warnings, wake-lock).
  * **In-Context AI Mentor:** Powered by `gemini-2.0-flash`, analyzing student scorecard errors to generate instant topic diagnostics and 7-day revision plans.

---

### Slide 5: Product Progress & Technology Stack
* **Build Risk Resolved:** ~90% of core features are already built, live, and validated.
* **Architecture:** Fast-running API backend hosted on Google Cloud Run + Supabase (Auth, DB, Storage) + Cloudflare CDN.
* **What is Already Built & Live:**
  * AI-OCR test generator (converts scanned sheets with equations).
  * Proctoring boundaries (Screen Wake Lock API, DevTools block, full-screen lock).
  * Gemini-powered diagnostics & historical trend analyzer (tracks last 10 attempts).
  * Community feed and verified creator dashboards.

---

### Slide 6: Target Market & Opportunity
* **Total Addressable Market (TAM):** A **₹10,000+ Crore ($1.2B)** test-prep ecosystem in India.
* **Volume:** 250 Million+ students and ~500,000 small/medium coaching institutes.
* **Beachhead Focus:** Tier-2, Tier-3, and rural tutoring centers preparing students for state and national exams (SSC, RRB, Banking, NEET, JEE).
* **Macro Trend:** Massive demand for local, affordable digitization tools rather than generic pre-made content.

---

### Slide 7: Refined Competitive Moats (Defensibility)
* **How We Win Against Legacy Players:**
  1. **The Trust Layer:** We are an empowering utility for local teachers, not an EdTech competitor attempting to replace them. This unlocks organic B2B2C acquisition.
  2. **Local Network Effects:** By hosting local teachers' proprietary study materials, we build a localized "knowledge graph" that centralized platforms cannot replicate.
  3. **Rural-First Stack:** Highly optimized page loads (< 2s on 3G) and offline tolerance to survive unstable networks, running securely on low-end smartphones.

---

### Slide 8: Competitive Landscape Matrix

| Feature | TestoZa | Google Forms | Moodle LMS | Telegram | Testbook |
| :--- | :---: | :---: | :---: | :---: | :---: |
| AI Doc-to-Test Parser | **✅ Yes** | ❌ No | ❌ No | ❌ No | ❌ No |
| NTA 1:1 Exam Portal | **✅ Yes** | ❌ No | ❌ No | ❌ No | ⚠ Paid Only |
| Gemini AI Score Diagnostics | **✅ Yes** | ❌ No | ❌ No | ❌ No | ❌ No |
| Low-Bandwidth Proctoring | **✅ Yes** | ❌ No | ⚠ Complex | ❌ No | ❌ No |
| Material Sharing Community | **✅ Yes** | ❌ No | ❌ No | ⚠ Unorganized | ❌ No |

---

### Slide 9: Customer Validation & Insights
* **On-Ground Cohort Testing:** Conducted tests with local tutors and students in Tier 2 cities.
* **Key Feedback Received:** Educators found TestoZa uniquely simple compared to legacy systems, but requested an easier way to share notes/materials alongside tests.
* **Action Taken:** Integrated a **Social Learning Layer** allowing teachers to post revision notes and video links in a centralized feed.
* **Optimized UI:** Re-architected mobile layouts for touch-friendly bilingual inputs (English-to-Hindi transliteration).

---

### Slide 10: Monetization Model
* **Low-Cost SaaS Subscriptions (B2B):** Monthly packages (₹500 to ₹2,000/month) for coaching centers to run branded portals, class dashboards, and custom proctor boundaries.
* **Pay-As-You-Grow Credits (B2C & Tutors):** Token-based pricing for independent students and creators to execute high-volume AI test parses or access additional AI mentor chat hours.
* **Verified Creator Network:** Top tutors publish public tests, driving viral user acquisition with zero customer acquisition cost (CAC).

---

### Slide 11: 6-Month Commercialization Roadmap
* **Month 1 — AI Engine Hardening:** Fine-tune AI-OCR accuracy to ≥99% and resolve mobile LaTeX rendering.
* **Month 2 — Admin Dashboard & Billing:** Build multi-tenant management controls for 1,000+ centers and automate billing.
* **Month 3 — Deep Student Analytics:** Add time-spent-per-question analysis and concept-level mastery heatmaps.
* **Month 4 — Proctoring Finalization:** Deploy strict full-screen blocking warning UI and pilot with 10 centers.
* **Month 5 — Scale Testing & rural 3G Optimization:** Stress test to 50k concurrent users and minimize initial loads to <2s.
* **Month 6 — Launch & Revenue:** Commercial rollout targeting 100 paying coaching institutions.

---

### Slide 12: Seed Funding & Capital Efficiency
* **Total 6-Month Budget:** **₹1,11,360**
  * *AI Model Credits:* ₹36,000
  * *Cloudflare CDN & Security:* ₹10,920
  * *Sentry Error Tracking (9-Mo Buffer):* ₹18,000
  * *Cursor Pro IDE:* ₹10,920
  * *On-Ground Validation (Field Visits):* ₹18,000
  * *Proctoring Security Research:* ₹15,000
  * *Email Infrastructure:* ₹2,520
* **Capital Efficiency Moat:** 100% of the core MVP was built via founder sweat equity. No seed funds will be wasted building basic architecture—funding is exclusively directed to scaling, security, and market validation.

---

### Slide 13: What We Need (Incubator Support)
* **Branding & Positioning:** Mentorship on packaging TestoZa for national scale.
* **Legal & Compliance:** Structuring multi-tenant customer agreements and data privacy policies.
* **Go-To-Market & Connections:** Introductions to coaching federations and rural education initiatives.
* **Workspace & Networking:** Access to Nirmaan/IIT Madras startup resources to foster collaboration.
