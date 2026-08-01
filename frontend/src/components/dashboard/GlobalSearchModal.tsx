import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Plus, Sparkles, FileText, Upload, Database, ChevronRight, Activity, BookOpen, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userTests?: any[];
}

export default function GlobalSearchModal({ open, onOpenChange, userTests = [] }: GlobalSearchModalProps) {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    // Keyboard shortcut handler (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onOpenChange(!open);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onOpenChange]);

    const quickActions = [
        { title: 'Create New Test', subtitle: 'Manual LaTeX & Section Builder', icon: Plus, action: () => navigate('/create-test'), color: 'text-blue-600 bg-blue-50' },
        { title: 'AI Test Studio', subtitle: 'Generate from PDF, YouTube, or Prompts', icon: Sparkles, action: () => navigate('/generate-with-ai'), color: 'text-purple-600 bg-purple-50' },
        { title: 'Import PDF Exam', subtitle: 'Extract questions & diagrams from file', icon: Upload, action: () => navigate('/generate-with-ai?tab=pdf'), color: 'text-emerald-600 bg-emerald-50' },
        { title: 'Study Materials', subtitle: 'Manage notes, syllabus, and resources', icon: BookOpen, action: () => navigate('/materials'), color: 'text-amber-600 bg-amber-50' },
    ];

    const filteredTests = userTests.filter(t => t.title?.toLowerCase().includes(query.toLowerCase()));

    const handleSelect = (callback: () => void) => {
        callback();
        onOpenChange(false);
        setQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xl bg-white">
                {/* Search Bar */}
                <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
                    <Search className="w-5 h-5 text-slate-400 shrink-0" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tests, actions, AI tools... (Press ESC to exit)"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-800 placeholder:text-slate-400 text-sm h-9 p-0"
                        autoFocus
                    />
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                        ESC
                    </span>
                </div>

                {/* Results Container */}
                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
                    {/* Quick Navigation / Actions */}
                    {!query && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                                Recommended Actions
                            </p>
                            <div className="space-y-1">
                                {quickActions.map((action, idx) => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelect(action.action)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">{action.title}</p>
                                                    <p className="text-[11px] text-slate-400">{action.subtitle}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filtered User Tests */}
                    {userTests.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                                {query ? 'Matching Exams & Tests' : 'Your Recent Tests'}
                            </p>
                            {filteredTests.length === 0 ? (
                                <p className="text-xs text-slate-400 px-3 py-4 text-center">No tests matching "{query}"</p>
                            ) : (
                                <div className="space-y-1">
                                    {filteredTests.slice(0, 5).map((test) => (
                                        <button
                                            key={test.id}
                                            onClick={() => handleSelect(() => navigate(`/edit-test/${test.id}`))}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">{test.title}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {test.total_questions || test.questions?.length || 0} Questions · {test.duration || 0} min
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-100 shrink-0">
                                                {test.visibility || 'private'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
