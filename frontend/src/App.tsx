import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { TestProvider } from "@/contexts/TestContext";
import PrivateRoute from "@/components/ui/PrivateRoute";
import PageLoader from "@/components/ui/PageLoader";
import { Suspense, lazy, useEffect } from "react";
import SubdomainGuard from "@/components/SubdomainGuard";
import { WHITE_BOXES_META } from "@/blog/articles/meta";
import { AI_TEST_GENERATOR_META, BANK_META, CLASSPLUS_META, KAHOOT_META, TEACHMINT_META, TESTPORTAL_META, BEST_PLATFORM_META, CBT_META, CHEMISTRY_META, CONDUCT_META, HINDI_META, JEE_ADVANCED_META, JEE_META, MATH_TEST_MAKER_META, MOODLE_META, NEET_META, PREVENT_CHEATING_META, SSC_META } from "@/guides/meta";

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
// Exam sessions: join codes, live monitor, batches
const JoinPage = safeLazy(() => import("./pages/join/JoinPage"));
const ExamsPage = safeLazy(() => import("./pages/exams/ExamsPage"));
const ExamSessionPage = safeLazy(() => import("./pages/exams/ExamSessionPage"));
const ExamPresentPage = safeLazy(() => import("./pages/exams/ExamPresentPage"));
const ReportCardsPage = safeLazy(() => import("./pages/exams/ReportCardsPage"));
const BatchesPage = safeLazy(() => import("./pages/exams/BatchesPage"));
const BatchPage = safeLazy(() => import("./pages/exams/BatchPage"));
const PinSlipsPage = safeLazy(() => import("./pages/exams/PinSlipsPage"));
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
const SendTestPage = safeLazy(() => import("./pages/SendTestPage"));
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
// Panna (PDF tools) moved to https://pdf.testoza.com. The Cloudflare edge answers old
// URLs with real 301s; this covers in-app links and the app./blog. hosts.
const PdfToolsMoved = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(`https://pdf.testoza.com${to}`);
  }, [to]);
  return <PageLoader />;
};
const SurveyPage = safeLazy(() => import("./pages/SurveyPage"));

// SEO Landing Pages
// Guides (src/guides): long-form pages on testoza.com; the worker serves their text to crawlers.
const CreateMockTestOnline = safeLazy(() => import("./pages/guides/CreateMockTestOnline"));
const UseCaseLandingPage = safeLazy(() => import("./pages/UseCaseLandingPage"));
const SubjectLandingPage = safeLazy(() => import("./pages/SubjectLandingPage"));
const ComparisonLandingPage = safeLazy(() => import("./pages/ComparisonPage"));

// News & Posts
const NewsFeed = safeLazy(() => import("./pages/NewsFeed"));
const NewsPostView = safeLazy(() => import("./pages/NewsPostView"));
const NewsPostEditor = safeLazy(() => import("./pages/NewsPostEditor"));
const MyPosts = safeLazy(() => import("./pages/MyPosts"));

// Static blog articles (src/blog/articles): long-form pages the post editor can't
// build. They share the post URLs, so the router picks them by slug.
const StopPaintingWhiteBoxes = safeLazy(() => import("./pages/blog/StopPaintingWhiteBoxes"));
const STATIC_ARTICLE_PAGES: Record<string, React.ComponentType> = {
  [WHITE_BOXES_META.slug]: StopPaintingWhiteBoxes,
};
const BlogPostRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const StaticArticle = slug ? STATIC_ARTICLE_PAGES[slug] : undefined;
  return StaticArticle ? <StaticArticle /> : <NewsPostView />;
};

