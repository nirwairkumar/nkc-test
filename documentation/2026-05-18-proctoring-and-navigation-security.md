# Proctoring & Navigation Security Overhaul (May 2026)

This document details the architecture and implementation of the security upgrades introduced to prevent unauthorized test re-entry, integrate an industry-grade screen wake lock, and scope proctoring violations strictly to exams in **Conduct-Exam Mode**.

---

## 1. Preventing Test Page Re-Entry & Unidirectional Flow

### Problem
Previously, when a student submitted a test and was redirected to the results page, pressing the browser's back button allowed them to navigate back into the active test page context. Because the local session variables (`test_session_*`) were cleared upon submission, the page loaded in a blank or reset state, causing UX issues and raising concerns about cheating or unauthorized retry attempts.

### Solution & Mechanism
We instituted a multi-layer unidirectional flow guard:

1. **Submission Flag (`localStorage`):**
   * Upon successful submission (both single/combined modes), a persistent entry is created in `localStorage`:
     ```ts
     localStorage.setItem(`test_submitted_${user.id}_${test.id}`, 'true');
     ```
2. **Mount Guard Check (`TestPage.tsx`):**
   * On mounting `TestPage.tsx`, the component checks if `test_submitted_*` is true.
   * If yes, the student is instantly redirected to the dashboard (`/`) with an error message toast: *"This test has already been submitted. You cannot re-enter it."*
3. **Fresh Start Authorization (`TestIntroPage.tsx`):**
   * If the student starts a new attempt (permitted for unlimited attempt tests), the navigation from `TestIntroPage.tsx` passes a state payload:
     ```ts
     navigate(`/live/${test.id}`, { state: { fromIntro: true } });
     ```
   * When `TestPage.tsx` detects `fromIntro: true` on mount, it clears the stale `test_submitted_*` marker so they can take the test fresh.
4. **History sentinel & Popstate Blocker (`ResultsPage.tsx`):**
   * On loading the results, we push a sentinel history entry to capture back-gestures:
     ```ts
     window.history.pushState(null, '', window.location.href);
     ```
   * A global `popstate` listener intercepts the back button and forces a redirection to home (`/`), preventing history-back navigation from reaching the live test page altogether.

---

## 2. Industry-Grade Screen Wake Lock API

### Goal
Prevent screens, mobile devices, and monitors from dimming, going to sleep, or locking while a student is in the middle of taking an important exam.

### Implementation
We integrated the standard **W3C Screen Wake Lock API** inside `TestPage.tsx` for tests running in **Conduct-Exam Mode**:

* **Acquiring Wake Lock:**
  ```ts
  wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
  ```
* **Lifecycle Management:**
  * **Tab Visibility Recovery:** When a user switches tabs or minimizes the window, browsers automatically release the screen wake lock. Our implementation hooks into the `visibilitychange` event; as soon as the test tab becomes visible again, the lock is automatically re-acquired seamlessly.
  * **Clean Release:** The wake lock is released instantly upon test submission, time exhaustion (`isTimeUp`), or component unmount.
  * **Graceful Fallback:** If a student is using a legacy browser that lacks support for the Wake Lock API, the system silently catches the exception and logs a warning in the console without breaking the test-taking experience.

### Browser Compatibility & Fallbacks

| Feature | Browser | Supported Versions | Fallback Behavior |
|---|---|---|---|
| **Screen Wake Lock API** | Chrome / Chromium | Chrome 84+ (Released July 2020) | Silently bypassed. Device falls back to default system screen sleep timeout. |
| | Microsoft Edge | Edge 84+ | Silently bypassed. |
| | Safari (macOS / iOS) | Safari 16.4+ (Released March 2023) | Silently bypassed. |
| | Firefox | Firefox 126+ (Released May 2024) | Silently bypassed. |
| **History sentinel / Popstate Guard** | All modern browsers | Standard HTML5 (Chrome 5+, Safari 5.1+, Firefox 4+, Edge 12+) | Standard browser back navigation. If popstate isn't supported, the mount check redirecting via `localStorage` is used as a secure secondary wall. |
| **LocalStorage Submission Flag** | All modern browsers | Standard HTML5 (Fully supported since 2011) | Standard session/cookie checks. |

---

## 3. Scoping Proctoring Violations to Conduct-Exam Mode

### Design Shift
Proctoring warnings and auto-submission behaviors should not interfere with public practice or private testing where strict control is not configured. They are intended exclusively for **Conduct-Exam Mode**.

### Rule Adjustments

| Feature | Conduct-Exam Mode | Public / Private (Practice) Mode |
|---|---|---|
| **Tab Switch Check (`visibilitychange`)** | Triggers violation warning & increments violation count. | Fully bypassed (no warning, no count). |
| **Fullscreen Exit Check** | Triggers violation warning & increments violation count. | Shows a dialog prompting to return to fullscreen (if `force_fullscreen` is on), but **never** increments violation count. |
| **Action Blocking (Right Click, Copy/Paste)** | Bypassed/Enforced based on builder configuration settings. | Bypassed/Enforced based on builder configuration settings (UX convenience setting). |

This keeps practice attempts friendly and casual, while ensuring that official exams in Conduct-Exam Mode remain highly secure and strictly proctored.
