import React from 'react';
import { GraduationCap, ArrowRight, BookOpen, Calculator, Beaker, Globe, Code, PenTool, Lightbulb, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toSlug } from '@/lib/slugUtils';
import { cn } from '@/lib/utils';

interface FolderCardProps {
    categoryName: string;
    testCount: number;
}

// Map index to a specific gradient and icon for variety
const getCategoryStyle = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const styles = [
        { gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: GraduationCap },
        { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: BookOpen },
        { gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: Calculator },
        { gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: Beaker },
        { gradient: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', icon: Globe },
        { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', icon: PenTool },
        { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Lightbulb },
        { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: Zap },
    ];
    return styles[hash % styles.length];
};

export default function FolderCard({ categoryName, testCount }: FolderCardProps) {
    const navigate = useNavigate();
    const slug = toSlug(categoryName);
    const style = getCategoryStyle(categoryName);
    const Icon = style.icon;

    return (
        <div
            onClick={() => navigate(`/tests/${slug}`)}
            className="group relative flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1.5 cursor-pointer transition-all duration-300 overflow-hidden h-full min-h-[140px]"
        >
            {/* Top Gradient Line */}
            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300", style.gradient)} />

            {/* Background Glow on Hover */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.05] transition-opacity duration-500", style.gradient)} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={cn("p-3 rounded-xl transition-all duration-500 group-hover:scale-110", style.bg)}>
                    <Icon className="h-6 w-6" />
                </div>
                {/* Hover Arrow */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                    <ArrowRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {categoryName}
                </h3>
                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="mr-1">{testCount}</span> {testCount === 1 ? 'Test' : 'Tests'}
                </div>
            </div>

            {/* Background Decoration Pattern */}
            <div className="absolute -bottom-6 -right-6 opacity-[0.02] dark:opacity-[0.03] group-hover:opacity-[0.05] dark:group-hover:opacity-[0.08] transition-opacity pointer-events-none transform group-hover:scale-110 group-hover:-rotate-12 duration-500">
                <Icon className="h-32 w-32" />
            </div>
        </div>
    );
}
