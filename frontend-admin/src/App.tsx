import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashLoader from '@/components/ui/SplashLoader';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLoginPanel = lazy(() => import('./pages/AdminLoginPanel'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HelmetProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<SplashLoader text="Loading Admin Portal..." />}>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/login" element={<AdminLoginPanel />} />
                <Route path="/analytics" element={<Navigate to="/admin?tab=analytics" replace />} />
                <Route path="/manage-tests" element={<Navigate to="/admin?tab=tests" replace />} />
                <Route path="/create-test" element={<Navigate to="/admin?tab=builder" replace />} />
                <Route path="/ai-importer" element={<Navigate to="/admin?tab=importer" replace />} />
                <Route path="/materials" element={<Navigate to="/admin?tab=materials" replace />} />
                <Route path="/news" element={<Navigate to="/admin?tab=posts" replace />} />
                <Route path="/features" element={<Navigate to="/admin?tab=features" replace />} />
                <Route path="/pricing" element={<Navigate to="/admin?tab=pricing" replace />} />
                <Route path="/promos" element={<Navigate to="/admin?tab=promos" replace />} />
                <Route path="/migration" element={<Navigate to="/admin?tab=migration" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </HelmetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
