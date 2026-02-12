import React, { useEffect, useState } from 'react';

import FolderCard from './FolderCard';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleCategories.map((cat) => (
                    <FolderCard
                        key={cat.id}
                        categoryName={cat.name}
                        testCount={counts[cat.id] || 0}
                    />
                ))}
            </div>

            {categories.length > 8 && (
                <div className="mt-4 flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                        className="text-muted-foreground"
                    >
                        {showAll ? (
                            <>Show Less <ChevronUp className="h-4 w-4 ml-2" /></>
                        ) : (
                            <>View More ({categories.length - 8}) <ChevronDown className="h-4 w-4 ml-2" /></>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
