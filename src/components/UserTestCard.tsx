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
    Heart,
    MoreVertical,
    Globe,
    Link as LinkIcon,
    Lock,
    GraduationCap,
    Check,
    FileText
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
}: UserTestCardProps) {
    const visibility = test.visibility || (test.is_public ? 'public' : 'private');

    return (
        <div
            key={test.id}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 pb-3.5 shadow-sm hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full overflow-hidden"
        >
            {/* --- Identity Accent --- */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-violet-600 opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* --- Zone A: Header --- */}
            <div className="flex justify-between items-start mb-2.5 gap-3 pl-2">
                <div className="flex-1 min-w-0">
                    <CardHeader className="p-0 pb-1">
                        <CardTitle
                            className="text-[1rem] font-semibold text-red-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
                            title={test.title}
                            onClick={() => onConfigure(test)}
                        >
                            {test.title}
                        </CardTitle>
                    </CardHeader>
                    {/* --- Zone B: Metadata (Clean Row) --- */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                        <span className="flex items-center gap-1.5">
                            <span className="opacity-70 font-semibold">{test.total_questions || test.questions?.length || 0}</span> Qs
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5">
                            <span className="opacity-70 font-semibold">{test.duration || 0}</span> min
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${getVisibilityColor(visibility)}`}>
                            {getVisibilityIcon(visibility)}
                            <span className="capitalize text-[10px] font-semibold">{visibility === 'unlisted' ? 'Link' : visibility}</span>
                        </span>
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
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Globe className="mr-2 h-4 w-4" /> Visibility
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => onVisibilityChange(test, 'public')}>
                                        <Globe className="mr-2 h-4 w-4 text-green-500" /> Public
                                        {visibility === 'public' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onVisibilityChange(test, 'unlisted')}>
                                        <LinkIcon className="mr-2 h-4 w-4 text-primary" /> Link Only
                                        {visibility === 'unlisted' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onVisibilityChange(test, 'private')}>
                                        <Lock className="mr-2 h-4 w-4 text-slate-500" /> Private
                                        {visibility === 'private' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => onEdit(test)}>
                                <Edit className="mr-2 h-4 w-4 text-slate-500" /> Edit Test
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onConfigure(test)}>
                                <Settings className="mr-2 h-4 w-4 text-slate-500" /> Manage Settings
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => onShare(test)}>
                                <LinkIcon className="mr-2 h-4 w-4 text-slate-500" /> Share Link
                            </DropdownMenuItem>

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
            <div className="mb-3 pl-2 flex items-center gap-2 min-h-[20px] mt-1">
                {/* ID Tag */}
                <span className="text-xs text-slate-400 font-mono tracking-wide">
                    #{test.custom_id || 'N/A'}
                </span>

                {/* Optional Class Badge */}
                {test.class_id && classes.find(c => c.id === test.class_id) && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-primary border border-violet-100">
                        <GraduationCap className="h-3 w-3" />
                        <span className="uppercase tracking-wide">
                            {classes.find(c => c.id === test.class_id)?.name}
                        </span>
                    </div>
                )}

                {/* Likes info if popular - now handled internally by TestVoteButtons */}
                <div className="ml-auto">
                    <TestVoteButtons testId={test.id} userId={undefined} isCreatorOrAdmin={true} />
                </div>
            </div>

            {/* --- Zone D: Actions --- */}
            <div className="flex items-center justify-end gap-3 mt-auto pt-3 border-t border-slate-50 dark:border-slate-800/50 pl-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium px-4 bg-transparent border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    onClick={() => onViewResults(test)}
                >
                    Results
                </Button>
                <Button
                    size="sm"
                    className="h-8 text-xs font-medium px-5 bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition-colors duration-300 rounded-md"
                    onClick={() => onView(test)}
                >
                    View
                </Button>
            </div>
        </div>
    );
}
