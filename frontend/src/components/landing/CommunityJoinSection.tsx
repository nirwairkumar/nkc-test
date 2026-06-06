import { ArrowUpRight } from 'lucide-react';

export default function CommunityJoinSection() {
    return (
        <section className="py-20 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800/50 relative overflow-hidden">
            <div className="container mx-auto px-6 max-w-6xl relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    {/* Left content: Title & CTA button */}
                    <div className="flex flex-col items-start space-y-6 md:w-1/2">
                        <h2 className="text-4xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Join Us to Improve
                        </h2>
                        <a
                            href="https://forms.gle/o5WxY3XGTossyktu8"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            Join Us
                            <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                    </div>

                    {/* Right content: Image */}
                    <div className="w-full md:w-1/2 flex justify-center md:justify-end">
                        <div className="relative group max-w-md w-full">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                            <div className="relative bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                                <img
                                    src="/community-representation-image.jpg"
                                    alt="Community Campaign"
                                    className="w-full h-auto object-cover rounded-xl transition duration-500 group-hover:scale-[1.01]"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
