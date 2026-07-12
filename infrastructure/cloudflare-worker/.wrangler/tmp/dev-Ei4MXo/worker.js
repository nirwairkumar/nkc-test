var S=Object.defineProperty;var r=(e,t)=>S(e,"name",{value:t,configurable:!0});var p={API_BASE_URL:"https://apigcp.testoza.com",FRONTEND_URL:"https://testoza.com",CACHE_TTL:{SITEMAP:3600,STATIC:86400,API:1800,HTML:300},CRAWLER_AGENTS:["googlebot","bingbot","facebookexternalhit","twitterbot","linkedinbot","whatsapp","slackbot","discordbot","lighthouse","pagespeed","google page speed"],NO_CACHE_ROUTES:["/live/","/admin","/api/","/create-test","/edit-test/"]};function x(e){let t=new URL(e).pathname;return p.NO_CACHE_ROUTES.some(a=>t.startsWith(a))}r(x,"shouldBypassCache");function $(e){let t=new URL(e.url);return new Request(`${t.origin}${t.pathname}`,e)}r($,"generateCacheKey");function v(e){let t=new URL(e).pathname;return t.startsWith("/sitemap")?p.CACHE_TTL.SITEMAP:t.startsWith("/test/")||t.startsWith("/test-intro/")?p.CACHE_TTL.HTML:t.startsWith("/static/")||t.includes(".")?p.CACHE_TTL.STATIC:p.CACHE_TTL.HTML}r(v,"getCacheTTL");async function O(e,t={}){let a=`${p.API_BASE_URL}${e}`;return await fetch(a,{...t,headers:{"Content-Type":"application/json",...t.headers}})}r(O,"fetchFromAPI");async function W(e){let a=new URL(e.url).pathname.replace("/sitemap/","").replace(".xml",""),n=caches.default,o=new Request(`${p.FRONTEND_URL}/sitemap/${a}.xml`,e),s=await n.match(o);if(s)return new Response(s.body,{status:200,headers:{...Object.fromEntries(s.headers),"X-Cache":"HIT","X-Cache-Location":"EDGE"}});let i=await O(`/sitemap/${a}.xml`);if(!i.ok)return new Response("Sitemap not found",{status:404});let l=await i.text(),d=new Response(l,{status:200,headers:{"Content-Type":"application/xml","Cache-Control":`public, max-age=${p.CACHE_TTL.SITEMAP}`,"X-Cache":"MISS","X-Cache-Location":"EDGE"}});return await n.put(o,d.clone()),d}r(W,"handleSitemap");function U(e){if(!e)return"";let t=e.split("-"),a=["jee","gate","cat","iit","jam","neet","ssc","upsc","clat","nda"];return t.map(n=>{let o=n.toLowerCase();return a.includes(o)?o.toUpperCase():n.charAt(0).toUpperCase()+n.slice(1)}).join(" ")}r(U,"formatCategoryName");function H(e,t=null){let a=p.FRONTEND_URL,n=new URL(e).pathname,o="TestoZa \u2013 Free Online Test Maker for Teachers | Create Exam Online with AI",s="Create online tests and exams in minutes with AI. TestoZa is the best free online test maker for teachers \u2014 generate quizzes from PDFs, YouTube videos, or text. Free quiz creator, mock tests, CBT platform & secure proctoring tools.",i="website",l=`${a}/default-og.png`,d="online test maker, ai test generator, quiz creator, exam builder, conduct online exam, mock test platform";if(n.startsWith("/test/")||n.startsWith("/test-intro/"))if(t){o=`${t.title} | TestoZa`;let u=t.description?t.description.length>150?t.description.substring(0,147)+"...":t.description:`Practice ${t.title} online. Timed mock exam with instant results and solutions.`,m=t.total_questions||t.questions?.length||0,g=m>0?`${m} questions`:"Practice test";s=`${u} (${g}, instant results & solutions on TestoZa).`,i="article",d=`${t.title}, online test, practice test, ${t.categories?.map(E=>E.name).join(", ")||""}`}else o="Online Test | TestoZa",s="Take this online test on TestoZa. Practice and improve your skills.";else if(n.startsWith("/tests/")){let u=n.split("/")[2],m=U(u);o=`${m} Practice Tests & Mock Exams | TestoZa`,s=`Free ${m} practice tests and mock exams online. Take timed practice papers with instant grading, detailed solutions, and analysis.`,i="website",d=`${m} test, ${m} practice test, online exam, mock test, competitive exam prep`}else n.startsWith("/creator/")?(o="Creator Profile | TestoZa",s="View tests and educational content from this creator on TestoZa."):n==="/pricing"?(o="Pricing | TestoZa",s="Affordable pricing plans for online test creation. Start free, upgrade anytime.",i="product"):n==="/more-tests"||n==="/dashboard"||n==="/explore"?(o="Explore Free Mock Tests & Online Exams | TestoZa",s="Find and take free mock tests across various competitive exams, subjects, and topics. Access timed practice papers with real-time analytics and detailed solutions."):n==="/create-test"?(o="Create Online Tests & Mock Exams | TestoZa",s="Easily build custom online tests, quizzes, and exams. Customize settings including timer, marking schemes, section rules, and remote proctoring options."):n==="/generate-with-ai"?(o="Free AI Quiz & Test Generator | Create Exams in Minutes | TestoZa",s="Generate comprehensive quizzes and tests in seconds using AI. Import PDFs, YouTube videos, docx, or text prompts to create ready-to-take exams."):n.startsWith("/user-guide")?(o="TestoZa User Guide & Tutorials for Teachers | TestoZa",s="Learn how to use TestoZa to create exams, manage classrooms, invite students, and analyze test results with our step-by-step documentation and guide."):n==="/about"&&(o="Why TestoZa - Best Free Online Test Maker | TestoZa",s="Discover why TestoZa is the preferred choice for educators and institutions. Secure proctoring, AI question generation, and instant grading analytics.");return`
    <!-- Dynamic SEO Meta Tags (Cloudflare Worker) -->
    <title>${h(o)}</title>
    <meta name="description" content="${h(s)}">
    <meta name="keywords" content="${h(d)}">
    <link rel="canonical" href="${a}${n}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${h(o)}">
    <meta property="og:description" content="${h(s)}">
    <meta property="og:type" content="${i}">
    <meta property="og:url" content="${a}${n}">
    <meta property="og:image" content="${l}">
    <meta property="og:site_name" content="TestoZa">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${h(o)}">
    <meta name="twitter:description" content="${h(s)}">
    <meta name="twitter:image" content="${l}">
    
    <!-- Robots -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
  `}r(H,"generateMetaTags");function h(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}r(h,"escapeHtml");async function N(e){let t=caches.default,a=$(e),n=await t.match(a);if(n&&!x(e.url))return new Response(n.body,{status:200,headers:{...Object.fromEntries(n.headers),"X-Cache":"HIT","X-Cache-Location":"EDGE"}});let o=await fetch(e);if(!o.ok)return o;let i=new URL(e.url).pathname,l=o;if(i!=="/"&&i!==""){let m=i.startsWith("/test/")||i.startsWith("/test-intro/");{let g=null;if(m){let A=i.split("/")[2];if(A)try{let T=await fetch(`${p.API_BASE_URL}/api/tests/${A}?exclude_questions=true`,{headers:{Accept:"application/json"}});T.ok&&(g=await T.json())}catch(T){console.error("Failed to fetch test data in worker:",T)}}let E=H(e.url,g);l=new HTMLRewriter().on("title",{element(c){c.remove()}}).on('meta[name="description"]',{element(c){c.remove()}}).on('meta[name="keywords"]',{element(c){c.remove()}}).on('meta[name="author"]',{element(c){c.remove()}}).on('meta[name="robots"]',{element(c){c.remove()}}).on('meta[name="googlebot"]',{element(c){c.remove()}}).on('link[rel="canonical"]',{element(c){c.remove()}}).on('meta[property^="og:"]',{element(c){c.remove()}}).on('meta[name^="twitter:"]',{element(c){c.remove()}}).on("head",{element(c){c.append(E,{html:!0})}}).transform(o)}}let d=v(e.url),u=new Response(l.body,{status:l.status,headers:{...Object.fromEntries(l.headers),"Content-Type":"text/html; charset=utf-8","Cache-Control":x(e.url)?"no-store, no-cache, must-revalidate":`public, max-age=${d}`,"X-Cache":"MISS","X-Cache-Location":"EDGE"}});return x(e.url)||await t.put(a,u.clone()),u}r(N,"handleHTMLRequest");var b={async fetch(e,t,a){let n=new URL(e.url);if(e.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Max-Age":"86400"}});try{if(n.pathname.startsWith("/sitemap"))return await W(e);if(n.pathname==="/robots.txt")return new Response(P,{headers:{"Content-Type":"text/plain","Cache-Control":"public, max-age=86400"}});if(n.pathname==="/llms.txt"||n.pathname==="/llms-full.txt"){let s=caches.default,i=await s.match(e);if(i)return new Response(i.body,{headers:{...Object.fromEntries(i.headers),"Content-Type":"text/plain; charset=utf-8","X-Cache":"HIT"}});let l=await fetch(e);if(l.ok){let d=new Response(l.body,{status:l.status,headers:{...Object.fromEntries(l.headers),"Content-Type":"text/plain; charset=utf-8","Cache-Control":`public, max-age=${p.CACHE_TTL.STATIC}`,"X-Cache":"MISS"}});return a.waitUntil(s.put(e,d.clone())),d}}return/\.(txt|xml|json|css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(n.pathname)?fetch(e):e.headers.get("accept")?.includes("text/html")?await N(e):fetch(e)}catch(o){return console.error("Worker error:",o),fetch(e)}}},P=`# TestoZa SEO Robots Configuration
# Domain: https://testoza.com
# Last Updated: 2026-07-05

User-agent: *
Allow: /

# Sitemap location
Sitemap: https://testoza.com/sitemap/index.xml
Sitemap: https://testoza.com/sitemap/static.xml
Sitemap: https://testoza.com/sitemap.xml

# Crawl rate
Crawl-delay: 1

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
Disallow: /*.xml$
Allow: /sitemap*.xml$

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
`;var j=r(async(e,t,a,n)=>{try{return await n.next(e,t)}finally{try{if(e.body!==null&&!e.bodyUsed){let o=e.body.getReader();for(;!(await o.read()).done;);}}catch(o){console.error("Failed to drain the unused request body.",o)}}},"drainBody"),D=j;function k(e){return{name:e?.name,message:e?.message??String(e),stack:e?.stack,cause:e?.cause===void 0?void 0:k(e.cause)}}r(k,"reduceError");var F=r(async(e,t,a,n)=>{try{return await n.next(e,t)}catch(o){let s=k(o);return Response.json(s,{status:500,headers:{"MF-Experimental-Error-Stack":"true"}})}},"jsonError"),I=F;var f=[D,I],w=b;var L=[];function y(...e){L.push(...e.flat())}r(y,"__facade_register__");function M(e,t,a,n,o){let[s,...i]=o;return s(e,t,a,{dispatch:n,next(d,u){return M(d,u,a,n,i)}})}r(M,"__facade_invokeChain__");function C(e,t,a,n,o){return M(e,t,a,n,[...L,o])}r(C,"__facade_invoke__");var _=class e{constructor(t,a,n){this.scheduledTime=t;this.cron=a;this.#e=n}scheduledTime;cron;static{r(this,"__Facade_ScheduledController__")}#e;noRetry(){if(!(this instanceof e))throw new TypeError("Illegal invocation");this.#e()}};function z(e){if(f===void 0||f.length===0)return e;for(let a of f)y(a);let t=r(function(a,n,o){if(e.fetch===void 0)throw new Error("Handler does not export a fetch() function.");return e.fetch(a,n,o)},"fetchDispatcher");return{...e,fetch(a,n,o){return C(a,n,o,r(function(i,l){if(i==="scheduled"&&e.scheduled!==void 0){let d=new _(Date.now(),l.cron??"",()=>{});return e.scheduled(d,n,o)}},"dispatcher"),t)}}}r(z,"wrapExportedHandler");function X(e){if(f===void 0||f.length===0)return e;for(let t of f)y(t);return class extends e{#e=r((t,a,n)=>{if(this.env=a,this.ctx=n,super.fetch===void 0)throw new Error("Entrypoint class does not define a fetch() function.");return super.fetch(t)},"#fetchDispatcher");#t=r((t,a)=>{if(t==="scheduled"&&super.scheduled!==void 0){let n=new _(Date.now(),a.cron??"",()=>{});return super.scheduled(n)}},"#dispatcher");fetch(t){return C(t,this.env,this.ctx,this.#t,this.#e)}}}r(X,"wrapWorkerEntrypoint");var R;typeof w=="object"?R=z(w):typeof w=="function"&&(R=X(w));var he=R;export{f as __INTERNAL_WRANGLER_MIDDLEWARE__,he as default};
//# sourceMappingURL=worker.js.map
