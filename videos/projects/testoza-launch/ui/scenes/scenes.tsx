/**
 * Static stand-ins for TestoZa screens that only exist inside a page's state machine.
 * Every class string and line of copy is the product's own; the source is named above
 * each component. Real components are imported where they render on their own.
 * Rendered to HTML by ui/render.mjs, never shipped to the app.
 */
import type { ReactNode } from 'react';
import {
    AlertTriangle, ArrowLeft, BarChart3, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList,
    Clock, Copy, Download, EyeOff, FileText, FileUp, Flag as FlagIcon, HelpCircle, Info, Key, Layers, Link as LinkIcon,
    ListChecks, Loader2, Lock, Maximize, Menu as MenuIcon, MessageSquareWarning, PencilLine, Plus, Radio, RefreshCw,
    Search, Settings, Share2, Shield, ShieldCheck, Sparkles, Square, Trash2, TriangleAlert, Upload, Users, X, Zap, Eye,
    CheckCircle2, Trophy, Save, KeyRound, Inbox, Pencil,
} from 'lucide-react';
import { UserTestCard } from '@/components/UserTestCard';
import { QuestionCard } from '@/components/test-builder/QuestionCard';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const TEST_TITLE = 'JEE Main 2026 · Physics Mock Test 01';
export const EXAM_URL = 'testoza.com/test/jee-phy-mock-7k2q';

/* ── components/dashboard/dashboardUi.tsx ─────────────────────────────── */
const PRIMARY_BTN =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_-12px_rgba(2,132,199,0.85)] ' +
    'transition-[background-color,transform] duration-150 hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const PILL_BTN =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 ' +
    'transition-[background-color,transform] duration-150 hover:bg-slate-200/80 motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const SEGMENT =
    'rounded-lg px-4 py-1.5 text-[14px] font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm';

