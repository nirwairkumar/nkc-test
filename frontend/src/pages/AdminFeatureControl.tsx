import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { fetchFeatureFlags, updateFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { toast } from 'sonner';
import { Wrench, ShieldAlert, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';

const AdminFeatureControl = () => {
    const [flags, setFlags] = useState<FeatureFlags>({ enable_anonymous_tests: false });
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminFeatureControl;
