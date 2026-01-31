import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TestSubmissionSuccess() {
    const navigate = useNavigate();

    useEffect(() => {
        // Trigger confetti animation on mount
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Flowers and sparkles from both sides
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFD700', '#FFA500']
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFD700', '#FFA500']
            });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full shadow-2xl border-2 border-purple-200 dark:border-purple-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                <CardContent className="p-8 md:p-12 text-center space-y-6">
                    {/* Success Icon with Animation */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-6 shadow-xl">
                                <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-white animate-bounce" />
                            </div>
                        </div>
                    </div>

                    {/* Sparkles Decoration */}
                    <div className="flex justify-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                        <Sparkles className="w-8 h-8 text-pink-400 animate-pulse delay-75" />
                        <Sparkles className="w-6 h-6 text-purple-400 animate-pulse delay-150" />
                    </div>

                    {/* Main Heading */}
                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                            Test Submitted Successfully!
                        </h1>
                        <p className="text-xl md:text-2xl font-semibold text-slate-700 dark:text-slate-300">
                            🎉 Congratulations! 🎉
                        </p>
                    </div>

                    {/* Flower Emojis */}
                    <div className="text-6xl md:text-7xl space-x-2 animate-pulse">
                        🌸 🌺 🌼 🌻 🌷
                    </div>

                    {/* Message */}
                    <div className="space-y-4 py-6">
                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                            Your test has been submitted successfully!
                        </p>
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                            <p className="text-base md:text-lg text-slate-700 dark:text-slate-300 font-medium">
                                📊 Your results will be published by the test creator soon.
                            </p>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2">
                                Thank you for your participation and effort!
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <Button
                            onClick={() => navigate('/')}
                            size="lg"
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                            <Home className="w-5 h-5 mr-2" />
                            Return to Home
                        </Button>
                    </div>

                    {/* Footer Note */}
                    <p className="text-sm text-slate-500 dark:text-slate-500 pt-4">
                        Keep up the great work! ✨
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
