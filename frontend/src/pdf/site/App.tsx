/**
 * The pdf.testoza.com app shell: routes, footer, toasts and head tags. Page
 * components are passed in, so the pre-renderer can use plain imports while
 * the browser loads each page's code on demand.
 */
import { useEffect, type ComponentType } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import PannaFooter from '../ui/PannaFooter';
import { PAGES, pageFor, type PageKey } from './routes';
import { applyHead } from './seo';
import { analytics } from '@/lib/analytics/tracker';

export type PageComponents = Record<PageKey, ComponentType>;

export default function App({ pages, onIntent }: { pages: PageComponents; onIntent?: (key: PageKey) => void }) {
    const { pathname, search, hash } = useLocation();
    const page = pageFor(pathname);

    useEffect(() => {
        applyHead(page);
    }, [page]);

    // One page view per path (our analytics + GA4); the host tells the sites apart.
    useEffect(() => {
        analytics.page();

        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'page_view', {
                page_path: page.path + (search || ''),
                page_title: page.title,
                page_location: window.location.href,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    useEffect(() => {
        if (!hash) window.scrollTo(0, 0);
    }, [pathname, hash]);

    // Load a page's code as soon as someone shows intent to open it (hover, focus, touch).
    useEffect(() => {
        if (!onIntent) return;
        const onEvent = (e: Event) => {
            const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!a || a.origin !== window.location.origin) return;
            const target = pageFor(a.pathname);
            if (target.key !== 'notFound') onIntent(target.key);
        };
        document.addEventListener('pointerover', onEvent, { passive: true });
        document.addEventListener('focusin', onEvent);
        document.addEventListener('touchstart', onEvent, { passive: true });
        return () => {
            document.removeEventListener('pointerover', onEvent);
            document.removeEventListener('focusin', onEvent);
            document.removeEventListener('touchstart', onEvent);
        };
    }, [onIntent]);

    return (
        <>
            <Routes>
                {PAGES.filter((p) => p.key !== 'notFound').map((p) => {
                    const Page = pages[p.key];
                    return <Route key={p.key} path={p.path} element={<Page />} />;
                })}
                <Route path="*" element={<NotFound pages={pages} />} />
            </Routes>
            <PannaFooter />
            {/* Room for the fixed download bar of the converter pages on phones. */}
            {(page.key === 'latex' || page.key === 'chatgpt') && <div aria-hidden="true" className="h-[72px] bg-slate-950 lg:hidden" />}
            <Toaster theme="light" richColors closeButton position="top-center" />
        </>
    );
}

function NotFound({ pages }: { pages: PageComponents }) {
    const Page = pages.notFound;
    return <Page />;
}
