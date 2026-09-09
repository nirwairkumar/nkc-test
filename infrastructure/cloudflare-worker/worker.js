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
  let description = 'Create, conduct, and manage online tests and exams in minutes with AI. TestoZa is the best free online test maker for teachers, educators, coaching institutes, and content creators — generate quizzes from PDFs, YouTube videos, or text. Auto-grading, analytics, white-label branding & exam integrity tools.';
  let type = 'website';
  let image = `${siteUrl}/default-og.png`;
  let keywords = 'online test maker for teachers, ai test generator, quiz creator for educators, exam builder, conduct online exam, assessment platform for coaching institutes, online examination software';

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

  // ─── SEO USE-CASE LANDING PAGES ──────────────────────────────────────
  const useCaseMetaMap = {
    '/online-test-maker': { title: 'Online Test Maker – Create Tests Online in Minutes | TestoZa', description: 'Create online tests instantly with TestoZa. The easiest online test maker for teachers, educators, and coaching institutes. Auto-grading, analytics, and secure test delivery — all free.' },
    '/online-exam-software': { title: 'Online Exam Software – Conduct Secure Online Exams | TestoZa', description: 'Secure online exam software for educators and coaching institutes. Conduct proctored exams with auto-grading, focus tracking, and detailed analytics. Start free.' },
    '/online-quiz-maker': { title: 'Online Quiz Maker for Teachers – Create Quizzes Free | TestoZa', description: 'Free online quiz maker for teachers. Create engaging quizzes from PDFs, text, or YouTube videos using AI. Auto-grading, instant results, and student analytics.' },
    '/mcq-test-maker': { title: 'MCQ Test Maker Online – Create Multiple Choice Tests Free | TestoZa', description: 'Create MCQ tests online in minutes. Free MCQ test maker for teachers with AI question generation, auto-grading, and detailed analytics.' },
    '/ai-question-generator': { title: 'AI Question Generator – Generate Quiz Questions from Any Content | TestoZa', description: 'Generate quiz questions automatically using AI. Upload PDFs, paste text, or share YouTube videos — get MCQ, fill-in-the-blank, and true/false questions instantly.' },
    '/pdf-to-quiz': { title: 'PDF to Quiz Converter – Turn PDFs into Online Quizzes with AI | TestoZa', description: 'Convert any PDF into an online quiz instantly using AI. Upload textbook chapters, lecture slides, or study notes — get a ready-to-take quiz with auto-grading.' },
    '/youtube-to-quiz': { title: 'YouTube to Quiz Generator – Create Quizzes from YouTube Videos | TestoZa', description: 'Create quizzes from YouTube videos using AI. Share a YouTube link and get a complete quiz with MCQs, answers, and explanations. Perfect for flipped classrooms.' },
    '/online-test-for-coaching': { title: 'Online Test Platform for Coaching Institutes | TestoZa', description: 'Online test platform built for coaching institutes. Conduct mock tests, track student performance, and manage batches with white-label branding. Start free.' },
    '/exam-software-for-schools': { title: 'Online Exam Software for Schools – Conduct School Exams Online | TestoZa', description: 'Online exam software designed for schools. Conduct class tests, mid-terms, and final exams online with auto-grading, secure delivery, and detailed student reports.' },
    '/white-label-test-platform': { title: 'White Label Test Platform – Your Brand, Our Technology | TestoZa', description: 'White-label online test platform for coaching institutes and schools. Custom logo, colours, domain, and certificates. Your brand, powered by TestoZa technology.' },
    '/auto-grading-software': { title: 'Auto Grading Software – Instant Test Grading for Teachers | TestoZa', description: 'Auto-grade tests and quizzes instantly. Eliminates manual correction. Instant scores, analytics, and detailed student reports. Free for teachers.' },
    '/online-proctoring-software': { title: 'Online Proctoring Software – Secure Online Exam Monitoring | TestoZa', description: 'Conduct secure proctored online exams. Focus tracking, tab-switch detection, full-screen enforcement, and detailed activity logs. Free for educators.' },
  };
  if (useCaseMetaMap[path]) {
    title = useCaseMetaMap[path].title;
    description = useCaseMetaMap[path].description;
  }

  // ─── SEO SUBJECT HUB PAGES (/create-test/:subject) ──────────────────
  const subjectMatch = path.match(/^\/create-test\/([a-z-]+)$/);
  if (subjectMatch) {
    const subjectMetaMap = {
      'physics': { title: 'Create Physics Tests Online – AI-Powered Physics Quiz Maker | TestoZa', description: 'Create physics tests and quizzes online using AI. Upload physics notes, textbooks, or videos — get ready-to-take MCQs with solutions. Free for physics teachers.' },
      'chemistry': { title: 'Create Chemistry Tests Online – AI Chemistry Quiz Generator | TestoZa', description: 'Create chemistry tests and quizzes online using AI. Generate organic, inorganic, and physical chemistry MCQs from your materials. Free for chemistry teachers.' },
      'mathematics': { title: 'Create Maths Tests Online – AI-Powered Maths Quiz Maker | TestoZa', description: 'Create mathematics tests and quizzes online with AI. Generate maths MCQs, numerical problems, and concept checks. Full LaTeX support. Free for teachers.' },
      'biology': { title: 'Create Biology Tests Online – AI Biology Quiz Generator | TestoZa', description: 'Create biology tests and quizzes online using AI. Generate MCQs on botany, zoology, genetics, and ecology. Free for biology teachers.' },
      'english': { title: 'Create English Tests Online – AI English Quiz Maker | TestoZa', description: 'Create English language and literature tests online using AI. Grammar quizzes, comprehension tests, and vocabulary assessments. Free for English teachers.' },
      'computer-science': { title: 'Create Computer Science Tests Online – AI CS Quiz Maker | TestoZa', description: 'Create computer science tests and quizzes online using AI. Programming, DSA, DBMS, OS, and networking MCQs with code snippets.' },
      'history': { title: 'Create History Tests Online – AI History Quiz Generator | TestoZa', description: 'Create history tests and quizzes online using AI. Generate MCQs on ancient, medieval, modern, and world history. Free for history teachers.' },
      'geography': { title: 'Create Geography Tests Online – AI Geography Quiz Maker | TestoZa', description: 'Create geography tests and quizzes online using AI. Physical geography, human geography, and map-based MCQs. Free for teachers.' },
      'economics': { title: 'Create Economics Tests Online – AI Economics Quiz Maker | TestoZa', description: 'Create economics tests and quizzes online using AI. Micro, macro, and Indian economy MCQs from your teaching materials. Free for economics teachers.' },
      'general-knowledge': { title: 'Create GK Tests Online – AI General Knowledge Quiz Maker | TestoZa', description: 'Create general knowledge tests and quizzes online using AI. Current affairs, static GK, and awareness MCQs. Free for teachers.' },
      'reasoning': { title: 'Create Reasoning Tests Online – AI Aptitude Quiz Maker | TestoZa', description: 'Create reasoning and aptitude tests online using AI. Logical reasoning, verbal ability, and quantitative aptitude MCQs. Free for educators.' },
    };
    const subjectSlug = subjectMatch[1];
    if (subjectMetaMap[subjectSlug]) {
      title = subjectMetaMap[subjectSlug].title;
      description = subjectMetaMap[subjectSlug].description;
    }
  }

  // ─── SEO COMPARISON PAGES (/compare/:slug) ───────────────────────────
  const compareMatch = path.match(/^\/compare\/([a-z-]+)$/);
  if (compareMatch) {
    const compareMetaMap = {
      'testmoz-alternative': { title: 'TestoZa vs Testmoz – Best Testmoz Alternative for Teachers', description: 'Looking for a Testmoz alternative? TestoZa offers AI question generation, auto-grading, analytics, and white-label branding — all free. Compare features.' },
      'classmarker-alternative': { title: 'TestoZa vs ClassMarker – Best ClassMarker Alternative', description: 'Looking for a ClassMarker alternative? TestoZa offers AI test generation, better analytics, and white-label branding at a fraction of the cost.' },
      'google-forms-alternative': { title: 'TestoZa vs Google Forms – Better Alternative for Online Tests', description: 'Google Forms is great for surveys, not for exams. TestoZa is purpose-built for assessments — AI generation, auto-grading, analytics, proctoring, and branding.' },
      'quizizz-alternative': { title: 'TestoZa vs Quizizz – Best Quizizz Alternative for Assessments', description: 'Quizizz is great for gamified quizzes but lacks exam-grade features. TestoZa is built for serious assessments — AI generation, proctoring, and branding.' },
      'typeform-alternative': { title: 'TestoZa vs Typeform – Better Alternative for Tests & Quizzes', description: 'Typeform is built for surveys, not assessments. TestoZa is purpose-built for tests — AI generation, auto-grading, exam security, and analytics.' },
    };
    const compareSlug = compareMatch[1];
    if (compareMetaMap[compareSlug]) {
      title = compareMetaMap[compareSlug].title;
      description = compareMetaMap[compareSlug].description;
    }
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
