/**
 * Subdomain routing utility
 */
import { APP_ORIGIN, isAuthReturn, isMarketingPath } from '@/utils/marketingPaths';

export const getAppUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const isMainDomain = hostname === 'testoza.com' || hostname === 'www.testoza.com';
  
  if (isMainDomain) {
    // Return absolute path on the app subdomain
    return `https://app.testoza.com${path.startsWith('/') ? path : '/' + path}`;
  }
  
  // Return relative path for local development and staging
  return path.startsWith('/') ? path : '/' + path;
};

/**
 * Where testoza.com sends this URL instead of rendering it, or null when it stays.
 * Shared by SubdomainGuard (which redirects) and page-view tracking (which must
 * not count the hop — the page is counted once, on app.testoza.com).
 *
 * The Cloudflare worker already answers these URLs with an HTTP 301 (same rule,
 * utils/marketingPaths.ts), so this only fires for in-app navigation and for
 * OAuth hash tokens, which never reach the server.
 */
export const mainDomainRedirect = (loc: { pathname: string; search: string; hash: string }): string | null => {
  const hostname = window.location.hostname;
  if (hostname !== 'testoza.com' && hostname !== 'www.testoza.com') return null;

  // OAuth responses (hash token or code/error query) always finish on the app subdomain.
  const hasAuthHash = loc.hash.includes('access_token') || loc.hash.includes('error');
  if (hasAuthHash || isAuthReturn(loc.search) || loc.pathname.startsWith('/auth/callback')) {
    return `${APP_ORIGIN}/auth/callback${loc.search}${loc.hash}`;
  }

  return isMarketingPath(loc.pathname) ? null : `${APP_ORIGIN}${loc.pathname}${loc.search}${loc.hash}`;
};

export const getMarketingUrl = (path: string): string => {
  const hostname = window.location.hostname;
  const isAppDomain = hostname === 'app.testoza.com';
  
  if (isAppDomain) {
    // Return absolute path on the marketing domain
    return `https://testoza.com${path.startsWith('/') ? path : '/' + path}`;
  }
  
  // Return relative path for local development and staging
  return path.startsWith('/') ? path : '/' + path;
};
