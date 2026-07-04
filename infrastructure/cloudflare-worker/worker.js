/**
 * Cloudflare Worker for TestoZa SEO Optimization
 * Handles: Edge caching, sitemap proxying, meta tag injection for crawlers
 * Deploy to: Cloudflare Workers (testoza.com domain)
 */

// Configuration
const CONFIG = {
  // Backend API URL (GCP Cloud Run)
  API_BASE_URL: 'https://apigcp.testoza.com',

  // Frontend origin (Cloudflare Pages)
  FRONTEND_URL: 'https://testoza.com',

  // Cache TTLs (in seconds)
  CACHE_TTL: {
    SITEMAP: 3600,      // 1 hour
    STATIC: 86400,      // 24 hours
    API: 1800,          // 30 minutes
    HTML: 300           // 5 minutes for prerendered HTML
  },

  // Crawler user agents that need special handling
  CRAWLER_AGENTS: [
    'googlebot',
    'bingbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'slackbot',
    'discordbot',
    'lighthouse',
    'pagespeed',
    'google page speed'
  ],

  // Routes that should never be cached
  NO_CACHE_ROUTES: [
    '/live/',
    '/admin',
    '/api/',
    '/create-test',
    '/edit-test/'
  ]
};

/**
 * Check if request is from a search crawler
 */
function isCrawler(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const lowerUA = userAgent.toLowerCase();
  return CONFIG.CRAWLER_AGENTS.some(agent => lowerUA.includes(agent));
}

/**
 * Check if URL should bypass cache
 */
