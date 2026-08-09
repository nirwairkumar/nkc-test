import React, { useEffect, useState } from 'react';
import { fetchAllAiHistory, fetchAiHistoryDetail } from '@/lib/usersApi';
import { getApiUrl } from '@/lib/getApiUrl';
import LatexRenderer from '@/components/ui/LatexRenderer';
import { 
    Sparkles, FileText, User, Search, RefreshCw, CheckCircle2, 
    FileUp, Layers, Eye, HelpCircle, AlertCircle, ArrowUpDown,
    Youtube, Tag, Clock, Zap, ExternalLink, ChevronRight, ChevronLeft, File,
    Activity, Cpu, ShieldCheck, Download, Check, X, Terminal
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
    
    // Server-Side Pagination & Stats State
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({
        total_requests: 0,
        total_questions: 0,
        generate_ai_count: 0,
        youtube_count: 0,
        topics_count: 0,
        avg_execution_time: 2.4
    });

    // Inspection Drawer/Modal State
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [inspectLoading, setInspectLoading] = useState(false);

    // AI Health Test Modal State
    const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
    const [healthTesting, setHealthTesting] = useState(false);
    const [healthResult, setHealthResult] = useState<any | null>(null);

    const loadHistory = async (targetPage: number = page, targetSubSection: AiSubSection = activeSubSection, targetSearch: string = searchQuery) => {
        setLoading(true);
        const { data, error } = await fetchAllAiHistory(targetPage, 10, targetSubSection, targetSearch);
        if (error) {
            toast.error("Failed to load AI generation history: " + (error.message || String(error)));
        } else if (data) {
            if (Array.isArray(data)) {
                setHistory(data);
                setTotal(data.length);
            } else {
                setHistory(data.items || []);
                setTotal(data.total || 0);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        setPage(1);
        loadHistory(1, activeSubSection, searchQuery);
    }, [activeSubSection]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadHistory(1, activeSubSection, searchQuery);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadHistory(newPage, activeSubSection, searchQuery);
    };

    const handleRunAiTest = async () => {
        setIsHealthCheckOpen(true);
        setHealthTesting(true);
        setHealthResult(null);

        try {
            const API_BASE = getApiUrl();
            const url = API_BASE.endsWith('/') ? `${API_BASE}ai/test-key` : `${API_BASE}/ai/test-key`;
            const res = await fetch(url, { method: 'POST' });
            const data = await res.json();
            setHealthResult(data);
            if (data.status === 'healthy') {
                toast.success(`AI Health Check Passed (${data.response_time_ms}ms)`);
            } else {
                toast.error(`AI Health Check Failed: ${data.message || 'Unknown error'}`);
            }
        } catch (e: any) {
            setHealthResult({
                status: 'error',
                message: 'Failed to reach AI Backend: ' + (e.message || String(e)),
                provider: 'Google Gemini (Vertex AI)'
            });
            toast.error("Network or API Error during AI test");
        } finally {
            setHealthTesting(false);
        }
    };

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

    // On-Demand Targeted Fetch for Inspecting Details
    const handleViewDetails = async (item: any) => {
        setIsDialogOpen(true);
        setInspectLoading(true);
        setSelectedItem(null);

        const { data, error } = await fetchAiHistoryDetail(item.id);
        if (error || !data) {
            toast.error("Could not fetch full inspection logs. Displaying summary metadata.");
            setSelectedItem(item);
        } else {
            setSelectedItem(data);
        }
        setInspectLoading(false);
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
                            Monitor real-time prompt extractions, YouTube video test creations, AI topic classifications, step-by-step latencies, and KaTeX mathematical formulas.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Test AI Health Button */}
                        <Button 
                            onClick={handleRunAiTest} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-lg transition-all flex items-center gap-2"
                        >
                            <Activity className="w-4 h-4 text-emerald-200 animate-pulse" />
                            Test AI API Key
                        </Button>

                        <Button 
                            onClick={loadHistory} 
                            disabled={loading} 
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Engine Logs
                        </Button>
                    </div>
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
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stats.total_requests}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Logged across all tools</p>
                </div>

                {/* Metric 2 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions Built</span>
                        <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stats.total_questions}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Total questions extracted</p>
                </div>

                {/* Metric 3 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gen / Extract AI</span>
                        <div className="w-8 h-8 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <FileUp className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stats.generate_ai_count}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Paper & Prompt requests</p>
                </div>

                {/* Metric 4 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">YouTube Tests</span>
                        <div className="w-8 h-8 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <Youtube className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stats.youtube_count}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Video test generations</p>
                </div>

                {/* Metric 5 */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Step Speed</span>
                        <div className="w-8 h-8 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{stats.avg_execution_time}s</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Mean AI processing time</p>
                </div>
            </div>

            {/* iOS Segmented Sub-section Navigation & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Segmented Controls */}
                <div className="bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-2xl flex items-center w-full sm:w-auto shadow-inner backdrop-blur-md">
                    <button
                        onClick={() => setActiveSubSection('all')}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            activeSubSection === 'all'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        All Tools
                    </button>

                    <button
                        onClick={() => setActiveSubSection('generate_with_ai')}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            activeSubSection === 'generate_with_ai'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate with AI ({stats.generate_ai_count})
                    </button>

                    <button
                        onClick={() => setActiveSubSection('youtube')}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            activeSubSection === 'youtube'
                                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Youtube className="w-3.5 h-3.5" />
                        YouTube Tests ({stats.youtube_count})
                    </button>

                    <button
                        onClick={() => setActiveSubSection('topics')}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            activeSubSection === 'topics'
                                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <Tag className="w-3.5 h-3.5" />
                        Topic Tagging ({stats.topics_count})
                    </button>
                </div>

                {/* Search Bar */}
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
                                Real-time inspectable logs capturing user prompts, file attachments, system generated questions, step latencies, and KaTeX rendering.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800">
                            {total} Entries Total
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
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                                            <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching AI logs found</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your sub-section tab or search term.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((item) => {
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
                                                                    OCR: {timingSteps.analyzing || timingSteps.ocr || 0}s | AI: {timingSteps.extracting || timingSteps.extraction || 0}s
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

                {/* iOS Pagination Controls Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <p className="text-slate-500 font-medium">
                        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{total > 0 ? (page - 1) * 10 + 1 : 0}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(page * 10, total)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{total}</span> entries
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || loading}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-8 rounded-xl px-3 text-xs font-bold border-slate-200 dark:border-slate-800 flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>

                        <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-400">
                            Page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{Math.ceil(total / 10) || 1}</strong>
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= (Math.ceil(total / 10) || 1) || loading}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-8 rounded-xl px-3 text-xs font-bold border-slate-200 dark:border-slate-800 flex items-center gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* AI Health Check Diagnostic Modal */}
            <Dialog open={isHealthCheckOpen} onOpenChange={setIsHealthCheckOpen}>
                <DialogContent className="max-w-lg rounded-3xl p-6 bg-slate-900 text-white border border-slate-800 shadow-2xl font-sans">
                    <DialogHeader className="pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-extrabold text-white">
                                    AI Engine Connectivity Diagnostic
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    Testing Vertex AI & Gemini API key latency and authorization.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {healthTesting ? (
                            <div className="py-10 text-center space-y-3">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                                <p className="text-xs font-bold text-slate-300">Sending test ping to Gemini 2.5 Flash model...</p>
                            </div>
                        ) : healthResult ? (
                            <div className="space-y-3">
                                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                                    healthResult.status === 'healthy' 
                                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                                }`}>
                                    {healthResult.status === 'healthy' ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className="font-extrabold text-sm">
                                            {healthResult.status === 'healthy' ? 'System Operational' : 'API Health Check Issue'}
                                        </h4>
                                        <p className="text-xs mt-1 leading-relaxed">{healthResult.message}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs font-mono">
                                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                        <span className="text-slate-400">Provider</span>
                                        <span className="font-bold text-indigo-400">{healthResult.provider || 'Google Gemini'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                        <span className="text-slate-400">Model</span>
                                        <span className="font-bold text-slate-200">{healthResult.model || 'gemini-2.5-flash'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                        <span className="text-slate-400">Response Latency</span>
                                        <span className="font-bold text-amber-400">{healthResult.response_time_ms} ms</span>
                                    </div>
                                    {healthResult.test_response && (
                                        <div className="pt-1">
                                            <span className="text-slate-400 block mb-1">Model Output:</span>
                                            <span className="bg-slate-900 p-2 rounded block text-emerald-300 text-[11px] truncate">
                                                "{healthResult.test_response}"
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <Button 
                            variant="outline"
                            onClick={() => setIsHealthCheckOpen(false)}
                            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs rounded-xl"
                        >
                            Close
                        </Button>
                        <Button 
                            onClick={handleRunAiTest}
                            disabled={healthTesting}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                        >
                            Re-run Test
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
                                        Full system audit breakdown of user request, step timings, and rendered mathematical outputs.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {inspectLoading ? (
                        <div className="py-20 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Fetching inspection logs & generated questions...</p>
                        </div>
                    ) : selectedItem ? (
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
                                                    <span className="text-slate-500">1. Document Upload & File Reading</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.uploading || selectedItem.parsed_data.timing_steps.file_upload || 0}s
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">2. Vision & OCR Page Classification</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.analyzing || selectedItem.parsed_data.timing_steps.ocr || 0}s
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">3. AI Question Extraction</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.extracting || selectedItem.parsed_data.timing_steps.extraction || 0}s
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className="text-slate-500">4. Structure Finalization</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                        {selectedItem.parsed_data.timing_steps.finalizing || selectedItem.parsed_data.timing_steps.structuring || 0}s
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {selectedItem.parsed_data?.used_method && (
                                            <div className="flex items-center justify-between text-xs py-1">
                                                <span className="text-slate-500">Extraction Engine</span>
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
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <File className="w-4 h-4 text-indigo-500" />
                                                    {selectedItem.file_name}
                                                </p>
                                                {selectedItem.parsed_data?.files_details?.[0] && (
                                                    <p className="text-[10px] text-slate-500 font-mono">
                                                        Size: {formatBytes(selectedItem.parsed_data.files_details[0].size_bytes)} | Type: {selectedItem.parsed_data.files_details[0].type}
                                                    </p>
                                                )}
                                                {selectedItem.parsed_data?.files_details?.[0]?.url && (
                                                    <a
                                                        href={selectedItem.parsed_data.files_details[0].url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 underline pt-1"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Original File
                                                    </a>
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
                                    selectedItem.parsed_data.questions.map((q: any, idx: number) => {
                                        const stem = q.question_text || q.question || q.stem || 'Question Stem';
                                        
                                        // Standardize options array/object
                                        let optionsList: { key: string; text: string; isCorrect: boolean }[] = [];
                                        if (q.options) {
                                            if (Array.isArray(q.options)) {
                                                optionsList = q.options.map((opt: any, optIdx: number) => {
                                                    const text = typeof opt === 'string' ? opt : (opt.text || opt.option || '');
                                                    const isCorrect = typeof opt === 'object' && opt.is_correct || (q.correct_option === optIdx || q.correct_answer === text);
                                                    return {
                                                        key: String.fromCharCode(65 + optIdx),
                                                        text,
                                                        isCorrect
                                                    };
                                                });
                                            } else if (typeof q.options === 'object') {
                                                optionsList = Object.entries(q.options).map(([k, val]: [string, any]) => {
                                                    const text = typeof val === 'object' && val !== null ? (val.text || '') : String(val || '');
                                                    const isCorrect = q.correctAnswer === k || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(k));
                                                    return { key: k, text, isCorrect };
                                                });
                                            }
                                        }

                                        return (
                                            <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="space-y-1.5 flex-1">
                                                            <LatexRenderer className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                                                {stem}
                                                            </LatexRenderer>
                                                            {q.diagram_url && (
                                                                <img src={q.diagram_url} alt="Question Diagram" className="max-h-44 rounded-xl border border-slate-200 dark:border-slate-700 my-2" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase shrink-0 bg-slate-50 dark:bg-slate-800">
                                                        {q.question_type || q.type || 'MCQ'}
                                                    </Badge>
                                                </div>

                                                {/* Options Grid with KaTeX */}
                                                {optionsList.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                                                        {optionsList.map((opt, optIdx) => (
                                                            <div 
                                                                key={optIdx} 
                                                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                                                                    opt.isCorrect 
                                                                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold' 
                                                                        : 'bg-slate-50/60 border-slate-200/80 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <div className="flex gap-1.5 items-start">
                                                                    <span className="font-bold shrink-0">{opt.key}:</span>
                                                                    <LatexRenderer>{opt.text}</LatexRenderer>
                                                                </div>
                                                                {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                                                            </div>
                                                        ))}
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
                                                                <LatexRenderer>{q.explanation || q.solution}</LatexRenderer>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
