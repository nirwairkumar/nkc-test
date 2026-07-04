import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function SubdomainGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Detect search engines and ad bots to avoid triggering cloaking/redirect policies (Circumventing Systems)
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|google|googlebot|adsbot|mediapartners|slurp|duckduckbot|yandex|baidu|bing|sogou|exabot|ia_archiver|crawler|spider|robot|crawling|lighthouse|pagespeed/i.test(ua);
    
    if (isBot) {
      console.log('SubdomainGuard: Bot user-agent detected, skipping client-side redirect.');
      return;
    }

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
        '/convert',
        '/quiz-creator',
        '/assessment-platform'
      ];

      // Check if current path matches allowed list or starts with an allowed list subpath (e.g. /user-guide/:slug)
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
