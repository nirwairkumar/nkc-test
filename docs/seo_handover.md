# Google Search Console (GSC) Handover Guide

To ensure Google quickly picks up our URL structure changes (`/test/` prefix and slug-based routing), follow these steps in your [Google Search Console](https://search.google.com/search-console) dashboard.

## 1. Refresh the Sitemap
1.  Navigate to **Indexing** > **Sitemaps** in the left sidebar.
2.  If `sitemap.xml` is already listed: 
    -   Note the "Last read" date.
    -   Click on the existing sitemap and check for any errors.
3.  **Submit the Sitemap again**:
    -   Paste `sitemap.xml` into the "Add a new sitemap" field.
    -   Click **Submit**.
    -   Google will now re-scan all URLs, discover the new ones, and see the old ones redirecting.

## 2. Request Re-indexing for Key Pages
Google picks up changes faster if you manually request a crawl for high-traffic "Hub" pages.
1.  Paste these URLs into the top Search bar in GSC one by one:
    -   `https://www.testoza.com/`
    -   `https://www.testoza.com/tests`
    -   `https://www.testoza.com/pricing`
2.  Click **Request Indexing**.

## 3. Monitor "Page Indexing" Reports
Over the next 7-14 days, you should see:
-   A spike in "Page with redirect" (this is good, it means Google found the old `/test-intro/` links and followed our redirect).
-   A gradual increase in "Indexed" pages with the new `/test/` structure.

## 4. Robots.txt Check
Your `robots.txt` is already configured correctly at `https://testoza.com/robots.txt`. It contains:
```txt
Sitemap: https://testoza.com/sitemap.xml
```
Google uses this line as a backup to find your sitemap automatically.

## 5. Mobile Usability & Core Web Vitals
Since we refined the URLs and metadata, Google's "Mobile Usability" report might show improvements. Keep an eye on the **Experience** section in GSC.