function shouldBypassCache(url) {
  const pathname = new URL(url).pathname;
  return CONFIG.NO_CACHE_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Generate cache key based on URL and user agent type
 */
function generateCacheKey(request) {
  const url = new URL(request.url);
  const isCrawlerRequest = isCrawler(request);

  // Different cache for crawlers vs humans
  return new Request(
    `${url.origin}${url.pathname}${isCrawlerRequest ? '?_crawler=1' : ''}`,
    request
  );
}

/**
 * Get appropriate cache TTL based on route
 */
function getCacheTTL(url) {
  const pathname = new URL(url).pathname;

  if (pathname.startsWith('/sitemap')) {
    return CONFIG.CACHE_TTL.SITEMAP;
  }
  if (pathname.startsWith('/test/') || pathname.startsWith('/test-intro/')) {
    return CONFIG.CACHE_TTL.HTML;
  }
  if (pathname.startsWith('/static/') || pathname.includes('.')) {
    return CONFIG.CACHE_TTL.STATIC;
  }

  return CONFIG.CACHE_TTL.HTML;
}

/**
 * Fetch from backend API with caching
 */
async function fetchFromAPI(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  return response;
}

/**
 * Handle sitemap requests - proxy to backend with edge caching
 */
async function handleSitemap(request) {
  const url = new URL(request.url);
  const sitemapType = url.pathname.replace('/sitemap/', '').replace('.xml', '');

  // Try cache first
  const cache = caches.default;
  const cacheKey = new Request(`${CONFIG.FRONTEND_URL}/sitemap/${sitemapType}.xml`, request);
  let cached = await cache.match(cacheKey);

  if (cached) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...Object.fromEntries(cached.headers),
        'X-Cache': 'HIT',
        'X-Cache-Location': 'EDGE'
      }
    });
  }

  // Fetch from backend
  const apiResponse = await fetchFromAPI(`/sitemap/${sitemapType}.xml`);

  if (!apiResponse.ok) {
    return new Response('Sitemap not found', { status: 404 });
  }

  const body = await apiResponse.text();

  // Cache the response
  const response = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL.SITEMAP}`,
      'X-Cache': 'MISS',
      'X-Cache-Location': 'EDGE'
    }
  });

  // Store in cache
  await cache.put(cacheKey, response.clone());

  return response;
}

/**
 * Inject SEO meta tags into HTML for crawlers
 * This is a lightweight prerendering approach
 */
async function injectSEOMetaTags(html, url, testData = null) {
  // Extract test data from URL if available
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');

  // Generate meta tags
  const metaTags = generateMetaTags(url, testData);

  // Inject into HTML head
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex === -1) return html;

  const beforeHead = html.substring(0, headEndIndex);
  const afterHead = html.substring(headEndIndex);

  return `${beforeHead}${metaTags}${afterHead}`;
}

/**
 * Generate comprehensive meta tags
 */
function generateMetaTags(url, testData = null) {
  const siteUrl = CONFIG.FRONTEND_URL;
  const path = new URL(url).pathname;

  // Default meta
  let title = 'TestoZa - AI-Powered Online Test Platform';
  let description = 'Create AI-powered tests in minutes. Free online test maker for teachers and students.';
  let type = 'website';
  let image = `${siteUrl}/default-og.png`;
  let keywords = 'online test maker, ai test generator, quiz creator, exam builder';

  // Customize based on route
  if (path.startsWith('/test/') || path.startsWith('/test-intro/')) {
    if (testData) {
      title = `${testData.title} | TestoZa`;
      description = `Practice ${testData.title} online. ${testData.questions?.length || 0} questions, instant results.`;
      type = 'article';
      keywords = `${testData.title}, online test, practice test, ${testData.categories?.join(', ') || ''}`;
    } else {
      title = 'Online Test | TestoZa';
      description = 'Take this online test on TestoZa. Practice and improve your skills.';
    }
  } else if (path.startsWith('/tests/')) {
    const category = path.split('/')[2];
    title = `${category?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Tests | TestoZa`;
    description = `Browse ${category} practice tests. Prepare for your exams with our curated test collection.`;
    type = 'website';
  } else if (path.startsWith('/creator/')) {
    title = 'Creator Profile | TestoZa';
    description = 'View tests and educational content from this creator on TestoZa.';
  } else if (path === '/pricing') {
    title = 'Pricing | TestoZa';
    description = 'Affordable pricing plans for online test creation. Start free, upgrade anytime.';
    type = 'product';
  }

  // Build meta tag HTML
  return `
    <!-- Dynamic SEO Meta Tags (Cloudflare Worker) -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(keywords)}">
    <link rel="canonical" href="${siteUrl}${path}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${siteUrl}${path}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="TestoZa">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Robots -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
  `;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handle HTML requests with potential meta tag injection
 */
async function handleHTMLRequest(request) {
  const cache = caches.default;
  const cacheKey = generateCacheKey(request);

  // Try cache first
  let cached = await cache.match(cacheKey);
  if (cached && !shouldBypassCache(request.url)) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...Object.fromEntries(cached.headers),
        'X-Cache': 'HIT',
        'X-Cache-Location': 'EDGE'
      }
    });
  }

  // Fetch from origin
  const originResponse = await fetch(request);

  if (!originResponse.ok) {
    return originResponse;
  }

  let html = await originResponse.text();

  // Inject SEO meta tags for crawlers or test pages
  if (isCrawler(request) || new URL(request.url).pathname.startsWith('/test/')) {
    html = await injectSEOMetaTags(html, request.url);
  }

  // Create response with cache headers
  const ttl = getCacheTTL(request.url);
  const response = new Response(html, {
    status: originResponse.status,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': shouldBypassCache(request.url)
        ? 'no-store, no-cache, must-revalidate'
        : `public, max-age=${ttl}`,
      'X-Cache': 'MISS',
      'X-Cache-Location': 'EDGE'
    }
  });

  // Cache if applicable
  if (!shouldBypassCache(request.url)) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Route handling
    try {
      // Sitemap requests
      if (url.pathname.startsWith('/sitemap')) {
        return await handleSitemap(request);
      }

      // Robots.txt - serve directly
      if (url.pathname === '/robots.txt') {
        return new Response(ROBOTS_TXT, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      // Serve llms.txt and llms-full.txt explicitly as plain text
      if (url.pathname === '/llms.txt' || url.pathname === '/llms-full.txt') {
        const cache = caches.default;
        const cached = await cache.match(request);
        if (cached) {
          return new Response(cached.body, {
            headers: {
              ...Object.fromEntries(cached.headers),
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Cache': 'HIT'
            }
          });
        }

        const originResponse = await fetch(request);
        if (originResponse.ok) {
          const response = new Response(originResponse.body, {
            status: originResponse.status,
            headers: {
              ...Object.fromEntries(originResponse.headers),
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL.STATIC}`,
              'X-Cache': 'MISS'
            }
          });
          ctx.waitUntil(cache.put(request, response.clone()));
          return response;
        }
      }

      // Static assets - pass through directly to let Cloudflare Pages handle native caching & compression
      const hasStaticExtension = /\.(txt|xml|json|css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname);
      if (hasStaticExtension) {
        return fetch(request);
      }

      // HTML pages
      if (request.headers.get('accept')?.includes('text/html')) {
        return await handleHTMLRequest(request);
      }

      // Fallback for any other API/resource requests
      return fetch(request);

    } catch (error) {
      console.error('Worker error:', error);

      // Fallback to origin on error
      return fetch(request);
    }
  }
};

