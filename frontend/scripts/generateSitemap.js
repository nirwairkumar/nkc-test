import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables with explicit path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Baseline date for static pages to prevent false lastmod updates on every build
const STATIC_PAGE_LASTMOD = '2026-08-01T00:00:00.000Z';

async function fetchFromEndpoints(endpoints) {
    for (const url of endpoints) {
        try {
            console.log(`[Sitemap] Attempting fetch from: ${url}`);
            const res = await fetch(url, { 
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3500)
            });
            if (res.ok) {
                return res;
            }
        } catch (e) {
            console.warn(`⚠️ [Sitemap] Failed to reach ${url}: ${e.message}`);
        }
    }
    return null;
}

function buildXml(urls, baseUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(page => {
    const formattedDate = new Date(page.lastmod || STATIC_PAGE_LASTMOD).toISOString();
    const loc = page.url.startsWith('http') ? page.url : `${baseUrl}${page.url}`;
    return `    <url>
        <loc>${loc}</loc>
        <lastmod>${formattedDate}</lastmod>
        <changefreq>${page.changefreq || 'weekly'}</changefreq>
        <priority>${page.priority || '0.7'}</priority>
    </url>`;
}).join('\n')}
</urlset>`;
}

async function generateSitemap() {
    try {
        console.log("Starting sitemap generation...");

        const BASE_URL = (process.env.VITE_SITE_URL || 'https://testoza.com').replace(/\/$/, '');
        const primaryApi = process.env.VITE_API_URL || 'https://apigcp.testoza.com/api';
        
        // Candidate API endpoints
        const apiCandidates = [
            primaryApi,
            'https://apigcp.testoza.com/api',
            'https://test-platform-backend-1087440407062.asia-south1.run.app/api',
            'http://localhost:8000/api'
        ].filter((val, idx, self) => self.indexOf(val) === idx);

        const staticPages = [
            { url: '/', changefreq: 'daily', priority: 1.0, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/quiz-creator', changefreq: 'weekly', priority: 0.95, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/assessment-platform', changefreq: 'weekly', priority: 0.95, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/generate-with-ai', changefreq: 'weekly', priority: 0.9, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/create-test', changefreq: 'weekly', priority: 0.85, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/more-tests', changefreq: 'daily', priority: 0.85, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/pricing', changefreq: 'monthly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/premium', changefreq: 'monthly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/about', changefreq: 'monthly', priority: 0.7, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/support', changefreq: 'monthly', priority: 0.7, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/convert', changefreq: 'monthly', priority: 0.7, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/survey', changefreq: 'monthly', priority: 0.6, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/privacy-policy', changefreq: 'yearly', priority: 0.4, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/terms-and-conditions', changefreq: 'yearly', priority: 0.4, lastmod: STATIC_PAGE_LASTMOD },
        ];

        // 1. Fetch Tests from Backend
        const testPages = [];
        try {
            const LIMIT = 100;
            let page = 1;
            let hasMore = true;

            while (hasMore && page <= 20) {
                const endpoints = apiCandidates.map(api => `${api}/tests/feed?limit=${LIMIT}&page=${page}`);
                const testRes = await fetchFromEndpoints(endpoints);

                if (testRes) {
                    const testData = await testRes.json();
                    const tests = testData.tests || [];
                    tests.forEach(test => {
                        const lastMod = test.updated_at || test.created_at || STATIC_PAGE_LASTMOD;
                        const url = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
                        const isJEE = test.title?.toUpperCase().includes('JEE');

                        if (!testPages.find(p => p.url === url)) {
                            testPages.push({
                                url,
                                changefreq: isJEE ? 'daily' : 'weekly',
                                priority: isJEE ? 0.9 : 0.8,
                                lastmod: lastMod
                            });
                        }
                    });
                    hasMore = tests.length === LIMIT && testData.meta?.has_more !== false;
                    page++;
                } else {
                    hasMore = false;
                }
            }

            console.log(`[Sitemap] Total tests fetched: ${testPages.length}`);
        } catch (e) {
            console.warn("⚠️  [Sitemap] Error fetching tests:", e.message);
        }

        // 2. Fetch / Build Category Hubs
        const categoryPages = [];
        const hubCategories = ['jee-mains', 'jee-advanced', 'neet-ug', 'gate', 'cat', 'jee', 'iit-jam', 'ssc'];
        hubCategories.forEach(slug => {
            categoryPages.push({
                url: `/tests/${slug}`,
                changefreq: 'daily',
                priority: 0.95,
                lastmod: STATIC_PAGE_LASTMOD
            });
        });

        try {
            const catEndpoints = apiCandidates.map(api => `${api}/categories/`);
            const catRes = await fetchFromEndpoints(catEndpoints);

            if (catRes) {
                const categories = await catRes.json();
                if (Array.isArray(categories)) {
                    categories.forEach(cat => {
                        const slug = (cat.slug || cat.name).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                        const isJEE = cat.name?.toUpperCase().includes('JEE');

                        if (!categoryPages.find(p => p.url === `/tests/${slug}`)) {
                            categoryPages.push({
                                url: `/tests/${slug}`,
                                changefreq: isJEE ? 'daily' : 'weekly',
                                priority: isJEE ? 0.85 : 0.75,
                                lastmod: STATIC_PAGE_LASTMOD
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("⚠️  [Sitemap] Error fetching categories:", e.message);
        }

        // 3. Write XML Files
        const publicDir = path.resolve(__dirname, '../public');
        const sitemapSubDir = path.join(publicDir, 'sitemap');

        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        if (!fs.existsSync(sitemapSubDir)) fs.mkdirSync(sitemapSubDir, { recursive: true });

        // Combined Sitemap
        const allPages = [...staticPages, ...categoryPages, ...testPages];
        fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildXml(allPages, BASE_URL));

        // Sub-sitemaps
        fs.writeFileSync(path.join(sitemapSubDir, 'static.xml'), buildXml(staticPages, BASE_URL));
        fs.writeFileSync(path.join(sitemapSubDir, 'categories.xml'), buildXml(categoryPages, BASE_URL));
        fs.writeFileSync(path.join(sitemapSubDir, 'tests.xml'), buildXml(testPages, BASE_URL));

        // Index XML
        const today = new Date().toISOString().split('T')[0];
        const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${BASE_URL}/sitemap/static.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${BASE_URL}/sitemap/categories.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${BASE_URL}/sitemap/tests.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>
</sitemapindex>`;
        fs.writeFileSync(path.join(sitemapSubDir, 'index.xml'), sitemapIndexXml);

        console.log(`✅ [Sitemap] Successfully generated sitemap.xml (${allPages.length} URLs) and sub-sitemaps in public/sitemap/.`);
        process.exit(0);

    } catch (error) {
        console.error("⚠️  [Sitemap] Unexpected fatal error:", error);
        process.exit(0);
    }
}

// Execute
generateSitemap();
