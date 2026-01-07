import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TestCardCategoryList({ categoryIds, allCategories, customCategory }: { categoryIds: string[] | undefined, allCategories: any[], customCategory?: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [showLeftArrow, setShowLeftArrow] = useState(false);

    // Filter valid categories
    const categories = (categoryIds || []).map(id => allCategories.find(s => s.id === id)).filter(Boolean);

    useEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [categories, customCategory]);

    const checkOverflow = () => {
        if (scrollRef.current) {
            const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;
            setShowRightArrow(scrollWidth > clientWidth && Math.ceil(scrollLeft + clientWidth) < scrollWidth);
            setShowLeftArrow(scrollLeft > 0);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = 100;
            scrollRef.current.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
            setTimeout(checkOverflow, 300); // Check after scroll animation
        }
    };

    if (categories.length === 0 && !customCategory) return null;

    return (
        <div className="flex-1 min-w-0 relative group flex items-center justify-end">
            {/* Left Fade/Arrow */}
            {showLeftArrow && (
                <div className="absolute left-0 z-10 h-full flex items-center bg-gradient-to-r from-white to-transparent pr-2">
                    <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="h-5 w-5 flex items-center justify-center hover:text-primary transition-colors">
                        <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            )}

            <div
                ref={scrollRef}
                onScroll={checkOverflow}
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-full px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {categories.map((cat: any) => (
                    <span key={cat.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap shrink-0">
                        {cat.name}
                    </span>
                ))}
                {customCategory && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">
                        {customCategory}
                    </span>
                )}
            </div>

            {/* Right Arrow */}
            {showRightArrow && (
                <div className="absolute right-0 z-10 h-full flex items-center bg-gradient-to-l from-white to-transparent pl-2">
                    <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="h-5 w-5 flex items-center justify-center hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            )}
        </div>
    );
}
