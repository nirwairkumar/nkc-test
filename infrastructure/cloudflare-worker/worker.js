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
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:site_name" content="TestoZa">
    <meta property="og:locale" content="en_IN">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta name="twitter:site" content="@testoza">
    
    <!-- Robots -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
  `;
}

/**
 * Escape HTML entities
 */
function safeJsonLd(value) {
  // M6: JSON.stringify does not escape "<", so a value containing "</script>" would
  // close the tag early and everything after it would execute as script.
  // U+2028/U+2029 are line terminators in JS source and must be escaped too.
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

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
 * Route-specific rich content & FAQ schema generator for crawlers & bots
 */
function generateRouteContent(url, testData = null) {
  const path = new URL(url).pathname;

  // ─── 1. PRICING PAGE ────────────────────────────────────────────────────────
  if (path === '/pricing') {
    const faqs = [
      {
        q: "Is TestoZa really free? What's the catch?",
        a: "Yes, TestoZa is 100% free for individual teachers and educators creating and conducting standard online tests. There is no trial period, no credit card requirement, and no artificial cap on the number of tests you can create or students you can assess. Our paid plans are strictly for coaching institutes and schools needing white-label branding, higher submission quotas, and dedicated organizational support."
      },
      {
        q: "How many students can take a test at once?",
        a: "Hundreds of students can take a test simultaneously on TestoZa without lag or server degradation. Our infrastructure is powered by Google Cloud Run and Cloudflare edge networks, which scale dynamically to handle concurrent exam traffic during institute-wide tests, coaching mock exams, and school assessments."
      },
      {
        q: "What happens if a student's internet disconnects mid-test?",
        a: "If a student loses their internet connection during an exam, TestoZa saves all answered questions locally in the browser. When the connection is restored, responses sync automatically with our server. If the connection cannot be restored before the timer ends, submitted answers up to the point of disconnection remain safely recorded and accessible in the educator's dashboard."
      },
      {
        q: "Do students need to create an account to take a test?",
        a: "No, students do not need to create an account or sign up to take a test. They simply open the test link provided by the teacher, enter their name, roll number, or email address as required by your settings, and begin the assessment immediately. This eliminates login friction and technical barriers on exam day."
      },
      {
        q: "Is my question paper data secure?",
        a: "Yes, your question papers, uploaded study materials, and student response data are completely secure and private. All data is encrypted in transit using SSL/TLS and stored on secure cloud databases with strict access controls. TestoZa never shares, sells, or publicly publishes tests created privately by educators or coaching institutes."
      },
      {
        q: "What payment methods do you support for premium plans?",
        a: "We support all major Indian and international payment methods through our secure Razorpay gateway. You can pay using UPI (Google Pay, PhonePe, Paytm), credit and debit cards (Visa, MasterCard, RuPay), net banking across all major banks, and digital wallets. Invoices with GST details are automatically generated upon payment."
      },
      {
        q: "Can I upgrade, renew, or cancel my subscription anytime?",
        a: "Yes, you have complete control over your subscription with no lock-in contracts. Since our plans are flexible (weekly, monthly, or yearly), you can renew when exam seasons begin or switch plans as your student batch size changes. If your subscription expires, your tests and student history remain safe and accessible on the free tier."
      }
    ];

    const bodyHtml = `
      <h1>Transparent Pricing & Plans for Educators and Coaching Institutes</h1>
      <p>Start 100% free with unlimited test creation and student assessments. Upgrade to flexible weekly, monthly, or yearly plans for custom institute branding, anti-cheat proctoring, and official certificates.</p>

      <h2>TestoZa Plans & Subscription Tiers</h2>
      <div>
        <h3>Free Forever Plan (₹0)</h3>
        <p>Free forever for all individual teachers, educators, and creators. No credit card required.</p>
        <ul>
          <li>Unlimited online tests and quizzes</li>
          <li>Unlimited student test takers</li>
          <li>AI Question Generator (from PDF, YouTube, or text)</li>
          <li>Manual Question Builder with full math & LaTeX support</li>
          <li>Instant auto-grading, student scorecards, and class leaderboards</li>
        </ul>

        <h3>Weekly Lite (₹49 / 7 days)</h3>
        <p>Designed for periodic test cycles, weekly coaching mock exams, and short tests.</p>
        <ul>
          <li>Includes all Free features</li>
          <li>100 Student Result Submissions per cycle</li>
          <li>Custom Institute Name & Logo on all test pages</li>
          <li>Advanced Exam Security Controls & Anti-Cheat Environment</li>
          <li>Scheduled Online Exams with strict access windows</li>
          <li>Student Management & Batch Assignments</li>
        </ul>

        <h3>Monthly Pro (₹149 / 30 days)</h3>
        <p>The most popular plan for active coaching institutes and classroom teachers.</p>
        <ul>
          <li>Includes all Weekly Lite features</li>
          <li>350 Student Result Submissions per month</li>
          <li>Full Anti-Cheat Proctoring with Tab-Switch & Focus Tracking</li>
          <li>Detailed Performance Reports and Section-Wise Score Analysis</li>
          <li>Export Student Results and Scorecards to Excel (CSV/XLSX)</li>
          <li>Priority Customer Support</li>
        </ul>

        <h3>Yearly Elite (₹799 / 365 days)</h3>
        <p>Maximum value for schools, colleges, and premier coaching academies.</p>
        <ul>
          <li>Includes all Monthly Pro features</li>
          <li>4,000 Student Result Submissions per year</li>
          <li>Full White-Label Institute Branding & Custom Certificate Generation</li>
          <li>Unlimited Timed Exam Scheduling and Batch Management</li>
          <li>Custom Domain & Portal Integration Ready</li>
          <li>24/7 Dedicated Priority Support</li>
        </ul>
      </div>

      <h2>Plan Feature Comparison</h2>
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free Forever</th>
            <th>Weekly Lite (₹49)</th>
            <th>Monthly Pro (₹149)</th>
            <th>Yearly Elite (₹799)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Test Creation</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
          <tr><td>Student Assessments</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
          <tr><td>AI Test Generator (PDF/Video)</td><td>Included</td><td>Included</td><td>Included</td><td>Included</td></tr>
          <tr><td>Submissions Quota</td><td>Standard</td><td>100</td><td>350</td><td>4,000</td></tr>
          <tr><td>Institute Logo & Branding</td><td>No</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Anti-Cheat Tab Tracking</td><td>Standard</td><td>Advanced</td><td>Advanced</td><td>Full Suite</td></tr>
          <tr><td>Export to Excel</td><td>No</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
          <tr><td>Support</td><td>Community</td><td>Email</td><td>Priority</td><td>24/7 Dedicated</td></tr>
        </tbody>
      </table>

      <h2>Frequently Asked Questions About Pricing</h2>
      ${faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/create-test">Create a Test Free</a> | <a href="https://testoza.com/generate-with-ai">AI Quiz Maker</a> | <a href="https://testoza.com/">Back to Homepage</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 2. CREATE TEST PAGE (MANUAL BUILDER) ──────────────────────────────────
  if (path === '/create-test') {
    const faqs = [
      {
        q: "What question types does TestoZa support?",
        a: "TestoZa supports multiple question formats including Single-Choice Multiple Choice Questions (MCQs), Multiple-Select Questions (MSQs), Numerical Value Questions, True or False, Fill-in-the-Blanks, and Short Answer questions. You can combine different question types within a single test or organize them into distinct subject sections to mirror standard competitive and school exam formats."
      },
      {
        q: "Can I import questions from Word or Excel?",
        a: "Yes, you can import questions in bulk from Microsoft Word documents, Excel spreadsheets, or text files. With our AI and text import tools, you can simply copy and paste your existing question sets or upload documents directly. The system automatically parses question text, answer options, and correct answers into structured, editable test questions."
      },
      {
        q: "Can I add images or math equations to questions?",
        a: "Yes, TestoZa provides full support for images, diagrams, and complex mathematical formulas. You can upload images directly into questions and answer explanations, and format scientific notations and equations using LaTeX syntax. This makes it easy to construct technical exams in Mathematics, Physics, Chemistry, and Engineering."
      },
      {
        q: "How do I configure negative marking and marking schemes?",
        a: "You can configure custom marking schemes for each question or section within the test builder. Specify the positive marks awarded for correct answers and choose fractional negative deductions (such as -0.25, -0.33, -0.5, or -1) for incorrect responses. TestoZa calculates aggregate scores and negative deductions automatically when students submit their tests."
      },
      {
        q: "Can I organize tests into multiple sections?",
        a: "Yes, you can divide any test into multiple named sections—such as Physics, Chemistry, and Mathematics, or Section A (Objective) and Section B (Numerical). Each section can have its own instructions, question count, and optional sectional time limits, giving students an authentic exam environment."
      },
      {
        q: "Can I download results and student responses as an Excel sheet?",
        a: "Yes, you can export complete exam results and individual student scorecards to an Excel (CSV/XLSX) spreadsheet with a single click. The download includes student names, roll numbers, total scores, section-wise marks, accuracy percentages, time spent per question, and timestamps for comprehensive offline record-keeping."
      },
      {
        q: "Can I schedule an exam to open and close at specific times?",
        a: "Yes, you can schedule tests with precise start and end dates and times. Once scheduled, the test becomes accessible only during the designated exam window. You can also configure whether students can review answers immediately upon submission or only after the test window has officially closed."
      }
    ];

    const bodyHtml = `
      <h1>Create Online Tests & Mock Exams – Manual Question Builder & Exam Rules</h1>
      <p>TestoZa's online test builder gives teachers and coaching institutes complete control over exam structure, question types, timer settings, negative marking rules, and anti-cheat proctoring. Create tests manually or import questions in bulk.</p>

      <h2>Supported Question Formats</h2>
      <ul>
        <li><strong>Single-Choice Multiple Choice Questions (MCQ):</strong> Standard 4-option questions with one correct answer and detailed explanations.</li>
        <li><strong>Multiple-Select Questions (MSQ):</strong> Advanced questions with multiple correct options and optional partial marking.</li>
        <li><strong>Numerical & Integer Value Questions:</strong> Exact value, decimal, or range-based numerical input questions.</li>
        <li><strong>Fill in the Blanks:</strong> Single or multi-blank sentences with case-sensitive validation options.</li>
        <li><strong>True or False Questions:</strong> Rapid concept-check questions.</li>
        <li><strong>LaTeX & Formula Support:</strong> Full LaTeX equation editor support for mathematical symbols and scientific notations.</li>
        <li><strong>Rich Media:</strong> Upload diagrams, charts, and images directly into questions and answer explanations.</li>
      </ul>

      <h2>Timer Settings & Exam Scheduling</h2>
      <ul>
        <li><strong>Overall Countdown Timer:</strong> Strict time limit with automatic test submission upon expiry.</li>
        <li><strong>Section-Wise Timers:</strong> Dedicated timers per section to simulate standardized competitive exams.</li>
        <li><strong>Scheduled Exam Windows:</strong> Set start and end date/time so students only access the exam during designated windows.</li>
      </ul>

      <h2>Marking Schemes & Negative Marking Rules</h2>
      <ul>
        <li><strong>Custom Positive Marks:</strong> Assign specific marks (+1, +2, +4) per question or section.</li>
        <li><strong>Configurable Negative Marking:</strong> Enforce negative marks (-0.25, -0.33, -0.5, -1) for incorrect responses.</li>
        <li><strong>Automated Calculation:</strong> Net score, gross score, negative deductions, and accuracy percentages calculate automatically.</li>
      </ul>

      <h2>Exam Security & Anti-Cheat Proctoring</h2>
      <ul>
        <li><strong>Tab-Switch Monitoring:</strong> Records every time a student leaves the test tab.</li>
        <li><strong>Full-Screen Enforcement:</strong> Distraction-free full-screen testing mode.</li>
        <li><strong>Question & Option Shuffling:</strong> Automatically randomizes question and option order per student.</li>
      </ul>

      <h2>Frequently Asked Questions About Creating Tests</h2>
      ${faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/generate-with-ai">Create Test with AI</a> | <a href="https://testoza.com/pricing">Pricing & Plans</a> | <a href="https://testoza.com/">Homepage</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 3. GENERATE WITH AI ───────────────────────────────────────────────────
  if (path === '/generate-with-ai') {
    const faqs = [
      {
        q: "How does TestoZa generate tests using AI?",
        a: "TestoZa uses advanced AI models to analyze educational content—such as PDF documents, lecture notes, textbook chapters, text prompts, or YouTube video transcripts. The AI extracts core learning concepts, formulates accurate multiple-choice and short-answer questions, specifies correct answers, and generates step-by-step explanations automatically in under two minutes."
      },
      {
        q: "Can I edit AI-generated questions before publishing?",
        a: "Yes, you have 100% editing control. Once the AI generates the test, all questions, options, and explanations load into our full-featured Test Builder. You can edit question wording, reorder options, change answer keys, add images or math formulas, and adjust marking schemes before sharing the test with students."
      },
      {
        q: "What content formats can I upload for AI test generation?",
        a: "TestoZa supports PDF documents (including textbooks and lecture slides), pasted plain text, topic prompts, and YouTube video URLs with transcripts. The AI parses the uploaded material and formats questions tailored to your chosen grade level and difficulty."
      }
    ];

    const bodyHtml = `
      <h1>Free AI Quiz & Test Generator – Create Online Exams from Any Content</h1>
      <p>Transform PDFs, textbook chapters, lecture notes, text prompts, and YouTube videos into ready-to-take online tests in seconds using TestoZa's AI test generator. Free for teachers and educators.</p>

      <h2>How AI Test Generation Works</h2>
      <ol>
        <li><strong>Upload Content:</strong> Upload a PDF document, paste lecture notes, or share a YouTube video link.</li>
        <li><strong>Configure Preferences:</strong> Select your desired number of questions, question types (MCQ, MSQ, True/False, Fill-in-the-blank), and difficulty level.</li>
        <li><strong>Instant Generation:</strong> Our AI extracts key concepts, formulates questions, creates plausible distractors, and writes detailed solution explanations.</li>
        <li><strong>Review & Customize:</strong> Edit questions in our visual test builder, configure timer and marking settings, and publish.</li>
      </ol>

      <h2>Frequently Asked Questions About AI Test Generation</h2>
      ${faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/create-test">Manual Test Builder</a> | <a href="https://testoza.com/pricing">Pricing</a> | <a href="https://testoza.com/">Homepage</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 4. SEO USE-CASE LANDING PAGES ──────────────────────────────────────────
  const useCaseDetails = {
    '/online-test-maker': {
      h1: 'Online Test Maker – Create Tests Online in Minutes',
      overview: 'Create online tests instantly with TestoZa. The easiest online test maker for teachers, educators, and coaching institutes. Auto-grading, analytics, and secure test delivery — all free.',
      features: ['AI Question Generation from PDFs, YouTube & Text', 'Instant Auto-Grading & Performance Reports', 'One-Click Test Sharing via Link or QR Code', 'Anti-Cheat Proctoring & Focus Tracking'],
      faqs: [
        { q: 'Is this online test maker free?', a: 'Yes, TestoZa is completely free for teachers, educators, and creators. You can create unlimited tests and assess unlimited students without any fee or subscription.' },
        { q: 'Can students take tests on mobile phones?', a: 'Yes, tests are fully responsive and work on any smartphone, tablet, or laptop browser without installing any app.' },
        { q: 'What question formats are supported?', a: 'TestoZa supports Single-Choice MCQs, Multiple-Select questions, Numerical values, Fill-in-the-blank, and True/False questions.' }
      ]
    },
    '/online-exam-software': {
      h1: 'Online Exam Software – Conduct Secure Online Exams',
      overview: 'Secure online exam software for educators and coaching institutes. Conduct proctored exams with auto-grading, focus tracking, and detailed analytics.',
      features: ['Standardized Exam Security & Tab-Switch Detection', 'Full-Screen Immersion & Anti-Multitasking', 'Timer & Section-Wise Scheduling', 'Automated Scorecards with Negative Marking'],
      faqs: [
        { q: 'How does TestoZa secure online exams?', a: 'TestoZa uses tab-switch tracking, fullscreen enforcement, question and option randomization, and copy-paste prevention to maintain exam integrity.' },
        { q: 'Can I conduct institute-wide exams?', a: 'Yes, hundreds of students can attempt exams simultaneously with zero lag, supported by scalable cloud infrastructure.' },
        { q: 'Does it support negative marking?', a: 'Yes, you can configure custom positive marks and negative mark penalties (-0.25, -0.33, -0.5, -1) per question or section.' }
      ]
    },
    '/online-quiz-maker': {
      h1: 'Online Quiz Maker for Teachers – Create Quizzes Free',
      overview: 'Free online quiz maker for teachers. Create engaging quizzes from PDFs, text, or YouTube videos using AI. Auto-grading, instant results, and student analytics.',
      features: ['Create Quizzes in 60 Seconds with AI', 'Instant Results & Student Scorecards', 'Classroom Leaderboards', 'No Account Required for Students'],
      faqs: [
        { q: 'How do I share a quiz with my class?', a: 'Copy the unique quiz link or display the QR code in class. Students can open it in any mobile or desktop browser immediately.' },
        { q: 'Can I download quiz scores?', a: 'Yes, you can export all student responses, scores, and completion times to an Excel spreadsheet with one click.' },
        { q: 'Is there a limit on quizzes?', a: 'No, teachers can create unlimited quizzes for free on TestoZa.' }
      ]
    },
    '/mcq-test-maker': {
      h1: 'MCQ Test Maker Online – Create Multiple Choice Tests Free',
      overview: 'Create MCQ tests online in minutes. Free MCQ test maker for teachers with AI question generation, auto-grading, and detailed analytics.',
      features: ['Single-Choice & Multi-Select MCQs', 'Negative Marking Rules', 'LaTeX Math & Scientific Notation Support', 'Question & Option Shuffling'],
      faqs: [
        { q: 'How many options can an MCQ have?', a: 'You can add 2 to 6 options per question, with full support for formulas and images.' },
        { q: 'Can I import MCQs from Word or Excel?', a: 'Yes, you can paste questions in bulk or upload PDF documents, and AI parses them into MCQs automatically.' },
        { q: 'Are questions randomized for each student?', a: 'Yes, you can enable automatic question and option shuffling to prevent answer sharing.' }
      ]
    },
    '/ai-question-generator': {
      h1: 'AI Question Generator – Generate Quiz Questions from Any Content',
      overview: 'Generate quiz questions automatically using AI. Upload PDFs, paste text, or share YouTube videos — get MCQ, fill-in-the-blank, and true/false questions instantly.',
      features: ['Extract Questions from PDFs & Textbooks', 'Convert YouTube Videos into Quizzes', 'Accurate Distractor Generation', 'Full Explanations for Every Question'],
      faqs: [
        { q: 'How accurate is the AI question generator?', a: 'The AI analyzes the provided source text directly, extracting factual concepts and generating contextually sound questions with correct answer keys.' },
        { q: 'Can I modify questions after AI generation?', a: 'Yes, every question is fully editable in TestoZa’s visual test editor before publishing.' },
        { q: 'Does it support STEM and math questions?', a: 'Yes, TestoZa handles mathematical notations, chemical formulas, and technical terminology with LaTeX rendering.' }
      ]
    },
    '/pdf-to-quiz': {
      h1: 'PDF to Quiz Converter – Turn PDFs into Online Quizzes with AI',
      overview: 'Convert any PDF into an online quiz instantly using AI. Upload textbook chapters, lecture slides, or study notes — get a ready-to-take quiz with auto-grading.',
      features: ['Direct PDF Upload & Parsing', 'Automatic MCQ & Fill-in-the-Blank Creation', 'Difficulty Level Selection', 'Instant Student Delivery'],
      faqs: [
        { q: 'What size PDF can I upload?', a: 'You can upload standard PDF documents including textbook chapters, slide decks, and lecture notes.' },
        { q: 'How long does conversion take?', a: 'Most PDF documents are analyzed and converted into ready-to-use tests in under two minutes.' },
        { q: 'Can I choose how many questions to generate?', a: 'Yes, you can choose the desired question count (e.g., 5, 10, 20, or custom) before generation.' }
      ]
    },
    '/youtube-to-quiz': {
      h1: 'YouTube to Quiz Generator – Create Quizzes from YouTube Videos',
      overview: 'Create quizzes from YouTube videos using AI. Share a YouTube link and get a complete quiz with MCQs, answers, and explanations. Perfect for flipped classrooms.',
      features: ['Automatic Transcript Extraction', 'Comprehension Concept Testing', 'Ideal for Flipped Classrooms', 'One-Click Publishing'],
      faqs: [
        { q: 'Does any YouTube video work?', a: 'Any public YouTube video with English subtitles or transcripts can be converted into a quiz.' },
        { q: 'How does it help flipped classrooms?', a: 'Students watch the assigned video, then complete the quiz immediately to demonstrate concept mastery.' },
        { q: 'Can students rewatch the video during the quiz?', a: 'You can embed the video right alongside the quiz questions or keep the quiz strictly separate.' }
      ]
    },
    '/online-test-for-coaching': {
      h1: 'Online Test Platform for Coaching Institutes',
      overview: 'Online test platform built for coaching institutes. Conduct mock tests, track student performance, and manage batches with white-label branding. Start free.',
      features: ['Batch & Student Management', 'Institute Name & Logo Branding', 'Rank & Percentile Analytics', 'Scheduled Exam Sessions'],
      faqs: [
        { q: 'Can I brand tests with my coaching institute logo?', a: 'Yes, premium plans allow you to display your institute name, logo, and custom instructions on all tests.' },
        { q: 'Does it calculate ranks and percentiles?', a: 'Yes, TestoZa automatically computes student ranks, percentiles, and batch-wise performance distributions.' },
        { q: 'Can I schedule tests for specific batch timings?', a: 'Yes, you can configure precise start and end times for any coaching batch.' }
      ]
    },
    '/exam-software-for-schools': {
      h1: 'Online Exam Software for Schools – Conduct School Exams Online',
      overview: 'Online exam software designed for schools. Conduct class tests, mid-terms, and final exams online with auto-grading, secure delivery, and detailed student reports.',
      features: ['Term Exams & Weekly Tests', 'Classroom Batch Assignments', 'Automated Score Reports', 'Excel Export for Report Cards'],
      faqs: [
        { q: 'Is TestoZa suitable for K-12 schools?', a: 'Yes, TestoZa is widely used by primary, secondary, and higher secondary schools for classroom evaluations.' },
        { q: 'Can non-technical teachers use it?', a: 'Yes, the interface is simple and intuitive, allowing any teacher to build a test in minutes.' },
        { q: 'Can parents receive test results?', a: 'Teachers can download or share individual scorecards and performance summaries directly.' }
      ]
    },
    '/white-label-test-platform': {
      h1: 'White Label Test Platform – Your Brand, Our Technology',
      overview: 'White-label online test platform for coaching institutes and schools. Custom logo, colours, domain, and certificates. Your brand, powered by TestoZa technology.',
      features: ['Custom Logo & Organization Identity', 'Branded Test URLs & Portals', 'Custom Completion Certificates', 'Private Question Banks'],
      faqs: [
        { q: 'What elements can be white-labeled?', a: 'Your organization logo, institute name, test portal headers, result pages, and certificates can be branded.' },
        { q: 'Can I issue branded certificates?', a: 'Yes, TestoZa generates official PDF certificates with your institute seal, logo, and student scores.' },
        { q: 'Are my tests private?', a: 'Yes, all tests and question banks remain strictly confidential to your institution.' }
      ]
    },
    '/auto-grading-software': {
      h1: 'Auto Grading Software – Instant Test Grading for Teachers',
      overview: 'Auto-grade tests and quizzes instantly. Eliminates manual correction. Instant scores, analytics, and detailed student reports. Free for teachers.',
      features: ['Instant Auto-Grading upon Submission', 'Zero Manual Paper Checking', 'Negative Marking Support', 'Accuracy & Time-Spent Metrics'],
      faqs: [
        { q: 'Which question types are auto-graded?', a: 'MCQs, MSQs, Numerical questions, Fill-in-the-blanks, and True/False questions are graded automatically.' },
        { q: 'Do students see their scores immediately?', a: 'You can choose whether students view scores immediately or after the test window closes.' },
        { q: 'Can I export grading sheets to Excel?', a: 'Yes, complete score sheets with sectional marks and time stamps export to Excel with one click.' }
      ]
    },
    '/online-proctoring-software': {
      h1: 'Online Proctoring Software – Secure Online Exam Monitoring',
      overview: 'Conduct secure proctored online exams. Focus tracking, tab-switch detection, full-screen enforcement, and detailed activity logs. Free for educators.',
      features: ['Real-Time Tab-Switch Tracking', 'Full-Screen Lock Mode', 'Copy-Paste Restriction', 'Question & Option Shuffling'],
      faqs: [
        { q: 'How does tab-switch detection work?', a: 'TestoZa monitors browser visibility state and logs each time a student leaves or minimizes the exam tab.' },
        { q: 'Can tests auto-submit on cheating attempts?', a: 'Yes, teachers can set a maximum violation limit after which the test automatically submits.' },
        { q: 'Do students need to install software?', a: 'No, all proctoring features operate directly in modern web browsers without plugins or downloads.' }
      ]
    }
  };

  if (useCaseDetails[path]) {
    const d = useCaseDetails[path];
    const bodyHtml = `
      <h1>${escapeHtml(d.h1)}</h1>
      <p>${escapeHtml(d.overview)}</p>

      <h2>Key Features for Educators</h2>
      <ul>
        ${d.features.map(f => `<li>${escapeHtml(f)}</li>`).join('\n')}
      </ul>

      <h2>Frequently Asked Questions</h2>
      ${d.faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/create-test">Create a Test Free</a> | <a href="https://testoza.com/generate-with-ai">AI Test Generator</a> | <a href="https://testoza.com/pricing">Pricing</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": d.faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 5. SEO SUBJECT HUB PAGES (/create-test/:subject) ──────────────────────
  const subjectMatch = path.match(/^\/create-test\/([a-z-]+)$/);
  if (subjectMatch) {
    const slug = subjectMatch[1];
    const subjectName = formatCategoryName(slug);
    const faqs = [
      {
        q: `How do I create ${subjectName} tests on TestoZa?`,
        a: `You can create ${subjectName} tests manually using our visual question editor or automatically with AI. Upload ${subjectName} lecture notes, textbook chapters, or PDF question banks, and TestoZa generates MCQs with step-by-step solutions in minutes.`
      },
      {
        q: `Does TestoZa support formulas and diagrams for ${subjectName}?`,
        a: `Yes, TestoZa provides full LaTeX equation editor support for mathematical, chemical, and physical formulas, as well as high-resolution image uploads for diagrams, charts, and graphs.`
      },
      {
        q: `Can I share ${subjectName} tests with my students for free?`,
        a: `Yes, TestoZa is 100% free for teachers. You can create unlimited ${subjectName} tests and share the link with any number of students without restrictions.`
      }
    ];

    const bodyHtml = `
      <h1>Create ${escapeHtml(subjectName)} Tests Online – AI-Powered ${escapeHtml(subjectName)} Quiz Maker</h1>
      <p>Create, conduct, and grade ${escapeHtml(subjectName)} tests online with TestoZa. Built for ${escapeHtml(subjectName)} teachers, educators, and coaching institutes. Support for LaTeX formulas, diagrams, auto-grading, and anti-cheat proctoring.</p>

      <h2>Capabilities for ${escapeHtml(subjectName)} Assessments</h2>
      <ul>
        <li>AI question generation from ${escapeHtml(subjectName)} notes, textbooks, and YouTube videos</li>
        <li>Full LaTeX formula and scientific notation editor</li>
        <li>Image, diagram, and graph embedding in questions and solutions</li>
        <li>Instant auto-grading with detailed scorecards and explanations</li>
        <li>Strict timers and negative marking configurations</li>
      </ul>

      <h2>Frequently Asked Questions About ${escapeHtml(subjectName)} Tests</h2>
      ${faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/create-test">Build ${escapeHtml(subjectName)} Test</a> | <a href="https://testoza.com/generate-with-ai">AI Quiz Maker</a> | <a href="https://testoza.com/pricing">Pricing</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 6. SEO COMPARISON PAGES (/compare/:slug) ──────────────────────────────
  const compareMatch = path.match(/^\/compare\/([a-z-]+)$/);
  if (compareMatch) {
    const slug = compareMatch[1];
    const compNameMap = {
      'testmoz-alternative': 'Testmoz',
      'classmarker-alternative': 'ClassMarker',
      'google-forms-alternative': 'Google Forms',
      'quizizz-alternative': 'Quizizz',
      'typeform-alternative': 'Typeform'
    };
    const compName = compNameMap[slug] || 'Alternative';

    const faqs = [
      {
        q: `Why is TestoZa better than ${compName} for online tests?`,
        a: `TestoZa is purpose-built for academic and exam assessments. Unlike ${compName}, TestoZa offers native AI test generation from PDFs and YouTube videos, built-in countdown timers, negative marking, anti-cheating tab-switch detection, and student leaderboards—completely free with zero student limits.`
      },
      {
        q: `Can I migrate my tests from ${compName} to TestoZa?`,
        a: `Yes, you can easily migrate question sets by copying and pasting your text into TestoZa’s AI importer or uploading your question documents directly. Our AI parses questions, options, and answers automatically.`
      },
      {
        q: `Is TestoZa really free compared to ${compName}?`,
        a: `Yes, TestoZa offers unlimited test creation, unlimited students, and core assessment features 100% free for teachers. Paid plans are strictly optional for coaching institutes needing custom branding and higher submission quotas.`
      }
    ];

    const bodyHtml = `
      <h1>TestoZa vs ${escapeHtml(compName)} – Better Online Assessment Platform for Teachers</h1>
      <p>Looking for a modern alternative to ${escapeHtml(compName)}? TestoZa offers AI-powered test generation, built-in exam security, automatic grading, and white-label branding at zero cost for educators.</p>

      <h2>Comparison: TestoZa vs ${escapeHtml(compName)}</h2>
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Feature</th>
            <th>TestoZa</th>
            <th>${escapeHtml(compName)}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>AI Test Generator (PDF / Video)</td><td>Yes (Built-in)</td><td>No / Limited</td></tr>
          <tr><td>Countdown Timers & Auto-Submit</td><td>Yes (Native)</td><td>Requires Add-on / Manual</td></tr>
          <tr><td>Negative Marking Calculation</td><td>Yes (Automatic)</td><td>Limited / None</td></tr>
          <tr><td>Anti-Cheat Tab-Switch Tracking</td><td>Yes (Native)</td><td>Limited</td></tr>
          <tr><td>Student Account Required</td><td>No (Instant Link)</td><td>Often Required</td></tr>
          <tr><td>Free Tier Limits</td><td>Unlimited Tests & Students</td><td>Restricted Limits</td></tr>
        </tbody>
      </table>

      <h2>Frequently Asked Questions</h2>
      ${faqs.map(f => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`).join('\n')}

      <p><a href="https://testoza.com/create-test">Try TestoZa Free</a> | <a href="https://testoza.com/pricing">View Pricing</a> | <a href="https://testoza.com/">Homepage</a></p>
    `;

    return {
      bodyHtml,
      faqSchema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a }
        }))
      }
    };
  }

  // ─── 7. TEST PRACTICE & INTRO ROUTES ───────────────────────────────────────
  if (path.startsWith('/test/') || path.startsWith('/test-intro/')) {
    if (testData) {
      const qCount = testData.total_questions || testData.questions?.length || 0;
      const duration = testData.time_limit_mins ? `${testData.time_limit_mins} minutes` : 'Untimed';
      const bodyHtml = `
        <h1>${escapeHtml(testData.title)}</h1>
        <p>${escapeHtml(testData.description || 'Online test and assessment on TestoZa.')}</p>
        <h2>Exam Information</h2>
        <ul>
          <li><strong>Total Questions:</strong> ${qCount}</li>
          <li><strong>Duration:</strong> ${duration}</li>
          <li><strong>Format:</strong> Computer-Based Test (CBT) with auto-grading</li>
        </ul>
        <p><a href="https://testoza.com/test-intro/${testData.id}">Start Test</a> | <a href="https://testoza.com/">Explore More Tests</a></p>
      `;
      return { bodyHtml, faqSchema: null };
    }
  }

  return { bodyHtml: null, faqSchema: null };
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
        ...securityHeaders(),
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

    // Generate meta tags HTML and route-specific body/schema
    const metaTags = generateMetaTags(request.url, testData);
    const routeContent = generateRouteContent(request.url, testData);

    // Use native HTMLRewriter to strip old SEO tags, inject new ones, and replace <main> body
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
      .on('script#schema-faq', {
        element(el) { el.remove(); }
      })
      .on('head', {
        element(el) {
          el.append(metaTags, { html: true });
          if (routeContent && routeContent.faqSchema) {
            el.append(`\n    <!-- Route FAQPage Schema -->\n    <script id="schema-faq" type="application/ld+json">\n${safeJsonLd(routeContent.faqSchema)}\n    </script>`, { html: true });
          }
        }
      });

    if (routeContent && routeContent.bodyHtml) {
      rewriter.on('main', {
        element(el) {
          el.setInnerContent(routeContent.bodyHtml, { html: true });
        }
      });
    }

    responseToReturn = rewriter.transform(originResponse);
  }

  // Create response with cache headers
  const ttl = getCacheTTL(request.url);
  const response = new Response(responseToReturn.body, {
    status: responseToReturn.status,
    headers: {
      ...Object.fromEntries(responseToReturn.headers),
      ...securityHeaders(),
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
 * M6 / M7 (SECURITY_THREAT_MODEL_AND_PLAN.md) — security headers for the HTML document.
 *
 * These belong here, not on the API: the backend's CSP only covers JSON responses,
 * while XSS happens in the page. Access/refresh tokens live in localStorage, so any
 * script execution in this origin is an account takeover — CSP is the safety net.
 *
 * script-src still needs 'unsafe-inline' and 'unsafe-eval':
 *   - the Vite bundle and GTM inject inline <script> blocks
 *   - KaTeX/mhchem and the chart library evaluate generated code
 * Removing either breaks the app today, so the enforced policy keeps them while
 * locking down everything that costs nothing: object-src, base-uri, form-action,
 * frame-ancestors.
 */
function securityHeaders() {
  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://apigcp.testoza.com',
    'https://challenges.cloudflare.com'
  ].join(' ');

  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      `connect-src ${connectSrc}`,
      "frame-src https://challenges.cloudflare.com",
      // Nothing here embeds plugins or sets a <base> tag, and no form should post
      // off-origin. These cost nothing and block common XSS escalations.
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests'
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
}

// ─── blog.testoza.com ────────────────────────────────────────────────────────
// The blog is the same Pages build as testoza.com (the app shows the news feed
// when the hostname is blog.testoza.com). Without this section the HTML Google
// reads for the blog is testoza.com's — same title, canonical https://testoza.com/,
// site name "TestoZa" — so Google treats the blog as a copy of testoza.com and
// lists it as one of its sitelinks. Here the blog gets its own identity (site
// name "TestoZa Blog", own canonicals, robots.txt and sitemap) and every post
// lives at https://blog.testoza.com/<slug>.
// Keep the home title and description identical to src/lib/blog.ts in the
// frontend, so nothing changes when the app hydrates.

const BLOG_HOST = 'blog.testoza.com';
const BLOG_URL = `https://${BLOG_HOST}`;
const BLOG_NAME = 'TestoZa Blog';
const BLOG_HOME_TITLE = 'TestoZa Blog – Exam Tips, Teaching Guides & Product Updates';
const BLOG_HOME_DESCRIPTION = 'Guides for teachers and coaching institutes on creating and conducting online exams, exam preparation tips, and TestoZa product updates — from the TestoZa team.';
const BLOG_IMAGE = 'https://testoza.com/default-og.png';
const BLOG_PUBLISHER = {
  '@type': 'Organization',
  name: 'TestoZa',
  url: 'https://testoza.com/',
  logo: { '@type': 'ImageObject', url: 'https://testoza.com/favicon.ico' }
};

/** The app's older blog URLs: /news, /blog, /posts and /<prefix>/<slug>. */
const BLOG_PREFIXES = ['news', 'blog', 'posts'];

/**
 * First path segments of testoza.com app pages (src/App.tsx) and Pages Functions
 * (functions/). The blog's header and footer link to them with relative URLs, so
 * on this host they are duplicates of testoza.com pages — they 301 to testoza.com.
 */
const APP_SECTIONS = new Set([
  'share', 'about', 'ai-question-generator', 'all-submissions', 'analysis', 'analytics', 'assessment-platform',
  'auth', 'auth-error', 'auto-grading-software', 'combined-break', 'combined-intro', 'compare',
  'create-combined-test', 'create-test', 'creator', 'dashboard', 'edit-test', 'exam-software-for-schools',
  'explore', 'generate-with-ai', 'history', 'live', 'login', 'materials', 'mcq-test-maker', 'more-tests',
  'my-posts', 'my-tests', 'notifications', 'onboarding', 'online-exam-software', 'online-proctoring-software',
  'online-quiz-maker', 'online-test-for-coaching', 'online-test-maker', 'pdf-to-quiz', 'premium', 'pricing',
  'privacy-policy', 'profile', 'quiz-creator', 'results', 'rewards', 'settings', 'solutions',
  'solutions-editor', 'support', 'survey', 'terms-and-conditions', 'test', 'test-analysis', 'test-intro',
  'test-submitted', 'tests', 'update-password', 'user-guide', 'white-label-test-platform', 'youtube-to-quiz'
]);

const BLOG_ROBOTS_TXT = `# TestoZa Blog — https://blog.testoza.com
User-agent: *
Allow: /

Sitemap: https://blog.testoza.com/sitemap.xml
`;

/**
 * Every published post (pinned first, then newest), or null when the API is
 * unreachable. One edge-cached list serves the home page, the sitemap and post
 * lookups; it holds the title, summary, cover, dates and author a page head needs.
 */
async function fetchBlogFeed() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/posts/feed?limit=1000`, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: CONFIG.CACHE_TTL.HTML, cacheEverything: true }
    });
    if (!res.ok) return null;
    const posts = await res.json();
    return Array.isArray(posts) ? posts : null;
  } catch (e) {
    console.error('Blog feed fetch failed:', e);
    return null;
  }
}

function blogPostUrl(slug) {
  return `${BLOG_URL}/${encodeURIComponent(slug)}`;
}

function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Head tags for a blog page. Replaces everything testoza.com-specific in index.html. */
function blogHeadTags({ title, ogTitle = title, description, url, image = BLOG_IMAGE, type = 'website', noindex = false, extra = '', jsonLd = null }) {
  const robots = noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${robots}">${url ? `
    <link rel="canonical" href="${escapeHtml(url)}">
    <meta property="og:url" content="${escapeHtml(url)}">` : ''}
    <meta property="og:site_name" content="${BLOG_NAME}">
    <meta property="og:type" content="${type}">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:locale" content="en_IN">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@testoza">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">${extra}${jsonLd ? `
    <script type="application/ld+json">
${safeJsonLd(jsonLd)}
    </script>` : ''}
`;
}

function blogHomePage(posts) {
  const url = `${BLOG_URL}/`;
  const items = posts
    .map((p) => `<li><a href="${escapeHtml(blogPostUrl(p.slug))}">${escapeHtml(p.title)}</a>${p.summary ? ` — ${escapeHtml(p.summary)}` : ''}</li>`)
    .join('\n          ');

  return {
    head: blogHeadTags({
      title: BLOG_HOME_TITLE,
      description: BLOG_HOME_DESCRIPTION,
      url,
      // The site name Google shows comes from this WebSite node on the home page.
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${BLOG_URL}/#website`,
            name: BLOG_NAME,
            alternateName: 'TestoZa Blog & News',
            url,
            inLanguage: 'en-IN',
            publisher: BLOG_PUBLISHER
          },
          {
            '@type': 'Blog',
            '@id': `${BLOG_URL}/#blog`,
            name: BLOG_NAME,
            url,
            description: BLOG_HOME_DESCRIPTION,
            publisher: BLOG_PUBLISHER,
            blogPost: posts.slice(0, 10).map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              url: blogPostUrl(p.slug),
              datePublished: p.published_at || p.created_at
            }))
          }
        ]
      }
    }),
    body: `
        <h1>${BLOG_NAME}</h1>
        <p>${escapeHtml(BLOG_HOME_DESCRIPTION)}</p>${items ? `
        <h2>Latest articles</h2>
        <ul>
          ${items}
        </ul>` : ''}
        <p><a href="https://testoza.com/">TestoZa</a> is a free online test maker for teachers, schools and coaching institutes.</p>
`
  };
}

