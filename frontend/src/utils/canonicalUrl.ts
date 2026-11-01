import { APP_ORIGIN, publicUrl } from '@/utils/marketingPaths';

/**
 * The canonical absolute URL for a path — the same link whichever host the teacher is
 * standing on. Its own tiny module so the dashboard can use it without pulling in
 * shareUtils (and html2canvas with it).
 *
 * Links used to be built from `window.location.origin`, so one paper had two
 * addresses — testoza.com/test/x and app.testoza.com/test/x — and the teacher watched
 * the domain change under them between the card and the share sheet.
 */
export const shareLink = (path: string): string => {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (typeof window === 'undefined') return `${APP_ORIGIN}${p}`;
    // Production: marketingPaths decides which host owns the path, so the crawler meta,
    // the canonical tag and the link we hand the teacher all agree.
    if (/(^|\.)testoza\.com$/.test(window.location.hostname)) return publicUrl(p);
    return `${window.location.origin}${p}`;
};
