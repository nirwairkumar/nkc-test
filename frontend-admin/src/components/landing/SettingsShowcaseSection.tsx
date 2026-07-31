import SettingsShowcase from './SettingsShowcase';
import LiveTestShowcase from './LiveTestShowcase';

export default function SettingsShowcaseSection() {
    return (
        <section className="py-20 bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Section heading */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 mb-4">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span className="text-sm font-medium">Platform Overview</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                        Configure & <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Experience</span> Every Detail
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                        From proctoring controls to a fully responsive live test environment — built for creators and students.
                    </p>
                </div>

                {/* Two showcases side by side */}
                <div className="flex flex-col lg:flex-row items-start justify-center gap-10">

                    {/* LEFT — Test Settings */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center gap-4">
                        <div className="text-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">⚙ Test Configuration</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-white">Proctoring &amp; Settings Panel</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Configure your test environment with granular controls</div>
                        </div>
                        <SettingsShowcase />
                    </div>

                    {/* RIGHT — Live Test */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center gap-4">
                        <div className="text-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-green-500 mb-1">▶ Live Test Interface</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-white">Student View — Desktop &amp; Mobile</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">See exactly what students experience during the exam</div>
                        </div>
                        <LiveTestShowcase />
                    </div>

                </div>
            </div>
        </section>
    );
}
