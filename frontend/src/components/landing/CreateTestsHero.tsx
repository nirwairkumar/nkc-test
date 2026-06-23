import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const slogans = [
    "Create High-Level Tests & Conduct Them Online",
    "Conduct Mock Exams in a Highly Secure Environment",
    "Shift Seamlessly from Paper to Digital Assessments",
    "Run Eco-Friendly & Sustainable Mock Tests"
];

export default function CreateTestsHero() {
    const navigate = useNavigate();
    const [currentSloganIndex, setCurrentSloganIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentSloganIndex((prev) => (prev + 1) % slogans.length);
                setIsVisible(true);
            }, 400);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Pure CSS Background — no component overhead */}
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ background: 'linear-gradient(to top, #0f172a, #312e81)' }}>
                <div className="absolute inset-0 pointer-events-none opacity-50" style={{
                    background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'
                }} />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-6 py-24 text-center">
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                    {/* Company Slogan — Institutional Motto Style */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-amber-400/60" />
                        <div className="flex items-center">
                            <span className="text-[14px] font-semibold tracking-[0.35em] uppercase text-amber-300/90 flex items-baseline">
                                <span className="text-[20px] font-bold">T</span>he&nbsp;
                                <span className="text-[20px] font-bold">E</span>ducator's&nbsp;
                                <span className="text-[20px] font-bold">C</span>hoice
                            </span>
                        </div>
                        <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-400/60" />
                    </div>

                    {/* Main Heading — CSS transition instead of framer-motion */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight min-h-[140px] md:min-h-[180px] flex items-center justify-center overflow-hidden">
                        <span
                            className="inline-block bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent px-4 py-2"
                            style={{
                                opacity: isVisible ? 1 : 0,
                                transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                                transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                            }}
                        >
                            {slogans[currentSloganIndex]}
                        </span>
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
