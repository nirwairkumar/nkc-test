# NKC Test Platform — Comprehensive Testing Checklist

This document provides a structured testing plan for the entire platform, organized by priority.

---

## 🔴 Priority 1: Critical User Workflows
These are the most important flows. Any failure here blocks the application's core value.

### 1. Authentication & Onboarding
- [ ] **Google Login**: Verify "Sign in with Google" (both first-time and returning users).
- [ ] **Email/Password**: Standard login and sign-up with AuthForm.
- [ ] **Onboarding**: Verify profile setup and redirect logic.
- [ ] **Password Recovery**: "Forgot Password" flow and "Update Password" page.
- [ ] **Auth Guards**: Verify that protected pages (e.g., ManageTests) redirect to login if unauthenticated.

### 2. Test Execution (The Core)
- [ ] **Test Initiation**: Landing on `TestIntroPage` and clicking "Start Test".
- [ ] **The Test Interface**:
    - [ ] Question navigation (Next/Prev/Palette).
    - [ ] Marking for review.
    - [ ] Calculator functionality.
    - [ ] LaTeX/KaTeX rendering of math questions.
- [ ] **Timer Logic**: Verify strict timer (persists on refresh) and flexible timer (if enabled).
- [ ] **Auto-Submission**: Test behaves correctly when the timer runs out.
- [ ] **Manual Submission**: Review dialog and final submission success.

### 3. Combined Tests (Paper 1 + Paper 2)
- [ ] **Flow**: Intro -> Paper 1 -> Break Screen -> Paper 2 -> Final Result.
- [ ] **Break Management**: Timer on the break screen works as expected.
- [ ] **Data Persistence**: Answers from Paper 1 are saved even if Paper 2 is interrupted.

---

## 🟡 Priority 2: Test Management & Creator Tools

### 1. Test Builder & Editor
- [ ] **Creation Flow**: Create a new test using `CreateTestPage`.
- [ ] **Editor Features**:
    - [ ] Section Mode vs. Flat Mode.
    - [ ] Question types (Single, Multiple, Numerical, Comprehension).
    - [ ] Image uploads for questions and options.
- [ ] **Topic Management**: AI Topic Analyzer (Gemini) auto-assigning topics.

### 2. Proctoring & Security (Recent Updates)
- [ ] **Focus Violations**: 
    - [ ] Fullscreen exit detection.
    - [ ] Tab Switch detection (Switching between tabs or apps).
- [ ] **Violation Action Logic**:
    - [ ] "No limit (Warn only)": Warnings appear, test continues.
    - [ ] "Strict (Instant Submit)": Test auto-submits on the 1st violation.
    - [ ] "N warnings then Submit": Verify submission on the (N+1)th violation.

### 3. Advanced Creator Features
- [ ] **Solution Editor**: Uploading and formatting detailed solutions.
- [ ] **Class Assignment**: Creating classes and assigning tests to them.
- [ ] **Scheduling**: Setting start/end dates for test availability.

---

## 🔵 Priority 3: Results, Analytics & Community

### 1. Result Analysis
- [ ] **Instant Results**: Detailed score breakdown immediately after submission.
- [ ] **Topic-Wise Analysis**: Check if AI topics correctly group the performance data.
- [ ] **Solutions View**: Users can view correct answers and explanations after the test.

### 2. Social & Discovery
- [ ] **Feed**: Check `NewsFeed` and `TestList` for discovery.
- [ ] **Search**: Global search by test ID, title, or creator name.
- [ ] **Voting**: Upvoting/Downvoting tests.

---

## 🟢 Priority 4: Admin & Performance

### 1. Admin Dashboard
- [ ] **Global Analytics**: View overall platform usage metrics.
- [ ] **Creator Management**: Verify promo code generation and pricing tier updates.
- [ ] **User Support**: Verify handling of user reports and support tickets.

### 2. Technical Verification
- [ ] **Responsiveness**: Verify "Mobile vs Desktop" layouts for all critical pages.
- [ ] **Offline Resilience**: Check that "Save Progress" works during network blips.
- [ ] **AI & Extraction Pipeline**:
    - [ ] **PDF Parsing**: Test with various PDF layouts (single column, dual column).
    - [ ] **OCR Verification**: Check accuracy of image-to-text extraction using Tesseract.
    - [ ] **Image Extraction**: Verify that diagrams in PDFs are correctly cropped and uploaded to Cloudinary.
- [ ] **Performance**: 
    - [ ] Test page loading speed (Asset batching).
    - [ ] AI extraction speed for large PDFs.

---

## 🛠 Testing Tools Reference
- **Frontend**: Vite Dev Server (localhost:5173 / 3000)
- **Backend**: FastAPI (localhost:8000)
- **Database**: Supabase (PostgreSQL + Auth)
