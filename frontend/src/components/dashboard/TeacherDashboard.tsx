import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchTestsByUserId, updateTest, deleteTest } from '@/lib/testsApi';
import { fetchClasses } from '@/lib/classesApi';
import { fetchCategories } from '@/lib/categoriesApi';
import { fetchUserDetails } from '@/lib/usersApi';
import { shareTest } from '@/utils/shareUtils';
import { toggleCreatorMode as apiToggleCreatorMode } from '@/lib/socialApi';
import SplashLoader from '@/components/ui/SplashLoader';
import ConductExamDialog from '@/components/ConductExamDialog';
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import CreatorDashboardTour from '@/components/CreatorDashboardTour';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

// Subcomponents
import DashboardHeader from './DashboardHeader';
import WelcomeSection from './WelcomeSection';
import PrimaryActions from './PrimaryActions';
import OverviewCards from './OverviewCards';
import ContinueWorking from './ContinueWorking';
import LiveActivity from './LiveActivity';
import RecentResponses from './RecentResponses';
import QuickActionsSection from './QuickActionsSection';
import AIStudioSection from './AIStudioSection';
import CommunityLibrarySection from './CommunityLibrarySection';
import InstitutionPanel from './InstitutionPanel';
import AnalyticsSection from './AnalyticsSection';
import GlobalSearchModal from './GlobalSearchModal';
import NotificationCenter from './NotificationCenter';

