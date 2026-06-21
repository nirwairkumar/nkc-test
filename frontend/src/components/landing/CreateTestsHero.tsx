import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import AnimatedBackground from '@/components/background/AnimatedBackground';
import { motion, AnimatePresence } from 'framer-motion';

const slogans = [
    "Create High-Level Tests & Conduct Them Online",
    "Conduct Mock Exams in a Highly Secure Environment",
    "Shift Seamlessly from Paper to Digital Assessments",
    "Run Eco-Friendly & Sustainable Mock Tests"
];

export default function CreateTestsHero() {
    const navigate = useNavigate();
    const [currentSloganIndex, setCurrentSloganIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSloganIndex((prev) => (prev + 1) % slogans.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-6 py-24 text-center">
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                    {/* Company Slogan Badge */}
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-400/10 backdrop-blur-sm border border-amber-300/40 text-amber-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-sm font-semibold tracking-[0.18em] uppercase">The Educator's Choice</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight min-h-[140px] md:min-h-[180px] flex items-center justify-center overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentSloganIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="inline-block bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent px-4 py-2"
                            >
                                {slogans[currentSloganIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </h1>

                    {/* Subheading — space preserved */}
                    <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                        &nbsp;
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                        <Button
                            size="lg"
                            // onClick={() => navigate('/generate-with-ai')}
                            onClick={() => navigate('/create-test')}
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
