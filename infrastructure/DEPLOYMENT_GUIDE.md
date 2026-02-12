# TestoZa Production SEO Architecture
## Complete Deployment Guide

**Infrastructure Stack:**
- Frontend: Cloudflare Pages
- Backend: Railway (Python/FastAPI)
- Database: Supabase (PostgreSQL)
- Edge Caching: Cloudflare Workers + CDN
- Domain: https://testoza.com

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Prerequisites
- [ ] Cloudflare account with testoza.com zone
- [ ] Railway account with deployed backend
- [ ] Supabase project with public tests data
- [ ] Wrangler CLI installed locally
- [ ] Git repository access

### 2. Environment Variables

**Backend (Railway):**
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
SITE_URL=https://testoza.com

# Optional - for Redis caching
REDIS_URL=redis://default:password@host:port

# Required - for sitemap cache invalidation
SITEMAP_INVALIDATE_SECRET=your_secure_random_string_here
```

**Cloudflare Worker:**
```bash
# Set via wrangler secret put
API_BASE_URL=https://your-railway-app.up.railway.app
SITEMAP_INVALIDATE_SECRET=your_secure_random_string_here
```

---

## 🚀 DEPLOYMENT STEPS

### Phase 1: Backend API Setup (Railway)

#### Step 1.1: Add Sitemap Router to Main App

Edit `backend/app/main.py`:

```python
from app.routers import sitemap

# Add router
app.include_router(sitemap.router)
```

#### Step 1.2: Install Dependencies

Add to `backend/requirements.txt`:
```
# Existing dependencies...

# Optional - for Redis caching
redis>=5.0.0
hiredis>=2.2.0
```

#### Step 1.3: Deploy to Railway

```bash
cd backend
git add .
git commit -m "Add dynamic sitemap generation API"
git push origin main

# Railway will auto-deploy
```

#### Step 1.4: Set Environment Variables

In Railway Dashboard:
1. Go to your project
2. Click "Variables" tab
3. Add all required env vars
4. Redeploy if needed

#### Step 1.5: Test Sitemap API

```bash
# Test health endpoint
curl https://your-railway-app.up.railway.app/sitemap/health

# Test sitemap index
curl https://your-railway-app.up.railway.app/sitemap/index.xml

# Test static sitemap
curl https://your-railway-app.up.railway.app/sitemap/static.xml
```

---

### Phase 2: Cloudflare Worker Deployment

#### Step 2.1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2.2: Authenticate with Cloudflare

```bash
wrangler login
# This will open browser for authentication
```

#### Step 2.3: Update Worker Configuration

Edit `infrastructure/cloudflare-worker/wrangler.toml`:

```toml
[env.production]
route = { pattern = "testoza.com/*", zone_name = "testoza.com" }

[env.production.vars]
API_BASE_URL = "https://your-actual-railway-url.up.railway.app"
FRONTEND_URL = "https://testoza.com"
```

#### Step 2.4: Set Secrets

```bash
cd infrastructure/cloudflare-worker

# Set API base URL as secret
wrangler secret put API_BASE_URL --env production
# Enter: https://your-actual-railway-url.up.railway.app

# Set invalidate secret
wrangler secret put SITEMAP_INVALIDATE_SECRET --env production
# Enter: your_secure_random_string_here
```

#### Step 2.5: Deploy Worker

```bash
wrangler deploy --env production
```

#### Step 2.6: Verify Deployment

```bash
# Test sitemap through worker
curl https://testoza.com/sitemap/index.xml

# Check cache headers
curl -I https://testoza.com/sitemap/tests.xml
```

Expected headers:
```
Content-Type: application/xml
Cache-Control: public, max-age=3600
X-Cache: MISS (or HIT on second request)
X-Cache-Location: EDGE
```

---

### Phase 3: Frontend Updates

#### Step 3.1: Update SEO Component

The existing SEO component is already good, but ensure it's used on all public pages.

Add to pages missing SEO:
- `/login` - AuthForm
- `/history` - TestHistory  
- `/results` - ResultsPage

Example usage:
```jsx
import SEO from '@/components/SEO';

