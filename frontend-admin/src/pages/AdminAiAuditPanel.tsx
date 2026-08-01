import React, { useEffect, useState } from 'react';
import { fetchAllAiHistory } from '@/lib/usersApi';
import { 
    Sparkles, FileText, User, Search, RefreshCw, CheckCircle2, 
    FileUp, Layers, Eye, HelpCircle, AlertCircle, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function AdminAiAuditPanel() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [modeFilter, setModeFilter] = useState<'all' | 'extract' | 'generate'>('all');
    
    // Modal state for viewing questions
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const loadHistory = async () => {
        setLoading(true);
        const { data, error } = await fetchAllAiHistory();
        if (error) {
            toast.error("Failed to load AI generation history: " + (error.message || String(error)));
        } else {
            setHistory(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const filteredHistory = history.filter(item => {
        const userStr = `${item.user_profile?.full_name || ''} ${item.user_profile?.email || ''}`.toLowerCase();
        const titleStr = `${item.title || ''} ${item.description || ''} ${item.file_name || ''}`.toLowerCase();
        const matchesSearch = userStr.includes(searchQuery.toLowerCase()) || titleStr.includes(searchQuery.toLowerCase());
        
        if (modeFilter === 'all') return matchesSearch;
        return matchesSearch && item.mode === modeFilter;
    });

    // Compute metrics
    const totalRequests = history.length;
    const totalQuestions = history.reduce((sum, item) => sum + (item.question_count || 0), 0);
    const fileExtractions = history.filter(item => item.mode === 'extract').length;
    const promptGenerations = history.filter(item => item.mode === 'generate').length;

    const handleViewQuestions = (item: any) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        AI Generation Audit & Analytics
                    </h1>
                    <p className="text-sm text-slate-500">
                        Monitor all AI test generations, file uploads, generated questions, and user actions.
                    </p>
                </div>
                <Button onClick={loadHistory} disabled={loading} variant="outline" size="sm" className="w-fit">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total AI Requests</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalRequests}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questions Generated</p>
                            <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{totalQuestions}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Layers className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PDF / Image Extracts</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{fileExtractions}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <FileUp className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prompt Generations</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{promptGenerations}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Generation Logs</CardTitle>
                            <CardDescription>Detailed history of user AI generations.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Mode Filter Buttons */}
                            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                                <button
                                    onClick={() => setModeFilter('all')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${modeFilter === 'all' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setModeFilter('extract')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${modeFilter === 'extract' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                >
                                    PDF Extractions
                                </button>
                                <button
                                    onClick={() => setModeFilter('generate')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${modeFilter === 'generate' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                >
                                    Prompts
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search user, file, or topic..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                <TableHead>User</TableHead>
                                <TableHead>Mode & File / Prompt</TableHead>
                                <TableHead>Test Title</TableHead>
                                <TableHead className="text-center">Questions</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                                        Loading AI logs...
                                    </TableCell>
                                </TableRow>
                            ) : filteredHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                        No AI generation records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredHistory.map((item) => {
                                    const userProfile = item.user_profile || {};
                                    return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            {/* User Details */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={userProfile.avatar_url} />
                                                        <AvatarFallback>{(userProfile.full_name || userProfile.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                                            {userProfile.full_name || 'Anonymous User'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">{userProfile.email || 'No email'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Mode & File */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`text-[10px] uppercase tracking-wider font-semibold ${
                                                            item.mode === 'extract' 
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' 
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {item.mode === 'extract' ? 'File Extract' : 'AI Prompt'}
                                                    </Badge>
                                                    {item.file_name && (
                                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                            <FileUp className="w-3 h-3 text-slate-400" />
                                                            {item.file_name}
                                                        </p>
                                                    )}
                                                    {item.description && !item.file_name && (
                                                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{item.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Test Title */}
                                            <TableCell>
                                                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                                                    {item.title || 'Untitled AI Test'}
                                                </p>
                                            </TableCell>

                                            {/* Question Count */}
                                            <TableCell className="text-center">
                                                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                                                    {item.question_count || 0} Qs
                                                </Badge>
                                            </TableCell>

                                            {/* Created Date */}
                                            <TableCell className="text-xs text-slate-500">
                                                {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-medium border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
                                                    onClick={() => handleViewQuestions(item)}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                                                    View Questions
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Questions Inspection Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            <DialogTitle className="text-lg">Generated Questions Inspection</DialogTitle>
                        </div>
                        <DialogDescription>
                            Review questions generated by AI for <strong>{selectedItem?.user_profile?.full_name || selectedItem?.user_profile?.email || 'User'}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedItem && (
                        <div className="space-y-6 py-2">
                            {/* Summary Metadata Card */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Test Title</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{selectedItem.title || 'Untitled'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Mode</p>
                                    <p className="text-xs font-bold text-indigo-600 uppercase">{selectedItem.mode}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">File Uploaded</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{selectedItem.file_name || 'None (Prompt)'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Question Count</p>
                                    <p className="text-xs font-bold text-emerald-600">{selectedItem.question_count || 0} Questions</p>
                                </div>
                            </div>

                            {/* Questions Listing */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2">
                                    Questions ({selectedItem.parsed_data?.questions?.length || 0})
                                </h3>

                                {(!selectedItem.parsed_data?.questions || selectedItem.parsed_data.questions.length === 0) ? (
                                    <p className="text-xs text-slate-500 italic">No question details available in snapshot.</p>
                                ) : (
                                    selectedItem.parsed_data.questions.map((q: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-white dark:bg-slate-900 border rounded-xl space-y-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-2.5">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                            {q.question_text || q.question || q.stem || 'Question'}
                                                        </p>
                                                        {q.diagram_url && (
                                                            <img src={q.diagram_url} alt="Question Diagram" className="max-h-40 rounded-md border my-2" />
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                                                    {q.question_type || q.type || 'MCQ'}
                                                </Badge>
                                            </div>

                                            {/* Options */}
                                            {q.options && Array.isArray(q.options) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                                                    {q.options.map((opt: any, optIdx: number) => {
                                                        const optText = typeof opt === 'string' ? opt : opt.text || opt.option || '';
                                                        const isCorrect = typeof opt === 'object' && opt.is_correct || (q.correct_option === optIdx || q.correct_answer === optText);
                                                        return (
                                                            <div 
                                                                key={optIdx} 
                                                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold' 
                                                                        : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <span>{String.fromCharCode(65 + optIdx)}. {optText}</span>
                                                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            {(q.explanation || q.solution) && (
                                                <div className="pl-8 pt-2">
                                                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-xs text-indigo-900 dark:text-indigo-200">
                                                        <span className="font-bold block mb-1">Explanation:</span>
                                                        {q.explanation || q.solution}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
