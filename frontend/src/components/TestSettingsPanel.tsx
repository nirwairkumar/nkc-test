import React, { useState, useEffect } from 'react';
import { Test, TestSettings, updateTest, generateTopics, Question, fetchTestById } from '@/lib/testsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Eye, Lock, Shield, Calendar, FormInput, Maximize, FileText, GraduationCap, Crown, Sparkles, Loader2 } from 'lucide-react';
import { ClassItem, fetchClasses } from '@/lib/classesApi';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface TestSettingsPanelProps {
    test: Test;
    onClose: () => void;
    onUpdate: (updatedTest?: Test) => void;
    onViewResults: () => void;
    overridePremium?: boolean;
}

export default function TestSettingsPanel({ test, onClose, onUpdate, onViewResults, overridePremium }: TestSettingsPanelProps) {
    const [settings, setSettings] = useState<TestSettings>({
        attempt_limit: undefined,
        strict_timer: false,
        allow_flexible_timer: true,
        tab_switch_mode: 'off',
        disable_copy_paste: false,
        disable_actions: false,
        force_fullscreen: false,
        shuffle_questions: false,
        show_results_immediate: true,
        schedule: { enabled: false },
        start_form: { enabled: false, fields: [] },
        ...test.settings // Merge existing settings
    });

    // Manage class_id separately as it's not part of TestSettings jsonb
    const [classId, setClassId] = useState<string | null>(test.class_id || null);
    const [currentTest, setCurrentTest] = useState<Test>(test);

    const [loading, setLoading] = useState(false);
    const [topicGenerating, setTopicGenerating] = useState(false);
    const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);

    // Premium status check
    const { isPremium, loading: premiumLoading } = usePremiumStatus();
    const navigate = useNavigate();

    useEffect(() => {
        const loadFullTest = async () => {
            const hasQuestionsOrSections = (test.questions && test.questions.length > 0) || 
                                         (test.sections && test.sections.length > 0);
            
            if (!hasQuestionsOrSections) {
                const { data } = await fetchTestById(test.id);
                if (data) {
                    setCurrentTest(data);
                    if (data.settings) {
                        setSettings(prev => ({ ...prev, ...data.settings }));
                    }
                    setClassId(data.class_id || null);
                }
            } else {
                setCurrentTest(test);
            }
        };

        if (test.settings) {
            setSettings(prev => ({ ...prev, ...test.settings }));
        }
        setClassId(test.class_id || null);

        if (test.created_by) {
            fetchClasses(test.created_by).then(({ data }) => {
                if (data) setAvailableClasses(data);
            });
        }

        loadFullTest();
    }, [test]);

    const handleSave = async () => {
        // If overridePremium (admin) is true, skip check
        if (!isPremium && !overridePremium) {
            toast.error("Premium feature required", {
                description: "Upgrade to Premium to manage test settings",
                action: {
                    label: "Upgrade Now",
                    onClick: () => navigate('/pricing')
                }
            });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await updateTest(test.id, {
                settings: settings,
                class_id: classId
            }, overridePremium);

            if (error) throw error;
            toast.success("Test settings updated successfully");
            onUpdate(data?.[0]); // Pass updated test back to parent
            onClose();
        } catch (err: any) {
            console.error("Failed to save settings", err);
            toast.error("Failed to save settings: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const showPremiumToast = () => {
        if (!isPremium && !overridePremium) {
            toast.error("Premium feature required", {
                description: "Upgrade to Premium to unlock all test management features",
                action: {
                    label: "Upgrade Now",
                    onClick: () => navigate('/pricing')
                }
            });
        }
    };

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleAutoAssignTopics = async () => {
        if (!isPremium && !overridePremium) {
            showPremiumToast();
            return;
        }

        setTopicGenerating(true);
        try {
            // Flatten questions from both modes
            const questions: Question[] = currentTest.enable_section_mode && currentTest.sections
                ? currentTest.sections.flatMap(s => s.questions || [])
                : currentTest.questions || [];

            if (questions.length === 0) {
                toast.error("No questions found in this test.");
                return;
            }

            const payload = questions.map(q => ({
                id: q.id,
                text: q.question
            }));

            const { data: topicsMap, error } = await generateTopics(payload);

            if (error) throw new Error(error);
            if (!topicsMap) throw new Error("No topics returned");

            // Update local test object (passed as prop, so we need to tell parent or update via API)
            // The cleanest way is to update the question objects in the 'test' and then call updateTest.

            const updatedQuestions = (questions || []).map(q => ({
                ...q,
                topic: topicsMap[String(q.id)] || q.topic
            }));

            let updatePayload: any = {};
            if (currentTest.enable_section_mode && currentTest.sections) {
                // We need to re-structure them back into sections
                let qIndex = 0;
                const updatedSections = currentTest.sections.map(sec => {
                    const secQs = (sec.questions || []).map(() => updatedQuestions[qIndex++]);
                    return { ...sec, questions: secQs };
                });
                updatePayload = { sections: updatedSections };
            } else {
                updatePayload = { questions: updatedQuestions };
            }

            const { error: saveErr } = await updateTest(test.id, updatePayload, overridePremium);
            if (saveErr) throw saveErr;

            toast.success(`Successfully assigned topics for ${Object.keys(topicsMap).length} questions!`);
            onUpdate(); // Trigger refresh in parent
        } catch (err: any) {
            console.error("Failed to generate topics", err);
            toast.error("Failed to generate topics: " + err.message);
        } finally {
            setTopicGenerating(false);
        }
    };

    const renderProctoring = (mode: string) => (
        <div className="space-y-6">
            <div className="space-y-4">
                {/* Unified Monitoring & Violations Card */}
                <div className="flex flex-col gap-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monitoring</p>

                    {/* Force Fullscreen Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2"><Maximize className="w-4 h-4 text-blue-500" /> Force Full Screen</Label>
                            <p className="text-sm text-muted-foreground">User must enter full screen to start. Exiting counts as a violation.</p>
                        </div>
                        <Switch
                            checked={settings.force_fullscreen}
                            onCheckedChange={(c) => updateSetting('force_fullscreen', c)}
                        />
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700" />

                    {/* Tab Switch Detection Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Tab Switch Detection</Label>
                            <p className="text-sm text-muted-foreground">Detect if user switches tabs or minimizes browser.</p>
                        </div>
                        <Switch
                            checked={settings.tab_switch_mode !== 'off'}
                            onCheckedChange={(c) => updateSetting('tab_switch_mode', c ? 'on' : 'off')}
                        />
                    </div>

                    {/* Violation Limit (only shown if at least one monitoring feature is on) */}
                    {(settings.force_fullscreen || settings.tab_switch_mode !== 'off') && (
                        <>
                            <hr className="border-slate-200 dark:border-slate-700" />
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violation Action</p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id={`vl_none_${mode}`}
                                            name={`violation_limit_${mode}`}
                                            checked={settings.violation_limit === null || settings.violation_limit === undefined}
                                            onChange={() => updateSetting('violation_limit', null)}
                                            className="accent-primary"
                                        />
                                        <Label htmlFor={`vl_none_${mode}`} className="font-normal cursor-pointer">No limit (Warn only)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id={`vl_strict_${mode}`}
                                            name={`violation_limit_${mode}`}
                                            checked={settings.violation_limit === 0}
                                            onChange={() => updateSetting('violation_limit', 0)}
                                            className="accent-red-500"
                                        />
                                        <Label htmlFor={`vl_strict_${mode}`} className="font-normal cursor-pointer text-red-600">Strict (Instant Submit)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id={`vl_count_${mode}`}
                                            name={`violation_limit_${mode}`}
                                            checked={typeof settings.violation_limit === 'number' && settings.violation_limit > 0}
                                            onChange={() => updateSetting('violation_limit', (settings.violation_limit && settings.violation_limit > 0) ? settings.violation_limit : 2)}
                                            className="accent-primary"
                                        />
                                        <Label htmlFor={`vl_count_${mode}`} className="font-normal cursor-pointer flex items-center gap-2">
                                            <Select
                                                value={String(typeof settings.violation_limit === 'number' && settings.violation_limit > 0 ? settings.violation_limit : 2)}
                                                onValueChange={(val) => updateSetting('violation_limit', Number(val))}
                                                disabled={!(typeof settings.violation_limit === 'number' && settings.violation_limit > 0)}
                                            >
                                                <SelectTrigger className="w-16 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2">2</SelectItem>
                                                    <SelectItem value="3">3</SelectItem>
                                                    <SelectItem value="4">4</SelectItem>
                                                    <SelectItem value="5">5</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <span>warnings then Submit</span>
                                        </Label>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    Both fullscreen exits and tab switches count toward this limit.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Disable Copy/Paste</Label>
                            <p className="text-xs text-muted-foreground">Prevent clipboard actions</p>
                        </div>
                        <Switch
                            checked={settings.disable_copy_paste}
                            onCheckedChange={(c) => updateSetting('disable_copy_paste', c)}
                        />
                    </div>
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Disable Right Click</Label>
                            <p className="text-xs text-muted-foreground">Prevent context menu</p>
                        </div>
                        <Switch
                            checked={settings.disable_actions}
                            onCheckedChange={(c) => updateSetting('disable_actions', c)}
                        />
                    </div>
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div className="space-y-0.5">
                            <Label>Block Back Button</Label>
                            <p className="text-xs text-muted-foreground">Prevent accidental navigation</p>
                        </div>
                        {/* @ts-ignore - Setting might not be typed yet */}
                        <Switch
                            checked={settings.block_back_button || false}
                            onCheckedChange={(c) => updateSetting('block_back_button', c)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAccess = (mode: string) => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 border p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-green-600" /> Scheduled Access</Label>
                            <p className="text-sm text-muted-foreground">Restrict test availability window.</p>
                        </div>
                        <Switch
                            checked={settings.schedule?.enabled}
                            onCheckedChange={(c) => updateSetting('schedule', { ...settings.schedule, enabled: c })}
                        />
                    </div>
                    {settings.schedule?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-6 border-l-0 md:border-l-2 ml-0 md:ml-2">
                            <div className="grid gap-2">
                                <Label>Start Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={settings.schedule?.start_time || ''}
                                    onChange={(e) => updateSetting('schedule', { ...settings.schedule!, start_time: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={settings.schedule?.end_time || ''}
                                    onChange={(e) => updateSetting('schedule', { ...settings.schedule!, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 border p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4 text-purple-600" /> Assign to Class</Label>
                            <p className="text-sm text-muted-foreground">Group this test under a specific class.</p>
                        </div>
                    </div>
                    {/* Class Selector */}
                    <Select
                        value={classId || "none"}
                        onValueChange={(val) => setClassId(val === "none" ? null : val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a class..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Class (General)</SelectItem>
                            {availableClasses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label>Attempt Limit</Label>
                        <p className="text-sm text-muted-foreground">Restrict users to a single attempt.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{settings.attempt_limit === 1 ? 'Single Attempt' : 'Unlimited'}</span>
                        <Switch
                            checked={settings.attempt_limit === 1}
                            onCheckedChange={(c) => updateSetting('attempt_limit', c ? 1 : undefined)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 border p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2"><FormInput className="w-4 h-4" /> Start Form</Label>
                            <p className="text-sm text-muted-foreground">Collect details before start (Name is default).</p>
                        </div>
                        <Switch
                            checked={settings.start_form?.enabled}
                            onCheckedChange={(c) => {
                                const newState = { ...settings.start_form, enabled: c, fields: settings.start_form?.fields || [] };
                                updateSetting('start_form', newState);
                                if (!c && !settings.show_results_immediate) {
                                    updateSetting('show_results_immediate', true);
                                    toast.info("Result Visibility enabled automatically since Start Form was disabled.");
                                }
                            }}
                        />
                    </div>
                    {settings.start_form?.enabled && (
                        <div className="pl-0 md:pl-6 border-l-0 md:border-l-2 ml-0 md:ml-2 space-y-2">
                            <p className="text-xs text-muted-foreground">Custom fields (label, required):</p>
                            {settings.start_form?.fields.map((field, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Input
                                        value={field.label}
                                        onChange={(e) => {
                                            const newFields = [...(settings.start_form?.fields || [])];
                                            newFields[idx].label = e.target.value;
                                            updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                        }}
                                        placeholder="Field Label (e.g. Roll No)"
                                    />
                                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => {
                                                const newFields = [...(settings.start_form?.fields || [])];
                                                newFields[idx].required = e.target.checked;
                                                updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                            }}
                                        />
                                        <span className="text-xs">Req</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const newFields = settings.start_form?.fields.filter((_, i) => i !== idx);
                                            updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                        }}
                                    ><span className="text-red-500">×</span></Button>
                                </div>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const newFields = [...(settings.start_form?.fields || []), { label: '', required: true }];
                                    updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                }}
                            >+ Add Field</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderResults = (mode: string) => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="flex items-center gap-2"><Eye className="w-4 h-4" /> Result Visibility</Label>
                        <p className="text-sm text-muted-foreground">Show detailed analysis immediately after submit.</p>
                    </div>
                    <Switch
                        checked={settings.show_results_immediate}
                        onCheckedChange={(c) => {
                            updateSetting('show_results_immediate', c);
                            if (!c) {
                                const currentFields = settings.start_form?.fields || [];
                                const hasName = currentFields.some(f => f.label.toLowerCase() === 'name');
                                const newFields = hasName ? currentFields : [{ label: 'Name', required: true }, ...currentFields];
                                updateSetting('start_form', {
                                    enabled: true,
                                    fields: newFields
                                });
                                toast.info("Start Form enabled automatically for security.");
                            }
                        }}
                    />
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Strict Timer (Server Side)</Label>
                        <p className="text-sm text-muted-foreground">Prevents timer reset on reload. Uses start timestamp.</p>
                    </div>
                    <Switch
                        checked={settings.strict_timer}
                        onCheckedChange={(c) => updateSetting('strict_timer', c)}
                    />
                </div>

                <div className="flex items-start justify-between border p-4 rounded-lg bg-purple-50/20">
                    <div className="space-y-1 pr-4">
                        <Label className="flex items-center gap-2 text-base"><Clock className="w-4 h-4 text-purple-600" /> Allow Flexible Timer</Label>
                        <p className="text-sm text-muted-foreground">Allows test takers to disable the test timer before starting.</p>
                        {settings.allow_flexible_timer !== false && (
                            <div className="flex items-start gap-2 mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                <p><strong>Warning:</strong> Don't forget to turn this off for strict exams. Candidates can take unlimited time if enabled.</p>
                            </div>
                        )}
                    </div>
                    <div className="pt-1">
                        <Switch
                            checked={settings.allow_flexible_timer !== false}
                            onCheckedChange={(c) => updateSetting('allow_flexible_timer', c)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label>Randomize Questions</Label>
                        <p className="text-sm text-muted-foreground">Shuffle question order for every student.</p>
                    </div>
                    <Switch
                        checked={settings.shuffle_questions}
                        onCheckedChange={(c) => updateSetting('shuffle_questions', c)}
                    />
                </div>
            </div>
        </div>
    );

    const renderAIUtilities = () => (
        <div className="space-y-6">
            <Card className="border-indigo-100 bg-indigo-50/30 dark:bg-indigo-900/10 dark:border-indigo-900/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> AI Topic Analyzer
                    </CardTitle>
                    <CardDescription>
                        Automatically categorize your questions into relevant topics using Gemini 2.0 Flash.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 space-y-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            This will analyze question text and assign topics like "Kinematics", "Trigonometry", etc. 
                            These topics will be used for **Topic-Wise Analysis** on the student results page.
                        </p>
                        <Button 
                            onClick={handleAutoAssignTopics} 
                            disabled={topicGenerating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {topicGenerating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Questions...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> ✨ Auto-Assign Topics (AI)</>
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 italic">
                        Note: You can manually review and edit assigned topics in the "Upload Solutions" page.
                    </p>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
            <Card className="w-full max-w-4xl h-[100dvh] md:h-[90vh] flex flex-col shadow-xl border-none md:border">

                {/* Mobile View: Single Scrollable View */}
                <div className="md:hidden flex-1 overflow-y-auto">
                    <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 dark:bg-slate-950">
                        <div className="flex flex-col gap-2">
                            <CardTitle className="text-lg">Test Environment Settings</CardTitle>
                            {!isPremium && !overridePremium && (
                                <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none flex items-center gap-1 w-fit">
                                    <Crown className="w-3 h-3" />
                                    Premium Feature
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onClose} size="icon"><span className="text-xl">×</span></Button>
                        </div>
                    </div>

                    <div className="p-4 space-y-8 pb-32">
                        <section>
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-primary bg-primary/5 p-2 rounded"><Shield className="w-5 h-5" /> Proctoring & Security</h3>
                            {renderProctoring('mobile')}
                        </section>

                        <section>
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-primary bg-primary/5 p-2 rounded"><Lock className="w-5 h-5" /> Access & Control</h3>
                            {renderAccess('mobile')}
                        </section>

                        <section>
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-primary bg-primary/5 p-2 rounded"><Eye className="w-5 h-5" /> Results & Timing</h3>
                            {renderResults('mobile')}
                        </section>

                        <section>
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-indigo-600 bg-indigo-50 p-2 rounded"><Sparkles className="w-5 h-5" /> AI Utilities</h3>
                            {renderAIUtilities()}
                        </section>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-white dark:bg-slate-950 z-20 flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                            <Button className="flex-1" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onViewResults} className="w-full">
                            <FileText className="w-4 h-4 mr-2" /> View Results
                        </Button>
                    </div>
                </div>

                {/* Desktop View: Tabs Layout */}
                <div className="hidden md:flex flex-col h-full">
                    <CardHeader className="border-b">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <CardTitle>Test Environment Settings</CardTitle>
                                {!isPremium && !overridePremium && (
                                    <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none flex items-center gap-1">
                                        <Crown className="w-3 h-3" />
                                        Premium Feature
                                    </Badge>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={onViewResults}>
                                    <FileText className="w-4 h-4 mr-2" /> View Results
                                </Button>
                                <Button variant="ghost" onClick={onClose} size="icon"><span className="text-xl">×</span></Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="flex-1 overflow-hidden">
                        <Tabs defaultValue="proctoring" className="h-full flex flex-col">
                            <div className="px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="proctoring" className="flex gap-2"><Shield className="w-4 h-4" /> Proctoring & Security</TabsTrigger>
                                    <TabsTrigger value="access" className="flex gap-2"><Lock className="w-4 h-4" /> Access & Control</TabsTrigger>
                                    <TabsTrigger value="results" className="flex gap-2"><Eye className="w-4 h-4" /> Results & Timing</TabsTrigger>
                                    <TabsTrigger value="ai" className="flex gap-2"><Sparkles className="w-4 h-4" /> AI Utilities</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <TabsContent value="proctoring" className="space-y-6 mt-0">
                                    {renderProctoring('desktop')}
                                </TabsContent>

                                <TabsContent value="access" className="space-y-6 mt-0">
                                    {renderAccess('desktop')}
                                </TabsContent>

                                <TabsContent value="results" className="space-y-6 mt-0">
                                    {renderResults('desktop')}
                                </TabsContent>

                                <TabsContent value="ai" className="space-y-6 mt-0">
                                    {renderAIUtilities()}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <div className="border-t p-4 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