function MyPage() {
  return (
    <>
      <SEO
        title="Page Title"
        description="Page description here"
        canonicalUrl="https://testoza.com/page-url"
      />
      {/* page content */}
    </>
  );
}
```

#### Step 3.2: Add Structured Data

For TestIntroPage, enhance the existing schema:

```jsx
const testSchema = {
  "@context": "https://schema.org",
  "@type": "Quiz",
  "name": test.title,
  "description": test.description,
  "url": `https://testoza.com/test/${test.slug}`,
  "author": {
    "@type": "Person",
    "name": test.creator_name
  },
  "educationalLevel": test.categories?.join(', '),
  "about": {
    "@type": "Thing",
    "name": test.title
  },
  "question": test.questions?.map(q => ({
    "@type": "Question",
    "name": q.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": q.correctAnswer
    }
  }))
};

<SEO
  title={test.title}
  description={test.description}
  schemas={[testSchema]}
/>
```

#### Step 3.3: Deploy Frontend

```bash
cd frontend
npm run build

# Deploy to Cloudflare Pages
# (via git push or direct upload)
git add .
git commit -m "Update SEO configuration for production"
git push origin main
```

---

### Phase 4: Google Search Console Setup

#### Step 4.1: Submit Sitemaps

Go to: https://search.google.com/search-console

Navigate to: **Sitemaps** → **Add a new sitemap**

Submit these URLs in order:
1. `https://testoza.com/sitemap/index.xml`
2. `https://testoza.com/sitemap/static.xml`
3. `https://testoza.com/sitemap/tests.xml`
4. `https://testoza.com/sitemap/categories.xml`
5. `https://testoza.com/sitemap/tags.xml`
6. `https://testoza.com/sitemap/creators.xml`

#### Step 4.2: Inspect URLs

Test key pages:
1. Homepage: `https://testoza.com/`
2. Test page: `https://testoza.com/test/sample-test-slug`
3. Category: `https://testoza.com/tests/jee`
4. Creator: `https://testoza.com/creator/user-id`

Use "URL Inspection" tool to verify:
- Page is indexed
- No crawl errors
- Canonical URL correct

#### Step 4.3: Coverage Report

Check **Coverage** section for:
- Valid pages count
- Excluded pages (should match robots.txt rules)
- Errors (fix immediately)

---

### Phase 5: Post-Deployment Verification

#### Step 5.1: Test All Sitemaps

```bash
#!/bin/bash
# save as test-sitemaps.sh

SITE="https://testoza.com"
SITEMAPS=(
  "/sitemap/index.xml"
  "/sitemap/static.xml"
  "/sitemap/tests.xml"
  "/sitemap/categories.xml"
  "/sitemap/tags.xml"
  "/sitemap/creators.xml"
)

for sitemap in "${SITEMAPS[@]}"; do
  echo "Testing: $SITE$sitemap"
  response=$(curl -s -o /dev/null -w "%{http_code}" "$SITE$sitemap")
  if [ $response -eq 200 ]; then
    echo "✅ OK (200)"
  else
    echo "❌ Failed ($response)"
  fi
  echo ""
done
```

Run: `bash test-sitemaps.sh`

#### Step 5.2: Verify Robots.txt

```bash
curl https://testoza.com/robots.txt

# Should return comprehensive robots.txt
```

#### Step 5.3: Check Meta Tags

```bash
# Test with curl (simulating crawler)
curl -A "Googlebot/2.1 (+http://www.google.com/bot.html)" \
  https://testoza.com/test/sample-test-slug | grep -i "<title\|<meta"
```

Should see:
- Proper title tag
- Description meta
- Open Graph tags
- Canonical URL

#### Step 5.4: Performance Test

Use Google PageSpeed Insights:
https://pagespeed.web.dev/

Test these pages:
- Homepage
- Test page
- Category page

Target scores:
- Mobile: 90+
- Desktop: 95+

---

## 🔧 MAINTENANCE & UPDATES

### Daily Tasks
- Monitor Google Search Console for crawl errors
- Check sitemap status in GSC

### Weekly Tasks
- Review Core Web Vitals report
- Check indexing coverage
- Monitor search performance

### Monthly Tasks
- Update sitemap cache
- Review and optimize meta descriptions
- Check for broken links

### Cache Invalidation

When new tests are published, invalidate cache:

```bash
# Via API
curl -X POST "https://your-railway-app.up.railway.app/sitemap/invalidate?sitemap_type=tests" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_here"}'

# Or invalidate all
curl -X POST "https://your-railway-app.up.railway.app/sitemap/invalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_here"}'
```

---

## 📊 MONITORING & ANALYTICS

### Set Up Cloudflare Analytics

