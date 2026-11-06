/**
 * Tells Bing, Yandex, Seznam and Naver (IndexNow) that testoza.com pages changed, so they
 * are re-crawled within minutes instead of weeks. Bing's index also feeds ChatGPT search,
 * Copilot and DuckDuckGo, which is where most AI answers about TestoZa come from.
 * Google does not use IndexNow; it reads the sitemap submitted in Search Console.
 *
 * Run after a deploy that changes pages (frontend first, then the SEO worker):
 *   npm run indexnow                 every page in https://testoza.com/sitemap/static.xml
 *   npm run indexnow -- /user-guide/quick-start /guides    only these (paths or full URLs)
 *
 * The key file is public/<KEY>.txt, served on both hosts by the same Pages build.
 */
const KEY = 'd01203870a580317631d6cd63765f783';
const SITEMAP = 'https://testoza.com/sitemap/static.xml';

const args = process.argv.slice(2);
let urls;
if (args.length) {
    urls = args.map((a) => (a.startsWith('http') ? a : `https://testoza.com${a.startsWith('/') ? a : `/${a}`}`));
} else {
    const xml = await (await fetch(SITEMAP)).text();
    // Page URLs only (the <loc> of each <url>), not the screenshots listed under <image:loc>.
    urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const byHost = new Map();
for (const u of urls) {
    const host = new URL(u).host;
    if (host !== 'testoza.com' && host !== 'app.testoza.com') continue;
    byHost.set(host, [...(byHost.get(host) || []), u]);
}

for (const [host, urlList] of byHost) {
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList }),
    });
    console.log(`IndexNow ${host}: ${urlList.length} URLs → ${res.status} ${res.statusText}`);
    if (res.status >= 400) {
        console.log(await res.text());
        process.exitCode = 1;
    }
}
