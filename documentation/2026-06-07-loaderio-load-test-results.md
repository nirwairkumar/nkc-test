# Loader.io Load Testing Results & Backend/Supabase Traffic Guide

This document records the load testing results conducted on June 7, 2026, using Loader.io to evaluate the performance and scalability of the TestoZa platform.

---

## 📊 Summary of Load Test Results

### Test 1: Introductory Read Test (Distributed Load)
* **Configuration**: 1,000 clients total distributed over 1 minute.
* **Target**: `https://www.testoza.com/test/copy-of-rrb-group-d--6w9l7wjz`
* **Success Rate**: **100%** (0 errors, 0 timeouts).
* **Average Response Time**: **~340ms** (highly stable).
* **Throughput**: Averaged ~16.6 requests/sec, peaking at **30 requests/sec**.
* **Impact**: Successfully tested the end-to-end cycle including Cloudflare Edge Worker rewriting, FastAPI route checking, and Supabase database query.

### Test 2: Ramped Concurrent Client Test
* **Configuration**: Ramped from 500 to 1,000 active concurrent clients over 1 minute.
* **Target**: `https://www.testoza.com/test/copy-of-rrb-group-d--6w9l7wjz`
* **Success Rate**: **100%** (0 errors, 0 timeouts).
* **Average Response Time**: **~400ms - 500ms** (maintained sub-second latency even at 1,000 active concurrent connections).
* **Impact**: Demonstrated that the FastAPI backend and database can comfortably support **1,000 concurrent active users** loading pages at the same time.

### Test 3: Stress Test & Cloudflare Rate Limiting Trigger
* **Configuration**: Ramped from 500 to 1,000 concurrent clients looping requests without delay.
* **Target**: Live test page.
* **Total Requests Made**: **963,641 requests in 60 seconds** (averaging ~16,000 requests/sec; peaking near 30,000 requests/sec).
* **Successes**: **729,885 requests** (75.7%).
* **Errors**: **233,756 requests** (24.3% error rate).
* **Error Types**: **100% 400-level errors** (`429 Too Many Requests` / `403 Forbidden` from Cloudflare). **0** 500-level server errors.
* **Impact**: Cloudflare's DDoS protection successfully detected the high-frequency traffic and blocked the Loader.io test IPs at the edge. The Python backend and Supabase database remained completely stable and did not crash.

---

## 🛠️ How to Test Backend & Supabase Directly

To test the raw limits of your FastAPI backend and Supabase database without being blocked by Cloudflare's DDoS protection, use one of the following methods:

### Method 1: Whitelist Loader.io in Cloudflare (Recommended)
This is the easiest way to test your production setup without disabling protection for the rest of the world.

1. **Log in** to your Cloudflare Dashboard.
2. Go to **Security** > **WAF** (Web Application Firewall) > **Custom Rules**.
3. Create a new Rule:
   * **Field**: `User Agent`
   * **Operator**: `contains`
   * **Value**: `loader.io`
4. Set the Action to **Skip** / **Bypass** for:
   * *Rate Limiting Rules*
   * *Super Bot Fight Mode*
   * *WAF Managed Rules*
5. Save and deploy. Now Cloudflare will let all Loader.io traffic pass straight to your backend.

---

### Method 2: Target the Origin Server URL (Bypass Cloudflare)
You can point Loader.io directly to where your FastAPI backend is hosted (e.g., Google Cloud Run or Railway's direct origin URL) rather than `api.testoza.com`.

1. Get your origin server URL:
   * For Google Cloud Run, it looks like: `https://[service-name]-[hash]-[region].run.app`
2. Create a new target host in Loader.io for this origin URL.
3. Verify the host on Loader.io (place the verification token file on the backend static route if needed).
4. Run the load test against the origin URL. 
   * *Note: Since this bypasses Cloudflare, any request will hit your FastAPI container directly.*

---

### Method 3: Use Local Load Testing Tools (k6 / Locust)
You can run load tests directly from a command-line interface on your own machine or a virtual machine (like a GCP Compute Engine instance) without any third-party rate limits.

#### Using k6 (Highly Recommended)
[k6](https://k6.io/) is a modern, developer-friendly load testing tool written in Go and scripted in JavaScript.

1. Install k6 on your machine:
   * Windows: `winget install gnu.k6`
   * Mac: `brew install k6`
2. Create a test script named `load_test.js`:
   ```javascript
   import http from 'k6/http';
   import { sleep } from 'k6';

   export const options = {
       stages: [
           { duration: '30s', target: 500 },  // Ramp up to 500 users
           { duration: '1m', target: 1000 },  // Ramp up to 1000 users
           { duration: '30s', target: 0 },    // Ramp down to 0 users
       ],
   };

   export default function () {
       // Target the backend API directly
       http.get('https://api.testoza.com/api/tests/YOUR_TEST_ID_HERE');
       sleep(1); // Wait 1 second between requests per client
   }
   ```
3. Run the test:
   ```bash
   k6 run load_test.js
   ```
