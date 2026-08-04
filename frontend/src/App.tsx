import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";
import PageLoader from "@/components/ui/PageLoader";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SubdomainGuard from "@/components/SubdomainGuard";

import Layout from "./Layout";
// Lazy Load Pages
import { HelmetProvider } from 'react-helmet-async';

const LandingPage = lazy(() => import("./pages/LandingPage"));
const GoogleAdsLanding = lazy(() => import("./pages/GoogleAdsLanding"));
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
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
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
const FullTestAnalysisPage = lazy(() => import("./pages/FullTestAnalysisPage"));

const CombinedIntroPage = lazy(() => import("./pages/CombinedIntroPage"));
const CombinedBreakScreen = lazy(() => import("./pages/CombinedBreakScreen"));
const CreateCombinedTestPage = lazy(() => import("./pages/CreateCombinedTestPage"));
const MoreTestsPage = lazy(() => import("./pages/MoreTestsPage"));
const ConvertPage = lazy(() => import("./pages/ConvertPage"));
const SurveyPage = lazy(() => import("./pages/SurveyPage"));

// News & Posts
const NewsFeed = lazy(() => import("./pages/NewsFeed"));
const NewsPostView = lazy(() => import("./pages/NewsPostView"));
const NewsPostEditor = lazy(() => import("./pages/NewsPostEditor"));
const MyPosts = lazy(() => import("./pages/MyPosts"));



const TeacherDashboard = lazy(() => import("./components/dashboard/TeacherDashboard"));

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

const queryClient = new QueryClient();

const AIImportRoute = () => {
  const navigate = useNavigate();
  return <AITestImporter onImport={(data) => navigate('/create-test', { state: { importedData: data } })} />;
};

import ErrorBoundary from "@/components/ErrorBoundary";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
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
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/quiz-creator" element={<GoogleAdsLanding />} />
                    <Route path="/assessment-platform" element={<GoogleAdsLanding />} />
                    <Route path="/dashboard" element={<DashboardRoute />} />
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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
