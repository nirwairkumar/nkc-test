import { Youtube, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function YouTubeGeneratorSection() {
    const navigate = useNavigate();

    const steps = [
        {
            number: '01',
            title: 'Paste YouTube Link',
            description: 'Copy any YouTube video URL and paste it into our generator.',
            icon: Youtube,
        },
        {
            number: '02',
            title: 'AI Analyzes Content',
            description: 'Our AI watches and understands the video content automatically.',
            icon: Sparkles,
        },
        {
            number: '03',
            title: 'Get Your Test',
            description: 'Receive a complete test with questions in seconds, ready to use.',
            icon: CheckCircle2,
        },
    ];

    const benefits = [
        'Extract key concepts from educational videos',
        'Generate questions from lectures and tutorials',
        'Create quizzes from any video content',
        'Save hours of manual question writing',
    ];

    return (
        <section className="py-32 bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                        <Youtube className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">YouTube Integration</span>
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                        Generate Tests from YouTube
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Turn any YouTube video into an interactive test. Perfect for educators, students,
                        and content creators who want to enhance learning.
                    </p>
                </div>

                {/* Process Steps */}
                <div className="max-w-6xl mx-auto mb-20">
                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-red-300 to-purple-300 dark:from-red-800 dark:to-purple-800"></div>
                                )}

                                <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                    <div className="text-6xl font-bold text-red-100 dark:text-red-900/30 mb-4">
                                        {step.number}
                                    </div>
                                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                        <step.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                                    <p className="text-muted-foreground text-lg">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Benefits & CTA */}
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    {/* Benefits List */}
                    <div className="space-y-6">
                        <h3 className="text-3xl font-bold mb-8">Why Use YouTube Generator?</h3>
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-4 group">
                                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-lg pt-1">{benefit}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Card */}
                    <div className="bg-gradient-to-br from-red-600 via-pink-600 to-purple-600 rounded-3xl p-10 text-white shadow-2xl">
                        <Youtube className="w-16 h-16 mb-6 opacity-90" />
                        <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
                        <p className="text-lg mb-8 opacity-90">
                            Transform your favorite educational videos into engaging tests in just a few clicks.
                        </p>
                        <div className="flex items-center gap-3 mb-8 text-white/90">
                            <Clock className="w-5 h-5" />
                            <span>Takes less than 30 seconds</span>
                        </div>
                        <Button
                            size="lg"
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-white text-pink-600 hover:bg-white/90 text-lg py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                        >
                            <Youtube className="mr-2 w-5 h-5" />
                            Try YouTube Generator
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
