import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Trash2,
    Settings,
    Edit,
    MoreVertical,
    Globe,
    Lock,
    GraduationCap,
    Check,
    FileText,
    Link as LinkIcon,
    Radio,
    BarChart2,
    GitFork,
} from 'lucide-react';
import TestVoteButtons from '@/components/TestVoteButtons';

interface UserTestCardProps {
    test: any;
    classes: any[];
    onEdit: (test: any) => void;
    onConfigure: (test: any) => void;
    onDelete: (testId: string, title: string) => void;
    onVisibilityChange: (test: any, visibility: string) => void;
    onShare: (test: any) => void;
    onUploadSolutions: (test: any) => void;
    onClassChange: (test: any, classId: string | null) => void;
    getVisibilityColor: (visibility: string) => string;
    getVisibilityIcon: (visibility: string) => React.ReactNode;
    onViewResults: (test: any) => void;
    onView: (test: any) => void;
    onConductExam: (test: any) => void;
}

export function UserTestCard({
    test,
    classes,
    onEdit,
    onConfigure,
    onDelete,
    onVisibilityChange,
    onShare,
    onUploadSolutions,
    onClassChange,
    getVisibilityColor,
    getVisibilityIcon,
    onViewResults,
    onView,
    onConductExam,
}: UserTestCardProps) {
    const visibility = test.visibility || (test.is_public ? 'public' : 'private');
    const isConducted = test.settings?.conduct_exam?.enabled;

    return (
        <div
            key={test.id}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pb-3 sm:p-4 sm:pb-3.5 shadow-sm hover:shadow-md hover:border-primary/40 dark:hover:border-primary/50 transition-all duration-200 flex flex-col h-full overflow-hidden cursor-pointer"
        >
            {/* --- Identity Accent --- */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity ${isConducted ? 'bg-gradient-to-b from-emerald-400 to-teal-600' : 'bg-gradient-to-b from-primary to-violet-600'}`} />

            {/* --- Zone A: Header --- */}
            <div className="flex justify-between items-start mb-2.5 gap-3 pl-2">
                <div className="flex-1 min-w-0">
                    <CardHeader className="p-0 pb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <CardTitle
                                className="text-[0.875rem] sm:text-[0.9375rem] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200 cursor-pointer"
                                title={test.title}
                                onClick={() => onConfigure(test)}
                            >
                                {test.title}
                            </CardTitle>
                            {isConducted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                                    <Radio className="w-2.5 h-2.5" /> LIVE
                                </span>
                            )}
                            {test.is_cloned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-200">
                                    <GitFork className="w-2.5 h-2.5" /> Clone
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    {/* --- Zone B: Metadata (Clean Row) --- */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-medium mt-1">
                        <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-600">{test.total_questions || test.questions?.length || 0}</span>
                            <span className="text-slate-400">Qs</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                            <span className="font-semibold text-slate-600">{test.duration || 0}</span>
                            <span className="text-slate-400">min</span>
                        </span>
                        {!isConducted && (
                            <>
                                <span className="text-slate-300">•</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${getVisibilityColor(visibility)}`}>
                                    {getVisibilityIcon(visibility)}
                                    <span className="capitalize font-semibold">{visibility}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Top Actions: Menu */}
                <div className="shrink-0 -mr-1 -mt-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-violet-50 dark:hover:bg-slate-800">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {/* Visibility (only Public / Private — no unlisted) */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Globe className="mr-2 h-4 w-4" /> Visibility
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => onVisibilityChange(test, 'public')}>
                                        <Globe className="mr-2 h-4 w-4 text-green-500" /> Public
                                        {visibility === 'public' && !isConducted && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onVisibilityChange(test, 'private')}>
                                        <Lock className="mr-2 h-4 w-4 text-slate-500" /> Private
                                        {visibility === 'private' && !isConducted && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator />


                            {/* View Results */}
                            <DropdownMenuItem onClick={() => onViewResults(test)}>
                                <BarChart2 className="mr-2 h-4 w-4 text-slate-500" /> View Results
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onEdit(test)}>
                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Test
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onConfigure(test)}>
                                <Settings className="mr-2 h-4 w-4 text-slate-500" /> Manage Settings
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onShare(test)} disabled={visibility === 'private'}>
                                <LinkIcon className="mr-2 h-4 w-4 text-slate-500" /> Share Link
                            </DropdownMenuItem>

                            {/* Conduct Exam */}
                            {!isConducted && (
                                <DropdownMenuItem onClick={() => onConductExam(test)} className="text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50">
                                    <Radio className="mr-2 h-4 w-4" /> Conduct Exam
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onUploadSolutions(test)}>
                                <FileText className="mr-2 h-4 w-4 text-indigo-500" /> Upload Solutions
                            </DropdownMenuItem>

                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                    <DropdownMenuItem onClick={() => onClassChange(test, null)}>
                                        <span className="opacity-50">None</span>
                                        {!test.class_id && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    {classes.map(cls => (
                                        <DropdownMenuItem key={cls.id} onClick={() => onClassChange(test, cls.id)}>
                                            {cls.name}
                                            {test.class_id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuItem onClick={() => onDelete(test.id, test.title)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>


            {/* --- Zone C: Context / Tags --- */}
            <div className="mb-2.5 pl-2 flex items-center gap-2 min-h-[20px] mt-1.5">
                {/* ID Tag */}
                <span className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wide">
                    #{test.custom_id || 'N/A'}
                </span>

                {/* Optional Class Badge */}
                {test.class_id && classes.find(c => c.id === test.class_id) && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-primary border border-violet-100">
                        <GraduationCap className="h-2.5 w-2.5" />
                        <span className="uppercase tracking-wide truncate max-w-[80px]">
                            {classes.find(c => c.id === test.class_id)?.name}
                        </span>
                    </div>
                )}

                <div className="ml-auto">
                    <TestVoteButtons testId={test.id} userId={undefined} isCreatorOrAdmin={true} />
                </div>
            </div>

            {/* --- Zone D: Actions --- */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800/50 pl-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 bg-transparent border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                    onClick={() => onConfigure(test)}
                >
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    Settings
                </Button>
                {!isConducted && (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors duration-200 cursor-pointer"
                        onClick={() => onConductExam(test)}
                    >
                        <Radio className="w-3.5 h-3.5 mr-1" />
                        Conduct
                    </Button>
                )}
                {/* Results button */}
                <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors duration-200 cursor-pointer"
                    onClick={() => onViewResults(test)}
                >
                    <BarChart2 className="w-3.5 h-3.5 mr-1" />
                    Results
                </Button>
                <Button
                    size="sm"
                    className="h-8 text-[11px] sm:text-xs font-medium px-3 sm:px-4 bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition-colors duration-200 rounded-md cursor-pointer"
                    onClick={() => onView(test)}
                >
                    View
                </Button>
            </div>
        </div>
    );
}
