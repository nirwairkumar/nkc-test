import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Lazy Load Pages
const TestList = lazy(() => import("./pages/TestList"));
const TestPage = lazy(() => import("./pages/TestPage"));
const TestIntroPage = lazy(() => import("./pages/TestIntroPage"));
const TestHistory = lazy(() => import("./pages/TestHistory"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const AuthForm = lazy(() => import("@/components/AuthForm"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ManageTests = lazy(() => import("./pages/ManageTests"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Layout = lazy(() => import("./Layout"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <TestProvider>
          <BrowserRouter>
            <Suspense fallback={
              <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<TestList />} />
                  <Route path="/login" element={<AuthForm />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/admin-migration" element={<AdminMigration />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/manage-tests" element={<ManageTests />} />
                  <Route path="/support" element={<SupportPage />} />


                  {/* Protected Routes */}
                  <Route
                    path="/test-intro/:id"
                    element={
                      <PrivateRoute>
                        <TestIntroPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/test/:id"
                    element={
                      <PrivateRoute>
                        <TestPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <PrivateRoute>
                        <TestHistory />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/results"
                    element={
                      <PrivateRoute>
                        <ResultsPage />
                      </PrivateRoute>
                    }
                  />
                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TestProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
