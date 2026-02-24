import { createClient } from '@supabase/supabase-js';
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

        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        // Support both ANON_KEY and PUBLISHABLE_KEY (legacy)
        const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const BASE_URL = process.env.VITE_SITE_URL || 'https://testoza.com';

        // 1. Graceful Skip if Env Missing
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            console.warn("⚠️  [Sitemap] Skipped: Missing VITE_SUPABASE_URL or keys.");
            // EXIT 0 to allow build to continue
            process.exit(0);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const pages = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'monthly', priority: 0.5 },
            { url: '/create-test', changefreq: 'weekly', priority: 0.8 },
            { url: '/generate-with-ai', changefreq: 'weekly', priority: 0.8 },
            { url: '/pricing', changefreq: 'monthly', priority: 0.8 },
            { url: '/premium', changefreq: 'monthly', priority: 0.8 },
            { url: '/about', changefreq: 'monthly', priority: 0.6 },
            { url: '/support', changefreq: 'monthly', priority: 0.6 },
            { url: '/privacy-policy', changefreq: 'monthly', priority: 0.4 },
            { url: '/terms-and-conditions', changefreq: 'monthly', priority: 0.4 },
        ];

        // 2. Fetch Tests - Correct Syntax
        // Removed table-qualified 'tests.created_at' which caused PGRST100
        const { data: tests, error: testError } = await supabase
            .from('tests')
            .select('id, slug, created_at')
            .eq('is_public', true);

        if (testError) {
            // Log warning but DO NOT crash
            console.warn("⚠️  [Sitemap] Failed to fetch tests:", testError.message);
        } else if (tests) {
            tests.forEach(test => {
                const lastMod = test.updated_at || test.created_at;
                const url = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
                pages.push({
                    url,
                    changefreq: 'weekly',
                    priority: 0.8,
                    lastmod: lastMod
                });
            });
        }

        // 3. Fetch Categories
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('name');

        if (catError) {
            console.warn("⚠️  [Sitemap] Failed to fetch categories:", catError.message);
        } else if (categories) {
            categories.forEach(cat => {
                // Simple slugify for category name
                const slug = cat.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                pages.push({
                    url: `/tests/${slug}`,
                    changefreq: 'weekly',
                    priority: 0.7
                });
            });
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
