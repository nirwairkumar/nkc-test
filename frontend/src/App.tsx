import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";
import PageLoader from "@/components/ui/PageLoader";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SubdomainGuard from "@/components/SubdomainGuard";

import Layout from "./Layout";
// Lazy Load Pages
import { HelmetProvider } from 'react-helmet-async';

// Helper for resilient lazy component loading with automatic post-deployment recovery
const safeLazy = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) => {
  return lazy(async () => {
    try {
      const module = await factory();
      if (module && module.default) {
        return module;
      }
      if (module && typeof module === 'object') {
        return { default: module.default || module };
      }
      throw new Error("Module export is invalid");
    } catch (error: any) {
      console.warn("Dynamic import failed (chunk outdated after deployment), auto-reloading page...", error);
      const storageKey = 'safe_lazy_reload_' + window.location.pathname;
      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem(storageKey) || 0);
      if (now - lastReload > 8000) {
        sessionStorage.setItem(storageKey, String(now));
        const url = new URL(window.location.href);
        url.searchParams.set('_v', now.toString());
        window.location.href = url.toString();
      }
      throw error;
    }
  });
};

const LandingPage = safeLazy(() => import("./pages/LandingPage"));
const GoogleAdsLanding = safeLazy(() => import("./pages/GoogleAdsLanding"));
const AITestImporter = safeLazy(() => import("./pages/AITestImporter"));

const CategoryPage = safeLazy(() => import("./pages/CategoryPage"));
const TestList = safeLazy(() => import("./pages/TestList"));
const TestPage = safeLazy(() => import("./pages/TestPage"));
const TestIntroPage = safeLazy(() => import("./pages/TestIntroPage"));
const TestHistory = safeLazy(() => import("./pages/TestHistory"));
const ResultsLayout = safeLazy(() => import("./components/layout/ResultsLayout"));
const ResultsPage = safeLazy(() => import("./pages/ResultsPage"));
const SolutionEditorPage = safeLazy(() => import("./pages/SolutionEditorPage"));
const SolutionsViewPage = safeLazy(() => import("./pages/SolutionsViewPage"));
const FeedbackViewPage = safeLazy(() => import("./pages/FeedbackViewPage"));
const AuthForm = safeLazy(() => import("@/components/AuthForm"));
const AuthCallback = safeLazy(() => import("./pages/AuthCallback"));
const AuthError = safeLazy(() => import("./pages/AuthError"));
const UpdatePassword = safeLazy(() => import("./pages/UpdatePassword"));
const PricingPage = safeLazy(() => import("./pages/PricingPage"));
const PremiumPage = safeLazy(() => import("./pages/PremiumPage"));
const OnboardingPage = safeLazy(() => import("./pages/OnboardingPage"));
const NotificationsPage = safeLazy(() => import("./pages/NotificationsPage"));
const UserTestManager = safeLazy(() => import("./pages/UserTestManager"));
const AllSubmissionsPage = safeLazy(() => import("./pages/AllSubmissionsPage"));
const RewardsPage = safeLazy(() => import("./pages/RewardsPage"));
const MaterialsManager = safeLazy(() => import("./pages/MaterialsManager"));
const SupportPage = safeLazy(() => import("./pages/SupportPage"));
const UserGuidePage = safeLazy(() => import("./pages/UserGuidePage"));
const NotFound = safeLazy(() => import("./pages/NotFound"));
const CreateTestPage = safeLazy(() => import("./pages/CreateTestPage"));
const ProfilePage = safeLazy(() => import("./pages/ProfilePage"));
const CreatorProfilePage = safeLazy(() => import("./pages/CreatorProfilePage"));
const PrivacyPolicy = safeLazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = safeLazy(() => import("./pages/TermsAndConditions"));
const AboutPage = safeLazy(() => import("./pages/AboutPage"));
const SettingsPage = safeLazy(() => import("./pages/SettingsPage"));
const TestSubmissionSuccess = safeLazy(() => import("./pages/TestSubmissionSuccess"));
const AdvancedAnalysis = safeLazy(() => import("./pages/AdvancedAnalysis"));
const FullTestAnalysisPage = safeLazy(() => import("./pages/FullTestAnalysisPage"));

