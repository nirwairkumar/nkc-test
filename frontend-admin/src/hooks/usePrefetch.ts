import React, { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * usePrefetchRoutes - Hook to prefetch routes on hover/touch
 * Improves perceived performance by loading route chunks before navigation
 */
export function usePrefetchRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefetchRoute = useCallback((path: string) => {
    // Don't prefetch if already on this route
    if (location.pathname === path) return;

    // Use React Router's prefetch mechanism
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);

    // Cleanup after a delay
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 5000);
  }, [location.pathname]);

  return { prefetchRoute };
}

/**
 * PrefetchLink - Wrapper component that prefetches routes on hover
 */
interface PrefetchLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

export function PrefetchLink({ to, children, className }: PrefetchLinkProps) {
  const { prefetchRoute } = usePrefetchRoutes();

  return React.createElement(
    'a',
    {
      href: to,
      className,
      onMouseEnter: () => prefetchRoute(to),
      onTouchStart: () => prefetchRoute(to),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        window.location.href = to;
      },
    },
    children
  );
}

/**
 * usePageVisibility - Hook to pause expensive operations when tab is not visible
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}