# Security Threat & Mitigation Report (Frontend & Infrastructure)

This report details a security audit of the TestoZa frontend, serverless edge code, and overall application infrastructure. It details potential vulnerabilities, modern attack vectors, and step-by-step mitigation plans.

---

## 1. Threat Matrix Summary

| # | Vulnerability Vector | Severity | Target Area | Status / Mitigation Action |
| :-: | :--- | :-: | :--- | :--- |
| **1** | **DOM-based Cross-Site Scripting (XSS)** in LaTeX & Math Rendering | 🔴 **High** | `LatexRenderer.tsx` / `MathKeyboard.tsx` | Needs sanitization library (`DOMPurify`) |
| **2** | **Client-Side Proctoring Bypass** (Cheating vulnerability) | 🟠 **High** | `TestPage.tsx` / Proctoring Listeners | Needs server-side anomaly scoring / behavior logging |
| **3** | **Wildcard CORS Configuration** in API Router | 🟡 **Medium** | `backend/app/main.py` | Remove wildcard `*` from production list |
| **4** | **Subresource Integrity (SRI) Missing** on External CDNs | 🟡 **Medium** | `frontend/index.html` (KaTeX & jsDelivr loading) | Inject integrity hashes on all CDN script links |
| **5** | **Supabase Row Level Security (RLS)** Disabled | 🔴 **Critical** | Supabase database tables | Implement policies for tests, results, and messages |

---

## 2. Deep Dive Analysis & Mitigation Guide

### Threat 1: DOM-Based XSS in LaTeX Rendering (`LatexRenderer.tsx`)
* **The Risk**: The platform uses KaTeX to render math expressions. In `LatexRenderer.tsx` and `MathKeyboard.tsx`, HTML generated from LaTeX strings is injected directly into the DOM using React's `dangerouslySetInnerHTML`.
  If a malicious user (or teacher) creates a test question containing a payload disguised inside a LaTeX tag (or Markdown link `![alt](javascript:...)`), it will bypass standard React protection.
* **The Impact**: Attackers could execute arbitrary JavaScript in the browser of any user viewing the test. Since Supabase JWT session tokens are stored in `localStorage` (`sb-...-auth-token`), XSS allows instant **Session Hijacking / Account Takeover** of students, teachers, and admins.
* **Mitigation**:
  1. Install `dompurify` and its types:
     ```bash
     npm install dompurify @types/dompurify
     ```
  2. Sanitize the output before returning the HTML.
  3. In `LatexRenderer.tsx`, wrap the rendered HTML:
     ```typescript
     import DOMPurify from 'dompurify';
     // ...
     const cleanHtml = DOMPurify.sanitize(rendered);
     return <span dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
     ```

---

### Threat 2: Proctoring Bypass (Integrity Exploitations)
* **The Risk**: TestoZa implements focus-tracking (detecting tab switches, mouse leaves) and fullscreen mode enforcement. Because this is managed 100% client-side via JavaScript event listeners (`visibilitychange`, `blur`, `keydown`), a user can easily deactivate it.
* **The Impact**: Tech-savvy students can bypass anti-cheat measures using:
  - Custom browser extensions that intercept or override `document.hidden` / `document.visibilityState`.
  - Disabling event propagation using developer tools console.
  - Using automated macro tools or virtual machines.
* **Mitigation**:
  * **Telemetry Backing**: Do not rely on blocking actions. Instead, log focus-loss events to the backend database with timestamps. Compare student submission timing with focus telemetry.
  * **Shuffling and Dynamic Pools**: Shuffle question orders and options per user on the backend, making shared answer key cheating impossible.
  * **Proctoring Validation**: Store critical proctoring alert logs (e.g., number of tab-switches) as a read-only telemetry model updated dynamically, preventing client-side overwrite at the end of the test.

---

### Threat 3: Wildcard CORS Configuration in FastAPI
* **The Risk**: In `backend/app/main.py`, the allowed CORS origins list contains:
  ```python
  origins = [
      "https://testoza.com",
      "https://www.testoza.com",
      "http://localhost:5173",
      "http://localhost:8081",
      "*" # Wildcard enabled
  ]
  ```
* **The Impact**: Keeping `*` alongside specific origins in production is dangerous. While modern browsers restrict the combination of wildcard origins and credentials sharing (`allow_credentials=True`), it still leaves endpoints vulnerable to CSRF and data leakage in non-browser environments or older browser versions.
* **Mitigation**:
  Modify `backend/app/main.py` to strip the wildcard in production:
  ```python
  origins = [
      "https://testoza.com",
      "https://www.testoza.com",
      "http://localhost:5173",
      "http://localhost:8081",
  ]
  ```

---

### Threat 4: CDN Subresource Integrity (SRI) Missing
* **The Risk**: In `frontend/index.html`, libraries such as KaTeX stylesheet and script files are loaded from the jsDelivr CDN without Subresource Integrity hashes.
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  ```
* **The Impact**: If the CDN is compromised (e.g., DNS hijacking or script poisoning), attackers could inject malicious JavaScript files directly into every visitor’s browser session.
* **Mitigation**:
  Add `integrity` and `crossorigin` tags:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GMRi4ti0JYjQpKlWAqdRY51GDOl+g3McUMP58Rxgo172R1+WXM2F/5mZ1OM0E23" crossorigin="anonymous">
  ```

---

### Threat 5: Disabled RLS on Supabase Tables
* **The Risk**: Key database tables (`public.tests`, `public.test_results`, `public.support_messages`, etc.) currently have Row Level Security (RLS) disabled. 
* **The Impact**: Anyone who grabs the public anonymous Supabase key (which is stored in frontend build files) can directly query your database REST endpoints (`https://<project>.supabase.co/rest/v1/...`) to read all test answers, update scores, or delete entries, completely bypassing your FastAPI backend and business rules.
* **Mitigation**:
  1. Turn on RLS on all tables.
  2. Implement target policies. For example, for `test_results`:
     - **Select**: Allow only the authenticated user who submitted it (`auth.uid() = user_id`) or admin.
     - **Insert**: Allow authenticated users.
     - **Update/Delete**: Restrict to admins or the owner.
