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
                        <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-serif">
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

                    {/* Support Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">Support</h3>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground text-left">
                            <div className="flex items-center gap-1">
                                <span>Email:</span>
                                <a
                                    href="mailto:support@testoza.com"
                                    className="hover:text-primary transition-colors"
                                >
                                    support@testoza.com
                                </a>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>Web:</span>
                                <a
                                    href="https://www.testoza.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary transition-colors"
                                >
                                    https://www.testoza.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">About</h3>
                        <nav className="flex flex-col gap-1">
                            <Link
                                to="/about"
                                className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
                            >
                                About Platform
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {currentYear} TestoZa. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
