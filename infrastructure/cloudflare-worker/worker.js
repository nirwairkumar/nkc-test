/**
 * Cloudflare Worker for TestoZa SEO Optimization
 * Handles: Edge caching, dynamic sitemap proxying, meta tag & canonical injection for crawlers and humans
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
    HTML: 300           // 5 minutes for HTML
  },

  // Crawler user agents that need special handling
  CRAWLER_AGENTS: [
    'googlebot',
    'bingbot',
    'yandex',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'slackbot',
    'discordbot',
    'telegrambot',
    'pinterest',
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
 * Generate cache key based on URL
 */
function generateCacheKey(request) {
  const url = new URL(request.url);
  return new Request(
    `${url.origin}${url.pathname}`,
    request
  );
}

/**
 * Get appropriate cache TTL based on route
 */
function getCacheTTL(url) {
  const pathname = new URL(url).pathname;

  if (pathname.startsWith('/sitemap') || pathname === '/sitemap.xml') {
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
 * Fetch from backend API with timeout and caching
 */
async function fetchFromAPI(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/xml, application/json, text/plain',
        ...options.headers
      }
    });
    return response;
  } catch (err) {
    console.error(`fetchFromAPI failed for ${url}:`, err);
    return new Response(null, { status: 502 });
  }
}

/**
 * Handle sitemap requests - proxy to backend with fallback and edge caching
 */
