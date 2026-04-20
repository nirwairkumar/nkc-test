import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { fetchFeatureFlags, updateFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { toast } from 'sonner';
import { Wrench, ShieldAlert, Loader2, Youtube } from 'lucide-react';
import { SEO } from '@/components/SEO';

const AdminFeatureControl = () => {
    const [flags, setFlags] = useState<FeatureFlags>({
        enable_anonymous_tests: false,
        enable_ai_test_generation: true,
        ai_test_generation_notes: "",
        enable_youtube_generation: true,
        youtube_generation_notes: "",
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadFlags();
    }, []);

    const loadFlags = async () => {
        setLoading(true);
        try {
            const data = await fetchFeatureFlags();
            setFlags(data);
        } catch (error) {
            toast.error("Failed to load feature flags.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key: keyof FeatureFlags, checked: boolean) => {
        setIsSaving(true);
        try {
            const newFlags = { ...flags, [key]: checked };
            await updateFeatureFlags(newFlags);
            setFlags(newFlags);
            toast.success("Feature updated successfully.");
        } catch (error) {
            toast.error("Failed to update feature.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTextChange = async (key: keyof FeatureFlags, value: string) => {
        setIsSaving(true);
        try {
            const newFlags = { ...flags, [key]: value };
            await updateFeatureFlags(newFlags);
            setFlags(newFlags);
            toast.success("Notes updated successfully.");
        } catch (error) {
            toast.error("Failed to update notes.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-10 px-4 md:px-8 animate-in fade-in duration-500">
            <SEO title="Feature Control | Admin" />
            <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Wrench className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Feature Control</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Toggle global platform features and beta functionalities.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Security & Access Section */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-slate-500" />
                            <CardTitle className="text-lg">Access & Security</CardTitle>
                        </div>
                        <CardDescription>Manage how users access the platform and assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="space-y-1">
                                <h3 className="font-medium text-slate-900 dark:text-slate-100">Anonymous Test Taking</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Allow guests to take tests without logging in. Results are not saved to any history.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                <Switch
                                    checked={flags.enable_anonymous_tests}
                                    onCheckedChange={(checked) => handleToggle('enable_anonymous_tests', checked)}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors mt-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-medium text-slate-900 dark:text-slate-100">AI Test Generator</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Enable or disable the "Generate with AI" capability globally.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    <Switch
                                        checked={flags.enable_ai_test_generation ?? true}
                                        onCheckedChange={(checked) => handleToggle('enable_ai_test_generation', checked)}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            
                            {/* Notes Textarea (Disabled mode) */}
                            {!(flags.enable_ai_test_generation ?? true) && (
                                <div className="mt-2 space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Disable Message / Notes to Users
                                    </label>
                                    <textarea
                                        className="w-full min-h-[80px] p-3 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-800"
                                        placeholder="e.g. We are currently undergoing maintenance..."
                                        value={flags.ai_test_generation_notes || ""}
                                        onChange={(e) => setFlags(prev => ({ ...prev, ai_test_generation_notes: e.target.value }))}
                                        onBlur={(e) => handleTextChange('ai_test_generation_notes', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">This message will be shown to users when they visit the generate-with-ai page while this feature is disabled. Focus away from the text box to save.</p>
                                </div>
                            )}
                        </div>
                        {/* YouTube Generation Toggle */}
                        <div className="flex flex-col gap-4 p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors mt-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <Youtube className="h-4 w-4 text-red-500" />
                                        YouTube Test Generator
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Enable or disable the "Generate from YouTube" feature globally.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    <Switch
                                        checked={flags.enable_youtube_generation ?? true}
                                        onCheckedChange={(checked) => handleToggle('enable_youtube_generation', checked)}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>

                            {/* Notes Textarea (shown when disabled) */}
                            {!(flags.enable_youtube_generation ?? true) && (
                                <div className="mt-2 space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Disable Message / Notes to Users
                                    </label>
                                    <textarea
                                        className="w-full min-h-[80px] p-3 text-sm border rounded-md dark:bg-slate-900 dark:border-slate-800"
                                        placeholder="e.g. YouTube generation is temporarily paused for maintenance..."
                                        value={flags.youtube_generation_notes || ""}
                                        onChange={(e) => setFlags(prev => ({ ...prev, youtube_generation_notes: e.target.value }))}
                                        onBlur={(e) => handleTextChange('youtube_generation_notes', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">This message will be shown to users as a popup when they try to use the YouTube generator. Focus away to save.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminFeatureControl;
