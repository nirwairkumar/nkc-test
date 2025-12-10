import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";

// Pages
import TestList from "./pages/TestList";
import TestPage from "./pages/TestPage";
import TestHistory from "./pages/TestHistory";
import ResultsPage from "./pages/ResultsPage";
import AuthForm from "@/components/AuthForm";
import UpdatePassword from "./pages/UpdatePassword";

import AdminMigration from "./pages/AdminMigration";
import AdminLogin from "./pages/AdminLogin";
import ManageTests from "./pages/ManageTests";

import NotFound from "./pages/NotFound";
import Layout from "./Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <TestProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<TestList />} />
                <Route path="/login" element={<AuthForm />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/admin-migration" element={<AdminMigration />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/manage-tests" element={<ManageTests />} />


                {/* Protected Routes */}
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
          </BrowserRouter>
        </TestProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
