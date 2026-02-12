import { useEffect, Suspense, lazy } from 'react';
import CreateTestsHero from '@/components/landing/CreateTestsHero';
import { SEO } from '@/components/SEO';

// Lazy load heavy sections
const UploadMaterialsSection = lazy(() => import('@/components/landing/UploadMaterialsSection'));
const FileToTestSection = lazy(() => import('@/components/landing/FileToTestSection'));
const TestCollectionSection = lazy(() => import('@/components/landing/TestCollectionSection'));
const YouTubeGeneratorSection = lazy(() => import('@/components/landing/YouTubeGeneratorSection'));
const PlatformStatsSection = lazy(() => import('@/components/landing/PlatformStatsSection'));

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

    return (
        <>
            <SEO
                title="TestoZa - Create Tests in Minute with AI"
                description="Transform your content into engaging tests with AI-powered tools. Upload PDFs, images, or YouTube videos and generate tests instantly. Access thousands of tests across multiple subjects."
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
                                TestoZa is the ultimate <strong>online test platform</strong> for teachers, students, and institutes.
                                Our <strong>AI test generator</strong> allows you to create quizzes from PDFs, text, and YouTube videos in seconds.
                                Whether you need a <strong>mock test for JEE, NEET, GATE</strong>, or a simple class quiz, TestoZa provides
                                comprehensive tools to assess knowledge effectively.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Feature Sections with scroll animations */}
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

                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <TestCollectionSection />
                    </Suspense>
                </div>

                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <YouTubeGeneratorSection />
                    </Suspense>
                </div>

                {/* Platform Statistics - Promotional */}
                <div className="landing-section">
                    <Suspense fallback={<SectionLoader />}>
                        <PlatformStatsSection />
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
