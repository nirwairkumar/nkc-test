import React, { useState, useEffect } from 'react';
import { Test, TestSettings, updateTest } from '@/lib/testsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Clock, Eye, Lock, Shield, Calendar, FormInput, Maximize, FileText } from 'lucide-react';

interface TestSettingsPanelProps {
    test: Test;
    onClose: () => void;
    onUpdate: () => void;
    onViewResults: () => void;
}

export default function TestSettingsPanel({ test, onClose, onUpdate, onViewResults }: TestSettingsPanelProps) {
    const [settings, setSettings] = useState<TestSettings>({
        attempt_limit: undefined,
        strict_timer: false,
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

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (test.settings) {
            setSettings(prev => ({ ...prev, ...test.settings }));
        }
    }, [test]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await updateTest(test.id, { settings });
            if (error) throw error;
            toast.success("Test settings updated successfully");
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error("Failed to save settings", err);
            toast.error("Failed to save settings: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = <K extends keyof TestSettings>(key: K, value: TestSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl h-[90vh] flex flex-col shadow-xl">
                <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Test Environment Settings</CardTitle>
                            <CardDescription>Configure proctoring, access control, and fairness rules for {test.title}</CardDescription>
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
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="proctoring" className="flex gap-2"><Shield className="w-4 h-4" /> Proctoring & Security</TabsTrigger>
                                <TabsTrigger value="access" className="flex gap-2"><Lock className="w-4 h-4" /> Access & Control</TabsTrigger>
                                <TabsTrigger value="results" className="flex gap-2"><Eye className="w-4 h-4" /> Results & Timing</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <TabsContent value="proctoring" className="space-y-6 mt-0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                                        <div className="space-y-0.5">
                                            <Label className="text-base flex items-center gap-2"><Maximize className="w-4 h-4 text-blue-500" /> Force Full Screen</Label>
                                            <p className="text-sm text-muted-foreground">User must enter full screen to start. Exiting triggers a warning.</p>
                                        </div>
                                        <Switch checked={settings.force_fullscreen} onCheckedChange={(c) => updateSetting('force_fullscreen', c)} />
                                    </div>

                                    <div className="flex flex-col gap-3 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Tab Switch Detection</Label>
                                                <p className="text-sm text-muted-foreground">Detect if user switches tabs or minimizes browser.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-2">
                                            <div className="flex items-center space-x-2">
                                                <input type="radio" id="ts_off" name="tab_switch" checked={settings.tab_switch_mode === 'off'} onChange={() => updateSetting('tab_switch_mode', 'off')} className="accent-primary" />
                                                <Label htmlFor="ts_off" className="font-normal cursor-pointer">Off (Allowed)</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input type="radio" id="ts_warn" name="tab_switch" checked={settings.tab_switch_mode === 'warming'} onChange={() => updateSetting('tab_switch_mode', 'warming')} className="accent-primary" />
                                                <Label htmlFor="ts_warn" className="font-normal cursor-pointer">Warning then Submit</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input type="radio" id="ts_strict" name="tab_switch" checked={settings.tab_switch_mode === 'strict'} onChange={() => updateSetting('tab_switch_mode', 'strict')} className="accent-red-500" />
                                                <Label htmlFor="ts_strict" className="font-normal cursor-pointer text-red-600">Strict (Instant Submit)</Label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between border p-4 rounded-lg">
                                            <div className="space-y-0.5">
                                                <Label>Disable Copy/Paste</Label>
                                                <p className="text-xs text-muted-foreground">Prevent clipboard actions</p>
                                            </div>
                                            <Switch checked={settings.disable_copy_paste} onCheckedChange={(c) => updateSetting('disable_copy_paste', c)} />
                                        </div>
                                        <div className="flex items-center justify-between border p-4 rounded-lg">
                                            <div className="space-y-0.5">
                                                <Label>Disable Right Match</Label>
                                                <p className="text-xs text-muted-foreground">Prevent context menu</p>
                                            </div>
                                            <Switch checked={settings.disable_actions} onCheckedChange={(c) => updateSetting('disable_actions', c)} />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="access" className="space-y-6 mt-0">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-4 border p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-green-600" /> Scheduled Access</Label>
                                                <p className="text-sm text-muted-foreground">Restrict test availability window.</p>
                                            </div>
                                            <Switch checked={settings.schedule?.enabled} onCheckedChange={(c) => updateSetting('schedule', { ...settings.schedule, enabled: c })} />
                                        </div>
                                        {settings.schedule?.enabled && (
                                            <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 ml-2">
                                                <div className="grid gap-2">
                                                    <Label>Start Date & Time</Label>
                                                    <Input type="datetime-local" value={settings.schedule?.start_time || ''} onChange={(e) => updateSetting('schedule', { ...settings.schedule!, start_time: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>End Date & Time</Label>
                                                    <Input type="datetime-local" value={settings.schedule?.end_time || ''} onChange={(e) => updateSetting('schedule', { ...settings.schedule!, end_time: e.target.value })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between border p-4 rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>Attempt Limit</Label>
                                            <p className="text-sm text-muted-foreground">Restrict users to a single attempt.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium">{settings.attempt_limit === 1 ? 'Single Attempt' : 'Unlimited'}</span>
                                            <Switch checked={settings.attempt_limit === 1} onCheckedChange={(c) => updateSetting('attempt_limit', c ? 1 : undefined)} />
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

                                                    // Reciprocal Logic: If turning OFF Start Form, and Result Visibility is OFF,
                                                    // then FORCE Result Visibility ON to avoid "black hole" scenario.
                                                    if (!c && !settings.show_results_immediate) {
                                                        updateSetting('show_results_immediate', true);
                                                        toast.info("Result Visibility enabled automatically since Start Form was disabled.");
                                                    }
                                                }}
                                            />
                                        </div>
                                        {settings.start_form?.enabled && (
                                            <div className="pl-6 border-l-2 ml-2 space-y-2">
                                                <p className="text-xs text-muted-foreground">Custom fields (label, required):</p>
                                                {settings.start_form?.fields.map((field, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <Input value={field.label} onChange={(e) => {
                                                            const newFields = [...(settings.start_form?.fields || [])];
                                                            newFields[idx].label = e.target.value;
                                                            updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                                        }} placeholder="Field Label (e.g. Roll No)" />
                                                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded">
                                                            <input type="checkbox" checked={field.required} onChange={(e) => {
                                                                const newFields = [...(settings.start_form?.fields || [])];
                                                                newFields[idx].required = e.target.checked;
                                                                updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                                            }} />
                                                            <span className="text-xs">Req</span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => {
                                                            const newFields = settings.start_form?.fields.filter((_, i) => i !== idx);
                                                            updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                                        }}><span className="text-red-500">×</span></Button>
                                                    </div>
                                                ))}
                                                <Button size="sm" variant="outline" onClick={() => {
                                                    const newFields = [...(settings.start_form?.fields || []), { label: '', required: true }];
                                                    updateSetting('start_form', { ...settings.start_form!, fields: newFields });
                                                }}>+ Add Field</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="results" className="space-y-6 mt-0">
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
                                                // If turning OFF results, enforce Start Form with 'Name'
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
                                        <Switch checked={settings.strict_timer} onCheckedChange={(c) => updateSetting('strict_timer', c)} />
                                    </div>

                                    <div className="flex items-center justify-between border p-4 rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>Randomize Questions</Label>
                                            <p className="text-sm text-muted-foreground">Shuffle question order for every student.</p>
                                        </div>
                                        <Switch checked={settings.shuffle_questions} onCheckedChange={(c) => updateSetting('shuffle_questions', c)} />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <div className="border-t p-4 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
                </div>
            </Card>
        </div>
    );
}
