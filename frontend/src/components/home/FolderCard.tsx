import React from 'react';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toSlug } from '@/lib/slugUtils';

interface FolderCardProps {
    categoryName: string;
    testCount: number;
}

export default function FolderCard({ categoryName, testCount }: FolderCardProps) {
    const navigate = useNavigate();
    const slug = toSlug(categoryName);

    return (
        <div
            onClick={() => navigate(`/tests/${slug}`)}
            className="group relative flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-300 overflow-hidden h-full min-h-[140px]"
        >
            {/* Top Gradient Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-purple-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <GraduationCap className="h-6 w-6" />
                </div>
                {/* Hover Arrow */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <div>
                <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {categoryName}
                </h3>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {testCount} {testCount === 1 ? 'Test' : 'Tests'}
                </p>
            </div>

            {/* Background Decoration Pattern (Optional) */}
            <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                <GraduationCap className="h-24 w-24 -rotate-12" />
            </div>
        </div>
    );
}
