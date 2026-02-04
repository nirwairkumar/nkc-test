import { useEffect } from 'react';
import CreateTestsHero from '@/components/landing/CreateTestsHero';
import UploadMaterialsSection from '@/components/landing/UploadMaterialsSection';
import FileToTestSection from '@/components/landing/FileToTestSection';
import TestCollectionSection from '@/components/landing/TestCollectionSection';
import YouTubeGeneratorSection from '@/components/landing/YouTubeGeneratorSection';
import PlatformStatsSection from '@/components/landing/PlatformStatsSection';
import { SEO } from '@/components/SEO';

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
                title="TestoZa - Create Tests in Seconds with AI"
                description="Transform your content into engaging tests with AI-powered tools. Upload PDFs, images, or YouTube videos and generate tests instantly. Access thousands of tests across multiple subjects."
            />

            <div className="min-h-screen">
                {/* Hero Section - No animation class needed, has its own */}
                <CreateTestsHero />

                {/* Feature Sections with scroll animations */}
                <div id="features" className="landing-section">
                    <UploadMaterialsSection />
                </div>

                <div className="landing-section">
                    <FileToTestSection />
                </div>

                <div className="landing-section">
                    <TestCollectionSection />
                </div>

                <div className="landing-section">
                    <YouTubeGeneratorSection />
                </div>

                {/* Platform Statistics - Promotional */}
                <div className="landing-section">
                    <PlatformStatsSection />
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
