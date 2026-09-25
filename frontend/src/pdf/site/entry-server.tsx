/**
 * Build-time renderer for pdf.testoza.com (used by scripts/prerender-pdf.mjs).
 * Pages are imported directly so the HTML contains their full content.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import LatexToPdfPage from '../pages/LatexToPdfPage';
import NotFoundPage from '../pages/NotFoundPage';
import PdfEditorPage from '../pages/PdfEditorPage';
import PdfToolsLanding from '../pages/PdfToolsLanding';
import App, { type PageComponents } from './App';

export { UPDATED } from './content';
export { PAGES, REDIRECTS, absoluteUrl } from './routes';
export { SITEMAP_PAGES, headHtml } from './seo';

const pages: PageComponents = {
    home: PdfToolsLanding,
    editor: () => <PdfEditorPage />,
    hindi: () => <PdfEditorPage variant="hindi" />,
    latex: () => <LatexToPdfPage />,
    chatgpt: () => <LatexToPdfPage variant="chatgpt" />,
    notFound: NotFoundPage,
};

export function render(url: string): string {
    return renderToString(
        <StaticRouter location={url} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App pages={pages} />
        </StaticRouter>,
    );
}
