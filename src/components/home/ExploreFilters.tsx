import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ExploreFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    placeholders: string[];
    placeholderIndex: number;
}

export default function ExploreFilters({ searchQuery, setSearchQuery, placeholders, placeholderIndex }: ExploreFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border mb-8">
            <h2 className="text-lg font-semibold text-foreground pl-2">Explore Tests</h2>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={placeholders[placeholderIndex]}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-background"
                />
            </div>
        </div>
    );
}