const CombinedIntroPage = safeLazy(() => import("./pages/CombinedIntroPage"));
const CombinedBreakScreen = safeLazy(() => import("./pages/CombinedBreakScreen"));
const CreateCombinedTestPage = safeLazy(() => import("./pages/CreateCombinedTestPage"));
const MoreTestsPage = safeLazy(() => import("./pages/MoreTestsPage"));
const ConvertPage = safeLazy(() => import("./pages/ConvertPage"));
const SurveyPage = safeLazy(() => import("./pages/SurveyPage"));

// News & Posts
const NewsFeed = safeLazy(() => import("./pages/NewsFeed"));
const NewsPostView = safeLazy(() => import("./pages/NewsPostView"));
const NewsPostEditor = safeLazy(() => import("./pages/NewsPostEditor"));
const MyPosts = safeLazy(() => import("./pages/MyPosts"));

const TeacherDashboard = safeLazy(() => import("./components/dashboard/TeacherDashboard"));

import { useAuth } from "@/contexts/AuthContext";

const DashboardRoute = () => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const designation = profile?.designation || user?.user_metadata?.designation || (typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null);
  const isTeacherOrInstitution = (designation === 'Teacher' || designation === 'Institution') || (isAdmin && designation !== 'Student');

  if (user && isTeacherOrInstitution) {
    return <TeacherDashboard />;
  }
  return <TestList />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AIImportRoute = () => {
  const navigate = useNavigate();
  return <AITestImporter onImport={(data) => navigate('/create-test', { state: { importedData: data } })} />;
};

import ErrorBoundary from "@/components/ErrorBoundary";

const isBlogSubdomain = typeof window !== 'undefined' && (
  window.location.hostname === 'blog.testoza.com' ||
  window.location.hostname === 'news.testoza.com'
);

const HomeRoute = () => {
  if (isBlogSubdomain) {
    return <NewsFeed />;
  }
  return <LandingPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AuthModalProvider>
          <HelmetProvider>
            <Toaster />
            <Sonner />
            <TestProvider>
              <ErrorBoundary>
                <BrowserRouter>
                <SubdomainGuard />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route element={<Layout />}>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/quiz-creator" element={<GoogleAdsLanding />} />
                    <Route path="/assessment-platform" element={<GoogleAdsLanding />} />
                    <Route path="/dashboard" element={<DashboardRoute />} />
                    <Route path="/more-tests" element={<MoreTestsPage />} />

                    {/* News & Blog Routes */}
                    <Route path="/blog" element={<NewsFeed />} />
                    <Route path="/blog/:slug" element={<NewsPostView />} />
                    <Route path="/news" element={<NewsFeed />} />
                    <Route path="/news/:slug" element={<NewsPostView />} />
                    <Route path="/posts" element={<NewsFeed />} />
                    <Route path="/posts/:slug" element={<NewsPostView />} />
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
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
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
                    <Route path="/survey" element={<SurveyPage />} />


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
                      path="/all-submissions"
                      element={
                        <PrivateRoute>
                          <AllSubmissionsPage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/rewards"
                      element={
                        <PrivateRoute>
                          <RewardsPage />
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
                    <Route path="/create-combined-test" element={<PrivateRoute><CreateCombinedTestPage /></PrivateRoute>} />
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

                    {/* Unified Results Layout (Student Facing) */}
                    <Route path="/results" element={<ResultsLayout />}>
                      <Route index element={<ResultsPage />} />
                      <Route path="solutions/:testId" element={<SolutionsViewPage />} />
                      <Route path="feedback/:testId" element={<FeedbackViewPage />} />
                    </Route>

                    {/* Dedicated Teacher/Institution Full Test Analysis routes */}
                    <Route path="/results/analytics" element={<PrivateRoute><FullTestAnalysisPage /></PrivateRoute>} />
                    <Route path="/test-analysis/:testId" element={<PrivateRoute><FullTestAnalysisPage /></PrivateRoute>} />
                    <Route path="/analytics/full" element={<PrivateRoute><FullTestAnalysisPage /></PrivateRoute>} />

                    {/* Redirects from old paths to new paths */}
                    <Route path="/analysis" element={<Navigate to="/analytics/full" replace />} />
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
          </ErrorBoundary>
        </TestProvider>
        </HelmetProvider>
        </AuthModalProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
