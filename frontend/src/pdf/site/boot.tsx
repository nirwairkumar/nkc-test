/**
 * Starts the pdf.testoza.com app. Pre-rendered pages are hydrated (the current
 * page's code is loaded first so the first render matches the HTML); in dev,
 * or if the HTML is empty, the app is rendered from scratch.
 */
import { StrictMode, useEffect, useState, type ComponentType } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App, { type PageComponents } from './App';
import { pageFor, type PageKey } from './routes';

type Loadable = ComponentType & { preload: () => Promise<unknown> };

/** A page whose code loads on demand, but renders synchronously once loaded (needed for hydration). */
function loadable(load: () => Promise<ComponentType>): Loadable {
    let Loaded: ComponentType | null = null;
    let pending: Promise<unknown> | null = null;
    const preload = () => (pending ??= load().then((C) => (Loaded = C)));
    function Page() {
        const [C, setC] = useState<ComponentType | null>(() => Loaded);
        useEffect(() => {
            if (!C) void preload().then(() => setC(() => Loaded));
        }, [C]);
        return C ? <C /> : <div className="min-h-screen bg-white" aria-busy="true" />;
    }
    return Object.assign(Page, { preload });
}

const pages: Record<PageKey, Loadable> = {
    home: loadable(() => import('../pages/PdfToolsLanding').then((m) => m.default)),
    editor: loadable(() => import('../pages/PdfEditorPage').then((m) => () => <m.default />)),
    hindi: loadable(() => import('../pages/PdfEditorPage').then((m) => () => <m.default variant="hindi" />)),
    latex: loadable(() => import('../pages/LatexToPdfPage').then((m) => () => <m.default />)),
    chatgpt: loadable(() => import('../pages/LatexToPdfPage').then((m) => () => <m.default variant="chatgpt" />)),
    notFound: loadable(() => import('../pages/NotFoundPage').then((m) => m.default)),
};

export async function boot() {
    const app = (
        <StrictMode>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <App pages={pages as PageComponents} onIntent={(key) => void pages[key].preload()} />
            </BrowserRouter>
        </StrictMode>
    );
    const root = document.getElementById('root')!;
    if (root.firstElementChild) {
        await pages[pageFor(window.location.pathname).key].preload();
        hydrateRoot(root, app);
    } else {
        createRoot(root).render(app);
    }
}