/**
 * Robots.txt content
 */
const ROBOTS_TXT = `# TestoZa SEO Robots Configuration
# Domain: https://testoza.com
# Last Updated: 2026-02-12

User-agent: *
Allow: /

# Sitemap location
Sitemap: https://testoza.com/sitemap/index.xml
Sitemap: https://testoza.com/sitemap/static.xml
Sitemap: https://testoza.com/sitemap/tests.xml
Sitemap: https://testoza.com/sitemap/categories.xml
Sitemap: https://testoza.com/sitemap/tags.xml
Sitemap: https://testoza.com/sitemap/creators.xml

# Crawl rate
Crawl-delay: 1

# Private Routes - Do Not Index
Disallow: /live/
Disallow: /admin
Disallow: /manage-tests
Disallow: /my-tests
Disallow: /history
Disallow: /results
Disallow: /create-test
Disallow: /edit-test/
Disallow: /generate-with-ai
Disallow: /profile
Disallow: /settings
Disallow: /materials
Disallow: /notifications
Disallow: /update-password
Disallow: /onboarding
Disallow: /test-submitted
Disallow: /login
Disallow: /*?*  # Block query parameters
Allow: /*?page=  # Allow pagination

# Block specific file types
Disallow: /*.json$
Disallow: /*.xml$
Allow: /sitemap*.xml$

# Block development/internal paths
Disallow: /internal/
Disallow: /api/
Disallow: /_next/

# Google-specific
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Googlebot-Image
Allow: /assets/
Allow: /images/

# Bing-specific
User-agent: Bingbot
Allow: /
Crawl-delay: 1

# Social Media Crawlers
User-agent: facebookexternalhit
Allow: /
Crawl-delay: 0

User-agent: Twitterbot
Allow: /
Crawl-delay: 0
`;

/**
 * Deployment Instructions:
 * 
 * 1. Install Wrangler CLI:
 *    npm install -g wrangler
 * 
 * 2. Authenticate with Cloudflare:
 *    wrangler login
 * 
 * 3. Create wrangler.toml:
 *    name = "testoza-seo-worker"
 *    main = "worker.js"
 *    compatibility_date = "2026-02-12"
 *    
 *    [env.production]
 *    route = { pattern = "testoza.com/*", zone_name = "testoza.com" }
 *    
 *    [vars]
 *    API_BASE_URL = "https://your-railway-app.up.railway.app"
 *    FRONTEND_URL = "https://testoza.com"
 * 
 * 4. Deploy:
 *    wrangler deploy --env production
 * 
 * 5. Configure in Cloudflare Dashboard:
 *    - Set up custom domain
 *    - Configure caching rules
 *    - Enable analytics
 */
