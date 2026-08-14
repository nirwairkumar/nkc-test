import { Link } from "react-router-dom";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12 mt-auto relative overflow-hidden">
            {/* Soft gradient decorative line at the top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
                    {/* Brand Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1.5px' }}>
                            TestoZa
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 w-full max-w-[300px] leading-relaxed">
                            Professional online test and assessment platform for practice, evaluation, and learning.
                        </p>
                    </div>

                    {/* Legal Links Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">Legal</h3>
                        <nav className="flex flex-col gap-1">
                            <Link
                                to="/privacy-policy"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                to="/terms-and-conditions"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                Terms & Conditions
                            </Link>
                        </nav>
                    </div>

                    {/* Support & Contact Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">Support & Contact</h3>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground text-left">
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Email:</span>
                                <a
                                    href="mailto:support@testoza.com"
                                    className="hover:text-primary transition-colors"
                                >
                                    support@testoza.com
                                </a>
                            </div>
                            <div className="flex items-start gap-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Platform:</span>
                                <span className="text-slate-500 dark:text-slate-400">TestoZa Educational Systems</span>
                            </div>
                            <div className="flex items-start gap-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">Address:</span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs">1st Floor, Nirmaan, Sudha & Shankar Inv Hub, IIT Madras, Chennai, Tamil Nadu 600036, India</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300">LinkedIn:</span>
                                <a
                                    href="https://www.linkedin.com/company/testoza"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline transition-colors font-medium text-xs"
                                >
                                    linkedin.com/company/testoza
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Resources & About Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">Resources & News</h3>
                        <nav className="flex flex-col gap-1">
                            <a
                                href="https://blog.testoza.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
                            >
                                <span>📰 TestoZa Blog & News</span>
                                <span className="text-[10px] text-slate-400">↗</span>
                            </a>
                            <Link
                                to="/user-guide"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                            >
                                User Guide
                            </Link>
                            <Link
                                to="/about"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                            >
                                About Platform
                            </Link>
                            <Link
                                to="/convert"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                            >
                                LaTeX Converter
                            </Link>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                                ✓ SSL Encrypted & Privacy Protected
                            </span>
                        </nav>
                    </div>
                </div>

                {/* Copyright & Trust Disclaimer */}
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground space-y-2">
                    <p>© {currentYear} <span style={{ fontFamily: "'Ribeye', serif", letterSpacing: '1px' }}>TestoZa</span>. All rights reserved. Built for educators, schools, and competitive exam preparation.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-2xl mx-auto">
                        TestoZa is a privacy-compliant digital assessment and exam preparation software designed for learning, mock test practice, and institutional evaluation.
                    </p>
                </div>
            </div>
        </footer>
    );
}
