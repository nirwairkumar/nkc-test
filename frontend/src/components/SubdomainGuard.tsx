import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { mainDomainRedirect } from '@/utils/subdomain';
import { analytics } from '@/lib/analytics/tracker';

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
      // OAuth responses and every non-marketing path continue on the app subdomain.
      const target = mainDomainRedirect({ pathname: location.pathname, search: window.location.search, hash: window.location.hash });
      if (target) {
        console.log(`SubdomainGuard: Redirecting ${location.pathname} to app subdomain.`);
        analytics.handoff(); // the visit's referrer continues to app.testoza.com
        window.location.replace(target);
      }
    } else if (isAppDomain) {
      // App subdomain root: signed-in users go to dashboard (it routes by role);
      // logged-out visitors (e.g. guests leaving an exam) go to the public test library
      if (location.pathname === '/') {
        if (!loading) {
          navigate(user ? '/dashboard' : '/explore', { replace: true });
        }
      }
    }
  }, [location.pathname, location.search, navigate, user, loading]);

  return null;
}
