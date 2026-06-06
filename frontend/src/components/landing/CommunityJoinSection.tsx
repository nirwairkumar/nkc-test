import { Users, ArrowUpRight, GraduationCap, Users2, Code } from 'lucide-react';

export default function CommunityJoinSection() {
    return (
        <section className="py-24 bg-slate-50/50 dark:bg-slate-900/10 relative overflow-hidden border-t border-slate-100 dark:border-slate-800/50">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10 max-w-7xl">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                    {/* Content Column */}
                    <div className="lg:w-1/2 space-y-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-300">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Join Us to Improve</span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                            Help Us Build <br />
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                The Future of Learning
                            </span>
                        </h2>

                        <p className="text-lg text-slate-600 dark:text-slate-300">
                            Whether you are a student, teacher, creator, or developer, your suggestions matter. Share your thoughts and help shape TestoZa.
                        </p>

                        {/* Audience Roles Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                            {[
                                { icon: GraduationCap, label: "Students", desc: "For better prep" },
                                { icon: Users2, label: "Teachers", desc: "For smart teaching" },
                                { icon: Code, label: "Developers", desc: "For tech ideas" }
                            ].map((role, idx) => (
                                <div key={idx} className="flex flex-col p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-2.5">
                                        <role.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{role.label}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.desc}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2">
                            <a
                                href="https://forms.gle/sample-form-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                            >
                                Share Your Feedback
                                <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </a>
                        </div>
                    </div>

                    {/* Image Column */}
                    <div className="lg:w-1/2 w-full flex justify-center">
                        <div className="relative group max-w-lg w-full">
                            {/* Decorative shadow behind the image */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-35 transition duration-1000 group-hover:duration-200"></div>
                            
                            <div className="relative bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                                <img
                                    src="/community-representation-image.jpg"
                                    alt="TestoZa Community"
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