function blogPostPage(post) {
  const url = blogPostUrl(post.slug);
  // Same fallback text as NewsPostView.tsx, so the description does not change on hydration.
  const description = post.summary || `Read ${post.title} on TestoZa Blog for top exam preparation and insights.`;
  const image = post.cover_image || BLOG_IMAGE;
  const published = post.published_at || post.created_at;
  const modified = post.updated_at || published;
  const author = (post.profiles && post.profiles.full_name) || 'TestoZa Editorial Team';

  return {
    head: blogHeadTags({
      title: `${post.title} | ${BLOG_NAME}`,
      ogTitle: post.title,
      description,
      url,
      image,
      type: 'article',
      extra: `
    <meta property="article:published_time" content="${escapeHtml(published)}">
    <meta property="article:modified_time" content="${escapeHtml(modified)}">`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            '@id': `${url}#article`,
            headline: post.title,
            description,
            image: [image],
            datePublished: published,
            dateModified: modified,
            author: { '@type': 'Person', name: author },
            publisher: BLOG_PUBLISHER,
            mainEntityOfPage: url,
            isPartOf: { '@type': 'Blog', '@id': `${BLOG_URL}/#blog`, name: BLOG_NAME, url: `${BLOG_URL}/` }
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: BLOG_NAME, item: `${BLOG_URL}/` },
              { '@type': 'ListItem', position: 2, name: post.title, item: url }
            ]
          }
        ]
      }
    }),
    body: `
        <article>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(description)}</p>
          <p>Published ${escapeHtml(formatBlogDate(published))} by ${escapeHtml(author)} on the <a href="${BLOG_URL}/">${BLOG_NAME}</a>.</p>
        </article>
`
  };
}

