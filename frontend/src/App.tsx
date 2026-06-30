import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import SubdomainGuard from "@/components/SubdomainGuard";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const Layout = lazy(() => import("./Layout"));
// Lazy Load Pages
import { HelmetProvider } from 'react-helmet-async';

const AITestImporter = lazy(() => import("./pages/AITestImporter"));

const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const TestList = lazy(() => import("./pages/TestList"));
const TestPage = lazy(() => import("./pages/TestPage"));
const TestIntroPage = lazy(() => import("./pages/TestIntroPage"));
const TestHistory = lazy(() => import("./pages/TestHistory"));
const ResultsLayout = lazy(() => import("./components/layout/ResultsLayout"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const SolutionEditorPage = lazy(() => import("./pages/SolutionEditorPage"));
const SolutionsViewPage = lazy(() => import("./pages/SolutionsViewPage"));
const FeedbackViewPage = lazy(() => import("./pages/FeedbackViewPage"));
const AuthForm = lazy(() => import("@/components/AuthForm"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthError = lazy(() => import("./pages/AuthError"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const AdminPromoCodes = lazy(() => import("./pages/AdminPromoCodes"));
const AdminFeatureControl = lazy(() => import("./pages/AdminFeatureControl"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const ManageTests = lazy(() => import("./pages/ManageTests"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const UserTestManager = lazy(() => import("./pages/UserTestManager"));
const MaterialsManager = lazy(() => import("./pages/MaterialsManager"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const UserGuidePage = lazy(() => import("./pages/UserGuidePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreateTestPage = lazy(() => import("./pages/CreateTestPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CreatorProfilePage = lazy(() => import("./pages/CreatorProfilePage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TestSubmissionSuccess = lazy(() => import("./pages/TestSubmissionSuccess"));
const AdvancedAnalysis = lazy(() => import("./pages/AdvancedAnalysis"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const CombinedIntroPage = lazy(() => import("./pages/CombinedIntroPage"));
const CombinedBreakScreen = lazy(() => import("./pages/CombinedBreakScreen"));
const MoreTestsPage = lazy(() => import("./pages/MoreTestsPage"));
const ConvertPage = lazy(() => import("./pages/ConvertPage"));

// News & Posts
const NewsFeed = lazy(() => import("./pages/NewsFeed"));
const NewsPostView = lazy(() => import("./pages/NewsPostView"));
const NewsPostEditor = lazy(() => import("./pages/NewsPostEditor"));
const MyPosts = lazy(() => import("./pages/MyPosts"));



const queryClient = new QueryClient();

const AIImportRoute = () => {
  const navigate = useNavigate();
  return <AITestImporter onImport={(data) => navigate('/create-test', { state: { importedData: data } })} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <HelmetProvider>
          <Toaster />
          <Sonner />
          <TestProvider>
            <BrowserRouter>
              <SubdomainGuard />
              <Suspense fallback={
                <div className="flex h-screen w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/dashboard" element={<TestList />} />
                    <Route path="/more-tests" element={<MoreTestsPage />} />

                    {/* News & Posts Routes */}
                    <Route path="/news" element={<NewsFeed />} />
                    <Route path="/news/:slug" element={<NewsPostView />} />
                    <Route path="/news/create" element={
                      <PrivateRoute>
                        <NewsPostEditor />
                      </PrivateRoute>
                    } />
                    <Route path="/news/edit/:id" element={
                      <PrivateRoute>
                        <NewsPostEditor />
                      </PrivateRoute>
                    } />
                    <Route path="/my-posts" element={
                      <PrivateRoute>
                        <MyPosts />
                      </PrivateRoute>
                    } />

                    <Route path="/login" element={<AuthForm />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth-error" element={<AuthError />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/admin-migration" element={<AdminMigration />} />
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/admin-pricing" element={<AdminPricing />} />
                    <Route path="/admin-promo-codes" element={<AdminPromoCodes />} />
                    <Route 
                      path="/admin-features" 
                      element={
                        <PrivateRoute>
                          <AdminFeatureControl />
                        </PrivateRoute>
                      } 
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <PrivateRoute>
                          <AdminAnalytics />
                        </PrivateRoute>
                      }
                    />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
                    <Route path="/manage-tests" element={<ManageTests />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/user-guide" element={<UserGuidePage />} />
                    <Route path="/user-guide/:slug" element={<UserGuidePage />} />
                    <Route path="/create-test" element={<CreateTestPage />} />
                    <Route path="/edit-test/:id" element={<CreateTestPage />} />
                    <Route path="/creator/:id" element={<CreatorProfilePage />} />
                    <Route path="/generate-with-ai" element={<AIImportRoute />} />

                    {/* Legal Routes */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/convert" element={<ConvertPage />} />


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
                      element={<TestIntroPage />}
                    />
                    <Route
                      path="/test/:slug"
                      element={<TestIntroPage />}
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
                      element={<TestPage />}
                    />

                    {/* Combined Session Routes */}
                    <Route path="/combined-intro/:combinedId" element={<CombinedIntroPage />} />
                    <Route path="/combined-break/:combinedId" element={<CombinedBreakScreen />} />

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
                      element={<TestSubmissionSuccess />}
                    />

                    {/* Unified Results Layout */}
                    <Route path="/results" element={<ResultsLayout />}>
                      <Route index element={<ResultsPage />} />
                      <Route path="solutions/:testId" element={<SolutionsViewPage />} />
                      <Route path="analytics" element={<AdvancedAnalysis />} />
                      <Route path="feedback/:testId" element={<FeedbackViewPage />} />
                    </Route>

                    {/* Redirects from old paths to new paths */}
                    <Route path="/analysis" element={<Navigate to="/results/analytics" replace />} />
                    <Route path="/solutions/:testId" element={<Navigate to="/results" replace />} />

                    <Route
                      path="/solutions-editor/:testId"
                      element={
                        <PrivateRoute>
                          <SolutionEditorPage />
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
