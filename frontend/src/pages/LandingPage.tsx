import { useEffect, Suspense, lazy } from 'react';
import CreateTestsHero from '@/components/landing/CreateTestsHero';
import { SEO } from '@/components/SEO';

// Lazy load heavy sections
const UploadMaterialsSection = lazy(() => import('@/components/landing/UploadMaterialsSection'));
const FileToTestSection = lazy(() => import('@/components/landing/FileToTestSection'));
const CategoryFolderCards = lazy(() => import('@/components/home/CategoryFolderCards'));
const FeaturedTests = lazy(() => import('@/components/home/FeaturedTests'));
const YouTubeGeneratorSection = lazy(() => import('@/components/landing/YouTubeGeneratorSection'));
const PlatformStatsSection = lazy(() => import('@/components/landing/PlatformStatsSection'));
const CommunityJoinSection = lazy(() => import('@/components/landing/CommunityJoinSection'));
const ManualCreateSection = lazy(() => import('@/components/landing/ManualCreateSection'));
const SettingsShowcaseSection = lazy(() => import('@/components/landing/SettingsShowcaseSection'));
const LiveExamTestimonials = lazy(() => import('@/components/landing/LiveExamTestimonials'));

// Loading component
const SectionLoader = () => (
    <div className="w-full h-96 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
);

export default function LandingPage() {
    useEffect(() => {
        // Smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';

        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px',
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                }
            });
        }, observerOptions);

        // Observe all sections
        const sections = document.querySelectorAll('.landing-section');
        sections.forEach((section) => observer.observe(section));

        return () => {
            observer.disconnect();
            document.documentElement.style.scrollBehavior = 'auto';
        };
    }, []);

    const handleManageTest = (test: any) => {
        // Not used heavily by unauthenticated users on landing page, 
        // but required by prop signature.
    };

    return (
        <>
            <SEO
                title="Free Online Test Maker for Teachers – Create Exam Online with AI"
                description="Create online tests and exams in minutes with AI. TestoZa is the best free online test maker for teachers — generate quizzes from PDFs, YouTube videos, or text. Free quiz creator, mock tests, CBT platform & secure proctoring tools."
                canonicalUrl="https://testoza.com/"
                keywords={[
                    "online test maker for teachers",
                    "free online test maker for teachers",
                    "create online test",
                    "online quiz maker for teachers",
                    "create exam online",
                    "make test online",
                    "online exam software",
                    "best online exam platform",
                    "free quiz maker for teachers",
                    "test creator for teachers",
                    "computer-based test platform",
                    "online examination platform",
                    "ai quiz generator",
                    "secure online proctoring software",
                    "how to create a test online",
                    "learning management system"
                ]}
            />

            <div className="min-h-screen">
                {/* Hero Section - No animation class needed, has its own */}
                <CreateTestsHero />

                {/* SEO Content Section */}
                <section className="bg-white dark:bg-slate-950 py-12 border-b border-slate-100 dark:border-slate-800">
                    <div className="container mx-auto px-6 text-center max-w-4xl">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900 dark:text-white">
                            The Best Free Online Test Maker & AI Quiz Generator
                        </h2>
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span> is the ultimate <strong>online test platform</strong> for teachers, students, and institutes.
                                Our <strong>AI test generator</strong> allows you to create quizzes from PDFs, text, and YouTube videos in seconds.
                                Whether you need a <strong>mock test for JEE, NEET, GATE</strong>, or a simple class quiz, <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span> provides
                                comprehensive tools to assess knowledge effectively.
                            </p>
                        </div>
                    </div>
                </section>



                {/* Feature Sections with scroll animations */}
                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <ManualCreateSection />
                    </Suspense>
                </div>

                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <SettingsShowcaseSection />
                    </Suspense>
                </div>

                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <LiveExamTestimonials />
                    </Suspense>
                </div>

                <div id="features" className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <UploadMaterialsSection />
                    </Suspense>
                </div>

                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <FileToTestSection />
                    </Suspense>
                </div>

                {/* Discover Free Tests - Real Data */}
                <div className="landing-section bg-slate-50 dark:bg-slate-900/20 py-16">
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Discover Free Tests
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Browse thousands of tests created by our community.
                            </p>
                        </div>

                        <Suspense fallback={<SectionLoader />}>
                            <CategoryFolderCards />
                        </Suspense>

                        <div className="mt-12">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Featured</span> Tests
                            </h3>
                            <Suspense fallback={<SectionLoader />}>
                                <FeaturedTests user={null} onManageTest={handleManageTest} />
                            </Suspense>
                        </div>

                        <div className="text-center mt-8">
                            <a
                                href="/dashboard"
                                className="inline-flex items-center justify-center bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 text-base px-6 py-3 rounded-full transition-all font-medium"
                            >
                                View All Tests on Dashboard
                            </a>
                        </div>
                    </div>
                </div>
                {/* <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <YouTubeGeneratorSection />
                    </Suspense>
                </div> */}

                {/* Platform Statistics - Promotional */}
                {/* <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <PlatformStatsSection />
                    </Suspense>
                </div> */}

                {/* Community Campaign Section */}
                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <CommunityJoinSection />
                    </Suspense>
                </div>

                {/* Final CTA Section */}
                <section className="landing-section py-32 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-5xl md:text-6xl font-bold mb-6">
                            Ready to Transform Learning?
                        </h2>
                        <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-3xl mx-auto">
                            Join thousands of educators and students who are already creating amazing tests
                            with our AI-powered platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href="/create-test"
                                className="inline-flex items-center justify-center bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-4 rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105 font-semibold"
                            >
                                Get Started Free
                            </a>
                            <a
                                href="/dashboard"
                                className="inline-flex items-center justify-center bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 text-lg px-8 py-4 rounded-full backdrop-blur-sm transition-all duration-300 font-semibold"
                            >
                                Explore Tests
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
