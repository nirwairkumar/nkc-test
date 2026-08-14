import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function SubdomainGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'testoza.com' || hostname === 'www.testoza.com';
    const isAppDomain = hostname === 'app.testoza.com';
    const isBlogDomain = hostname === 'blog.testoza.com' || hostname === 'news.testoza.com';

    if (isBlogDomain) {
      // If someone accesses blog subdomain at / or /:slug, allow freely without redirecting to app domain
      return;
    }

    if (isMainDomain) {
      // 1. If OAuth response (hash with access_token or query param code/error) lands on main domain, forward to app subdomain immediately
      const hasAuthHash = window.location.hash.includes('access_token') || window.location.hash.includes('error');
      const hasAuthCode = window.location.search.includes('code=') || window.location.search.includes('error=');
      const isCallbackPath = location.pathname.startsWith('/auth/callback');

      if (hasAuthHash || hasAuthCode || isCallbackPath) {
        console.log("SubdomainGuard: Forwarding OAuth response from marketing domain to app subdomain...");
        window.location.replace(`https://app.testoza.com/auth/callback${location.search}${location.hash}`);
        return;
      }

      // Marketing domain allowed paths
      const allowedMarketingPaths = [
        '/',
        '/about',
        '/blog',
        '/news',
        '/privacy-policy',
        '/terms-and-conditions',
        '/support',
        '/user-guide',
        '/convert',
        '/quiz-creator',
        '/assessment-platform'
      ];

      // Check if current path matches allowed list or starts with an allowed list subpath (e.g. /user-guide/:slug, /blog/:slug)
      const isAllowed = allowedMarketingPaths.some(p => {
        if (p === '/') return location.pathname === '/';
        return location.pathname.startsWith(p);
      });

      if (!isAllowed) {
        console.log(`SubdomainGuard: Redirecting restricted path ${location.pathname} to app subdomain.`);
        window.location.replace(`https://app.testoza.com${location.pathname}${location.search}${location.hash}`);
      }
    } else if (isAppDomain) {
      // App subdomain root page should go to dashboard or login
      if (location.pathname === '/') {
        if (!loading) {
          if (user) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }
      }
    }
  }, [location.pathname, location.search, navigate, user, loading]);

  return null;
}