function blogMessagePage(title, message) {
  return {
    head: blogHeadTags({ title: `${title} | ${BLOG_NAME}`, description: message, noindex: true }),
    body: `
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)} <a href="${BLOG_URL}/">Browse all articles on the ${BLOG_NAME}</a>.</p>
`
  };
}

/**
 * The app's index.html from Pages with the blog's head and crawlable body.
 * The browser still gets the full app: React replaces <main> when it loads.
 */
async function serveBlogHtml(request, page, status = 200) {
  const originResponse = await fetch(request);
  if (!originResponse.ok) return originResponse;

  // Everything that describes testoza.com instead of the blog.
  const strip = [
    'title', 'meta[name="description"]', 'meta[name="keywords"]', 'meta[name="author"]',
    'meta[name="robots"]', 'meta[name="googlebot"]', 'link[rel="canonical"]',
    'meta[property^="og:"]', 'meta[name^="twitter:"]', 'script[type="application/ld+json"]'
  ];
  const rewriter = new HTMLRewriter();
  for (const selector of strip) {
    rewriter.on(selector, { element(el) { el.remove(); } });
  }
  rewriter
    .on('head', { element(el) { el.append(page.head, { html: true }); } })
    .on('main', { element(el) { el.setInnerContent(page.body, { html: true }); } });

  const transformed = rewriter.transform(originResponse);
  const headers = new Headers(transformed.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // Pages sends "max-age=0, must-revalidate" for HTML; keep it, so a new deploy
  // is never served with an old page that points at deleted asset files.
  if (status === 503) headers.set('Retry-After', '300');

  return new Response(transformed.body, { status, headers });
}

async function handleBlogSitemap() {
  const posts = await fetchBlogFeed();
  if (!posts) {
    // 503 tells crawlers to come back later instead of dropping every post URL.
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '3600' }
    });
  }

  const day = (value) => (value ? String(value).slice(0, 10) : '');
  const entry = (loc, lastmod) => `  <url>
    <loc>${escapeHtml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
  const newest = posts.map((p) => day(p.updated_at || p.published_at)).filter(Boolean).sort().pop();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[entry(`${BLOG_URL}/`, newest), ...posts.map((p) => entry(blogPostUrl(p.slug), day(p.updated_at || p.published_at)))].join('\n')}
</urlset>
`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL.SITEMAP}`
    }
  });
}

/** Every request to blog.testoza.com. */
async function handleBlogRequest(request, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (path === '/robots.txt') {
    return new Response(BLOG_ROBOTS_TXT, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
    });
  }
  if (path === '/sitemap.xml') {
    return handleBlogSitemap();
  }

  // Files (scripts, styles, images, llms.txt …), the Pages API proxy and
  // Cloudflare's own /cdn-cgi endpoints come straight from Pages.
  if ((segments.length && segments[segments.length - 1].includes('.')) || segments[0] === 'api' || segments[0] === 'cdn-cgi') {
    return fetch(request);
  }

  // Older URLs: /news → /, /news/<slug> → /<slug> (same for /blog and /posts).
  if (BLOG_PREFIXES.includes(segments[0])) {
    if (segments.length === 1) {
      return Response.redirect(`${BLOG_URL}/${url.search}`, 301);
    }
    if (segments.length === 2 && segments[1] !== 'create') {
      return Response.redirect(`${BLOG_URL}/${segments[1]}${url.search}`, 301);
    }
    // Writing and editing posts (/news/create, /news/edit/<id>) happen in the signed-in app.
    return Response.redirect(`https://app.testoza.com${url.pathname}${url.search}`, 302);
  }

  if (path === '/') {
    return serveBlogHtml(request, blogHomePage(((await fetchBlogFeed()) || []).slice(0, 20)));
  }

  if (APP_SECTIONS.has(segments[0])) {
    return Response.redirect(`https://testoza.com${url.pathname}${url.search}`, 301);
  }

  if (segments.length === 1) {
    let slug = segments[0];
    try { slug = decodeURIComponent(slug); } catch { /* keep the raw segment */ }

    const posts = await fetchBlogFeed();
    if (!posts) {
      return serveBlogHtml(request, blogMessagePage('Article temporarily unavailable', 'This article could not be loaded right now. Please try again in a few minutes.'), 503);
    }
    const post = posts.find((p) => p.slug === slug || p.id === slug);
    if (post) {
      // Links by post ID (the app accepts them) go to the post's real URL.
      if (post.slug !== slug) {
        return Response.redirect(`${blogPostUrl(post.slug)}${url.search}`, 301);
      }
      return serveBlogHtml(request, blogPostPage(post));
    }
  }

  // Unknown or unpublished: a real 404 for crawlers. The app still loads and
  // shows its own "not found" (or a draft to its signed-in author).
  return serveBlogHtml(request, blogMessagePage('Article not found', 'This article does not exist or is no longer published.'), 404);
}