const btn = (variant: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive', size: 'default' | 'sm' | 'icon' | 'lg', extra: string) =>
    cn(buttonVariants({ variant, size }), extra);

/* ═══ /generate-with-ai · Step 1 (pages/AITestImporter.tsx, "Step 1: File Upload") ═══ */
export function UploadStep1() {
    return (
        <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-8 pb-16">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI-Powered</p>
                    <p className="text-2xl font-bold text-white">Create Your Online Test</p>
                    <p className="text-sm text-slate-400 mt-1">Turn your question paper or notes into an online test in minutes.</p>
                </div>
            </div>
            <div className="px-4 -mt-10 pb-8 max-w-2xl mx-auto space-y-4">
                <div id="s1-upload" className="bg-white rounded-2xl shadow-sm border overflow-hidden border-slate-100">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                <FileUp className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">Upload Question Paper, Notes or Chapter</p>
                                <p className="text-[11px] text-slate-400">PDF or photos</p>
                            </div>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">⭐ Recommended</span>
                    </div>
                    <div className="p-4 space-y-3.5">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Select a PDF or photos of a question paper, class notes or study material. We'll turn it into an online test. Word or PowerPoint? Save it as PDF first.
                        </p>
                        <button id="s1-choose" type="button" className="w-full inline-flex items-center justify-center gap-2 bg-[#007AFF] text-white font-semibold text-sm h-11 rounded-xl shadow-sm">
                            <Upload className="w-4 h-4" />
                            <span>Choose File</span>
                        </button>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                            <span>⚡ Ready in ~2–3 minutes</span>
                        </div>
                    </div>
                </div>
                <div className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <PencilLine className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">Create Test Manually</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Type or paste questions with full control.</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                <div className="pt-1 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-500">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>How it works</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ═══ /generate-with-ai · Step 2 (pages/AITestImporter.tsx, "Step 2: Mode Selection") ═══ */
function Chip({ on, children }: { on?: boolean; children: ReactNode }) {
    return (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${on ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>{children}</span>
    );
}
function MarkRow({ label, sign, presets }: { label: string; sign: string; presets: string[] }) {
    return (
        <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">{label}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center rounded-lg border bg-slate-50/50 border-slate-200">
                    <span className="pl-2.5 text-xs font-semibold text-slate-400">{sign}</span>
                    <span className="w-16 bg-transparent px-1.5 py-1 text-xs font-normal text-slate-400">Auto</span>
                </div>
                {presets.map((p) => <Chip key={p}>{p}</Chip>)}
            </div>
        </div>
    );
}
export function UploadStep2({ fileName }: { fileName: string }) {
    return (
        <div className="container mx-auto pt-4 px-4 pb-8 max-w-2xl">
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="h-8 w-8 -ml-2 rounded-full text-slate-500 inline-flex items-center justify-center">
                            <ArrowLeft className="w-4 h-4" />
                        </span>
                        <h1 className="text-[15px] font-semibold text-slate-800 truncate">Selected files</h1>
                        <span className="ml-1 text-[11px] font-medium tabular-nums text-slate-500 bg-slate-100 rounded-full px-1.5 py-px">1</span>
                    </div>
                </div>
                <div id="s2-composer" className="relative rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] border-slate-200">
                    <div className="p-3 grid grid-cols-1 gap-2">
                        <div id="s2-file" className="relative flex items-center gap-3 min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 pr-10">
                            <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 truncate">{fileName}</p>
                                <p className="text-[11px] text-slate-400">PDF · 2.4 MB</p>
                            </div>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400">
                                <X className="w-3.5 h-3.5" />
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-9 h-9 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-slate-600">
                                <Plus className="w-[18px] h-[18px]" />
                            </span>
                            <span className="text-xs text-slate-400 truncate">Add more pages, or drop files here</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-lg text-[13px] font-medium text-slate-700 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>High accuracy</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                            <Key className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800">Answer key <span className="font-normal text-slate-400">· Optional</span></p>
                            <p className="text-[11px] leading-snug text-slate-500">Are the answers not next to each question, like an answer key on the last pages? Upload them here.</p>
                        </div>
                    </div>
                    <span className={btn('outline', 'sm', 'text-xs h-8 px-3 shrink-0 rounded-lg')}>Upload key</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Settings &amp; Constraints</h3>
                        </div>
                        <span className="text-[10px] text-slate-400">Customizable</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><span>🌐 Language Output</span></span>
                            <div className="flex items-center gap-1.5 flex-wrap"><Chip on>Same as Material</Chip><Chip>English</Chip><Chip>Hindi</Chip></div>
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-600">🎯 Target Difficulty</span>
                            <div className="flex items-center gap-1.5">
                                <span className="flex-1 py-1 rounded-lg text-xs font-medium text-center bg-slate-100 text-slate-600">🟢 Easy</span>
                                <span className="flex-1 py-1 rounded-lg text-xs font-medium text-center bg-amber-600 text-white shadow-sm">🟡 Moderate</span>
                                <span className="flex-1 py-1 rounded-lg text-xs font-medium text-center bg-slate-100 text-slate-600">🔴 Tough</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-slate-600">⚖️ Marking</span>
                        <div className="grid grid-cols-2 gap-3">
                            <MarkRow label="Marks per question" sign="+" presets={['1', '2', '3', '4']} />
                            <MarkRow label="Negative marks per wrong answer" sign="−" presets={['0', '0.25', '0.5', '1']} />
                        </div>
                    </div>
                </div>
                <div className="text-center space-y-1 mt-5 px-2">
                    <h2 className="text-lg font-bold text-slate-800 leading-snug tracking-tight">How do you want to process this file?</h2>
                    <p className="text-xs text-slate-500">Choose a mode based on your goal</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-4">
                    <div id="s2-extract" className="border-beam-container p-[1.5px] rounded-2xl bg-slate-200 group flex flex-col justify-between">
                        <div className="border-beam-gradient-blue" />
                        <div className="rounded-lg border-0 bg-white relative z-10 w-full h-full flex flex-col justify-between rounded-[15px]">
                            <div className="p-6 text-center flex flex-col justify-between h-full space-y-4">
                                <div className="space-y-4 flex-1">
                                    <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
                                        <ClipboardList className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Extract Questions</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Extract exact questions, options, and diagrams from the exam paper as-is</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-[10px] bg-slate-100 text-slate-600 border-transparent">Best for: Exam papers, question banks</span>
                                        <span className="inline-flex items-center rounded-full px-2.5 font-semibold text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 py-0.5"><Zap className="w-2.5 h-2.5 mr-0.5" />ULTRA-FAST</span>
                                    </div>
                                </div>
                                <span id="s2-extract-btn" className={btn('default', 'default', 'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2 mt-2 shadow-sm')}>Extract Questions →</span>
                            </div>
                        </div>
                    </div>
                    <div className="border-beam-container p-[1.5px] rounded-2xl bg-slate-200 group flex flex-col justify-between">
                        <div className="border-beam-gradient-purple" />
                        <div className="rounded-lg border-0 bg-white relative z-10 w-full h-full flex flex-col justify-between rounded-[15px]">
                            <div className="p-6 text-center flex flex-col justify-between h-full space-y-4">
                                <div className="space-y-4 flex-1">
                                    <div className="w-14 h-14 mx-auto rounded-full bg-purple-50 flex items-center justify-center">
                                        <Sparkles className="w-7 h-7 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Generate New Questions</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">AI creates original questions based on the content and topics in the document</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-[10px] bg-slate-100 text-slate-600 border-transparent">Best for: Textbooks, notes, study material</span>
                                        <span className="inline-flex items-center rounded-full px-2.5 font-semibold text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 py-0.5"><Zap className="w-2.5 h-2.5 mr-0.5" />ULTRA-FAST</span>
                                    </div>
                                </div>
                                <span className={btn('default', 'default', 'w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-2 mt-2 shadow-sm')}>Generate Questions →</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══ /my-tests (pages/UserTestManager.tsx) ═══ */
const noop = () => {};
const cardHandlers = {
    classes: [], onEdit: noop, onConfigure: noop, onDelete: noop, onVisibilityChange: noop, onShare: noop,
    onUploadSolutions: noop, onClassChange: noop, onViewResults: noop, onView: noop, onConductExam: noop,
};
function SectionTitle({ title, count }: { title: string; count?: number }) {
    return (
        <div className="mb-3 flex items-center gap-2 px-1">
            <h2 className="truncate text-lg font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
            {count !== undefined && (
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{count}</span>
            )}
        </div>
    );
}
function MyTestsHeader() {
    return (
        <>
            <header className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Creator studio</p>
                    <h1 className="mt-1.5 font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 text-[34px]">My Tests</h1>
                    <p className="mt-2 text-[15px] text-slate-600">Create tests, run them as live exams, and see every student's result.</p>
                </div>
                <span className={`${PRIMARY_BTN} h-11 px-5`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    <span>Create test</span>
                </span>
            </header>
            <div className="flex flex-row items-center justify-between gap-3">
                <div className="inline-grid h-auto grid-cols-2 rounded-xl bg-slate-200/60 p-1">
                    <span data-state="active" className={SEGMENT}>My tests</span>
                    <span className={SEGMENT}>Student reports</span>
                </div>
                <div className="relative w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <div className="flex items-center h-10 rounded-xl border border-transparent bg-slate-200/60 pl-9 text-[15px] text-slate-500">Search your tests</div>
                </div>
            </div>
        </>
    );
}
const OTHER_TESTS = [
    { id: 'b', title: 'NEET 2026 · Biology Chapter Test: Cell Structure', total_questions: 45, duration: 45, visibility: 'public', submission_count: 0 },
    { id: 'c', title: 'Class 11 Chemistry · Mole Concept Weekly Quiz', total_questions: 20, duration: 30, visibility: 'private', submission_count: 0 },
];
export function MyTests({ isNew }: { isNew: boolean }) {
    const test = { id: 'a', title: TEST_TITLE, total_questions: 31, duration: 60, visibility: 'private', submission_count: 0, settings: {} };
    return (
        <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-4">
            <div className="space-y-6">
                <MyTestsHeader />
                <section>
                    <SectionTitle title="All tests" />
                    <div className="grid gap-5 grid-cols-3">
                        <div id="mt-new">
                            <UserTestCard {...cardHandlers} test={test} isNew={isNew} />
                        </div>
                        {OTHER_TESTS.map((t) => <UserTestCard key={t.id} {...cardHandlers} test={t} />)}
                    </div>
                </section>
            </div>
        </div>
    );
}

/* ═══ components/ConductExamDialog.tsx (DialogContent drawn in place) ═══ */
export function ConductDialog() {
    return (
        <div className="w-[400px] overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl">
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-[18px] h-[18px] text-white" />
                    </div>
                    <div>
                        <h2 className="text-white text-base font-bold leading-tight">Conduct Online Exam</h2>
                        <p className="text-white/70 text-[11px] mt-0.5">Generate a secure private link</p>
                    </div>
                </div>
            </div>
            <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Exam</p>
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{TEST_TITLE}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        Accessible <strong>only via this secure link</strong>. Won't appear publicly — private mode blocks all other access.
                    </p>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Secure Slug</span>
                        <span className="h-6 px-2 text-[11px] text-indigo-600 inline-flex items-center"><RefreshCw className="w-3 h-3 mr-1" /> Regenerate</span>
                    </div>
                    <div className="relative">
                        <div className="flex items-center rounded-md border px-3 pr-10 font-mono text-[12px] h-9 border-slate-200 bg-slate-50 text-slate-800">jee-phy-mock-7k2q</div>
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">17c</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Link Preview</span>
                        <span className="h-6 w-6 inline-flex items-center justify-center text-slate-400"><Copy className="w-3 h-3" /></span>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2 bg-slate-900 rounded-lg border border-slate-800">
                        <LinkIcon className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-300 font-mono flex-1">https://{EXAM_URL}</span>
                    </div>
                </div>
            </div>
            <div className="px-4 pb-4 pt-1 flex gap-2">
                <span className={btn('outline', 'default', 'flex-1 h-9 text-sm')}>Cancel</span>
                <span id="cd-start" className={btn('default', 'default', 'flex-1 h-9 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-md shadow-indigo-200')}>
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Start Conducting</span>
                </span>
            </div>
        </div>
    );
}

/* ═══ /my-tests · Live exams card (pages/UserTestManager.tsx, "LIVE EXAMS") ═══ */
export const JOIN_CODE = '482913';
export function LiveExams({ submitted, proctored, menuOpen = false, joinCode = null }: { submitted: number; proctored: boolean; menuOpen?: boolean; joinCode?: string | null }) {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-4">
            <div className="space-y-6">
                <MyTestsHeader />
                <section>
                    <SectionTitle title="Live exams" count={1} />
                    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-600/20 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-18px_rgba(5,150,105,0.45)]">
                        <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-emerald-50/70 px-5 py-2.5 text-[13px] font-medium text-emerald-800">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span id="le-ping" className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span>Students can take these right now. Only people with the link can join.</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            <li className="p-5">
                                <div className="relative flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-slate-900">{TEST_TITLE}</h3>
                                        <p className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-slate-600">
                                            <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-slate-400" />31 questions</span>
                                            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />60 min</span>
                                            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{submitted} submitted</span>
                                        </p>
                                    </div>
                                    <span id="le-menu" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${menuOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                    </span>
                                    {menuOpen && (
                                        <div id="le-dropdown" className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-md">
                                            <div className="flex items-center rounded-lg px-2 py-2 text-sm"><BarChart3 className="mr-2.5 h-4 w-4 text-slate-500" /> Results</div>
                                            <div className="flex items-center rounded-lg px-2 py-2 text-sm"><Inbox className="mr-2.5 h-4 w-4 text-slate-500" /> Student reports</div>
                                            <div className="-mx-1 my-1 h-px bg-muted" />
                                            <div className="flex items-center rounded-lg px-2 py-2 text-sm"><Pencil className="mr-2.5 h-4 w-4 text-slate-500" /> Edit questions</div>
                                            <div id="le-getcode" className="flex items-center rounded-lg px-2 py-2 text-sm"><KeyRound className="mr-2.5 h-4 w-4 text-sky-600" /> Get a join code</div>
                                            <div className="flex items-center rounded-lg px-2 py-2 text-sm"><LinkIcon className="mr-2.5 h-4 w-4 text-slate-500" /> Share link</div>
                                            <div className="flex items-center rounded-lg px-2 py-2 text-sm"><FileText className="mr-2.5 h-4 w-4 text-slate-500" /> Upload solutions</div>
                                        </div>
                                    )}
                                </div>
                                <p className="mb-1.5 mt-4 text-xs font-medium text-slate-500">Exam link — send this to your candidates</p>
                                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                                    <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-slate-700">{EXAM_URL}</span>
                                    <span id="le-copy" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5">
                                        <Copy className="h-3.5 w-3.5" /><span>Copy link</span>
                                    </span>
                                    <span id="le-share" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5">
                                        <Share2 className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                                {joinCode && (
                                    <div id="le-join">
                                        <p className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
                                            Or tell candidates: go to <span className="font-semibold text-slate-700">testoza.com/join</span> and enter
                                        </p>
                                        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                                            <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
                                            <span id="le-code" className="min-w-0 flex-1 text-[20px] font-bold tracking-[0.12em] text-slate-900 tabular-nums">{joinCode.slice(0, 3)} {joinCode.slice(3)}</span>
                                            <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5"><Copy className="h-3.5 w-3.5" /> Copy</span>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span id="le-settings" className={PILL_BTN}><Settings className="h-4 w-4 text-sky-600" /> Settings</span>
                                    <span id="le-results" className={PILL_BTN}>
                                        <BarChart3 className="h-4 w-4 text-sky-600" /> Results
                                        {submitted > 0 && (
                                            <span id="le-badge" className="min-w-[20px] rounded-full bg-sky-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums text-center">{submitted}</span>
                                        )}
                                    </span>
                                    {!proctored && (
                                        <span id="le-anticheat" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-[13px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Anti-cheating is off
                                        </span>
                                    )}
                                    <span className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-red-600">
                                        <Square className="h-3 w-3 fill-current" /> Stop exam
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>
                <section>
                    <SectionTitle title="All tests" />
                    <div className="grid gap-5 grid-cols-3">
                        <UserTestCard {...cardHandlers} test={{ id: 'a', title: TEST_TITLE, total_questions: 31, duration: 60, submission_count: submitted, settings: { conduct_exam: { enabled: true } } }} />
                        {OTHER_TESTS.map((t) => <UserTestCard key={t.id} {...cardHandlers} test={t} />)}
                    </div>
                </section>
            </div>
        </div>
    );
}

/* ═══ components/TestSettingsPanel.tsx (desktop view, Proctoring & Security tab) ═══ */
/** components/ui/switch.tsx with both states stacked; the video tweens between them. */
function Toggle({ id }: { id: string }) {
    return (
        <span id={id} className="tz-switch peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-input relative">
            <span className="tz-switch-on absolute inset-[-2px] rounded-full bg-primary opacity-0" />
            <span className="tz-switch-thumb pointer-events-none relative block h-5 w-5 rounded-full bg-background shadow-lg ring-0" />
        </span>
    );
}
function Radio({ on, red }: { on?: boolean; red?: boolean }) {
    return (
        <span className={`inline-flex h-[13px] w-[13px] items-center justify-center rounded-full border ${on ? (red ? 'border-red-500' : 'border-primary') : 'border-slate-400'}`}>
            {on && <span className={`h-[7px] w-[7px] rounded-full ${red ? 'bg-red-500' : 'bg-primary'}`} />}
        </span>
    );
}
export function SettingsPanel() {
    return (
        <div className="w-[900px] rounded-lg border bg-card text-card-foreground shadow-2xl flex flex-col overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 border-b">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-semibold leading-none tracking-tight">Test Environment Settings</h3>
                    <div className="flex gap-2">
                        <span className={btn('outline', 'sm', '')}><FileText className="w-4 h-4 mr-2" /> View Results</span>
                        <span className={btn('ghost', 'icon', '')}><span className="text-xl">×</span></span>
                    </div>
                </div>
            </div>
            <div className="px-6 pt-4">
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground grid w-full grid-cols-4">
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium bg-background text-foreground shadow-sm flex gap-2"><Shield className="w-4 h-4" /> Proctoring &amp; Security</span>
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium flex gap-2"><Lock className="w-4 h-4" /> Access &amp; Control</span>
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium flex gap-2"><Eye className="w-4 h-4" /> Results &amp; Timing</span>
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium flex gap-2 opacity-40"><Sparkles className="w-4 h-4" /> AI Utilities</span>
                </div>
            </div>
            <div className="p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 border p-4 rounded-lg bg-slate-50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monitoring</p>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-base font-medium flex items-center gap-2"><Maximize className="w-4 h-4 text-blue-500" /> Force Full Screen</span>
                                <p className="text-sm text-muted-foreground">User must enter full screen to start. Exiting counts as a violation.</p>
                            </div>
                            <Toggle id="sp-fullscreen" />
                        </div>
                        <hr className="border-slate-200" />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="text-base font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Tab/App Switch Detection</span>
                                <p className="text-sm text-muted-foreground">Detect if user switches tabs/apps or minimizes browser.</p>
                            </div>
                            <Toggle id="sp-tabswitch" />
                        </div>
                        <div id="sp-violations" className="space-y-4">
                            <hr className="border-slate-200" />
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violation Action</p>
                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="flex items-center space-x-2"><Radio /><span>No limit (Warn only)</span></div>
                                    <div className="flex items-center space-x-2"><Radio red /><span className="text-red-600">Strict (Instant Submit)</span></div>
                                    <div className="flex items-center space-x-2"><Radio on /><span className="flex items-center gap-2">
                                        <span className="flex h-8 w-16 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">3<ChevronDown className="h-4 w-4 opacity-50" /></span>
                                        <span>warnings then Submit</span></span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="border-t p-4 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
                <span className={btn('outline', 'default', '')}>Cancel</span>
                <span id="sp-save" className={btn('default', 'default', '')}>Save Settings</span>
            </div>
        </div>
    );
}

/* ═══ sonner toast as components/ui/sonner.tsx styles it ═══ */
export function Toast({ title }: { title: string }) {
    return (
        <div className="flex w-[356px] items-center gap-1.5 rounded-lg border border-border bg-background p-4 text-[13px] text-foreground shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" height="20" width="20" className="text-foreground"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            <span className="font-medium">{title}</span>
        </div>
    );
}

/* ═══ components/TestResultsPanel.tsx (SheetContent, desktop table) ═══ */
export function ResultsSheet({ rows }: { rows: { name: string; roll: string; score: number; c: number; w: number; s: number; time: string; date: string }[] }) {
    const total = 124;
    const top = Math.max(...rows.map(r => r.score));
    const avg = rows.reduce((a, r) => a + r.score, 0) / rows.length;
    return (
        <div className="w-[896px] h-full bg-background flex flex-col overflow-hidden shadow-2xl border-l">
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-4 pt-5 pb-4 flex-shrink-0">
                <span className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400"><X className="h-4 w-4" /></span>
                <div className="pr-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Test Results</p>
                    <h3 className="text-base font-bold text-white leading-tight line-clamp-2">{TEST_TITLE}</h3>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full px-2.5 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">Conduct Exam Results</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5"><Users className="h-3 w-3 text-slate-300" /></div>
                        <p className="text-lg font-black text-white leading-none">{rows.length}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Submitted</p>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5"><Trophy className="h-3 w-3 text-yellow-400" /></div>
                        <p className="text-lg font-black text-yellow-300 leading-none">{top.toFixed(1)}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Top Score</p>
                    </div>
                    <div className="bg-white/10 rounded-lg px-2.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5"><BarChart3 className="h-3 w-3 text-emerald-400" /></div>
                        <p className="text-lg font-black text-emerald-300 leading-none">{avg.toFixed(1)}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Average</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent bg-input scale-90"><span className="block h-5 w-5 rounded-full bg-background shadow-lg" /></span>
                    <span className="text-xs font-semibold text-slate-600 leading-none">Rank Mode</span>
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <span className={btn('outline', 'sm', 'h-7 text-[11px] px-2.5 gap-1.5 font-semibold')}><Download className="w-3 h-3" />Excel</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <table className="w-full caption-bottom text-sm min-w-[600px]">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b bg-slate-50/80">
                            {['Student', 'Score', 'Stats', 'Time Taken', 'Date', 'Mode'].map(h => (
                                <th key={h} className="h-12 px-4 text-left align-middle text-muted-foreground font-bold text-xs">{h}</th>
                            ))}
                            <th className="h-12 px-4 w-[44px]" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.name} id={`rs-row-${i}`} className="border-b">
                                <td className="p-4 align-middle">
                                    <div className="font-semibold text-sm text-slate-800">{r.name}</div>
                                    <div className="text-xs text-slate-400 space-y-0.5 mt-0.5"><div><span className="opacity-60">Roll No.:</span> {r.roll}</div></div>
                                </td>
                                <td className="p-4 align-middle">
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 border-transparent bg-primary text-primary-foreground font-bold text-xs">{r.score} / {total}</span>
                                </td>
                                <td className="p-4 align-middle text-xs">
                                    <div className="space-y-0.5">
                                        <div className="text-emerald-600 font-medium">✓ {r.c}</div>
                                        <div className="text-red-500 font-medium">✗ {r.w}</div>
                                        <div className="text-slate-400">— {r.s}</div>
                                    </div>
                                </td>
                                <td className="p-4 align-middle text-xs text-slate-600 font-semibold">{r.time}</td>
                                <td className="p-4 align-middle text-xs text-muted-foreground whitespace-nowrap">{r.date}</td>
                                <td className="p-4 align-middle">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><CheckCircle2 className="h-3 w-3" /> Submitted</span>
                                </td>
                                <td className="p-4 align-middle">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <span className="h-8 w-8 inline-flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
                                        <span className="h-8 w-8 inline-flex items-center justify-center"><Trash2 className="w-4 h-4" /></span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══ Candidate phone: TestPage.tsx (gateway + Standard Mode, phone layout) ═══ */
export function PhoneGateway() {
    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full bg-white/80 border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl mb-2"><BookOpen className="w-7 h-7" /></div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{TEST_TITLE}</h1>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">Please review the guidelines below before beginning your attempt.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[['Questions', '31'], ['Duration', '60m'], ['Passing Marks', 'N/A']].map(([k, v]) => (
                        <div key={k} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{k}</span>
                            <p className="text-lg font-bold text-slate-800">{v}</p>
                        </div>
                    ))}
                </div>
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex gap-3 text-sm text-slate-600">
                        <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div><span className="font-semibold text-slate-800">Do Not Close or Switch Tabs:</span> Leaving the browser page or switching tabs might trigger cheating warnings or auto-submit your exam.</div>
                    </div>
                    <div className="flex gap-3 text-sm text-slate-600">
                        <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div><span className="font-semibold text-slate-800">Continuous Timer:</span> Once started, the countdown timer cannot be paused or stopped under any circumstances.</div>
                    </div>
                </div>
                <span id="pg-start" className={btn('default', 'lg', 'w-full h-12 rounded-xl bg-indigo-600 text-white text-base font-semibold shadow-lg')}>Start Examination Now</span>
            </div>
        </div>
    );
}

const EXAM_Q = {
    text: 'Two resistors of 4 Ω and 12 Ω are connected in parallel. Their equivalent resistance is:',
    options: { A: '3 Ω', B: '8 Ω', C: '16 Ω', D: '48 Ω' } as Record<string, string>,
};
/** pages/guides/conduct/examScreen.tsx (TestPage Standard Mode, phone), with this paper's question. */
export function PhoneExam({ index, selected, time, submitting }: { index: number; selected: string | null; time: string; submitting?: boolean }) {
    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-slate-50 text-slate-900">
            <div className="bg-white border-b px-4 py-2.5 relative top-0 z-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] flex flex-col items-start justify-between gap-2">
                <div className="flex items-center justify-between gap-0 w-full">
                    <div className="text-[13px] font-medium text-slate-400 tracking-wide truncate text-left">{TEST_TITLE}</div>
                    <span className="flex items-center justify-center p-1 rounded-full text-slate-400 shrink-0 -mr-3"><Maximize className="w-3.5 h-3.5" /></span>
                </div>
                <div className="flex items-center justify-between gap-1.5 w-full mt-0.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-50/80 text-slate-600 border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="min-w-[40px] text-center font-mono">{time}</span>
                        <span className="flex items-center justify-center p-0.5 rounded-full text-slate-400"><EyeOff className="w-3.5 h-3.5" /></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                        <TriangleAlert className="w-3.5 h-3.5 fill-amber-100 text-amber-600" /><span>0/3</span>
                    </div>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className={btn('ghost', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold text-slate-500')}>Exit</span>
                    <span id="px-submit" className={btn('destructive', 'sm', 'h-7 rounded-full px-3 text-[11px] font-semibold shadow-sm overflow-hidden shrink-0 ml-auto')}>Submit Test</span>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="gap-2 flex flex-col p-3">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question {index}</span>
                            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">Single Choice</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="text-xs font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                <span className="text-emerald-700">+4</span><span className="text-slate-300">|</span><span className="text-red-600">-1</span>
                            </div>
                            <span className={btn('ghost', 'icon', 'h-7 w-7 p-0 ml-1 text-slate-400')}><MessageSquareWarning className="w-4 h-4" /></span>
                        </div>
                    </div>
                    <hr className="border-slate-200 mb-3" />
                    <div className="relative text-slate-800 font-medium leading-relaxed break-words py-3 px-2 rounded-lg tracking-wide [word-spacing:1.5px]" style={{ fontSize: 18 }}>{EXAM_Q.text}</div>
                    <div className="space-y-3 mt-3">
                        <div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Options</div>
                        {Object.entries(EXAM_Q.options).map(([key, text]) => {
                            const on = selected === key;
                            return (
                                <div key={key} id={`px-opt-${key}`} className={cn('flex items-start gap-4 p-4 rounded-lg border transition-all group relative', on ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20' : 'border-slate-200 bg-white')}>
                                    <div className={cn('h-7 w-7 flex items-center justify-center font-bold text-sm border shrink-0 mt-0.5 rounded-full', on ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200')}>{key}</div>
                                    <div className="flex-1 text-slate-800 font-medium leading-relaxed break-words pt-0.5" style={{ fontSize: 16 }}>{text}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-[55px] right-0 z-40">
                <span className={btn('default', 'icon', 'h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg')}><MenuIcon className="h-6 w-6" /></span>
            </div>
            <div className="flex-none z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-2">
                <div className="flex justify-between w-full gap-2">
                    <span className={btn('outline', 'default', 'h-9 w-9 flex-1')}><ChevronLeft className="w-6 h-6 mr-1" /><span>Back</span></span>
                    <div className="flex gap-2 justify-end flex-[2]">
                        <span className={btn('outline', 'sm', 'h-9 text-muted-foreground border-dashed')}>Clear</span>
                        <span className={btn('outline', 'sm', cn('h-9 px-3', selected ? 'bg-purple-600 text-white border-purple-600' : 'text-slate-600 border-slate-200'))}><FlagIcon className="w-4 h-4" /></span>
                        <span className={btn('default', 'sm', 'bg-[#0073E6] text-white h-9 px-3')}><span>Save &amp; Next</span><ChevronRight className="w-4 h-4 ml-0.5" /></span>
                    </div>
                </div>
            </div>
            {submitting && (
                <div id="px-submitting" className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center border">
                        <Loader2 className="h-12 w-12 text-indigo-600 mb-4" />
                        <p className="text-2xl font-bold text-slate-800 mb-2">Submitting Test...</p>
                        <p className="text-slate-500 text-center">Please stay on this page.<br />Finalizing your answers.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/** pages/TestSubmissionSuccess.tsx at phone width (heading block). */
export function PhoneSubmitted() {
    return (
        <div className="min-h-full bg-gradient-to-br from-purple-50 via-pink-50 to-white flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-50" />
                <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-6 shadow-xl">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
            </div>
            <div className="space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Test Submitted Successfully!</h1>
                <p className="text-xl font-semibold text-slate-700">🎉 Congratulations! 🎉</p>
            </div>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-5 border border-purple-200">
                <p className="text-base text-slate-700 font-medium">📊 Your results will be published by the test creator soon.</p>
            </div>
        </div>
    );
}

/* ═══ /create-test · questions list and save bar (components/TestBuilder.tsx) ═══ */
type BQ = { id: number; type: string; question: string; options: Record<string, string>; correctAnswer: any; marks: number; negativeMarks: number };
const toState = (q: BQ) => ({ ...q, passageContent: '', groupId: '', typingMode: 'en' as const, marks: String(q.marks), negativeMarks: String(q.negativeMarks) });
export function Builder({ questions, total, marks }: { questions: { q: BQ; n: number; id?: string }[]; total: number; marks: number }) {
    const actions = { update: noop, remove: noop, registerRef: noop, openSyPad: noop, cloudUpload: noop, snip: noop, fillFromPhoto: noop, typingModeUsed: noop };
    return (
        <div className="mx-auto w-full max-w-4xl px-8 pb-10 pt-4">
            <section className="pt-2">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                    <div>
                        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">Questions</h2>
                        <p className="text-[14px] text-slate-500 tabular-nums">{total} questions · {marks} marks</p>
                    </div>
                </div>
                <div>
                    {questions.map(({ q, n, id }) => (
                        <div key={n} id={id} className="scroll-mt-24">
                            <QuestionCard
                                q={toState(q) as any} number={n} refKey={`q-${n}`} update={noop} onRemove={noop} canRemove
                                isInGroup={false} isEndOfGroup={false} registerRef={noop} onOpenSyPad={noop} onCloudUpload={noop}
                                onSnip={noop} onFillFromPhoto={noop} onTypingModeUsed={noop}
                            />
                        </div>
                    ))}
                    <button id="b-add" type="button" className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 text-[16px] font-semibold text-sky-700">
                        <Plus className="h-5 w-5" /> Add question
                    </button>
                </div>
            </section>
            <div id="b-savebar" className="pt-4">
                <div className="flex flex-nowrap items-center gap-2 rounded-2xl bg-white/90 p-2 pl-4 shadow-[0_12px_36px_-14px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.08] backdrop-blur-xl">
                    <p className="min-w-0 flex-1 truncate text-[14px] text-slate-600 tabular-nums">
                        <span className="font-semibold text-slate-900">{total}</span> Q · <span className="font-semibold text-slate-900">{marks}</span> marks · <span className="font-semibold text-slate-900">60</span> min
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className="inline-flex items-center h-11 rounded-xl px-3.5 text-[15px] font-semibold text-slate-600">Cancel</span>
                        <span id="b-save" className={cn(PRIMARY_BTN, 'h-11 min-w-[128px] px-5')}>
                            <Save className="h-4 w-4" /> Save test
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { Radio as RadioIcon, Check, Plus };
