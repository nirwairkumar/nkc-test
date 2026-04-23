import { Shield, Lock, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import SettingsShowcase from './SettingsShowcase';

export default function SettingsShowcaseSection() {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16">

                    {/* Content Side */}
                    <div className="lg:w-1/2 space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">Test Configuration</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
                            Full Control Over Your <br />
                            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                Test Environment
                            </span>
                        </h2>

                        <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                            Configure proctoring, scheduling, attempt limits, and results timing — all from one intuitive settings panel designed for educators.
                        </p>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: Shield,
                                    title: "Smart Proctoring",
                                    desc: "Force full screen, detect tab switches, and configure violation actions to maintain exam integrity."
                                },
                                {
                                    icon: Clock,
                                    title: "Flexible Scheduling",
                                    desc: "Set precise start and end windows so students can only access the test at the right time."
                                },
                                {
                                    icon: Lock,
                                    title: "Access Controls",
                                    desc: "Limit attempts, collect student details via a start form, and assign tests to specific classes."
                                }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
                                            {feature.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <Button
                                size="lg"
                                onClick={() => navigate('/create-test')}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                            >
                                Configure Your Test
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>

                    {/* Visual Side */}
                    <div className="lg:w-1/2">
                        <SettingsShowcase />
                    </div>
                </div>
            </div>
        </section>
    );
}
