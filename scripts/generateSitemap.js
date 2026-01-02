import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = 'https://nkc-test-platform.vercel.app'; // Update with actual domain

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
    console.log("Generating sitemap...");

    const pages = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/login', changefreq: 'monthly', priority: 0.5 },
        // Add other static pages
    ];

    // Fetch Tests
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, slug, updated_at, created_at')
        .eq('is_public', true);

    if (testError) {
        console.error("Error fetching tests:", testError);
    } else {
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

    // Fetch Categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('name');

    if (catError) {
        console.error("Error fetching categories:", catError);
    } else {
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
}

generateSitemap();
