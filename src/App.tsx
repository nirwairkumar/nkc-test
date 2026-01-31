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

import { Analytics } from "@vercel/analytics/react";
import AITestImporter from "./pages/AITestImporter";

// Lazy Load Pages
import { HelmetProvider } from 'react-helmet-async';

const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const TestList = lazy(() => import("./pages/TestList"));
const TestPage = lazy(() => import("./pages/TestPage"));
const TestIntroPage = lazy(() => import("./pages/TestIntroPage"));
const TestHistory = lazy(() => import("./pages/TestHistory"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const AuthForm = lazy(() => import("@/components/AuthForm"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const AdminPromoCodes = lazy(() => import("./pages/AdminPromoCodes"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const ManageTests = lazy(() => import("./pages/ManageTests"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const UserTestManager = lazy(() => import("./pages/UserTestManager"));
const MaterialsManager = lazy(() => import("./pages/MaterialsManager"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreateTestPage = lazy(() => import("./pages/CreateTestPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CreatorProfilePage = lazy(() => import("./pages/CreatorProfilePage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TestSubmissionSuccess = lazy(() => import("./pages/TestSubmissionSuccess"));


const Layout = lazy(() => import("./Layout"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <HelmetProvider>
          <Toaster />
          <Sonner />
          <Analytics />
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
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/admin-migration" element={<AdminMigration />} />
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/admin-pricing" element={<AdminPricing />} />
                    <Route path="/admin-promo-codes" element={<AdminPromoCodes />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
                    <Route path="/manage-tests" element={<ManageTests />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/create-test" element={<CreateTestPage />} />
                    <Route path="/edit-test/:id" element={<CreateTestPage />} />
                    <Route path="/creator/:id" element={<CreatorProfilePage />} />
                    <Route path="/ai-import" element={<AITestImporter onImport={(data) => console.log(data)} />} />

                    {/* Legal Routes */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                    <Route path="/about" element={<AboutPage />} />


                    {/* Protected Routes */}

                    <Route
                      path="/my-tests"
                      element={
                        <PrivateRoute>
                          <UserTestManager />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/materials"
                      element={
                        <PrivateRoute>
                          <MaterialsManager />
                        </PrivateRoute>
                      }
                    />

                    {/* SEO & Test Routes */}
                    <Route
                      path="/test-intro/:id"
                      element={
                        <PrivateRoute>
                          <TestIntroPage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/test/:slug"
                      element={
                        <PrivateRoute>
                          <TestIntroPage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/tests/:category"
                      element={
                        <CategoryPage />
                      }
                    />

                    {/* Live Test Taking Page */}
                    <Route
                      path="/live/:id"
                      element={
                        <PrivateRoute>
                          <TestPage />
                        </PrivateRoute>
                      }
                    />
                    {/* Legacy/Compat: Redirect /test/:id to /live/:id if it's a UUID, but we can't easily differentiate in routing config alone without regex.
                        Since we claimed /test/:slug, if a UUID is passed, it might match :slug. 
                        We will handle this in TestIntroPage if we route /test/:slug (slug can be ID).
                        But TestPage needs to be distinct. 
                        We routed TestPage to /live/:id. Existing links to /test/:id will fail or start IntroPage?
                        If IntroPage gets a UUID as 'slug', it should redirect to slug or load test.
                        If the user meant to go to LIVE test, they might be confused. 
                        But standard flow is Intro -> Live. Direct access to Live is rare except refresh.
                     */}

                    <Route
                      path="/history"
                      element={
                        <PrivateRoute>
                          <TestHistory />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/test-submitted"
                      element={
                        <PrivateRoute>
                          <TestSubmissionSuccess />
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
                    <Route
                      path="/profile"
                      element={
                        <PrivateRoute>
                          <ProfilePage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <PrivateRoute>
                          <SettingsPage />
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
        </HelmetProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
