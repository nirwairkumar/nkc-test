import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import SplashLoader from '@/components/ui/SplashLoader';
import ErrorBoundary from '@/components/ErrorBoundary';

const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageRefreshed = JSON.parse(
      window.sessionStorage.getItem('admin_page_refreshed_for_chunk') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('admin_page_refreshed_for_chunk', 'false');
      return component.default ? component : { default: component };
    } catch (error) {
      if (!pageRefreshed) {
        window.sessionStorage.setItem('admin_page_refreshed_for_chunk', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const AdminLoginPanel = lazyWithRetry(() => import('./pages/AdminLoginPanel'));
const SolutionEditorPage = lazyWithRetry(() => import('./pages/SolutionEditorPage'));
const CreateTestPage = lazyWithRetry(() => import('./pages/CreateTestPage'));
const NewsPostEditor = lazyWithRetry(() => import('./pages/NewsPostEditor'));

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
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<SplashLoader text="Loading Admin Portal..." />}>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/login" element={<AdminLoginPanel />} />
                  <Route path="/solutions-editor/:testId" element={<SolutionEditorPage />} />
                  <Route path="/edit-test/:id" element={<CreateTestPage />} />
                  <Route path="/news/create" element={<NewsPostEditor />} />
                  <Route path="/news/edit/:id" element={<NewsPostEditor />} />
                  <Route path="/posts/create" element={<NewsPostEditor />} />
                  <Route path="/posts/edit/:id" element={<NewsPostEditor />} />
                  <Route path="/analytics" element={<Navigate to="/admin?tab=analytics" replace />} />
                  <Route path="/manage-tests" element={<Navigate to="/admin?tab=tests" replace />} />
                  <Route path="/create-test" element={<Navigate to="/admin?tab=builder" replace />} />
                  <Route path="/ai-importer" element={<Navigate to="/admin?tab=importer" replace />} />
                  <Route path="/materials" element={<Navigate to="/admin?tab=materials" replace />} />
                  <Route path="/news" element={<Navigate to="/admin?tab=posts" replace />} />
                  <Route path="/posts" element={<Navigate to="/admin?tab=posts" replace />} />
                  <Route path="/blog" element={<Navigate to="/admin?tab=posts" replace />} />
                  <Route path="/email-broadcast" element={<Navigate to="/admin?tab=email_broadcast" replace />} />
                  <Route path="/features" element={<Navigate to="/admin?tab=features" replace />} />
                  <Route path="/pricing" element={<Navigate to="/admin?tab=pricing" replace />} />
                  <Route path="/promos" element={<Navigate to="/admin?tab=promos" replace />} />
                  <Route path="/migration" element={<Navigate to="/admin?tab=migration" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </HelmetProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
