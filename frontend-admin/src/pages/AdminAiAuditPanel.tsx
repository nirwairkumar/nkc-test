import React, { useEffect, useState } from 'react';
import { fetchAllAiHistory } from '@/lib/usersApi';
import { 
    Sparkles, FileText, User, Search, RefreshCw, CheckCircle2, 
    FileUp, Layers, Eye, HelpCircle, AlertCircle, ArrowUpDown,
    Youtube, Tag, Clock, Zap, ExternalLink, ChevronRight, File,
    Activity, Cpu, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';

type AiSubSection = 'all' | 'generate_with_ai' | 'youtube' | 'topics';

export default function AdminAiAuditPanel() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubSection, setActiveSubSection] = useState<AiSubSection>('all');
    
    // Inspection Drawer/Modal State
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

    // Categorize tool items safely
    const getItemToolType = (item: any): AiSubSection => {
        const parsed = item.parsed_data || {};
        const toolType = parsed.tool_type || item.tool_type;
        if (toolType === 'youtube' || item.mode === 'youtube' || (item.file_name && item.file_name.toLowerCase().includes('youtube'))) {
            return 'youtube';
        }
        if (toolType === 'topics' || item.mode === 'topics' || (item.title && item.title.toLowerCase().includes('topic tagging'))) {
            return 'topics';
        }
        return 'generate_with_ai';
    };

    const filteredHistory = history.filter(item => {
        const userStr = `${item.user_profile?.full_name || ''} ${item.user_profile?.email || ''}`.toLowerCase();
        const titleStr = `${item.title || ''} ${item.description || ''} ${item.file_name || ''}`.toLowerCase();
        const matchesSearch = userStr.includes(searchQuery.toLowerCase()) || titleStr.includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;
        if (activeSubSection === 'all') return true;
        
        const itemType = getItemToolType(item);
        return itemType === activeSubSection;
    });

    // Global Statistics
    const totalRequests = history.length;
    const totalQuestions = history.reduce((sum, item) => sum + (item.question_count || 0), 0);
    
    const generateAiCount = history.filter(item => getItemToolType(item) === 'generate_with_ai').length;
    const youtubeCount = history.filter(item => getItemToolType(item) === 'youtube').length;
    const topicsCount = history.filter(item => getItemToolType(item) === 'topics').length;

    // Average timing metric
    const itemsWithTiming = history.filter(item => {
        const time = item.parsed_data?.execution_time_seconds || item.execution_time_seconds;
        return typeof time === 'number' && time > 0;
    });
    const avgExecutionTime = itemsWithTiming.length > 0
        ? (itemsWithTiming.reduce((acc, item) => acc + (item.parsed_data?.execution_time_seconds || item.execution_time_seconds), 0) / itemsWithTiming.length).toFixed(1)
        : '2.4';

    const handleViewDetails = (item: any) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return null;
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header with iOS Glass Accent */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800/80 backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/2 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                                iOS Admin Intelligence
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            AI Audit & Analysis Panel
                        </h1>
                        <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            Monitor real-time prompt extractions, YouTube video test creations, AI topic classifications, execution step timings, and complete user inputs.
                        </p>
                    </div>

                    <Button 
                        onClick={loadHistory} 
                        disabled={loading} 
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-2xl px-5 py-2.5 text-xs font-semibold shadow-lg transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Engine Logs
                    </Button>
                </div>
            </div>

            {/* iOS System Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* Metric 1 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
                        <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{totalRequests}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Logged across all tools</p>
                </div>

                {/* Metric 2 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions Built</span>
                        <div className="w-8 h-8 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 tracking-tight">{totalQuestions}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">AI generated questions</p>
                </div>

                {/* Metric 3 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gen With AI</span>
                        <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <FileUp className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{generateAiCount}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">PDF/Image & Prompts</p>
                </div>

                {/* Metric 4 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">YouTube Tests</span>
                        <div className="w-8 h-8 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <Youtube className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tight">{youtubeCount}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Video URL extractions</p>
                </div>

                {/* Metric 5 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Step Time</span>
                        <div className="w-8 h-8 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">{avgExecutionTime}s</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Processing speed avg</p>
                </div>
            </div>

            {/* iOS Sub-section Segmented Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                {/* iOS Segmented Pill Group */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveSubSection('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeSubSection === 'all'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        All AI Tools ({history.length})
                    </button>

                    <button
                        onClick={() => setActiveSubSection('generate_with_ai')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeSubSection === 'generate_with_ai'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Generate-with-AI ({generateAiCount})
                    </button>

                    <button
                        onClick={() => setActiveSubSection('youtube')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeSubSection === 'youtube'
                                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Youtube className="w-3.5 h-3.5 text-rose-500" />
                        YouTube Generation ({youtubeCount})
                    </button>

                    <button
                        onClick={() => setActiveSubSection('topics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeSubSection === 'topics'
                                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Tag className="w-3.5 h-3.5 text-purple-500" />
                        Topic Generation ({topicsCount})
                    </button>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search user, file, URL or prompt..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-xs rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                </div>
            </div>

            {/* Main Log Data Table Card */}
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                {activeSubSection === 'all' && 'All Generation Records'}
                                {activeSubSection === 'generate_with_ai' && 'Generate-with-AI Audit Logs'}
                                {activeSubSection === 'youtube' && 'YouTube Test Generation Audit Logs'}
                                {activeSubSection === 'topics' && 'Topic Classification Audit Logs'}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Real-time inspectable logs capturing user prompts, file attachments, system generated questions, and execution step latencies.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800">
                            {filteredHistory.length} Entries
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider">
                                    <TableHead className="py-3.5 pl-6">User & Identity</TableHead>
                                    <TableHead className="py-3.5">Sub-section & Inputs</TableHead>
                                    <TableHead className="py-3.5">Generated Title / Output</TableHead>
                                    <TableHead className="py-3.5 text-center">Execution Time</TableHead>
                                    <TableHead className="py-3.5 text-center">Questions</TableHead>
                                    <TableHead className="py-3.5">Timestamp</TableHead>
                                    <TableHead className="py-3.5 text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                                            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-500 mb-3" />
                                            <p className="text-xs font-semibold">Loading AI analytics snapshot...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                                            <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching AI logs found</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your sub-section tab or search term.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredHistory.map((item) => {
                                        const userProfile = item.user_profile || {};
                                        const itemTool = getItemToolType(item);
                                        const parsed = item.parsed_data || {};
                                        const execTime = parsed.execution_time_seconds || item.execution_time_seconds;
                                        const timingSteps = parsed.timing_steps;

                                        return (
                                            <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                {/* User Info */}
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            <AvatarImage src={userProfile.avatar_url} />
                                                            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                                                                {(userProfile.full_name || userProfile.email || 'U').slice(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                                                {userProfile.full_name || 'Anonymous User'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 line-clamp-1">{userProfile.email || 'No email'}</p>
                                                            {userProfile.designation && (
                                                                <span className="inline-block mt-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                    {userProfile.designation}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Mode & Inputs */}
                                                <TableCell className="py-4">
                                                    <div className="space-y-1.5 max-w-xs">
                                                        {itemTool === 'youtube' && (
                                                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider gap-1">
                                                                <Youtube className="w-3 h-3 text-rose-500" />
                                                                YouTube Video
                                                            </Badge>
                                                        )}
                                                        {itemTool === 'topics' && (
                                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider gap-1">
                                                                <Tag className="w-3 h-3 text-purple-500" />
                                                                Topic Classifier
                                                            </Badge>
                                                        )}
                                                        {itemTool === 'generate_with_ai' && (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider gap-1">
                                                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                                                {item.mode === 'extract' ? 'PDF / Image Extract' : 'Generate Prompt'}
                                                            </Badge>
                                                        )}

                                                        {/* Uploaded File or Input URL */}
                                                        {item.file_name && (
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                                                                <FileUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span className="truncate">{item.file_name}</span>
                                                            </p>
                                                        )}
                                                        {parsed.youtube_url && !item.file_name && (
                                                            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                                                <span className="truncate">{parsed.youtube_url}</span>
                                                            </p>
                                                        )}
                                                        {item.description && !item.file_name && !parsed.youtube_url && (
                                                            <p className="text-xs text-slate-500 line-clamp-1 italic">
                                                                "{item.description}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Output Title */}
                                                <TableCell className="py-4 max-w-xs">
                                                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2">
                                                        {item.title || 'Untitled AI Generation'}
                                                    </p>
                                                    {parsed.used_method && (
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                            Engine: {parsed.used_method}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Execution Time */}
                                                <TableCell className="py-4 text-center">
                                                    {execTime ? (
                                                        <div className="inline-flex flex-col items-center">
                                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono font-bold text-[11px] border border-amber-200 dark:border-amber-900/50">
                                                                ⚡ {execTime}s
                                                            </Badge>
                                                            {timingSteps && (
                                                                <span className="text-[9px] text-slate-400 mt-1 font-mono">
                                                                    Ex: {timingSteps.extracting || 0}s | AI: {timingSteps.finalizing || 0}s
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-mono">~1.5s</span>
                                                    )}
                                                </TableCell>

                                                {/* Question Count */}
                                                <TableCell className="py-4 text-center">
                                                    <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs px-2.5 py-0.5">
                                                        {item.question_count || 0} Qs
                                                    </Badge>
                                                </TableCell>

                                                {/* Created Date */}
                                                <TableCell className="py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                </TableCell>

                                                {/* Action Button */}
                                                <TableCell className="py-4 text-right pr-6">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleViewDetails(item)}
                                                        className="h-8 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-600 shadow-sm transition-all"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                        Inspect
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* iOS Inspection Drawer / Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-2xl font-sans">
                    <DialogHeader className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                                        AI Generation Inspector
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500">
                                        Full system audit breakdown of user request, execution timings, and platform generated outputs.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedItem && (
                        <div className="space-y-6 py-3">
                            {/* User Profile Card */}
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-11 w-11 border border-slate-200 dark:border-slate-700">
                                        <AvatarImage src={selectedItem.user_profile?.avatar_url} />
                                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                                            {(selectedItem.user_profile?.full_name || selectedItem.user_profile?.email || 'U').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            {selectedItem.user_profile?.full_name || 'Anonymous User'}
                                        </h4>
                                        <p className="text-xs text-slate-500">{selectedItem.user_profile?.email || 'No Email'}</p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">User Role</span>
                                    <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold capitalize mt-0.5">
                                        {selectedItem.user_profile?.designation || 'Student / Teacher'}
                                    </Badge>
                                </div>
                            </div>

                            {/* iOS Grouped Details: Step Timings & Input Files */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Execution Timing Details */}
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        Execution Latency & Step Timings
                                    </h4>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">Total Duration</span>
                                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                                {selectedItem.parsed_data?.execution_time_seconds || selectedItem.execution_time_seconds || '1.8'}s
                                            </span>
                                        </div>

                                        {selectedItem.parsed_data?.timing_steps && (
                                            <>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">1. Document Upload</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.uploading || 0}s
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">2. Vision & OCR Analysis</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.analyzing || 0}s
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">3. AI Question Extraction</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.extracting || 0}s
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {selectedItem.parsed_data?.used_method && (
                                            <div className="flex items-center justify-between text-xs py-1">
                                                <span className="text-slate-500">Extraction Method</span>
                                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                                                    {selectedItem.parsed_data.used_method}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* User Input & File Details */}
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                                        User Input & Attached Files
                                    </h4>

                                    <div className="space-y-2 text-xs">
                                        {selectedItem.file_name && (
                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <File className="w-4 h-4 text-indigo-500" />
                                                    {selectedItem.file_name}
                                                </p>
                                                {selectedItem.parsed_data?.files_details?.[0] && (
                                                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                                                        Size: {formatBytes(selectedItem.parsed_data.files_details[0].size_bytes)} | Type: {selectedItem.parsed_data.files_details[0].type}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {selectedItem.parsed_data?.youtube_url && (
                                            <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
                                                <span className="text-[10px] font-bold text-rose-600 uppercase block mb-1">YouTube Link</span>
                                                <a href={selectedItem.parsed_data.youtube_url} target="_blank" rel="noreferrer" className="text-rose-700 dark:text-rose-300 font-semibold underline flex items-center gap-1 truncate">
                                                    {selectedItem.parsed_data.youtube_url}
                                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                                </a>
                                            </div>
                                        )}

                                        {selectedItem.description && (
                                            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Prompt / Instructions</span>
                                                <p className="text-slate-700 dark:text-slate-300 italic">{selectedItem.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Generated Output Questions Listing */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-indigo-500" />
                                        Platform Generated Output Questions ({selectedItem.parsed_data?.questions?.length || 0})
                                    </h3>
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-xs">
                                        {selectedItem.question_count || 0} Questions Total
                                    </Badge>
                                </div>

                                {(!selectedItem.parsed_data?.questions || selectedItem.parsed_data.questions.length === 0) ? (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500 italic">No structured question JSON found for this log entry.</p>
                                    </div>
                                ) : (
                                    selectedItem.parsed_data.questions.map((q: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="space-y-1.5">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                                            {q.question_text || q.question || q.stem || 'Question Stem'}
                                                        </p>
                                                        {q.diagram_url && (
                                                            <img src={q.diagram_url} alt="Question Diagram" className="max-h-44 rounded-xl border border-slate-200 dark:border-slate-700 my-2" />
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase shrink-0 bg-slate-50 dark:bg-slate-800">
                                                    {q.question_type || q.type || 'MCQ'}
                                                </Badge>
                                            </div>

                                            {/* Options Grid */}
                                            {q.options && Array.isArray(q.options) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                                                    {q.options.map((opt: any, optIdx: number) => {
                                                        const optText = typeof opt === 'string' ? opt : opt.text || opt.option || '';
                                                        const isCorrect = typeof opt === 'object' && opt.is_correct || (q.correct_option === optIdx || q.correct_answer === optText);
                                                        return (
                                                            <div 
                                                                key={optIdx} 
                                                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                                                                    isCorrect 
                                                                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold' 
                                                                        : 'bg-slate-50/60 border-slate-200/80 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <span>{String.fromCharCode(65 + optIdx)}. {optText}</span>
                                                                {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Topic or Solution Explanation */}
                                            {(q.explanation || q.solution || q.topic) && (
                                                <div className="pl-10 pt-1 space-y-2">
                                                    {q.topic && (
                                                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                                                            Topic: {q.topic}
                                                        </Badge>
                                                    )}
                                                    {(q.explanation || q.solution) && (
                                                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
                                                            <span className="font-bold block mb-1">Detailed Explanation:</span>
                                                            {q.explanation || q.solution}
                                                        </div>
                                                    )}
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