async function handleSitemap(request) {
  const url = new URL(request.url);
  let subPath = url.pathname.replace(/^\/+/, ''); // e.g. "sitemap.xml" or "sitemap/static.xml"
  
  if (subPath === 'sitemap.xml' || subPath === 'sitemap' || subPath === 'sitemap/index.xml' || subPath === 'sitemap/sitemap.xml') {
    subPath = 'sitemap/index.xml';
  } else if (!subPath.startsWith('sitemap/')) {
    subPath = `sitemap/${subPath}`;
  }
  
  if (!subPath.endsWith('.xml')) {
    subPath = `${subPath}.xml`;
  }

  // Try Cloudflare Edge Cache first
  const cache = caches.default;
  const cacheKey = new Request(`${CONFIG.FRONTEND_URL}/${subPath}`, request);
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

  // 1. Attempt fetch from Backend API
  let apiResponse = await fetchFromAPI(`/${subPath}`);

  // 2. Fallback to /api prefix if root /sitemap fails
  if (!apiResponse.ok) {
    apiResponse = await fetchFromAPI(`/api/${subPath}`);
  }

  // 3. Fallback to Frontend Static Origin (Cloudflare Pages) if backend is unreachable
  if (!apiResponse.ok) {
    const originResponse = await fetch(request);
    if (originResponse.ok) {
      return originResponse;
    }
    return new Response('Sitemap not found', { status: 404 });
  }

  const body = await apiResponse.text();

  // Cache the response
  const response = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL.SITEMAP}, stale-while-revalidate=86400`,
      'X-Cache': 'MISS',
      'X-Cache-Location': 'EDGE'
    }
  });

  // Store in edge cache
  await cache.put(cacheKey, response.clone());

  return response;
}

/**
 * Formats category slugs into clean, readable titles, preserving common educational acronyms
 */
function formatCategoryName(slug) {
  if (!slug) return '';
  const words = slug.split('-');
  const acronyms = ['jee', 'gate', 'cat', 'iit', 'jam', 'neet', 'ssc', 'upsc', 'clat', 'nda', 'rrb', 'cbt'];

  return words.map(word => {
    const lower = word.toLowerCase();
    if (acronyms.includes(lower)) {
      return lower.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Generate comprehensive meta tags with strict canonical URLs
 */
function generateMetaTags(url, testData = null) {
  const siteUrl = CONFIG.FRONTEND_URL;
  const path = new URL(url).pathname;

  // Default meta - matching high quality educational branding
  let title = 'TestoZa – Free Online Test Maker for Teachers | Create Exam Online with AI';
  let description = 'Create online tests and exams in minutes with AI. TestoZa is the best free online test maker for teachers — generate quizzes from PDFs, YouTube videos, or text. Free quiz creator, mock tests, CBT platform & exam integrity tools.';
  let type = 'website';
  let image = `${siteUrl}/default-og.png`;
  let keywords = 'online test maker, ai test generator, quiz creator, exam builder, conduct online exam, mock test platform, online examination software';

  // Customize based on route
  if (path.startsWith('/test/') || path.startsWith('/test-intro/')) {
    if (testData) {
      title = `${testData.title} | TestoZa`;
      const testDesc = testData.description
        ? (testData.description.length > 150 ? testData.description.substring(0, 147) + '...' : testData.description)
        : `Practice ${testData.title} online. Timed mock exam with instant results and solutions.`;

      const questionCount = testData.total_questions || testData.questions?.length || 0;
      const countStr = questionCount > 0 ? `${questionCount} questions` : 'Practice test';
      description = `${testDesc} (${countStr}, instant results & solutions on TestoZa).`;
      type = 'article';
      const catNames = testData.categories?.map(c => c.name).join(', ') || '';
      keywords = `${testData.title}, online test, practice test, mock exam, ${catNames}, TestoZa`;
      if (testData.og_image) {
        image = testData.og_image;
      }
    } else {
      title = 'Online Test | TestoZa';
      description = 'Take this online test on TestoZa. Practice and improve your skills with real exam simulation.';
    }
  } else if (path.startsWith('/tests/')) {
    const category = path.split('/')[2];
    const catName = formatCategoryName(category);
    title = `${catName} Practice Tests & Mock Exams | TestoZa`;
    description = `Free ${catName} practice tests and mock exams online. Take timed practice papers with instant grading, detailed solutions, and comprehensive rank analysis.`;
    type = 'website';
    keywords = `${catName} test, ${catName} practice test, online exam, mock test, competitive exam prep, TestoZa`;
  } else if (path.startsWith('/creator/')) {
    title = 'Creator Profile | TestoZa';
    description = 'View tests and educational content from this creator on TestoZa.';
  } else if (path === '/pricing') {
    title = 'Pricing & Plans | Free Online Test Maker for Teachers | TestoZa';
    description = 'Affordable pricing plans for educators, coaching institutes, and schools. Start 100% free with unlimited tests and students.';
    type = 'product';
  } else if (path === '/premium') {
    title = 'TestoZa Premium - Advanced CBT Assessment Features';
    description = 'Upgrade to TestoZa Premium for white-label branding, custom certificates, and deep analytics.';
  } else if (path === '/more-tests' || path === '/dashboard' || path === '/explore') {
    title = 'Explore Free Mock Tests & Online Exams | TestoZa';
    description = 'Find and take free mock tests across various competitive exams, subjects, and topics. Access timed practice papers with real-time analytics.';
  } else if (path === '/create-test') {
    title = 'Create Online Tests & Mock Exams | TestoZa';
    description = 'Easily build custom online tests, quizzes, and exams. Customize settings including timer, negative marking, section rules, and proctoring.';
  } else if (path === '/generate-with-ai') {
    title = 'Free AI Quiz & Test Generator | Create Exams in Minutes | TestoZa';
    description = 'Generate comprehensive quizzes and tests in seconds using AI. Import PDFs, YouTube videos, or text prompts to create ready-to-take exams.';
  } else if (path.startsWith('/user-guide')) {
    title = 'TestoZa User Guide & Tutorials for Teachers | TestoZa';
    description = 'Learn how to use TestoZa to create exams, invite students, and analyze test results with our step-by-step documentation.';
  } else if (path === '/about') {
    title = 'Why TestoZa - Best Free Online Test Maker for Teachers | TestoZa';
    description = 'Discover why TestoZa is the preferred choice for educators and institutions. Secure proctoring, AI question generation, and instant grading.';
  } else if (path === '/quiz-creator') {
    title = 'Free AI Quiz & Test Generator for Teachers | TestoZa';
    description = 'Instantly create tests, quizzes, and exams online using AI. Generate assessments from text, PDFs, or YouTube videos. Clean, modern CBT simulator.';
    keywords = 'online quiz creator, ai quiz generator, free quiz maker, create quiz online, exam builder for teachers, TestoZa';
  } else if (path === '/assessment-platform') {
    title = 'CBT & Online Assessment Platform | Free Exam Creator | TestoZa';
    description = 'Create, distribute, and grade computer-based tests (CBT) and classroom assessments online. Get detailed student score reports instantly.';
    keywords = 'cbt assessment platform, computer based test, online exam platform, classroom assessment, exam software, TestoZa';
  } else if (path === '/login') {
    title = 'Login to TestoZa | Free Online Test Maker';
    description = 'Sign in to your TestoZa account to create tests, manage exams, and view student results.';
  } else if (path === '/support') {
    title = 'Contact Support | TestoZa Help Center';
    description = 'Get help with TestoZa. Contact our support team for questions about creating tests, managing exams, or account assistance.';
  } else if (path === '/privacy-policy') {
    title = 'Privacy Policy | TestoZa';
    description = 'Read the TestoZa Privacy Policy to understand how we collect, use, and protect your data.';
  } else if (path === '/terms-and-conditions') {
    title = 'Terms and Conditions | TestoZa';
    description = 'Read the TestoZa Terms and Conditions governing use of the platform for educators and students.';
  } else if (path === '/survey') {
    title = 'Community Survey | TestoZa';
    description = 'Share your feedback and help us improve TestoZa for teachers and students.';
  } else if (path === '/convert') {
    title = 'Convert PDF to Quiz Online | TestoZa';
    description = 'Convert any PDF document into a ready-to-take online quiz in seconds using AI.';
  } else if (path === '/news' || path.startsWith('/news/') || path === '/blog' || path.startsWith('/blog/')) {
    title = 'Education News, Guides & Updates | TestoZa';
    description = 'Stay up to date with the latest exam updates, test creation guides, and education tips from the TestoZa team.';
  }

  // Clean canonical URL without trailing slash or tracking parameters
  const canonicalUrl = `${siteUrl}${path}`;

  // Build meta tag HTML
  return `
    <!-- Dynamic SEO Meta Tags (Cloudflare Worker) -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(keywords)}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="TestoZa">
    <meta property="og:locale" content="en_IN">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${image}">
    <meta name="twitter:site" content="@testoza">
    
    <!-- Robots -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
  `;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Handle HTML requests with meta tag & canonical injection
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

  // Fetch from origin (Cloudflare Pages)
  const originResponse = await fetch(request);

  if (!originResponse.ok) {
    return originResponse;
  }

  const urlObj = new URL(request.url);
  const path = urlObj.pathname;

  let responseToReturn = originResponse;

  // Skip homepage / so it keeps the default highly optimized static tags from index.html
  if (path !== '/' && path !== '') {
    const isTestRoute = path.startsWith('/test/') || path.startsWith('/test-intro/');

    let testData = null;
    if (isTestRoute) {
      const parts = path.split('/');
      const identifier = parts[2];
      if (identifier) {
        try {
          // Fetch test data (excluding large questions list for efficiency)
          const apiResponse = await fetch(`${CONFIG.API_BASE_URL}/api/tests/${identifier}?exclude_questions=true`, {
            headers: {
              'Accept': 'application/json'
            }
          });
          if (apiResponse.ok) {
            testData = await apiResponse.json();
          }
        } catch (e) {
          console.error('Failed to fetch test data in worker:', e);
        }
      }
    }

    // Generate meta tags HTML
    const metaTags = generateMetaTags(request.url, testData);

    // Use native HTMLRewriter to strip old SEO tags and append new ones cleanly
    const rewriter = new HTMLRewriter()
      .on('title', {
        element(el) { el.remove(); }
      })
      .on('meta[name="description"]', {
        element(el) { el.remove(); }
      })
      .on('meta[name="keywords"]', {
        element(el) { el.remove(); }
      })
      .on('meta[name="author"]', {
        element(el) { el.remove(); }
      })
      .on('meta[name="robots"]', {
        element(el) { el.remove(); }
      })
      .on('meta[name="googlebot"]', {
        element(el) { el.remove(); }
      })
      .on('link[rel="canonical"]', {
        element(el) { el.remove(); }
      })
      .on('meta[property^="og:"]', {
        element(el) { el.remove(); }
      })
      .on('meta[name^="twitter:"]', {
        element(el) { el.remove(); }
      })
      .on('head', {
        element(el) {
          el.append(metaTags, { html: true });
        }
      });

    responseToReturn = rewriter.transform(originResponse);
  }

  // Create response with cache headers
  const ttl = getCacheTTL(request.url);
  const response = new Response(responseToReturn.body, {
    status: responseToReturn.status,
    headers: {
      ...Object.fromEntries(responseToReturn.headers),
      'Content-Type': 'text/html; charset=utf-8',
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
      // Sitemap requests (e.g. /sitemap.xml, /sitemap/index.xml, /sitemap/static.xml)
      if (url.pathname.startsWith('/sitemap') || url.pathname === '/sitemap.xml') {
        return await handleSitemap(request);
      }

      // Robots.txt - serve directly
      if (url.pathname === '/robots.txt') {
        return new Response(ROBOTS_TXT, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
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
      const hasStaticExtension = /\.(txt|json|css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname);
      if (hasStaticExtension) {
        return fetch(request);
      }

      // HTML pages & client-side routes (all routes without a static file extension)
      const isHtmlRoute = request.headers.get('accept')?.includes('text/html') ||
                          !url.pathname.includes('.') ||
                          isCrawler(request);

      if (isHtmlRoute) {
        return await handleHTMLRequest(request);
      }

      // Fallback for any other API/resource requests
      return fetch(request);

    } catch (error) {
      console.error('Worker error:', error);
      return fetch(request);
    }
  }
};

/**
 * Complete Robots.txt content with all declared sitemaps
 */
const ROBOTS_TXT = `# TestoZa SEO Robots Configuration
# Domain: https://testoza.com
# Last Updated: 2026-08-20

