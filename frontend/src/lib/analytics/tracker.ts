/**
 * TestoZa analytics v2 — first-party page views, real engaged time and a few
 * product events, sent to our own backend (POST /api/analytics/collect).
 * Design: documentation/2026-09-26-analytics-v2.md
 *
 * Identity is a random id in a first-party cookie shared by *.testoza.com
 * (tz_vid, ~13 months) — never a device fingerprint. A visit (tz_sid) ends
 * after 30 minutes without activity and is shared by all tabs and subdomains.
 *
 * Not tracked: localhost / previews, browsers sending Global Privacy Control,
 * obvious bots. `?tz_internal=1` marks a device as internal traffic (`=0` undoes it).
 */
import { getApiUrl } from '@/lib/getApiUrl';

type Json = string | number | boolean | null;
type EventProps = Record<string, Json>;

type PageviewEv = { t: 'pageview'; id: string; path: string };
type EngagementEv = { t: 'engagement'; id: string; ms: number; scroll?: number; title?: string };
type CustomEv = { t: 'event'; name: string; props?: EventProps; pvid?: string; path: string };
type IdentifyEv = { t: 'identify' };
type Ev = PageviewEv | EngagementEv | CustomEv | IdentifyEv;

interface CurrentPage {
    id: string;
    sid: string;
    path: string;
    title?: string;
    engagedMs: number;
    sentMs: number;
    activeSince: number | null; // null while the tab is hidden
    lastInteraction: number;
    maxScroll: number;
}

const VISITOR_COOKIE = 'tz_vid';
const SESSION_COOKIE = 'tz_sid';
const INTERNAL_COOKIE = 'tz_internal';
const HANDOFF_COOKIE = 'tz_ref'; // the real referrer, carried across a testoza.com → app.testoza.com hop
const VISITOR_MAX_AGE = 395 * 24 * 3600; // ≈ 13 months
const SESSION_MS = 30 * 60 * 1000;
const IDLE_MS = 10 * 60 * 1000; // stop counting time after 10 min without any input
const HEARTBEAT_MS = 60 * 1000;
const TITLE_DELAY_MS = 1200; // pages set their <title> after rendering
const PAID_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid', 'msclkid'];
const BOT_UA = /bot|crawler|spider|crawling|lighthouse|pagespeed|headless|prerender/i;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function uuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cookieDomain(): string {
    const host = window.location.hostname;
    return host === 'testoza.com' || host.endsWith('.testoza.com') ? '; domain=.testoza.com' : '';
}

