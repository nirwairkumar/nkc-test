/**
 * Browser entry for pdf.testoza.com. Deliberately tiny: the pre-rendered page
 * is painted first, then the app code (React, the page's component) is loaded
 * and hydrates it — so first paint never waits for JavaScript.
 */
import './site.css';

const boot = () => import('./boot').then((m) => m.boot());

if (document.getElementById('root')?.firstElementChild) {
    // Two frames: let the browser paint the server HTML, then start the app.
    requestAnimationFrame(() => setTimeout(boot, 0));
} else {
    void boot();
}
