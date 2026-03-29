import React, { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function TestLinkPaster() {
    const [link, setLink] = useState('');
    const [testId, setTestId] = useState('');
    const navigate = useNavigate();

    const handleNavigate = () => {
        const trimmedLink = link.trim();
        let trimmedId = testId.trim();

        // Priority 1: ID Input
        if (trimmedId) {
            // Remove '#' if present
            trimmedId = trimmedId.replace(/^#/, '');
            navigate(`/test-intro/${trimmedId}`);
            return;
        }

        // Priority 2: Link Input
        if (trimmedLink) {
            try {
                // Check if it's a full URL
                const url = new URL(trimmedLink);

                // Allow /test, /live, /test-intro routes
                if (url.pathname.match(/^\/(test|live|test-intro)\//)) {
                    navigate(url.pathname + url.search);
                    return;
                }

                // If URL but not a recognized route, try to grab the last segment
                const pathSegments = url.pathname.split('/').filter(Boolean);
                if (pathSegments.length > 0) {
                    const potentialId = pathSegments[pathSegments.length - 1];
                    navigate(`/test-intro/${potentialId}`);
                    return;
                }

            } catch (e) {
                // Not a URL. If the user put an ID in the Link box by mistake, handle it.
                // Remove '#' if present
                const cleanInput = trimmedLink.replace(/^#/, '');
                // Basic check to see if it looks like an ID (no spaces)
                if (!cleanInput.includes(' ')) {
                    navigate(`/test-intro/${cleanInput}`);
                    return;
                }
            }
            // Fallback if parsing failed but we have input
            navigate(`/test-intro/${trimmedLink.replace(/^#/, '')}`);
            return;
        }

        toast.error("Please enter a link or ID");
    };

    return (
        <div className="relative group mb-8 animate-slide-up-fade stagger-1">
            {/* Glossy gradient outline effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500" />
            
            <div className="relative flex flex-col md:flex-row gap-4 items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto pl-2">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-inner hidden sm:block">
                        <Link2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight">Quick Jump</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">Paste a test link or ID to start immediately</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto flex-1 md:pl-8">
                    <div className="relative w-full flex-1">
                        <Input
                            placeholder="Paste test link (https://...)"
                            value={link}
                            onChange={(e) => {
                                setLink(e.target.value);
                                if (e.target.value) setTestId('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                            className="h-11 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500/30 transition-all font-medium"
                            disabled={!!testId}
                        />
                    </div>
                    
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase px-1 hidden sm:block">OR</div>
                    
                    <div className="relative w-full sm:w-[140px]">
                        <Input
                            placeholder="Test ID (#...)"
                            value={testId}
                            onChange={(e) => {
                                setTestId(e.target.value);
                                if (e.target.value) setLink('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                            className="h-11 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500/30 transition-all text-center font-mono font-bold"
                            disabled={!!link}
                        />
                    </div>

                    <Button
                        onClick={handleNavigate}
                        className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                    >
                        Go <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