In Cloudflare Dashboard:
1. Go to **Analytics**
2. Enable **Edge Analytics**
3. Set up alerts for:
   - 5xx errors
   - Cache hit ratio < 80%
   - High origin response time

### Set Up Google Analytics 4

Add to frontend:
```html
<!-- In index.html head -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Key Metrics to Track

1. **SEO Metrics**
   - Organic search traffic
   - Average position
   - Click-through rate (CTR)
   - Indexed pages count

2. **Performance Metrics**
   - Core Web Vitals (LCP, FID, CLS)
   - Time to First Byte (TTFB)
   - Cache hit ratio
   - Origin response time

3. **Business Metrics**
   - Test views from organic search
   - User registrations from SEO
   - Test completion rate

---

## 🚨 TROUBLESHOOTING

### Issue: Sitemap returns 404

**Check:**
1. Backend API is running: `curl https://your-railway-app.up.railway.app/sitemap/index.xml`
2. Worker is deployed: `wrangler deploy --env production`
3. Route pattern matches in wrangler.toml

**Fix:**
```bash
# Redeploy worker
wrangler deploy --env production --force

# Check logs
wrangler tail --env production
```

### Issue: Cache not working

**Check headers:**
```bash
curl -I https://testoza.com/sitemap/tests.xml
```

Should show:
```
CF-Cache-Status: HIT
Cache-Control: public, max-age=3600
```

**Fix:**
- Check Cache-Control headers in backend
- Verify no-cache routes in worker
- Purge Cloudflare cache from dashboard

### Issue: Pages not indexing

**Check:**
1. robots.txt allows the page
2. No `noindex` meta tag
3. Canonical URL is correct
4. Page returns 200 status

**Tools:**
- Google Search Console URL Inspection
- `site:testoza.com/page-url` in Google

### Issue: Meta tags not showing

**Check:**
1. SEO component is imported and used
2. No JavaScript errors blocking render
3. Cloudflare Worker is injecting tags

---

## 📈 SCALING FOR GROWTH

### When you reach 10,000+ tests:

1. **Split Sitemap into Chunks**
   - sitemap-tests-1.xml (tests 1-10,000)
   - sitemap-tests-2.xml (tests 10,001-20,000)
   - etc.

2. **Implement Database Pagination**
   ```python
   # In sitemap.py
   page = request.query_params.get('page', 1)
   offset = (page - 1) * 10000
   
   tests = db.table("tests")\
       .select("id, slug, title")\
       .eq("is_public", True)\
       .range(offset, offset + 9999)\
       .execute()
   ```

3. **Add CDN Edge Caching**
   - Enable "Cache Everything" in Cloudflare
   - Set Browser Cache TTL to 4 hours
   - Enable Always Online™

### When you reach 100,000+ tests:

1. **Implement Incremental Sitemap Updates**
   - Only update changed tests
   - Use database triggers
   - Webhook-based invalidation

2. **Add Search Index API**
   - Google Indexing API integration
   - Bing URL Submission API
   - Automated submission on publish

3. **Regional CDN**
   - Enable Cloudflare Argo Smart Routing
   - Add regional edge nodes
   - Implement geo-based caching

---

## ✅ FINAL CHECKLIST

Pre-Launch:
- [ ] Backend sitemap API deployed and tested
- [ ] Cloudflare Worker deployed and caching
- [ ] robots.txt updated and accessible
- [ ] All public pages have SEO components
- [ ] Google Search Console sitemaps submitted
- [ ] Environment variables set in production
- [ ] Cache invalidation tested
- [ ] Performance tests passed (90+ score)

Post-Launch:
- [ ] Monitor GSC for 48 hours
- [ ] Verify pages are being indexed
- [ ] Check Core Web Vitals in GSC
- [ ] Set up weekly SEO performance reports
- [ ] Document any issues in project wiki

---

## 🎯 SUCCESS METRICS

After 30 days, you should see:
- ✅ 100% of public pages indexed
- ✅ Average page load time < 2s
- ✅ Cache hit ratio > 85%
- ✅ Organic search traffic increase
- ✅ Zero crawl errors in GSC

---

**Questions or Issues?**

Check:
1. Cloudflare Worker logs: `wrangler tail`
2. Railway backend logs
3. Google Search Console reports
4. This documentation for common fixes

**Last Updated:** 2026-02-12  
**Version:** 1.0.0  
**Status:** Production Ready
