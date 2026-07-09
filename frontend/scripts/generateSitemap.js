import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables with explicit path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });


async function generateSitemap() {
    try {
        console.log("Starting sitemap generation...");

        const BASE_URL = process.env.VITE_SITE_URL || 'https://testoza.com';
        const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';

        console.log(`Using API URL: ${API_URL}`);

        const pages = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'monthly', priority: 0.5 },
            { url: '/create-test', changefreq: 'weekly', priority: 0.8 },
            { url: '/generate-with-ai', changefreq: 'weekly', priority: 0.8 },
            { url: '/quiz-creator', changefreq: 'weekly', priority: 0.9 },
            { url: '/assessment-platform', changefreq: 'weekly', priority: 0.9 },
            { url: '/pricing', changefreq: 'monthly', priority: 0.8 },
            { url: '/premium', changefreq: 'monthly', priority: 0.8 },
            { url: '/about', changefreq: 'monthly', priority: 0.6 },
            { url: '/support', changefreq: 'monthly', priority: 0.6 },
            { url: '/convert', changefreq: 'monthly', priority: 0.7 },
            { url: '/survey', changefreq: 'monthly', priority: 0.7 },
            { url: '/privacy-policy', changefreq: 'monthly', priority: 0.4 },
            { url: '/terms-and-conditions', changefreq: 'monthly', priority: 0.4 },
        ];

        // 1. Fetch Tests from Backend
        try {
            // Fetch tests in batches to avoid missing entries
            const LIMIT = 1000;
            let page = 1;
            let hasMore = true;
            let allTests = [];

            while (hasMore && page <= 5) { // Limit to 5000 for safety
                console.log(`[Sitemap] Fetching tests page ${page}...`);
                const testRes = await fetch(`${API_URL}/tests/feed?limit=${LIMIT}&page=${page}`);
                if (testRes.ok) {
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
                const lastMod = test.updated_at || test.created_at;
                const url = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;

                // Prioritize JEE content
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

        // 2b. Add Explicit Hub Categories (requested by user)
        const hubCategories = [
            'jee-mains', 'gate', 'cat', 'jee', 'iit-jam'
        ];
        hubCategories.forEach(slug => {
            // Ensure they aren't duplicates if already fetched from DB
            if (!pages.find(p => p.url === `/tests/${slug}`)) {
                pages.push({
                    url: `/tests/${slug}`,
                    changefreq: 'daily',
                    priority: 0.95
                });
            }
        });
        try {
            const catRes = await fetch(`${API_URL}/categories/`);
            if (catRes.ok) {
                const categories = await catRes.json();
                if (Array.isArray(categories)) {
                    categories.forEach(cat => {
                        const slug = (cat.slug || cat.name).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                        const isJEE = cat.name?.toUpperCase().includes('JEE');

                        pages.push({
                            url: `/tests/${slug}`,
                            changefreq: isJEE ? 'daily' : 'weekly',
                            priority: isJEE ? 0.85 : 0.7
                        });
                    });
                }
            } else {
                console.warn(`⚠️  [Sitemap] Failed to fetch categories from API: ${catRes.status}`);
            }
        } catch (e) {
            console.warn("⚠️  [Sitemap] Error fetching categories:", e.message);
        }

        // 4. Generate XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
    <url>
        <loc>${BASE_URL}${page.url}</loc>
        <lastmod>${new Date(page.lastmod || new Date()).toISOString()}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>
`).join('')}
</urlset>`;

        // Write to file
        const publicDir = path.resolve(__dirname, '../public');
        // Ensure public dir exists
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
        console.log(`✅ [Sitemap] Generated at ${path.join(publicDir, 'sitemap.xml')} with ${pages.length} URLs.`);

        // Success
        process.exit(0);

    } catch (error) {
        // 5. Global Error Handling
        // Log error but exit successfully so build doesn't fail
        console.error("⚠️  [Sitemap] Unexpected fatal error (Build will continue):", error);
        process.exit(0);
    }
}

// Execute
generateSitemap();
