import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Support both ANON_KEY and PUBLISHABLE_KEY (legacy)
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BASE_URL = process.env.VITE_SITE_URL || 'https://nkc-test-platform.vercel.app';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) must be set.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
    try {
        console.log("Generating sitemap...");

        const pages = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/login', changefreq: 'monthly', priority: 0.5 },
            // Add other static pages
        ];

        // Fetch Tests
        // Hint 'reference column "tests.created_at"' suggests ambiguity or need for qualification.
        // We try to be explicit.
        const { data: tests, error: testError } = await supabase
            .from('tests')
            .select('id, slug, updated_at, created_at:tests.created_at')
            .eq('is_public', true);

        if (testError) {
            console.error("Error fetching tests:", testError);
            throw testError; // Throw to trigger catch block
        }

        if (tests) {
            tests.forEach(test => {
                // "created_at:tests.created_at" aliases it to "created_at" in the result if supported,
                // or we check strictly.
                // note: supabase-js/postgrest usually handles 'alias:column' syntax.
                const createdAt = test.created_at;
                const lastMod = test.updated_at || createdAt;
                const url = test.slug ? `/test/${test.slug}` : `/test-intro/${test.id}`;
                pages.push({
                    url,
                    changefreq: 'weekly',
                    priority: 0.8,
                    lastmod: lastMod
                });
            });
        }

        // Fetch Categories
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('name');

        if (catError) {
            console.error("Error fetching categories:", catError);
            throw catError;
        }

        if (categories) {
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

        // Generate XML
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
        console.log(`Sitemap generated at ${path.join(publicDir, 'sitemap.xml')} with ${pages.length} URLs.`);

        // Explicitly exit with success
        process.exit(0);

    } catch (error) {
        console.error("Fatal error generating sitemap:", error);
        // Explicitly exit with failure code to stop build
        process.exit(1);
    }
}

// Execute and handle any unhandled rejections
generateSitemap().catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
});