// Guides (src/guides): long-form pages on testoza.com, served to crawlers by the worker.
const BestOnlineTestPlatform = safeLazy(() => import("./pages/guides/BestOnlineTestPlatform"));
const CbtExamSoftware = safeLazy(() => import("./pages/guides/CbtExamSoftware"));
const JeeMockTestPlatform = safeLazy(() => import("./pages/guides/JeeMockTestPlatform"));
const AiTestGenerator = safeLazy(() => import("./pages/guides/AiTestGenerator"));
const NeetOnlineTestSoftware = safeLazy(() => import("./pages/guides/neet/NeetOnlineTestSoftware"));
const MoodleAlternative = safeLazy(() => import("./pages/guides/moodle/MoodleAlternative"));
const ConductOnlineExam = safeLazy(() => import("./pages/guides/conduct/ConductOnlineExam"));
const HindiOnlineTestMaker = safeLazy(() => import("./pages/guides/hindi/HindiOnlineTestMaker"));
const PreventCheating = safeLazy(() => import("./pages/guides/cheating/PreventCheating"));
const MathTestMaker = safeLazy(() => import("./pages/guides/math/MathTestMaker"));
const ChemistryQuestionPaperMaker = safeLazy(() => import("./pages/guides/chem/ChemistryQuestionPaperMaker"));
const JeeAdvancedMockTestSoftware = safeLazy(() => import("./pages/guides/jadv/JeeAdvancedMockTestSoftware"));
const SscMockTestPlatform = safeLazy(() => import("./pages/guides/ssc/SscMockTestPlatform"));
const BankExamMockTestPlatform = safeLazy(() => import("./pages/guides/bank/BankExamMockTestPlatform"));
// The four "alternative" guides share one shell (pages/guides/alt/AlternativePage.tsx).
const ClassplusAlternative = safeLazy(() => import("./pages/guides/alt/ClassplusAlternative"));
const TeachmintAlternative = safeLazy(() => import("./pages/guides/alt/TeachmintAlternative"));
const KahootAlternative = safeLazy(() => import("./pages/guides/alt/KahootAlternative"));
const TestportalAlternative = safeLazy(() => import("./pages/guides/alt/TestportalAlternative"));
const GuidesIndex = safeLazy(() => import("./pages/GuidesIndex"));

const TeacherDashboard = safeLazy(() => import("./components/dashboard/TeacherDashboard"));

import { useAuth } from "@/contexts/AuthContext";

