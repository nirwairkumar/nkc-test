# 🚀 TestoZa

> **Auto-Create. Revise. Share. Connect. Practice. Evaluate.**
>  
> AI-Powered Assessment & Learning Infrastructure for Students, Teachers & Institutions.

---

## 🌍 Overview

**TestoZa** is a next-generation AI-powered assessment platform designed to simplify and modernize the way tests are created, conducted, analyzed, and shared.

It is built for:
- Students
- Teachers
- Coaching Institutes
- Schools
- EdTech Creators

The platform combines:
- AI-based test generation
- Secure proctored exam infrastructure
- Advanced marking & analytics
- Public test publishing & creator system
- Institutional branding support

⚡ **Current Stage:** MVP Live  
🌐 Live Platform: https://testoza.com  
👨‍💻 Built Independently by: Nirwair Kumar Chaudhary  

---

# ✨ Core Features

## 🧠 AI & Automation

- 📄 Convert PDF / PPT / Image → Structured Test
- 🎥 Convert YouTube Lecture → Revision Notes / Live Test
- 🧾 File-to-Test Intelligent Parsing
- 🔢 Numerical Range Evaluation Support
- 🧩 Partial Marking for Multiple Correct Questions
- 📊 Advanced Marking Logic Engine

---

## 📝 Test Creation System

- Single Choice Questions
- Multiple Correct Questions
- Numerical Type Questions (Range-based checking)
- Image-based Questions
- Option Image Support
- Section-wise Tests
- Custom Marks per Question
- Custom Negative Marking
- Fraction-based Marking (e.g., 1/4)

---

## 🧮 Smart Evaluation Engine

- Section-wise Scoring
- Partial Marking System
- Negative Marking Support
- Auto Score Calculation
- Detailed Result Analysis
- Percentage Calculation
- Positive & Negative Score Breakdown
- Attempt Metadata Tracking

---

## 📊 Result & Analytics

- Detailed Question-wise Analysis
- Section-wise Performance Report
- Correct / Wrong / Partial / Skipped Count
- Instant Result Mode
- Hidden Result Mode (Institution Controlled)
- Test History Tracking
- Answer Review System

---

## 🔒 Secure Exam Infrastructure (Proctoring)

- Full-Screen Enforcement Mode
- Tab Switch Detection
- Strict Mode (Auto-submit on violation)
- Warning Mode (Multi-warning system)
- Disable Copy / Paste
- Disable Right Click
- Local Session Save & Resume System
- Auto Save Test Progress
- Auto Submit on Time Up

---

## 🏫 Institution & Creator Support

- Institution Branding (Logo + Name on Test)
- Public Test Publishing
- Verified Creator Model
- Creator Profile Page
- Like System for Tests
- Public Test Discovery
- Tag-Based Search System

---

## 🔎 Smart Discovery System

- Search by Title
- Search by Tag
- Search by Category
- Featured Tests Section
- Infinite Feed System
- User Recent Tests Section

---

## 👤 User Features

- Authentication System
- Password Reset Flow
- Profile System
- Creator Profile
- Test History
- Attempt Deletion
- Resume Interrupted Test
- Scientific Calculator (Optional per Test)
- Dark Mode Support

---

# 🧱 Tech Stack

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- ShadCN UI
- Lucide Icons
- React Router
- Latex Rendering (Math Support)

### Backend
- FastAPI (Python)
- Google Cloud Run (Hosting)
- Cloudflare (Proxy/DNS)
- Supabase (Auth + Database + Storage)
- PostgreSQL

### Architecture Highlights
- Section-aware marking model
- Per-question marking override system
- Metadata-based attempt storage
- LocalStorage + SessionStorage session recovery
- Lazy loaded components for performance

---

# 🏗️ Project Structure (High-Level)
src/
├── pages/
│ ├── TestPage
│ ├── ResultsPage
│ ├── TestHistory
│ ├── CreatorProfilePage
│ ├── UpdatePassword
│ └── ...
│
├── components/
│ ├── TestFeed
│ ├── FeaturedTests
│ ├── ScientificCalculator
│ ├── YouTubeGenerator
│ └── ...
│
├── contexts/
│ ├── AuthContext
│ ├── TestContext
│
├── lib/
│ ├── testsApi
│ ├── attemptsApi
│ └── supabaseClient


---

# 🛣️ Roadmap (Under Development 🚧)

TestoZa is actively evolving.

### 🔜 Planned Features

- 🧑‍🤝‍🧑 Student–Teacher Social Community
- 💬 Messaging System (Direct & Group)
- 🏷️ Community-based Learning Groups
- 📢 Institution Promotion Dashboard
- 📈 Advanced Analytics Dashboard
- 🏆 Leaderboard System
- 📱 Progressive Web App (PWA)
- 🧠 Advanced AI Question Quality Improvement
- 📊 AI-based Weakness Analysis

> ⚠️ Note: Social community and messaging features are planned but not yet implemented in the current MVP.

---

# 🎯 Market Problem Solved

Today:
- Google Forms → Too Basic  
- Moodle → Too Complex  
- LMS → Too Expensive  
- Telegram → Unstructured  
- Test Platforms → No Creator Visibility  

TestoZa provides:

✔ Affordable Structured Assessment Engine  
✔ AI-Powered Automation  
✔ Secure Exam Infrastructure  
✔ Public Creator Publishing  
✔ Institution Promotion Infrastructure  
✔ Community-Driven Learning Model  

---

# 🚀 Getting Started (Development)

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/nirwairkumar/nkc-test.git
cd nkc-test
```

## 2️⃣ Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your **Supabase URL** and **Supabase Keys**.
4. Run the backend:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

## 3️⃣ Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
