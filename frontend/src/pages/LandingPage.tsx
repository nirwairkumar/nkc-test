import { useEffect, Suspense, lazy, useRef, useState } from 'react';
import CreateTestsHero from '@/components/landing/CreateTestsHero';
import { SEO } from '@/components/SEO';
import { getAppUrl } from '@/utils/subdomain';
import { ChevronDown, HelpCircle } from 'lucide-react';

const HOMEPAGE_FAQS = [
    {
        q: "How do I create a test from a PDF?",
        a: "You can create a test from a PDF on TestoZa in under two minutes using our AI importer. Simply navigate to the AI Test Generator, upload your PDF document (such as lecture notes, textbook chapters, or question banks), select your desired question count and difficulty, and click Generate. Our AI extracts key concepts, creates multiple-choice or short-answer questions with detailed explanations, and loads them directly into your editable test builder."
    },
    {
        q: "Can I turn a YouTube video into a quiz?",
        a: "Yes, TestoZa allows you to turn any educational YouTube video into an interactive quiz automatically. Paste the YouTube video URL into our AI quiz generator, and our system analyzes the video transcript to generate relevant questions with correct answers and explanations. It is an ideal tool for flipped classrooms, homework assignments, and checking student comprehension after video lessons."
    },
    {
        q: "How do I add negative marking to an online test?",
        a: "You can add negative marking directly in the Test Settings panel while creating or editing any test on TestoZa. Under Scoring Settings, enable Negative Marking and specify the deduction value per incorrect answer—such as -0.25, -0.33, -0.5, or -1 mark. The platform automatically calculates negative marks upon submission, accurately reflecting competitive examination scoring rules."
    },
    {
        q: "How do I stop students from cheating in an online test?",
        a: "TestoZa prevents cheating through multi-layered exam security and proctoring controls. When setting up your test, you can enable full-screen enforcement, tab-switch monitoring, copy-paste disabling, and question and option randomization. If a student leaves the exam tab or attempts unauthorized navigation, TestoZa logs the infraction and can automatically submit or lock the test after a customizable threshold."
    },
    {
        q: "Can students take the test on a mobile phone?",
        a: "Yes, students can take any TestoZa test on mobile phones, tablets, or laptops without installing any apps. Every test link opens smoothly in standard mobile browsers like Chrome, Safari, and Firefox. The responsive interface adapts seamlessly to small screens, maintaining timer visibility, clear question navigation, and full touchscreen support for selecting answers and submitting responses."
    },
    {
        q: "How do I share a test with my students?",
        a: "You can share a test with your students by copying its unique test URL or generating a direct QR code from your dashboard. Distribute the link via WhatsApp, email, Google Classroom, or your learning management system. Students simply click the link, enter their name or roll number, and begin the test immediately without having to download software."
    },
    {
        q: "Is TestoZa better than Google Forms for conducting tests?",
        a: "Yes, TestoZa is purpose-built for educational assessments, whereas Google Forms is merely a survey tool. Unlike Google Forms, TestoZa provides built-in exam timers, automatic negative marking, anti-cheating tab-switch detection, randomized question ordering, AI-powered test generation, and comprehensive student analytics with automated rank calculation. It offers a professional computer-based testing experience without requiring complex add-ons."
    },
    {
        q: "What is a free alternative to Quizizz for teachers?",
        a: "TestoZa is the best free alternative to Quizizz for educators seeking formal, exam-grade assessments rather than just gamified trivia. TestoZa gives teachers unlimited test creation, AI question generation from PDFs and YouTube videos, customizable timers, negative marking, and classroom leaderboards—completely free with zero student limits or paywalled question types."
    }
];

const homepageFAQSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": HOMEPAGE_FAQS.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
        }
    }))
};

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
const SectionLoader = ({ className = "h-96" }: { className?: string }) => (
    <div className={`w-full ${className} flex items-center justify-center bg-slate-50 dark:bg-slate-900/50`}>
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
);

