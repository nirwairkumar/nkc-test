/**
 * Subdomain routing utility
 */

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

// Paths testoza.com serves itself (an entry or any of its sub-paths); every other
// path lives on app.testoza.com. Matching on "p/" keeps '/pdf' from also admitting '/pdf-to-quiz'.
const MARKETING_PATHS = [
  '/',
  '/about',
  '/blog',
  '/news',
  '/privacy-policy',
  '/terms-and-conditions',
  '/support',
  '/user-guide',
  '/convert',
  '/pdf',
  '/quiz-creator',
  '/assessment-platform'
];

/**
 * Where testoza.com sends this URL instead of rendering it, or null when it stays.
 * Shared by SubdomainGuard (which redirects) and page-view tracking (which must
 * not count the hop — the page is counted once, on app.testoza.com).
 */
export const mainDomainRedirect = (loc: { pathname: string; search: string; hash: string }): string | null => {
  const hostname = window.location.hostname;
  if (hostname !== 'testoza.com' && hostname !== 'www.testoza.com') return null;

  // OAuth responses (hash token or code/error query) always finish on the app subdomain.
  const hasAuthHash = loc.hash.includes('access_token') || loc.hash.includes('error');
  const hasAuthCode = loc.search.includes('code=') || loc.search.includes('error=');
  if (hasAuthHash || hasAuthCode || loc.pathname.startsWith('/auth/callback')) {
    return `https://app.testoza.com/auth/callback${loc.search}${loc.hash}`;
  }

  const isAllowed = MARKETING_PATHS.some(p =>
    p === '/' ? loc.pathname === '/' : loc.pathname === p || loc.pathname.startsWith(p + '/'));
  return isAllowed ? null : `https://app.testoza.com${loc.pathname}${loc.search}${loc.hash}`;
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
