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

    if (isMainDomain) {
      // Marketing domain allowed paths
      const allowedMarketingPaths = [
        '/',
        '/about',
        '/privacy-policy',
        '/terms-and-conditions',
        '/support',
        '/user-guide',
        '/convert'
      ];

      // Check if current path matches allowed list or starts with an allowed list subpath (e.g. /user-guide/:slug)
      const isAllowed = allowedMarketingPaths.some(p => {
        if (p === '/') return location.pathname === '/';
        return location.pathname.startsWith(p);
      });

      if (!isAllowed) {
        console.log(`SubdomainGuard: Redirecting restricted path ${location.pathname} to app subdomain.`);
        window.location.replace(`https://app.testoza.com${location.pathname}${location.search}`);
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