// Viewport-based lazy loading wrapper to defer JS evaluation & execution for below-the-fold content
function LazySection({ 
    children, 
    height, 
    className = "" 
}: { 
    children: React.ReactNode; 
    height: string; 
    className?: string; 
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersected, setIsIntersected] = useState(false);

    useEffect(() => {
        if (isIntersected) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersected(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '300px 0px', // start loading 300px before entering viewport
                threshold: 0.01,
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [isIntersected]);

    return (
        <div ref={ref} className={className} style={{ minHeight: height }}>
            {isIntersected ? children : (
                <div className="w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50" style={{ height }}>
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

export default function LandingPage() {
    useEffect(() => {
        // Smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';

        // Register WebMCP tool for agentic browsing
        const registerWebMCPTools = () => {
            const modelContext = 
                (document as any).modelContext || 
                (navigator as any).modelContext;

            if (modelContext && typeof modelContext.registerTool === 'function') {
                try {
                    modelContext.registerTool({
                        name: 'create_test_from_topic',
                        description: 'Generates an assessment or test on a specific academic subject, topic, or chapter for teachers.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                topic: { 
                                    type: 'string', 
                                    description: 'The academic subject, chapter, or topic to generate questions for.' 
                                },
                                numQuestions: { 
                                    type: 'number', 
                                    description: 'Number of questions to generate (default is 10).' 
                                }
                            },
                            required: ['topic']
                        },
                        execute: async ({ topic, numQuestions = 10 }: { topic: string; numQuestions?: number }) => {
                            window.location.href = getAppUrl(`/create-test?topic=${encodeURIComponent(topic)}&num=${numQuestions}`);
                            return `Redirecting to test creation page for topic "${topic}" with ${numQuestions} questions.`;
                        }
                    });
                } catch (err) {
                    console.warn('Failed to register WebMCP tool:', err);
                }
            }
        };

        registerWebMCPTools();

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
                title="Free Online Test Maker for Teachers – Create & Conduct Exams with AI"
                description="Create, conduct, and manage online tests and exams in minutes with AI. TestoZa is the best free online test maker for teachers, educators, coaching institutes, and content creators — generate quizzes from PDFs, YouTube videos, or text. Auto-grading, analytics, white-label branding & exam integrity tools."
                canonicalUrl="https://testoza.com/"
                schemas={[homepageFAQSchema]}
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
                                <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span> is the ultimate <strong>online test creation and examination platform</strong> for teachers, educators, and coaching institutes.
                                Our <strong>AI test generator</strong> allows you to build comprehensive quizzes and exams from PDFs, lecture notes, text, and YouTube videos in seconds.
                                Whether you are conducting periodic classroom tests, institute-wide assessments, or formal certification exams, <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span> provides
                                all the tools you need to test students with complete academic integrity.
                            </p>
                        </div>
                    </div>
                </section>



                {/* Feature Sections with scroll animations */}
                <div className="landing-section">
                    <LazySection height="800px">
                        <Suspense fallback={<SectionLoader className="h-[800px]" />}>
                            <ManualCreateSection />
                        </Suspense>
                    </LazySection>
                </div>

                <div className="landing-section">
                    <LazySection height="750px">
                        <Suspense fallback={<SectionLoader className="h-[750px]" />}>
                            <SettingsShowcaseSection />
                        </Suspense>
                    </LazySection>
                </div>

                <div className="landing-section">
                    <LazySection height="600px">
                        <Suspense fallback={<SectionLoader className="h-[600px]" />}>
                            <LiveExamTestimonials />
                        </Suspense>
                    </LazySection>
                </div>

                <div id="features" className="landing-section">
                    <LazySection height="750px">
                        <Suspense fallback={<SectionLoader className="h-[750px]" />}>
                            <UploadMaterialsSection />
                        </Suspense>
                    </LazySection>
                </div>

                <div className="landing-section">
                    <LazySection height="1100px">
                        <Suspense fallback={<SectionLoader className="h-[1100px]" />}>
                            <FileToTestSection />
                        </Suspense>
                    </LazySection>
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

                        <LazySection height="350px">
                            <Suspense fallback={<SectionLoader className="h-[350px]" />}>
                                <CategoryFolderCards />
                            </Suspense>
                        </LazySection>

                        <div className="mt-12">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Featured</span> Tests
                            </h3>
                            <LazySection height="500px">
                                <Suspense fallback={<SectionLoader className="h-[500px]" />}>
                                    <FeaturedTests user={null} onManageTest={handleManageTest} />
                                </Suspense>
                            </LazySection>
                        </div>

                        <div className="text-center mt-8">
                            <a
                                href={getAppUrl('/dashboard')}
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
                    <LazySection height="400px">
                        <Suspense fallback={<SectionLoader className="h-[400px]" />}>
                            <CommunityJoinSection />
                        </Suspense>
                    </LazySection>
                </div>

                {/* Frequently Asked Questions Section */}
                <section className="landing-section py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Got Questions?
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto">
                                Everything educators, teachers, and coaching institutes need to know about creating and conducting tests with TestoZa.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {HOMEPAGE_FAQS.map((faq, idx) => (
                                <details
                                    key={idx}
                                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-5 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-800 open:bg-white dark:open:bg-slate-900 open:shadow-sm"
                                >
                                    <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900 dark:text-slate-100 text-base md:text-lg list-none select-none">
                                        <span>{faq.q}</span>
                                        <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4" />
                                    </summary>
                                    <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base border-t border-slate-100 dark:border-slate-800 pt-3">
                                        {faq.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="landing-section py-32 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-5xl md:text-6xl font-bold mb-6">
                            Ready to Transform Learning?
                        </h2>
                        <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-3xl mx-auto">
                            Join thousands of educators, teachers, and coaching institutes who are already creating and conducting tests with our AI-powered platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href={getAppUrl('/create-test')}
                                className="inline-flex items-center justify-center bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-4 rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105 font-semibold"
                            >
                                Get Started Free
                            </a>
                            <a
                                href={getAppUrl('/dashboard')}
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
