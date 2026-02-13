import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import AnimatedBackground from '@/components/background/AnimatedBackground';

export default function CreateTestsHero() {
    const navigate = useNavigate();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-6 py-24 text-center">
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">The Future of Test Creation</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight">
                        Create Tests
                        <br />
                        <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                            In Minute
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                        Transform your content into engaging tests with AI-powered tools.
                        Upload PDFs, images, or YouTube videos and watch the magic happen.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                        <Button
                            size="lg"
                            onClick={() => navigate('/generate-with-ai')}
                            className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105"
                        >
                            Start Creating
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                                const element = document.getElementById('features');
                                element?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-white/10 text-white border-white/30 hover:bg-white/20 text-lg px-8 py-6 rounded-full backdrop-blur-sm"
                        >
                            Explore Features
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-16">
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-white">10K+</div>
                            <div className="text-white/80 mt-2">Tests Created</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-white">5K+</div>
                            <div className="text-white/80 mt-2">Active Users</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-white">99%</div>
                            <div className="text-white/80 mt-2">Satisfaction</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
                    <div className="w-1 h-3 bg-white/70 rounded-full animate-scroll-down"></div>
                </div>
            </div>
        </section>
    );
}