function readCookie(name: string): string | null {
    try {
        const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
        return m ? decodeURIComponent(m[1]) : null;
    } catch {
        return null;
    }
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}${cookieDomain()}`;
    } catch {
        /* cookies blocked */
    }
}

function readLocal(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeLocal(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* storage blocked */
    }
}

function normalizePath(path: string): string {
    const p = (path || '/').split('?')[0].split('#')[0] || '/';
    return p.length > 1 ? p.replace(/\/+$/, '') || '/' : p;
}

function scrollPercent(): number {
    const doc = document.documentElement;
    const total = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
    if (!total) return 0;
    const seen = window.scrollY + window.innerHeight;
    return Math.max(0, Math.min(100, Math.round((seen / total) * 100)));
}

function isOwnUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        const host = new URL(url).hostname;
        return host === 'testoza.com' || host.endsWith('.testoza.com');
    } catch {
        return false;
    }
}

function trackingAllowed(): boolean {
    if (!isBrowser) return false;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local') || host.endsWith('.pages.dev')) {
        return false;
    }
    if (host.startsWith('admin.')) return false;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl === true) return false;
    if (BOT_UA.test(nav.userAgent || '')) return false;
    return true;
}

class Tracker {
    private readonly enabled: boolean;
    private readonly endpoint: string;
    private readonly vid: string;
    private readonly internal: boolean;
    /** Referrer + campaign of this page load; sent until the first page view goes out. */
    private landing: { referrer?: string; utm?: Record<string, string>; paid?: boolean } | null;
    private uid: string | null = null;
    private current: CurrentPage | null = null;
    private titleTimer: ReturnType<typeof setTimeout> | null = null;
    private scrollQueued = false;

    constructor() {
        this.enabled = trackingAllowed();
        this.endpoint = '';
        this.vid = '';
        this.internal = false;
        this.landing = null;
        if (!this.enabled) return;

        const base = getApiUrl();
        this.endpoint = `${base.endsWith('/api') ? base : `${base}/api`}/analytics/collect`;

        const params = new URLSearchParams(window.location.search);
        const internalParam = params.get('tz_internal');
        if (internalParam === '1') writeCookie(INTERNAL_COOKIE, '1', VISITOR_MAX_AGE);
        if (internalParam === '0') writeCookie(INTERNAL_COOKIE, '', 0);
        this.internal = internalParam === '1' || (internalParam !== '0' && readCookie(INTERNAL_COOKIE) === '1');

        this.vid = this.loadVisitorId();

        const utm: Record<string, string> = {};
        for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
            const v = params.get(`utm_${key}`);
            if (v) utm[key] = v.slice(0, 150);
        }
        // Arriving from our own redirect hop: the visitor's real referrer was saved there.
        let referrer = document.referrer || undefined;
        const handedOff = readCookie(HANDOFF_COOKIE);
        if (handedOff !== null) {
            writeCookie(HANDOFF_COOKIE, '', 0);
            if (isOwnUrl(referrer)) referrer = handedOff || undefined;
        }
        this.landing = {
            referrer,
            utm: Object.keys(utm).length ? utm : undefined,
            paid: PAID_CLICK_PARAMS.some((p) => params.has(p)) || undefined,
        };

        this.listen();
    }

    // ── public API ───────────────────────────────────────────────────────────
    /** Record a page view for the current URL. Repeated calls for the same path are ignored. */
    page() {
        if (!this.enabled) return;
        const path = normalizePath(window.location.pathname);
        if (this.current && this.current.path === path) return;

        const now = Date.now();
        const sid = this.session(now);
        const batch: Ev[] = [];
        const previous = this.current;
        if (previous) {
            this.accrue(previous, now);
            const done = this.engagementEvent(previous, true);
            // Same visit: one request carries both. Otherwise the ping goes to its own visit.
            if (done && previous.sid === sid) batch.push(done);
            else if (done) this.send(previous.sid, [done]);
        }

        const page: CurrentPage = {
            id: uuid(),
            sid,
            path,
            engagedMs: 0,
            sentMs: 0,
            activeSince: document.visibilityState === 'visible' ? now : null,
            lastInteraction: now,
            maxScroll: 0,
        };
        this.current = page;
        batch.push({ t: 'pageview', id: page.id, path });
        this.send(sid, batch);

        if (this.titleTimer) clearTimeout(this.titleTimer);
        this.titleTimer = setTimeout(() => {
            if (this.current !== page) return;
            page.title = document.title.slice(0, 300);
            page.maxScroll = Math.max(page.maxScroll, scrollPercent()); // short pages never scroll
        }, TITLE_DELAY_MS);
    }

    /**
     * This page is about to redirect to another TestoZa site (see SubdomainGuard):
     * record nothing here, but pass the visit's referrer to the page that follows.
     */
    handoff() {
        if (!this.enabled || !this.landing || this.current) return;
        const ref = this.landing.referrer;
        writeCookie(HANDOFF_COOKIE, ref && !isOwnUrl(ref) ? ref.slice(0, 500) : '', 120);
    }

    /** Link this browser to a signed-in account (null on sign-out). */
    identify(userId: string | null | undefined) {
        if (!this.enabled) return;
        const next = userId && UUID_RE.test(userId) ? userId : null;
        if (next === this.uid) return;
        this.uid = next;
        if (next && this.current) this.send(this.session(Date.now()), [{ t: 'identify' }]);
    }

    /** A product event, e.g. track('pdf_export', { tool: 'edit-pdf' }). */
    track(name: string, props?: EventProps) {
        if (!this.enabled || !/^[a-z][a-z0-9_]{1,39}$/.test(name)) return;
        const now = Date.now();
        const sid = this.session(now);
        if (this.current) this.current.lastInteraction = now;
        this.send(sid, [{ t: 'event', name, props, pvid: this.current?.id, path: normalizePath(window.location.pathname) }]);
    }

    // ── internals ────────────────────────────────────────────────────────────
    private loadVisitorId(): string {
        const fromCookie = readCookie(VISITOR_COOKIE);
        const fromLocal = readLocal(VISITOR_COOKIE);
        const id = [fromCookie, fromLocal].find((v) => v && UUID_RE.test(v)) || uuid();
        // Re-writing extends the cookie's life on every visit (rolling 13 months).
        writeCookie(VISITOR_COOKIE, id, VISITOR_MAX_AGE);
        writeLocal(VISITOR_COOKIE, id);
        return id;
    }

    /** Current visit id; starts a new visit after 30 minutes of inactivity. */
    private session(now: number): string {
        const raw = readCookie(SESSION_COOKIE) || readLocal(SESSION_COOKIE) || '';
        const [id, last] = raw.split('.');
        const alive = id && UUID_RE.test(id) && now - Number(last) < SESSION_MS;
        const sid = alive ? id : uuid();
        const value = `${sid}.${now}`;
        writeCookie(SESSION_COOKIE, value, SESSION_MS / 1000);
        writeLocal(SESSION_COOKIE, value);
        return sid;
    }

    /** Add active time since the last checkpoint, ignoring time after 10 idle minutes. */
    private accrue(page: CurrentPage, now: number) {
        if (page.activeSince === null) return;
        const end = Math.min(now, page.lastInteraction + IDLE_MS);
        if (end > page.activeSince) page.engagedMs += end - page.activeSince;
        page.activeSince = now;
    }

    /** The running total for a page, or null when nothing new happened since the last ping. */
    private engagementEvent(page: CurrentPage, force = false): EngagementEv | null {
        const ms = Math.round(page.engagedMs);
        if (!force && ms <= page.sentMs) return null;
        if (ms <= 0 && page.maxScroll === 0 && !page.title) return null;
        page.sentMs = ms;
        return { t: 'engagement', id: page.id, ms, scroll: page.maxScroll || undefined, title: page.title };
    }

    private flushEngagement(page: CurrentPage, force = false) {
        const ev = this.engagementEvent(page, force);
        // Always to the page's own visit: a ping must never start or extend another one.
        if (ev) this.send(page.sid, [ev]);
    }

    private onInteraction = () => {
        const page = this.current;
        if (!page) return;
        const now = Date.now();
        this.accrue(page, now);
        page.lastInteraction = now;
        if (page.activeSince === null && document.visibilityState === 'visible') page.activeSince = now;
    };

    private onScroll = () => {
        if (this.scrollQueued) return;
        this.scrollQueued = true;
        requestAnimationFrame(() => {
            this.scrollQueued = false;
            if (this.current) this.current.maxScroll = Math.max(this.current.maxScroll, scrollPercent());
        });
        this.onInteraction();
    };

    private onVisibility = () => {
        const page = this.current;
        if (!page) return;
        const now = Date.now();
        if (document.visibilityState === 'hidden') {
            this.accrue(page, now);
            page.activeSince = null;
            if (!page.title) page.title = document.title.slice(0, 300);
            this.flushEngagement(page);
        } else {
            page.activeSince = now;
            page.lastInteraction = now;
        }
    };

    private onPageHide = () => {
        const page = this.current;
        if (!page) return;
        this.accrue(page, Date.now());
        page.activeSince = null;
        if (!page.title) page.title = document.title.slice(0, 300);
        this.flushEngagement(page);
    };

    private heartbeat = () => {
        const page = this.current;
        if (!page || document.visibilityState !== 'visible') return;
        const now = Date.now();
        if (now - page.lastInteraction > IDLE_MS) return;
        this.accrue(page, now);
        const sid = this.session(now); // keeps the visit alive while someone is actively reading
        if (sid !== page.sid) {
            // They came back after 30+ idle minutes: close the old visit and open a new
            // one on the same page, so the new visit has a landing page.
            this.flushEngagement(page, true);
            this.current = null;
            this.page();
            return;
        }
        this.flushEngagement(page);
    };

    private listen() {
        const opts: AddEventListenerOptions = { passive: true, capture: true };
        for (const type of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
            window.addEventListener(type, this.onInteraction, opts);
        }
        let lastMove = 0;
        window.addEventListener('mousemove', () => {
            const now = Date.now();
            if (now - lastMove > 5000) {
                lastMove = now;
                this.onInteraction();
            }
        }, opts);
        window.addEventListener('scroll', this.onScroll, opts);
        document.addEventListener('visibilitychange', this.onVisibility);
        window.addEventListener('pagehide', this.onPageHide);
        window.setInterval(this.heartbeat, HEARTBEAT_MS);
    }

    private send(sid: string, events: Ev[]) {
        const nav = navigator as Navigator & { webdriver?: boolean };
        const payload: Record<string, unknown> = {
            v: 2,
            vid: this.vid,
            sid,
            uid: this.uid,
            host: window.location.hostname,
            path: normalizePath(window.location.pathname),
            sw: window.screen?.width,
            sh: window.screen?.height,
            lang: (navigator.language || '').slice(0, 35) || undefined,
            tz: (() => {
                try {
                    return Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch {
                    return undefined;
                }
            })(),
            webdriver: nav.webdriver === true || undefined,
            internal: this.internal || undefined,
            events,
        };
        if (this.landing && events.some((e) => e.t === 'pageview')) {
            Object.assign(payload, this.landing);
            this.landing = null;
        }
        const body = JSON.stringify(payload);
        try {
            // text/plain is CORS-safelisted, so the beacon needs no preflight.
            if (navigator.sendBeacon && navigator.sendBeacon(this.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) {
                return;
            }
        } catch {
            /* fall through */
        }
        fetch(this.endpoint, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            keepalive: true,
            credentials: 'omit',
        }).catch(() => {
            /* analytics must never surface errors */
        });
    }
}

let instance: Tracker | null = null;

function tracker(): Tracker {
    if (!instance) instance = new Tracker();
    return instance;
}

export const analytics = {
    page: () => {
        if (isBrowser) tracker().page();
    },
    handoff: () => {
        if (isBrowser) tracker().handoff();
    },
    identify: (userId: string | null | undefined) => {
        if (isBrowser) tracker().identify(userId);
    },
    track: (name: string, props?: EventProps) => {
        if (isBrowser) tracker().track(name, props);
    },
};
