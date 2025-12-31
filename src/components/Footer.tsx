import { Link } from "react-router-dom";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t bg-white dark:bg-gray-950 py-12 px-4 shadow-sm mt-auto">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
                    {/* Brand Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-bold tracking-tighter text-primary">TestoZa</h3>
                        <p className="text-sm text-muted-foreground w-full max-w-[300px]">
                            TestoZa is an online test and assessment platform for practice, evaluation, and learning.
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

                    {/* Contact Section */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-base font-semibold">Support</h3>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <a
                                href="mailto:ziptrip.info.mail@gmail.com"
                                className="hover:text-primary transition-colors"
                            >
                                ziptrip.info.mail@gmail.com
                            </a>
                            <a
                                href="https://testoza.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                            >
                                https://testoza.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} TestoZa. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