export default function TeacherDashboard() {
    const { user, profile, isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Impersonation check
    const queryParams = new URLSearchParams(window.location.search);
    const impersonateUserId = queryParams.get("userId");
    const targetUserId = (isAdmin && impersonateUserId) ? impersonateUserId : user?.id;

    // Local states
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [targetUserProfile, setTargetUserProfile] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Modals & Panels
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Conduct Exam Dialog State
    const [selectedTestForConduct, setSelectedTestForConduct] = useState<any>(null);
    const [isConductDialogOpen, setIsConductDialogOpen] = useState<boolean>(false);

    // Settings Panel State
    const [selectedTestForSettings, setSelectedTestForSettings] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    // Results Panel State
    const [selectedTestForResults, setSelectedTestForResults] = useState<any>(null);

    // Delete Dialog State
    const [testToDelete, setTestToDelete] = useState<{ id: string; title: string } | null>(null);

    // Role resolution
    const designation = targetUserProfile?.designation || user?.user_metadata?.designation || profile?.designation;
    const isInstitutionRole = designation === 'Institution';
    const roleLabel = isInstitutionRole ? 'Institution' : 'Teacher';

    // Check if creator status is active
    const isCreator = targetUserProfile?.is_creator || profile?.is_creator || isAdmin;

    // Fetch Target User Profile if impersonated
    useEffect(() => {
        if (isAdmin && impersonateUserId) {
            fetchUserDetails(impersonateUserId)
                .then(data => setTargetUserProfile(data))
                .catch(err => console.error("Failed to load impersonated profile:", err));
        } else {
            setTargetUserProfile(profile);
        }
    }, [isAdmin, impersonateUserId, profile]);

    // Load Tests
    const loadTests = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const res = await fetchTestsByUserId(targetUserId);
            const testsArray = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
            setTests(testsArray);
        } catch (e: any) {
            console.error('Failed to fetch tests:', e);
            toast.error(e.message || 'Failed to load your tests.');
            setTests([]);
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => {
        if (targetUserId) {
            loadTests();
            fetchClasses(targetUserId).then(res => setClasses(res?.data || [])).catch(() => setClasses([]));
            fetchCategories().then(res => setCategories(res?.data || [])).catch(() => setCategories([]));
        }
    }, [targetUserId, loadTests]);

    // Test Action Handlers
    const handleEditTest = (test: any) => {
        navigate(`/edit-test/${test.id}`);
    };

    const handleConduct = (test: any) => {
        setSelectedTestForConduct(test);
        setIsConductDialogOpen(true);
    };

    const handleConfirmConduct = async (conductSlug: string) => {
        if (!selectedTestForConduct) return;
        try {
            const currentSettings = selectedTestForConduct.settings || {};
            const updatedSettings = {
                ...currentSettings,
                conduct_exam: {
                    ...(currentSettings.conduct_exam || {}),
                    enabled: true,
                    slug: conductSlug
                }
            };

            const res = await updateTest(selectedTestForConduct.id, { settings: updatedSettings }, targetUserId);
            if (res?.error) throw res.error;

            toast.success(`Exam link created for "${selectedTestForConduct.title}"`);
            setIsConductDialogOpen(false);
            setSelectedTestForConduct(null);
            loadTests();
        } catch (err: any) {
            toast.error(err.message || 'Failed to start exam.');
        }
    };

    const handleRemoveConduct = async (testId: string, title: string) => {
        try {
            const currentTest = safeTests.find(t => t.id === testId);
            const currentSettings = currentTest?.settings || {};

            const updatedSettings = {
                ...currentSettings,
                conduct_exam: {
                    ...(currentSettings.conduct_exam || {}),
                    enabled: false
                }
            };

            const res = await updateTest(testId, { settings: updatedSettings }, targetUserId);
            if (res?.error) throw res.error;

            toast.success(`Exam status for "${title}" updated.`);
            loadTests();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update exam status.');
        }
    };

    const handleSettings = (test: any) => {
        setSelectedTestForSettings(test);
        setIsSettingsOpen(true);
    };

    const handleShare = async (test: any) => {
        await shareTest({
            title: test.title,
            slug: test.slug,
            id: test.id,
            total_questions: test.total_questions || test.questions?.length,
            duration: test.duration,
            is_conduct_mode: test.settings?.conduct_exam?.enabled
        });
    };

    const handleDeleteConfirm = async () => {
        if (!testToDelete) return;
        try {
            await deleteTest(testToDelete.id, targetUserId);
            toast.success(`"${testToDelete.title}" deleted.`);
            setTestToDelete(null);
            loadTests();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete test.');
        }
    };

    const handleUploadSolutions = (test: any) => {
        navigate(`/edit-test/${test.id}?tab=solutions`);
    };

    if (authLoading) {
        return <SplashLoader text="Loading Workspace..." />;
    }

    // Fallback if not creator
    if (!isCreator && !isAdmin) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-16">
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Activate Creator & Educator Workstation</h1>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                        To access the Teacher & Institution Dashboard, create tests, and conduct online exams, enable your Educator status.
                    </p>
                    <div className="mt-6 flex justify-center">
                        <Button
                            onClick={async () => {
                                if (!user?.id) return;
                                const { error } = await apiToggleCreatorMode(user.id, true);
                                if (!error) {
                                    toast.success("Creator mode enabled! Loading workstation...");
                                    window.location.reload();
                                } else {
                                    toast.error("Failed to enable creator mode.");
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm cursor-pointer shadow-lg shadow-indigo-600/20"
                        >
                            Enable Teacher Workstation
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate metrics
    const safeTests = Array.isArray(tests) ? tests : [];
    const now = new Date();
    const hasEnded = (t: any) => t?.settings?.schedule?.end_time && new Date(t.settings.schedule.end_time) < now;
    const isLive = (t: any) => t?.settings?.conduct_exam?.enabled && !hasEnded(t);
    const isScheduled = (t: any) => t?.settings?.schedule?.enabled && t?.settings?.schedule?.start_time && new Date(t.settings.schedule.start_time) > now;
    const isDraft = (t: any) => !isLive(t) && !isScheduled(t) && (t?.questions?.length === 0 || t?.visibility === 'private');

    const liveCount = safeTests.filter(isLive).length;
    const draftCount = safeTests.filter(isDraft).length;
    const scheduledCount = safeTests.filter(isScheduled).length;

    const displayName = targetUserProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Tour onboarding */}
            <CreatorDashboardTour
                tests={tests}
                configuringTest={selectedTestForSettings}
                conductExamTest={selectedTestForConduct}
                onSkip={() => {}}
                userId={targetUserId}
            />

            {/* Main Workspace Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header Bar */}
                <DashboardHeader
                    user={user}
                    profile={targetUserProfile}
                    isAdmin={isAdmin}
                    role={roleLabel}
                    onOpenSearch={() => setIsSearchOpen(true)}
                    onOpenNotifications={() => setIsNotificationsOpen(true)}
                />

                {/* Welcome Productivity Section */}
                <WelcomeSection
                    displayName={displayName}
                    liveCount={liveCount}
                    draftCount={draftCount}
                    submissionsCount={18}
                    role={roleLabel}
                />

                {/* Primary Action Cards (Above the Fold) */}
                <PrimaryActions />

                {/* Institution Panel (Only rendered for Institution users) */}
                {isInstitutionRole && <InstitutionPanel />}

                {/* Workspace Overview Metrics */}
                <OverviewCards
                    totalTests={safeTests.length}
                    liveCount={liveCount}
                    draftCount={draftCount}
                    scheduledCount={scheduledCount}
                    submissionsToday={24}
                    avgScorePct={78}
                    isInstitution={isInstitutionRole}
                />

                {/* Continue Working (Workplace Test Management) */}
                <ContinueWorking
                    tests={tests}
                    loading={loading}
                    onEdit={handleEditTest}
                    onConduct={handleConduct}
                    onRemoveConduct={handleRemoveConduct}
                    onSettings={handleSettings}
                    onShare={handleShare}
                    onDelete={(id, title) => setTestToDelete({ id, title })}
                    onUploadSolutions={handleUploadSolutions}
                />

                {/* Live Activity & Recent Responses (2 Column Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <LiveActivity />
                    <RecentResponses />
                </div>

                {/* Quick Tools & AI Studio Highlights */}
                <QuickActionsSection />
                <AIStudioSection />

                {/* Performance Analytics Charts */}
                <AnalyticsSection />

                {/* Community Repository Library (Below Personal Work) */}
                <CommunityLibrarySection currentUserId={targetUserId || ''} />
            </div>

            {/* Global Keyboard Search Modal */}
            <GlobalSearchModal
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
                userTests={tests}
            />

            {/* Notifications Drawer */}
            <NotificationCenter
                open={isNotificationsOpen}
                onOpenChange={setIsNotificationsOpen}
            />

            {/* Conduct Exam Dialog */}
            {selectedTestForConduct && (
                <ConductExamDialog
                    open={isConductDialogOpen}
                    test={selectedTestForConduct}
                    onClose={() => {
                        setIsConductDialogOpen(false);
                        setSelectedTestForConduct(null);
                    }}
                    onConfirm={handleConfirmConduct}
                />
            )}

            {/* Test Settings Panel */}
            {selectedTestForSettings && isSettingsOpen && (
                <TestSettingsPanel
                    test={selectedTestForSettings}
                    onClose={() => {
                        setIsSettingsOpen(false);
                        setSelectedTestForSettings(null);
                    }}
                    onUpdate={() => {
                        loadTests();
                        setIsSettingsOpen(false);
                        setSelectedTestForSettings(null);
                    }}
                    onViewResults={() => {
                        setSelectedTestForResults(selectedTestForSettings);
                        setIsSettingsOpen(false);
                    }}
                />
            )}

            {/* Test Results Panel */}
            {selectedTestForResults && (
                <TestResultsPanel
                    test={selectedTestForResults}
                    onClose={() => setSelectedTestForResults(null)}
                />
            )}

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!testToDelete} onOpenChange={(open) => !open && setTestToDelete(null)}>
                <AlertDialogContent className="rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this test?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{testToDelete?.title}" and all associated student attempt logs. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                        >
                            Delete Test
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
