import React, { useEffect, useState } from 'react';

import FolderCard from './FolderCard';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';

export default function CategoryFolderCards() {
    const [categories, setCategories] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const { fetchCategoryStats } = await import('@/lib/categoriesApi');
            const { data, error } = await fetchCategoryStats();

            if (error) throw error;

            setCategories(data || []);

            // Map counts for compatibility with existing Render logic
            const countMap: Record<string, number> = {};
            (data || []).forEach((c: any) => {
                countMap[c.id] = c.count || 0;
            });
            setCounts(countMap);

        } catch (err) {
            console.error('Error loading folders:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null; // Or skeleton
    if (categories.length === 0) return null;

    const visibleCategories = showAll ? categories : categories.slice(0, 8);

    return (
        <div className="mb-10 animate-slide-up-fade stagger-2 relative z-10">
            <div className="flex items-center gap-3 mb-6 pl-1">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                    <FolderOpen className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                        Browse by Category
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Explore subjects and specific domains
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {visibleCategories.map((cat) => (
                    <FolderCard
                        key={cat.id}
                        categoryName={cat.name}
                        testCount={counts[cat.id] || 0}
                    />
                ))}
            </div>

            {categories.length > 8 && (
                <div className="mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => setShowAll(!showAll)}
                        className="rounded-full px-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        {showAll ? (
                            <>Show Less <ChevronUp className="h-4 w-4 ml-2" /></>
                        ) : (
                            <>View All Categories ({categories.length}) <ChevronDown className="h-4 w-4 ml-2" /></>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
