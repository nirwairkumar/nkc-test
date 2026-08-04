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
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                return res;
            }
        } catch (e) {
            console.warn(`⚠️ [Sitemap] Failed to reach ${url}: ${e.message}`);
        }
    }
    return null;
}

async function generateSitemap() {
    try {
        console.log("Starting sitemap generation...");

        const BASE_URL = process.env.VITE_SITE_URL || 'https://testoza.com';
        const primaryApi = process.env.VITE_API_URL || 'http://localhost:8000/api';
        
        // List of candidate API endpoints (local -> production Cloud Run -> custom domain)
        const apiCandidates = [
            primaryApi,
            'https://apigcp.testoza.com/api',
            'https://test-platform-backend-1087440407062.asia-south1.run.app/api'
        ].filter((val, idx, self) => self.indexOf(val) === idx);

        const pages = [
            { url: '/', changefreq: 'daily', priority: 1.0, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/login', changefreq: 'monthly', priority: 0.5, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/create-test', changefreq: 'weekly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/generate-with-ai', changefreq: 'weekly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/quiz-creator', changefreq: 'weekly', priority: 0.9, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/assessment-platform', changefreq: 'weekly', priority: 0.9, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/pricing', changefreq: 'monthly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/premium', changefreq: 'monthly', priority: 0.8, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/about', changefreq: 'monthly', priority: 0.6, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/support', changefreq: 'monthly', priority: 0.6, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/convert', changefreq: 'monthly', priority: 0.7, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/survey', changefreq: 'monthly', priority: 0.7, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/privacy-policy', changefreq: 'monthly', priority: 0.4, lastmod: STATIC_PAGE_LASTMOD },
            { url: '/terms-and-conditions', changefreq: 'monthly', priority: 0.4, lastmod: STATIC_PAGE_LASTMOD },
        ];

        // 1. Fetch Tests from Backend
        try {
            const LIMIT = 1000;
            let page = 1;
            let hasMore = true;
            let allTests = [];

            while (hasMore && page <= 5) {
                const endpoints = apiCandidates.map(api => `${api}/tests/feed?limit=${LIMIT}&page=${page}`);
                const testRes = await fetchFromEndpoints(endpoints);

                if (testRes) {
                    const testData = await testRes.json();
                    const tests = testData.tests || [];
                    allTests = [...allTests, ...tests];
                    hasMore = tests.length === LIMIT && testData.meta?.has_more !== false;
                    page++;
                } else {
                    hasMore = false;
                }
            }

            console.log(`[Sitemap] Total tests fetched: ${allTests.length}`);

            allTests.forEach(test => {
                const lastMod = test.updated_at || test.created_at || STATIC_PAGE_LASTMOD;
                const url = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
                const isJEE = test.title?.toUpperCase().includes('JEE');

                pages.push({
                    url,
                    changefreq: isJEE ? 'daily' : 'weekly',
                    priority: isJEE ? 0.9 : 0.8,
                    lastmod: lastMod
                });
            });
        } catch (e) {
            console.warn("⚠️  [Sitemap] Error fetching tests:", e.message);
        }

        // 2. Add Explicit Hub Categories
        const hubCategories = ['jee-mains', 'gate', 'cat', 'jee', 'iit-jam'];
        hubCategories.forEach(slug => {
            if (!pages.find(p => p.url === `/tests/${slug}`)) {
                pages.push({
                    url: `/tests/${slug}`,
                    changefreq: 'daily',
                    priority: 0.95,
                    lastmod: STATIC_PAGE_LASTMOD
                });
            }
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

                        if (!pages.find(p => p.url === `/tests/${slug}`)) {
                            pages.push({
                                url: `/tests/${slug}`,
                                changefreq: isJEE ? 'daily' : 'weekly',
                                priority: isJEE ? 0.85 : 0.7,
                                lastmod: STATIC_PAGE_LASTMOD
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("⚠️  [Sitemap] Error fetching categories:", e.message);
        }

        // 3. Generate XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => {
    const formattedDate = new Date(page.lastmod || STATIC_PAGE_LASTMOD).toISOString();
    return `    <url>
        <loc>${BASE_URL}${page.url}</loc>
        <lastmod>${formattedDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
}).join('\n')}
</urlset>`;

        // Write to file
        const publicDir = path.resolve(__dirname, '../public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
        console.log(`✅ [Sitemap] Successfully generated ${path.join(publicDir, 'sitemap.xml')} with ${pages.length} URLs.`);

        process.exit(0);

    } catch (error) {
        console.error("⚠️  [Sitemap] Unexpected fatal error:", error);
        process.exit(0);
    }
}

// Execute
generateSitemap();
