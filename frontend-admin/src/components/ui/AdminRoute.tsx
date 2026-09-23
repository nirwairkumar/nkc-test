/**
 * Route guard for admin-only pages.
 *
 * PrivateRoute only checks that SOMEONE is logged in. This additionally
 * requires `isAdmin`, which AuthContext derives from GET /users/check-admin.
 *
 * This is a UX gate, not a security boundary — the real boundary is
 * `verify_is_admin` on every privileged backend route (see
 * SECURITY_THREAT_MODEL_AND_PLAN.md, C5 and L2). Used here for preview
 * surfaces that should not be reachable by non-admins.
 */

import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import SplashLoader from './SplashLoader';

export default function AdminRoute({ children }: { children: JSX.Element }) {
    const { user, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) return <SplashLoader text="Checking permissions..." />;
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    if (!isAdmin) return <Navigate to="/" replace />;

    return children;
}
