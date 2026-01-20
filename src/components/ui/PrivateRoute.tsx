// src/components/PrivateRoute.tsx
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return children;
}