User-agent: *
Allow: /

# Sitemap Declarations
Sitemap: https://testoza.com/sitemap.xml
Sitemap: https://testoza.com/sitemap/index.xml
Sitemap: https://testoza.com/sitemap/static.xml
Sitemap: https://testoza.com/sitemap/tests.xml
Sitemap: https://testoza.com/sitemap/categories.xml
Sitemap: https://testoza.com/sitemap/posts.xml
Sitemap: https://testoza.com/sitemap/creators.xml

# Crawl rate
Crawl-delay: 0.5

# Private Routes - Do Not Index
Disallow: /live/
Disallow: /admin
Disallow: /manage-tests
Disallow: /history
Disallow: /results
Disallow: /edit-test/
Disallow: /settings
Disallow: /materials
Disallow: /notifications
Disallow: /update-password
Disallow: /onboarding
Disallow: /test-submitted
Disallow: /test-session/
Disallow: /attempt/
Disallow: /payment/
Disallow: /checkout/

# Block internal/build files
Disallow: /api/
Disallow: /_next/
Disallow: /*.js.map$
Disallow: /*.css.map$
Disallow: /*.json$

# Allow all XML and sitemaps
Allow: /sitemap*.xml$
Allow: /sitemap/*.xml$
Allow: /*.xml$

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
Crawl-delay: 0.5

# Social Media Crawlers
User-agent: facebookexternalhit
Allow: /
Crawl-delay: 0

User-agent: Twitterbot
Allow: /
Crawl-delay: 0

User-agent: LinkedInBot
Allow: /
Crawl-delay: 0

User-agent: WhatsApp
Allow: /
Crawl-delay: 0
`;
