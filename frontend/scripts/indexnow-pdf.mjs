/**
 * Tells Bing, Yandex, Seznam and Naver (IndexNow) that pdf.testoza.com pages
 * changed, so they are re-crawled within minutes instead of days. Bing's index
 * also feeds ChatGPT search and Copilot. Run after each deploy of the PDF site:
 *   npm run indexnow:pdf
 * Google does not use IndexNow — it reads the sitemap submitted in Search Console.
 */
const HOST = 'pdf.testoza.com';
const KEY = 'c2a78dbe99e3511235aaa7c273d9bf8d'; // also served at /<KEY>.txt
const PATHS = ['/', '/edit-pdf', '/edit-hindi-pdf', '/latex-to-pdf', '/chatgpt-to-pdf'];

const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: PATHS.map((p) => `https://${HOST}${p}`),
    }),
});
console.log(`IndexNow: ${res.status} ${res.statusText}`);
if (res.status >= 400) {
    console.log(await res.text());
    process.exitCode = 1;
}
