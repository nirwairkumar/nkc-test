import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExploreFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export default function ExploreFilters({ searchQuery, setSearchQuery }: ExploreFiltersProps) {
    const [isFocused, setIsFocused] = useState(false);

    // CSS-only animated placeholder — no JS setInterval, no React re-renders
    const animatedPlaceholder = searchQuery ? '' : 'Search by Title, Tag or Category...';

    return (
        <div className="relative group mb-8 animate-slide-up-fade stagger-1">
            {/* Glossy gradient outline effect */}
            <div className={cn(
                "absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500",
                isFocused && "opacity-60 blur-md duration-300"
            )} />
            
            <div className="relative flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 md:p-5 rounded-xl">
                <div className="flex items-center gap-2 w-full md:w-auto pl-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                        <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight">Explore Tests</h2>
                        <p className="text-xs text-muted-foreground hidden md:block">Find what you need to master next</p>
                    </div>
                </div>
                
                <div className="relative w-full md:w-80 lg:w-96">
                    <div className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 transition-transform duration-300",
                        isFocused && "scale-110 text-indigo-600 dark:text-indigo-400"
                    )}>
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                        placeholder={animatedPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={cn(
                            "pl-10 h-11 text-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 rounded-lg shadow-inner transition-all duration-300",
                            isFocused && "bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 shadow-lg"
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