/** testoza.com/news, /blog, /posts and their post URLs → the same pages on the blog. */
function mainSiteBlogRedirect(url) {
  const segments = url.pathname.split('/').filter(Boolean);
  if (!BLOG_PREFIXES.includes(segments[0])) return null;
  if (segments.length === 1) return `${BLOG_URL}/${url.search}`;
  if (segments.length === 2 && segments[1] !== 'create') return `${BLOG_URL}/${segments[1]}${url.search}`;
  return null; // /news/create and /news/edit/<id> stay in the app
}

/** Old testoza.com PDF-tool URLs → their pages on pdf.testoza.com. */
const PANNA_MOVED = {
  '/pdf': '/',
  '/pdf/editor': '/edit-pdf',
  '/pdf/latex-to-pdf': '/latex-to-pdf',
  '/convert': '/latex-to-pdf',
};

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
      // Panna (PDF tools) moved to https://pdf.testoza.com — permanent redirects
      // pass the old URLs' links and rankings to the new pages.
      const pannaTarget = PANNA_MOVED[url.pathname.replace(/\/+$/, '') || '/'];
      if (pannaTarget) {
        return Response.redirect(`https://pdf.testoza.com${pannaTarget}${url.search}`, 301);
      }

      // blog.testoza.com is its own site ("TestoZa Blog"), served from the same Pages build.
      if (url.hostname === BLOG_HOST) {
        return await handleBlogRequest(request, url);
      }

      // The blog moved to blog.testoza.com — its old testoza.com URLs follow it.
      const blogTarget = mainSiteBlogRedirect(url);
      if (blogTarget) {
        return Response.redirect(blogTarget, 301);
      }

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