// /dashboard is the educator workspace only (rendered inside PrivateRoute, so user is set).
// Everyone else goes to their own results; the public test library lives at /explore.
const DashboardRoute = () => {
  const { user, profile, isAdmin } = useAuth();

  const designation = profile?.designation || user?.user_metadata?.designation || (typeof window !== 'undefined' ? localStorage.getItem('user_designation') : null);
  const isTeacherOrInstitution = (designation === 'Teacher' || designation === 'Institution') || (isAdmin && designation !== 'Student');

  if (isTeacherOrInstitution) {
    return <TeacherDashboard />;
  }
  return <Navigate to="/history" replace />;
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

/** testoza.com/j/482913 — the short link inside the QR code and WhatsApp message. */
const ShortJoinRedirect = () => {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/join/${code || ''}`} replace />;
};

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
                    <Route path="/dashboard" element={<PrivateRoute><DashboardRoute /></PrivateRoute>} />
                    <Route path="/explore" element={<TestList />} />
                    <Route path="/more-tests" element={<MoreTestsPage />} />

                    {/* News & Blog Routes */}
                    <Route path="/blog" element={<NewsFeed />} />
                    <Route path="/blog/:slug" element={<BlogPostRoute />} />
                    <Route path="/news" element={<NewsFeed />} />
                    <Route path="/news/:slug" element={<BlogPostRoute />} />
                    <Route path="/posts" element={<NewsFeed />} />
                    <Route path="/posts/:slug" element={<BlogPostRoute />} />
                    {/* On blog.testoza.com posts live at /<slug> (their canonical URL);
                        static paths like /pricing still win over this pattern. */}
                    {isBlogSubdomain && <Route path="/:slug" element={<BlogPostRoute />} />}
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
                    {/* The step after saving a paper: the link, the message, the QR code. */}
                    <Route path="/send/:id" element={<PrivateRoute><SendTestPage /></PrivateRoute>} />
                    <Route path="/creator/:id" element={<CreatorProfilePage />} />
                    <Route path="/generate-with-ai" element={<AIImportRoute />} />

                    {/* Legal Routes */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                    <Route path="/about" element={<AboutPage />} />
                    {/* Panna — PDF tools now live on pdf.testoza.com */}
                    <Route path="/pdf" element={<PdfToolsMoved to="/" />} />
                    <Route path="/pdf/editor" element={<PdfToolsMoved to="/edit-pdf" />} />
                    <Route path="/pdf/latex-to-pdf" element={<PdfToolsMoved to="/latex-to-pdf" />} />
                    <Route path="/convert" element={<PdfToolsMoved to="/latex-to-pdf" />} />
                    <Route path="/survey" element={<SurveyPage />} />

                    {/* Guides */}
                    <Route path="/create-mock-test-online" element={<CreateMockTestOnline />} />

                    {/* SEO Use-Case Landing Pages */}
                    <Route path="/online-test-maker" element={<UseCaseLandingPage />} />
                    <Route path="/online-exam-software" element={<UseCaseLandingPage />} />
                    <Route path="/online-quiz-maker" element={<UseCaseLandingPage />} />
                    <Route path="/mcq-test-maker" element={<UseCaseLandingPage />} />
                    <Route path="/ai-question-generator" element={<UseCaseLandingPage />} />
                    <Route path="/pdf-to-quiz" element={<UseCaseLandingPage />} />
                    <Route path="/youtube-to-quiz" element={<UseCaseLandingPage />} />
                    <Route path="/online-test-for-coaching" element={<UseCaseLandingPage />} />
                    <Route path="/exam-software-for-schools" element={<UseCaseLandingPage />} />
                    <Route path="/white-label-test-platform" element={<UseCaseLandingPage />} />
                    <Route path="/auto-grading-software" element={<UseCaseLandingPage />} />
                    <Route path="/online-proctoring-software" element={<UseCaseLandingPage />} />

                    {/* Guides */}
                    <Route path={BEST_PLATFORM_META.path} element={<BestOnlineTestPlatform />} />
                    <Route path={CBT_META.path} element={<CbtExamSoftware />} />
                    <Route path={JEE_META.path} element={<JeeMockTestPlatform />} />
                    <Route path={AI_TEST_GENERATOR_META.path} element={<AiTestGenerator />} />
                    <Route path={NEET_META.path} element={<NeetOnlineTestSoftware />} />
                    <Route path={MOODLE_META.path} element={<MoodleAlternative />} />
                    <Route path={CONDUCT_META.path} element={<ConductOnlineExam />} />
                    <Route path={HINDI_META.path} element={<HindiOnlineTestMaker />} />
                    <Route path={PREVENT_CHEATING_META.path} element={<PreventCheating />} />
                    <Route path={MATH_TEST_MAKER_META.path} element={<MathTestMaker />} />
                    <Route path={CHEMISTRY_META.path} element={<ChemistryQuestionPaperMaker />} />
                    <Route path={JEE_ADVANCED_META.path} element={<JeeAdvancedMockTestSoftware />} />
                    <Route path={SSC_META.path} element={<SscMockTestPlatform />} />
                    <Route path="/guides" element={<GuidesIndex />} />
                    <Route path={BANK_META.path} element={<BankExamMockTestPlatform />} />
                    <Route path={CLASSPLUS_META.path} element={<ClassplusAlternative />} />
                    <Route path={TEACHMINT_META.path} element={<TeachmintAlternative />} />
                    <Route path={KAHOOT_META.path} element={<KahootAlternative />} />
                    <Route path={TESTPORTAL_META.path} element={<TestportalAlternative />} />

                    {/* SEO Subject Hub Pages */}
                    <Route path="/create-test/:subject" element={<SubjectLandingPage />} />

                    {/* SEO Comparison Pages */}
                    <Route path="/compare/:slug" element={<ComparisonLandingPage />} />


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

                    {/* Exam sessions — students join with a 6-digit code (no account) */}
                    <Route path="/join" element={<JoinPage />} />
                    <Route path="/join/result" element={<JoinPage />} />
                    <Route path="/join/result/:code" element={<JoinPage />} />
                    <Route path="/join/:code" element={<JoinPage />} />
                    <Route path="/join/:code/exam" element={<TestPage />} />
                    <Route path="/j/:code" element={<ShortJoinRedirect />} />
                    {/* …and teachers run them */}
                    <Route path="/exams" element={<PrivateRoute><ExamsPage /></PrivateRoute>} />
                    <Route path="/exams/:id" element={<PrivateRoute><ExamSessionPage /></PrivateRoute>} />
                    <Route path="/exams/:id/present" element={<PrivateRoute><ExamPresentPage /></PrivateRoute>} />
                    <Route path="/exams/:id/report-cards" element={<PrivateRoute><ReportCardsPage /></PrivateRoute>} />
                    <Route path="/batches" element={<PrivateRoute><BatchesPage /></PrivateRoute>} />
                    <Route path="/batches/:id" element={<PrivateRoute><BatchPage /></PrivateRoute>} />
                    <Route path="/batches/:id/slips" element={<PrivateRoute><PinSlipsPage /></PrivateRoute>} />

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
