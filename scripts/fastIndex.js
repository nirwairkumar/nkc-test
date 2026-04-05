import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const keyFile = process.env.GOOGLE_INDEXING_KEY_PATH || path.resolve(__dirname, '../../google-indexing-key.json');
const siteUrl = process.env.VITE_SITE_URL || 'https://testoza.com';

if (!fs.existsSync(keyFile)) {
    console.error(`❌ Key file not found at ${keyFile}. Please place your Google Service Account JSON key file here.`);
    process.exit(1);
}

const keyData = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

const jwtClient = new google.auth.JWT({
    email: keyData.client_email,
    key: keyData.private_key,
    scopes: ['https://www.googleapis.com/auth/indexing']
});

const indexing = google.indexing({
    version: 'v3',
    auth: jwtClient
});

async function indexUrls(urls) {
    try {
        console.log("⏳ Authorizing with Google Indexing API...");
        await jwtClient.authorize();
        console.log("✅ Authorized successfully");

        for (const url of urls) {
            console.log(`🚀 Notifying Google about: ${url}`);

            const res = await indexing.urlNotifications.publish({
                requestBody: {
                    url: url,
                    type: 'URL_UPDATED'
                }
            });

            console.log(`✅ Status: ${res.statusText || 'Success'}`);
        }
    } catch (error) {
        console.error("❌ Error during indexing:", error.response?.data?.error?.message || error.message);
        if (error.response?.data?.error?.message?.includes('permission')) {
            console.log("💡 Tip: Make sure the service account email is added as an OWNER in Google Search Console.");
        }
    }
}

// Example usage: node scripts/fastIndex.js https://testoza.com/test/your-slug
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Usage: node scripts/fastIndex.js <url1> <url2> ...");
} else {
    indexUrls(args);
}
