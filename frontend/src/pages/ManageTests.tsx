import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, Settings, Save, Plus, Pencil, FileText, Info, Clock, CheckCircle, Search, RefreshCw, Users, BookOpen, GraduationCap, MoreVertical, Globe, Link as LinkIcon, Lock, Check, ArrowRight, Upload, Layers, Copy, Edit, Radio, BarChart2, Loader2, X, Menu } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { fetchAllTests, createTest, deleteTest, updateTest, fetchTestsByCreator, adminCloneTest, fetchConductModeTests } from '@/lib/testsApi';
import { fetchAdminUsersReportStats, fetchAdminUserReports, Report } from '@/lib/reportsApi';
import { fetchUsers, fetchUserDetails, verifyCreator, revokeVerification } from '@/lib/usersApi';
import { fetchCategories, assignCategoriesToTest, fetchTestCategories, updateCategory, deleteCategory, createCategory, Category, SubCategory, fetchSubCategories, fetchAllSubCategories, createSubCategory, updateSubCategory, deleteSubCategory, assignSubCategoryToTest } from '@/lib/categoriesApi';
import { fetchUserAttempts } from '@/lib/attemptsApi';
import { fetchAllClasses } from '@/lib/classesApi';
import {
    createCombinedSession,
    fetchAdminCombinedSessions,
    deleteCombinedAttempt as deleteCombinedSessionAdmin,
} from '@/lib/combinedSessionsApi';
import { TestCardSkeleton } from '@/components/TestCardSkeleton';
import { useYouTubeStyleRender } from '@/hooks/useYouTubeStyleRender';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import TestSettingsPanel from '@/components/TestSettingsPanel';
import TestResultsPanel from '@/components/TestResultsPanel';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { shareTest } from '@/utils/shareUtils';
export default function ManageTests() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/admin');
        }
    }, [authLoading, isAdmin, navigate]);

    // --- State ---
    const [activeTab, setActiveTab] = useState("tests");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [tabLoading, setTabLoading] = useState(true);
    const loadedTabsRef = React.useRef<Record<string, boolean>>({});

    // Tests State
    const [tests, setTests] = useState<any[]>([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [isTestEditOpen, setIsTestEditOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<any>(null);

    const [selectedCategoriesForTest, setSelectedCategoriesForTest] = useState<string[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholders = ["Search by Title...", "Search by ID...", "Search by Creator...", "Search by Tags..."];

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);


    const [viewingCreator, setViewingCreator] = useState<any>(null); // For Creator Info Dialog

    // Categories State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string }>({ name: '' });

    // Sub-Categories State
    const [subCategories, setSubCategories] = useState<Record<string, SubCategory[]>>({});
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
    const [editingSubCategory, setEditingSubCategory] = useState<{ id?: string, name: string, category_id: string }>({ name: '', category_id: '' });
    const [allSubCategories, setAllSubCategories] = useState<SubCategory[]>([]);

    // Users State
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [viewingUser, setViewingUser] = useState<any>(null); // For User Details Dialog
    const [userDetails, setUserDetails] = useState<any>({ createdTests: [], attempts: [], reports: [] });

    // Reports Stats State
    const [reportStats, setReportStats] = useState<Record<string, { total: number; open: number; solved: number }>>({});

    // Manage & Results State
    const [configuringTest, setConfiguringTest] = useState<any>(null);
    const [viewingResultsTest, setViewingResultsTest] = useState<any>(null);

    // Cloning & Conduct States
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    const [cloningTestSelected, setCloningTestSelected] = useState<any>(null);
    const [cloneSearchUserQuery, setCloneSearchUserQuery] = useState('');
    const [cloneTargetUser, setCloneTargetUser] = useState<any>(null);
    const [isCloning, setIsCloning] = useState(false);
    const [cloneSearchTestQuery, setCloneSearchTestQuery] = useState('');
    const [dialogTests, setDialogTests] = useState<any[]>([]);
    const [dialogTestsLoading, setDialogTestsLoading] = useState(false);

    const [conductModeTests, setConductModeTests] = useState<any[]>([]);
    const [conductModeLoading, setConductModeLoading] = useState(false);

    // Three-dot menu state
    const [allClasses, setAllClasses] = useState<any[]>([]);

    // Combined Sessions State
    const [combinedSessions, setCombinedSessions] = useState<any[]>([]);
    const [combinedLoading, setCombinedLoading] = useState(false);
    const [newSession, setNewSession] = useState({
        title: '',
        paper1_label: 'Paper I',
        paper2_label: 'Paper II',
        test1_id: '',
        test2_id: '',
        break_duration_minutes: 30,
        is_public: true,
    });
    const [isSavingSession, setIsSavingSession] = useState(false);

    const observerTarget = React.useRef(null);

    // --- Loading Data ---
    // --- Loading Data ---
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const loadTests = React.useCallback(async (reset = false) => {
        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Create new controller for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const pageToLoad = reset ? 1 : page;

        setTestsLoading(true);
        try {
            // Using backend API for all tests (Admin view)
            const { data, meta, error } = await fetchAllTests({
                page: pageToLoad,
                limit: 9,
                searchQuery: debouncedSearchQuery,
                signal: controller.signal
            });

            if (error) throw error;

            if (reset) {
                setTests(data || []);
                setPage(2);
                setHasMore(meta?.has_more ?? (data ? data.length === 9 : false));
            } else {
                setTests(prev => [...prev, ...(data || [])]);
                setPage(prev => prev + 1);
                setHasMore(meta?.has_more ?? (data ? data.length === 9 : false));
            }
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message === 'canceled') {
                console.log('Request canceled');
                return; // Don't show error or update loading state heavily
            }
            console.error('Error loading tests:', error);
            toast.error("Failed to load tests");
        } finally {
            // Only turn off loading if this is the current request (not aborted)
            if (abortControllerRef.current === controller) {
                setTestsLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, [page, debouncedSearchQuery]);

    // --- Effects ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const isFirstSearchRef = React.useRef(true);
    useEffect(() => {
        if (isFirstSearchRef.current) {
            isFirstSearchRef.current = false;
            return;
        }
        if (activeTab === 'tests') {
            loadTests(true);
            loadedTabsRef.current['tests'] = true;
        } else {
            delete loadedTabsRef.current['tests'];
        }
    }, [debouncedSearchQuery]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !testsLoading) {
                    loadTests(false);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, testsLoading, loadTests]);

    const fetchActiveTabData = React.useCallback(async (tabId: string, force = false) => {
        if (!force && loadedTabsRef.current[tabId]) {
            setTabLoading(false);
            return;
        }

        try {
            setTabLoading(true);
            
            if (tabId === 'tests') {
                await Promise.all([
                    loadTests(true),
                    loadCategories().catch(() => null),
                    loadAllClasses().catch(() => null),
                    loadAllSubCategoriesData().catch(() => null)
                ]);
            } else if (tabId === 'categories') {
                await Promise.all([
                    loadCategories(),
                    loadAllSubCategoriesData()
                ]);
            } else if (tabId === 'users' || tabId === 'verified_creators') {
                await loadUsers();
            } else if (tabId === 'combined') {
                await Promise.all([
                    loadCombinedSessions(),
                    (tests.length === 0 ? loadTests(true) : Promise.resolve())
                ]);
            } else if (tabId === 'activity') {
                await loadConductModeTests();
            }

            loadedTabsRef.current[tabId] = true;
        } catch (error) {
            console.error(`Failed to load ${tabId} tab data:`, error);
        } finally {
            setTabLoading(false);
        }
    }, [tests.length]);

    useEffect(() => {
        fetchActiveTabData(activeTab);
    }, [activeTab, fetchActiveTabData]);

    // Fetch conduct mode tests on mount to get the active count for the sidebar badge
    useEffect(() => {
        const fetchInitialConductCount = async () => {
            try {
                const { data, error } = await fetchConductModeTests();
                if (!error && data) {
                    setConductModeTests(data || []);
                    // Mark as loaded so navigating to the activity tab doesn't fetch again
                    loadedTabsRef.current['activity'] = true;
                }
            } catch (err) {
                console.error("Failed to load initial conduct mode tests count:", err);
            }
        };
        fetchInitialConductCount();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);




    // Helper to count tests by a creator
    const getCreatorTestCount = (creatorId: string) => {
        return tests.filter(t => t.created_by === creatorId).length;
    };

    const handleViewCreator = async (creatorId: string) => {
        if (!creatorId) {
            toast.error("No creator ID found for this test.");
            return;
        }

        try {
            const { data, error } = await fetchUserDetails(creatorId);

            if (error) throw error;

            setViewingCreator({
                ...data, // Profile data
                testCount: getCreatorTestCount(creatorId)
            });
        } catch (error) {
            console.error("Error fetching creator:", error);
            toast.error("Could not fetch creator details.");
        }
    };

    const loadCategories = async () => {
        setCategoriesLoading(true);
        const { data } = await fetchCategories();
        if (data) setCategories(data);
        setCategoriesLoading(false);
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const { data, error } = await fetchUsers();

            if (error) throw error;
            setUsers(data || []);

            // Fetch Report Stats for Admin
            const { data: statsData } = await fetchAdminUsersReportStats();
            if (statsData) {
                setReportStats(statsData);
            }

        } catch (error) {
            console.error("Error loading users:", error);
            toast.error("Failed to load users");
        } finally {
            setUsersLoading(false);
        }
    };

    const loadConductModeTests = async () => {
        setConductModeLoading(true);
        try {
            const { data, error } = await fetchConductModeTests();
            if (error) throw error;
            setConductModeTests(data || []);
        } catch (error) {
            console.error('Error loading conduct mode tests:', error);
        } finally {
            setConductModeLoading(false);
        }
    };

    const handleStopConductMode = async (test: any) => {
        if (!confirm(`Are you sure you want to stop the live conduct mode for "${test.title}"? This will end the active exam for all students.`)) {
            return;
        }
        const updatedSettings = {
            ...test.settings,
            conduct_exam: {
                ...test.settings?.conduct_exam,
                enabled: false
            }
        };
        const { error } = await updateTest(test.id, { settings: updatedSettings }, isAdmin);
        if (error) {
            toast.error("Failed to stop conduct mode: " + error);
        } else {
            toast.success("Conduct mode stopped successfully.");
            loadConductModeTests();
        }
    };

    const handleOpenCloneToUserDialog = (test: any) => {
        setCloningTestSelected(test);
        setCloneTargetUser(null);
        setCloneSearchUserQuery('');
        setIsCloneDialogOpen(true);
    };

    const handleOpenCloneDialogForUser = (targetUser: any) => {
        setCloneTargetUser(targetUser);
        setCloningTestSelected(null);
        setCloneSearchTestQuery('');
        setIsCloneDialogOpen(true);
    };

    const handleCloneTestToUser = async () => {
        const testId = cloningTestSelected?.id;
        const targetUserId = cloneTargetUser?.id;
        if (!testId || !targetUserId) {
            toast.error("Please select both a test and a target user.");
            return;
        }
        setIsCloning(true);
        try {
            const { error } = await adminCloneTest(testId, targetUserId);
            if (error) throw new Error(error);
            toast.success(`Successfully cloned test into target user dashboard!`);
            setIsCloneDialogOpen(false);
            setCloningTestSelected(null);
            setCloneTargetUser(null);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to clone test: " + err.message);
        } finally {
            setIsCloning(false);
        }
    };

    useEffect(() => {
        if (!isCloneDialogOpen || !cloneTargetUser || cloningTestSelected) return;

        const searchTests = async () => {
            setDialogTestsLoading(true);
            try {
                const { data } = await fetchAllTests({
                    page: 1,
                    limit: 10,
                    searchQuery: cloneSearchTestQuery
                });
                setDialogTests(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setDialogTestsLoading(false);
            }
        };

        const timeout = setTimeout(searchTests, 300);
        return () => clearTimeout(timeout);
    }, [cloneSearchTestQuery, isCloneDialogOpen, cloneTargetUser, cloningTestSelected]);

    const handleViewUserDetails = async (user: any) => {
        setViewingUser(user);
        setUserDetails({ createdTests: [], attempts: [], reports: [] }); // Reset

        try {
            // 1. Fetch Created Tests
            const { data: createdTests } = await fetchTestsByCreator(user.id);

            // 2. Fetch Attempts (History)
            const { data: attempts } = await fetchUserAttempts(user.id);

            // 3. Fetch Reports (against tests created by this user)
            const { data: reports } = await fetchAdminUserReports(user.id);

            setUserDetails({
                createdTests: createdTests || [],
                attempts: attempts || [],
                reports: reports || []
            });

        } catch (error) {
            console.error("Error fetching user details", error);
            toast.error("Could not load full user details");
        }
    };

    const filteredUsers = users.filter(user => {
        if (!userSearchQuery) return true;
        const q = userSearchQuery.toLowerCase();
        return (
            (user.full_name?.toLowerCase() || '').includes(q) ||
            (user.email?.toLowerCase() || '').includes(q) ||
            (user.id?.toLowerCase() || '').includes(q)
        );
    });

    // --- Three-dot Menu Handlers ---
    const loadAllClasses = async () => {
        try {
            const { data, error } = await fetchAllClasses();
            if (error) throw error;
            setAllClasses(data || []);
        } catch (error) {
            console.error("Error loading classes:", error);
        }
    };

    const handleShare = (test: any) => {
        shareTest(test);
    };

    // --- Combined Sessions ---
    const loadCombinedSessions = async () => {
        setCombinedLoading(true);
        try {
            const { data } = await fetchAdminCombinedSessions();
            setCombinedSessions(data || []);
        } catch (e) {
            toast.error('Failed to load combined sessions');
        } finally {
            setCombinedLoading(false);
        }
    };

    const handleCreateCombinedSession = async () => {
        if (!newSession.title.trim()) { toast.error('Title is required'); return; }
        if (!newSession.test1_id) { toast.error('Paper I test is required'); return; }
        if (!newSession.test2_id) { toast.error('Paper II test is required'); return; }
        if (newSession.test1_id === newSession.test2_id) { toast.error('Paper I and Paper II must be different tests'); return; }
        setIsSavingSession(true);
        try {
            await createCombinedSession({
                created_by: user!.id,
                ...newSession,
            });
            toast.success('Combined session created!');
            setNewSession({ title: '', paper1_label: 'Paper I', paper2_label: 'Paper II', test1_id: '', test2_id: '', break_duration_minutes: 30, is_public: true });
            loadCombinedSessions();
        } catch (e: any) {
            toast.error('Failed to create combined session: ' + e.message);
        } finally {
            setIsSavingSession(false);
        }
    };

    const handleDeleteCombinedSession = async (id: string, title: string) => {
        if (!confirm(`Delete combined session "${title}"?`)) return;
        try {
            await deleteCombinedSessionAdmin(id);
            toast.success('Session deleted');
            loadCombinedSessions();
        } catch {
            toast.error('Failed to delete session');
        }
    };

    const handleVisibilityChange = async (test: any, newVisibility: 'public' | 'unlisted' | 'private') => {
        const isPublic = newVisibility === 'public';
        const oldVisibility = test.visibility;

        // Optimistic update
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, visibility: newVisibility, is_public: isPublic } : t));

        try {
            const { error } = await updateTest(test.id, { visibility: newVisibility, is_public: isPublic }, isAdmin);

            if (error) throw error;

            toast.success(`Visibility set to ${newVisibility === 'unlisted' ? 'Link Only' : newVisibility.charAt(0).toUpperCase() + newVisibility.slice(1)}`);
        } catch (error: any) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
            // Revert
            setTests(prev => prev.map(t => t.id === test.id ? { ...t, visibility: oldVisibility, is_public: test.is_public } : t));
        }
    };

    const handleClassChange = async (test: any, classId: string | null, className: string | null) => {
        const oldClassId = test.class_id;
        // Optimistic update
        setTests(prev => prev.map(t => t.id === test.id ? {
            ...t,
            class_id: classId,
            classes: className ? { name: className } : null
        } : t));

        try {
            const { error } = await updateTest(test.id, { class_id: classId }, isAdmin);

            if (error) throw error;

            toast.success(classId ? `Assigned to ${className}` : "Removed from class");
        } catch (error: any) {
            console.error("Failed to update class assignment:", error);
            toast.error("Failed to update class assignment");
            // Revert
            setTests(prev => prev.map(t => t.id === test.id ? {
                ...t,
                class_id: oldClassId,
                classes: test.classes
            } : t));
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'public': return <Globe className="h-4 w-4" />;
            case 'unlisted': return <LinkIcon className="h-4 w-4" />;
            case 'private': return <Lock className="h-4 w-4" />;
            default: return <Globe className="h-4 w-4" />;
        }
    };

    // --- Verified Creator Actions ---
    const handleVerifyUser = async (userToVerify: any) => {
        if (!confirm(`Are you sure you want to verify "${userToVerify.full_name}" as an Authorized Partner?`)) return;

        try {
            const { error } = await verifyCreator(userToVerify.id);

            if (error) throw error;
            toast.success(`${userToVerify.full_name} is now a Verified Creator!`);
            loadUsers();
        } catch (error: any) {
            console.error("Error verifying user:", error);
            toast.error("Failed to verify user: " + error.message);
        }
    };

    const handleRevokeVerification = async (userToRevoke: any) => {
        if (!confirm(`Are you sure you want to REVOKE verification for "${userToRevoke.full_name}"?`)) return;

        try {
            const { error } = await revokeVerification(userToRevoke.id);

            if (error) throw error;
            toast.success(`Verification revoked for ${userToRevoke.full_name}`);
            loadUsers();
        } catch (error: any) {
            console.error("Error revoking verification:", error);
            toast.error("Failed to revoke verification: " + error.message);
        }
    };

    // --- Test Actions ---
    const handleDeleteTest = async (testId: string, testTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${testTitle}" ?\n\nThis will permanently delete the test and all associated questions.`)) {
            return;
        }
        try {
            const { error } = await deleteTest(testId, isAdmin);
            if (error) throw error;
            setTests(prev => prev.filter(t => t.id !== testId));
            toast.success(`Test "${testTitle}" deleted`);
        } catch (error: any) {
            console.error('Error deleting test:', error);
            toast.error('Failed to delete test: ' + error.message);
        }
    };

    const openTestEditDialog = async (test: any) => {
        // Navigate to the full editor instead of the limited dialog
        navigate(`/edit-test/${test.id}`);
    };

    const handleSaveTest = async () => {
        if (!editingTest) return;
        try {
            const { error } = await updateTest(editingTest.id, {
                title: editingTest.title,
                description: editingTest.description,
                custom_id: editingTest.custom_id,
                marks_per_question: parseFloat(editingTest.marks_per_question),
                negative_marks: parseFloat(editingTest.negative_marks),
                duration: parseFloat(editingTest.duration)
            }, isAdmin);

            if (error) throw error;
            await assignCategoriesToTest(editingTest.id, selectedCategoriesForTest, isAdmin);

            toast.success("Test updated successfully");
            setIsTestEditOpen(false);
            loadTests();
        } catch (error: any) {
            console.error("Error updating test:", error);
            toast.error("Failed to update test: " + error.message);
        }
    };

    const handleTestUpdate = (updatedTest: any) => {
        if (!updatedTest) {
            loadTests();
            return;
        }

        // Update tests list locally
        setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));

        // Update configuringTest if matches (to show latest data immediately if re-opened)
        if (configuringTest?.id === updatedTest.id) {
            setConfiguringTest(updatedTest);
        }

        // Update viewingResultsTest if matches
        if (viewingResultsTest?.id === updatedTest.id) {
            setViewingResultsTest(updatedTest);
        }
    };

    const toggleCategoryForTest = (id: string) => {
        setSelectedCategoriesForTest(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };


    // --- Category Actions ---
    const openCategoryDialog = (category?: Category) => {
        if (category) {
            setEditingCategory({ id: category.id, name: category.name });
        } else {
            setEditingCategory({ name: '' });
        }
        setIsCategoryDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!editingCategory.name.trim()) return;

        try {
            if (editingCategory.id) {
                // Update
                const { error } = await updateCategory(editingCategory.id, editingCategory.name.trim());
                if (error) throw error;
                toast.success("Category updated");
            } else {
                // Create
                const { error } = await createCategory(editingCategory.name.trim());
                if (error) throw error;
                toast.success("Category created");
            }
            setIsCategoryDialogOpen(false);
            loadCategories();
        } catch (error: any) {
            console.error("Error saving category:", error);
            toast.error("Failed to save category");
        }
    };

    const handleDeleteCategory = async (category: Category) => {
        if (!confirm(`Delete category "${category.name}" ? This will vanish from all tests.`)) return;

        try {
            const { error } = await deleteCategory(category.id);
            if (error) throw error;
            toast.success("Category deleted");
            loadCategories();
        } catch (error: any) {
            toast.error("Failed to delete category");
        }
    };

    // --- Sub-Category Actions ---
    const loadSubCategories = async (categoryId: string) => {
        const { data } = await fetchSubCategories(categoryId);
        if (data) {
            setSubCategories(prev => ({ ...prev, [categoryId]: data }));
        }
    };

    const loadAllSubCategoriesData = async () => {
        const { data } = await fetchAllSubCategories();
        if (data) setAllSubCategories(data);
    };

    const toggleExpandCategory = (categoryId: string) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(categoryId);
            loadSubCategories(categoryId);
        }
    };

    const openSubCategoryDialog = (categoryId: string, subCategory?: SubCategory) => {
        if (subCategory) {
            setEditingSubCategory({ id: subCategory.id, name: subCategory.name, category_id: categoryId });
        } else {
            setEditingSubCategory({ name: '', category_id: categoryId });
        }
        setIsSubCategoryDialogOpen(true);
    };

    const handleSaveSubCategory = async () => {
        if (!editingSubCategory.name.trim()) return;
        try {
            if (editingSubCategory.id) {
                const { error } = await updateSubCategory(editingSubCategory.id, editingSubCategory.name.trim());
                if (error) throw error;
                toast.success("Sub-category updated");
            } else {
                const { error } = await createSubCategory(editingSubCategory.category_id, editingSubCategory.name.trim());
                if (error) throw error;
                toast.success("Sub-category created");
            }
            setIsSubCategoryDialogOpen(false);
            loadSubCategories(editingSubCategory.category_id);
            loadAllSubCategoriesData();
        } catch (error: any) {
            console.error("Error saving sub-category:", error);
            toast.error("Failed to save sub-category");
        }
    };

    const handleDeleteSubCategory = async (subCategory: SubCategory) => {
        if (!confirm(`Delete sub-category "${subCategory.name}"?`)) return;
        try {
            const { error } = await deleteSubCategory(subCategory.id);
            if (error) throw error;
            toast.success("Sub-category deleted");
            loadSubCategories(subCategory.category_id);
            loadAllSubCategoriesData();
        } catch (error: any) {
            toast.error("Failed to delete sub-category");
        }
    };

    const handleAssignSubCategory = async (testId: string, subCategoryId: string | null) => {
        try {
            const { error } = await assignSubCategoryToTest(testId, subCategoryId);
            if (error) throw error;
            toast.success(subCategoryId ? "Sub-category assigned" : "Sub-category removed");
            // Immediate UI update for the tick indicator
            setTests(prev => prev.map(t =>
                t.id === testId ? { ...t, sub_category_id: subCategoryId } : t
            ));
        } catch (error: any) {
            console.error("Error assigning sub-category:", error);
            toast.error("Failed to assign sub-category");
        }
    };


    // YouTube-style lazy loading hook for tests
    const {
        registerSkeleton,
        isItemRendered,
        renderedCount,
        totalCount,
        isComplete
    } = useYouTubeStyleRender(tests, testsLoading, {
        rootMargin: '100px',
        threshold: 0.1
    });


    if (authLoading) return <div className="p-10 text-center">Checking permissions...</div>;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-7xl px-4 py-10">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage tests and master data.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                <div className="flex flex-col lg:flex-row gap-8 items-start relative w-full">
                    {/* Mobile hamburger menu top bar */}
                    <div className="lg:hidden w-full flex items-center justify-between bg-card p-3 border rounded-xl shadow-sm mb-2 sticky top-16 z-30">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Dashboard Sections
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="flex items-center gap-2"
                        >
                            {isMobileMenuOpen ? (
                                <>
                                    <X className="h-4 w-4" /> Close
                                </>
                            ) : (
                                <>
                                    <Menu className="h-4 w-4" /> Menu
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Mobile overlay menu drawer */}
                    {isMobileMenuOpen && (
                        <div className="lg:hidden fixed inset-0 z-40 flex">
                            {/* Backdrop */}
                            <div 
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            
                            {/* Drawer Content */}
                            <aside className="relative flex flex-col w-72 max-w-[80vw] h-full bg-card p-6 border-r shadow-2xl animate-in slide-in-from-left duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="font-bold text-lg text-indigo-600">Navigation</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <nav className="flex flex-col gap-1.5">
                                    {[
                                        { id: 'tests', label: 'Manage Tests', icon: FileText },
                                        { id: 'categories', label: 'Categories', icon: BookOpen },
                                        { id: 'users', label: 'Users', icon: Users },
                                        { id: 'verified_creators', label: 'Verified Creators', icon: GraduationCap },
                                        { id: 'combined', label: 'Combined Sessions', icon: Layers },
                                        { id: 'activity', label: 'Live Activity', icon: Radio },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full group
                                  ${activeTab === tab.id
                                                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                }`}
                                        >
                                            {tab.id === 'activity' && conductModeTests.length > 0 ? (
                                                <span className="relative flex h-2 w-2 mr-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                            ) : (
                                                <tab.icon className={`h-4.5 w-4.5 transition-colors ${
                                                    activeTab === tab.id 
                                                        ? 'text-white' 
                                                        : 'text-muted-foreground group-hover:text-foreground'
                                                }`} />
                                            )}
                                            <span>{tab.label}</span>
                                            {tab.id === 'activity' && (
                                                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                                    activeTab === tab.id
                                                        ? 'bg-white/20 text-white border-white/30'
                                                        : conductModeTests.length > 0
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                                                }`}>
                                                    {conductModeTests.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </aside>
                        </div>
                    )}

                    {/* Desktop sidebar navigation - sticky top-20 to keep menu on screen when scrolling */}
                    <aside className="hidden lg:block w-64 shrink-0 sticky top-20 self-start">
                        <TabsList className="flex flex-col gap-1.5 rounded-xl bg-card p-2 border shadow-sm w-full h-auto items-stretch bg-transparent border-slate-200 dark:border-slate-800">
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Dashboard Sections
                            </div>
                            
                            <TabsTrigger 
                                value="tests"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer"
                            >
                                <FileText className="h-4.5 w-4.5" />
                                <span>Manage Tests</span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="categories"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer"
                            >
                                <BookOpen className="h-4.5 w-4.5" />
                                <span>Categories</span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="users"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer"
                            >
                                <Users className="h-4.5 w-4.5" />
                                <span>Users</span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="verified_creators"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer"
                            >
                                <GraduationCap className="h-4.5 w-4.5" />
                                <span>Verified Creators</span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="combined"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer"
                            >
                                <Layers className="h-4.5 w-4.5" />
                                <span>Combined Sessions</span>
                            </TabsTrigger>

                             <TabsTrigger 
                                value="activity"
                                className="flex items-center justify-start gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all text-left w-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent border-none outline-none shadow-none cursor-pointer group/trigger"
                            >
                                {conductModeTests.length > 0 ? (
                                    <span className="relative flex h-2 w-2 mr-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                ) : (
                                    <Radio className="h-4.5 w-4.5 text-muted-foreground group-hover/trigger:text-foreground group-data-[state=active]/trigger:text-white transition-colors" />
                                )}
                                <span>Live Activity</span>
                                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                    activeTab === 'activity'
                                        ? 'bg-white/20 text-white border-white/30'
                                        : conductModeTests.length > 0
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                                }`}>
                                    {conductModeTests.length}
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </aside>

                    {/* Right side content pane */}
                    <main className="flex-grow w-full min-w-0">
                        {tabLoading ? (
                            <div className="flex h-[400px] w-full items-center justify-center rounded-xl border bg-card p-8 shadow-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading dashboard section...</p>
                                </div>
                            </div>
                        ) : (
                            <>

                {/* --- TESTS TAB --- */}
                <TabsContent value="tests" className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={placeholders[placeholderIndex]}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-background"
                            />
                        </div>
                        <Button variant="outline" onClick={() => loadTests(true)} size="sm" className="whitespace-nowrap">
                            <RefreshCw className={`h-4 w-4 mr-2 ${testsLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden md:inline">Refresh Tests</span>
                        </Button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tests.length === 0 && !testsLoading ? (
                            <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                                {searchQuery ? "No matching tests found." : "No tests found."}
                            </div>
                        ) : (
                            <>
                                {tests.map((test) => {
                                    const testId = test.id;
                                    const isRendered = isItemRendered(testId);
                                    const currentVisibility = test.visibility || (test.is_public ? 'public' : 'private');
                                    const className = test.classes?.name || null;

                                    if (!isRendered) {
                                        return (
                                            <div key={testId} ref={(el) => registerSkeleton(testId, el)}>
                                                <TestCardSkeleton />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={test.id}
                                            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full overflow-hidden"
                                        >
                                            {/* --- Identity Accent --- */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity" />

                                            {/* --- Zone A: Header --- */}
                                            <div className="flex justify-between items-start mb-4 gap-3 pl-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3
                                                        className="text-[1.05rem] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors"
                                                        title={test.title}
                                                    >
                                                        {test.title}
                                                    </h3>
                                                    {test.settings?.is_example_template && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider mb-2">
                                                            Example Template
                                                        </span>
                                                    )}
                                                    {/* --- Zone B: Metadata (Clean Row) --- */}
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-medium mt-1.5">
                                                        <span className="flex items-center gap-1.5">
                                                            <FileText className="w-3.5 h-3.5 opacity-70" />
                                                            {test.total_questions || test.questions?.length || 0} Qs
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 opacity-70" />
                                                            {test.duration || 0}m
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-xs text-slate-400 font-normal tracking-wide">
                                                            #{test.custom_id || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Top Actions: Menu & Info */}
                                                <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                                                    <div
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewCreator(test.created_by);
                                                        }}
                                                        title="Creator Info"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </div>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            {/* Visibility Submenu */}
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    {getVisibilityIcon(currentVisibility)}
                                                                    <span className="ml-2">Visibility</span>
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent>
                                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'public')}>
                                                                        <Globe className="mr-2 h-4 w-4" /> Public
                                                                        {currentVisibility === 'public' && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'unlisted')}>
                                                                        <LinkIcon className="mr-2 h-4 w-4" /> Link Only
                                                                        {currentVisibility === 'unlisted' && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleVisibilityChange(test, 'private')}>
                                                                        <Lock className="mr-2 h-4 w-4" /> Private
                                                                        {currentVisibility === 'private' && <Check className="ml-auto h-4 w-4" />}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>

                                                            {/* Share Link */}
                                                            <DropdownMenuItem onClick={() => handleShare(test)}>
                                                                <LinkIcon className="mr-2 h-4 w-4" /> Share Link
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            {/* Class Assignment Submenu */}
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <GraduationCap className="mr-2 h-4 w-4" /> Assign Class
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                                    {allClasses.length === 0 ? (
                                                                        <DropdownMenuItem disabled>No classes found</DropdownMenuItem>
                                                                    ) : (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => handleClassChange(test, null, null)}>
                                                                                <span className="opacity-50">None</span>
                                                                                {!test.class_id && <Check className="ml-auto h-4 w-4" />}
                                                                            </DropdownMenuItem>
                                                                            {allClasses.map(cls => (
                                                                                <DropdownMenuItem key={cls.id} onClick={() => handleClassChange(test, cls.id, cls.name)}>
                                                                                    {cls.name}
                                                                                    {test.class_id === cls.id && <Check className="ml-auto h-4 w-4" />}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>

                                                            {/* Sub-Category Assignment Submenu */}
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <BookOpen className="mr-2 h-4 w-4" /> Assign Sub-Category
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                                                                    <DropdownMenuItem onClick={() => handleAssignSubCategory(test.id, null)} className="flex items-center justify-between">
                                                                        <span className="opacity-50">None</span>
                                                                        {!test.sub_category_id && <Check className="h-4 w-4 ml-2 text-primary" />}
                                                                    </DropdownMenuItem>
                                                                    {(() => {
                                                                        const filteredSubs = allSubCategories.filter(sc =>
                                                                            test.categories?.some((c: any) => c.id === sc.category_id)
                                                                        );

                                                                        if (filteredSubs.length === 0) {
                                                                            return <DropdownMenuItem disabled>No categories assigned / No matching sub-categories</DropdownMenuItem>;
                                                                        }

                                                                        return filteredSubs.map(sc => {
                                                                            const parentCat = categories.find(c => c.id === sc.category_id);
                                                                            const isAssigned = test.sub_category_id === sc.id;
                                                                            return (
                                                                                <DropdownMenuItem key={sc.id} onClick={() => handleAssignSubCategory(test.id, sc.id)} className="flex items-center justify-between">
                                                                                    <span>{parentCat ? `${parentCat.name} → ` : ''}{sc.name}</span>
                                                                                    {isAssigned && <Check className="h-4 w-4 ml-2 text-primary" />}
                                                                                </DropdownMenuItem>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>

                                                            <DropdownMenuSeparator />

                                                            {/* Edit Action */}
                                                            <DropdownMenuItem onClick={() => openTestEditDialog(test)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit Test
                                                            </DropdownMenuItem>

                                                            {/* Manage Action */}
                                                            <DropdownMenuItem onClick={() => setConfiguringTest(test)}>
                                                                <Settings className="mr-2 h-4 w-4" /> Manage Settings
                                                            </DropdownMenuItem>

                                                            {/* Upload Solutions Action */}
                                                            <DropdownMenuItem onClick={() => navigate(`/solutions-editor/${test.id}`)}>
                                                                <Upload className="mr-2 h-4 w-4" /> Upload Solutions
                                                            </DropdownMenuItem>

                                                            {/* Clone to User */}
                                                            <DropdownMenuItem onClick={() => handleOpenCloneToUserDialog(test)}>
                                                                <Copy className="mr-2 h-4 w-4" /> Clone to User
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            {/* Delete Action */}
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteTest(test.id, test.title)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {/* --- Zone C: Tags --- */}
                                            <div className="pl-2 flex-grow mb-4">
                                                {className && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-800/30">
                                                        <GraduationCap className="w-3 h-3 opacity-70" />
                                                        {className}
                                                    </span>
                                                )}
                                            </div>

                                            {/* --- Zone D: Actions --- */}
                                            <div className="flex items-center justify-end gap-3 mt-auto pt-3 border-t border-slate-50 dark:border-slate-800/50 pl-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs font-medium px-4 bg-transparent border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                                                    onClick={() => setViewingResultsTest(test)}
                                                >
                                                    Results
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs font-medium px-5 bg-slate-900 hover:bg-indigo-600 text-white shadow-sm transition-colors duration-300 rounded-md"
                                                    onClick={() => navigate(`/test-intro/${test.id}`)}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasMore && (
                                    <div
                                        className="col-span-full py-8 flex justify-center"
                                        ref={observerTarget}
                                    >
                                        <Button
                                            variant="outline"
                                            onClick={() => loadTests(false)}
                                            disabled={testsLoading}
                                            className="w-full md:w-auto min-w-[200px]"
                                        >
                                            {testsLoading ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Loading More...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    View More Tests
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </TabsContent>

                {/* --- CATEGORIES TAB --- */}
                <TabsContent value="categories">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Test Categories</CardTitle>
                                    <CardDescription>Create and rename categories (e.g., JEE, NEET, Physics, Math).</CardDescription>
                                </div>
                                <Button onClick={() => openCategoryDialog()} size="sm">
                                    <Plus className="w-4 h-4 mr-2" /> Add Category
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category Name</TableHead>
                                        <TableHead className="w-[150px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoriesLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : categories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground">No categories found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        categories.map(category => (
                                            <React.Fragment key={category.id}>
                                                <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => toggleExpandCategory(category.id)}>
                                                    <TableCell className="font-medium">
                                                        <span className="mr-2 text-xs text-muted-foreground">{expandedCategory === category.id ? '▼' : '▶'}</span>
                                                        {category.name}
                                                        {subCategories[category.id] && (
                                                            <span className="ml-2 text-xs text-muted-foreground">({subCategories[category.id].length} sub)</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" onClick={() => openSubCategoryDialog(category.id)} title="Add Sub-Category">
                                                            <Plus className="w-4 h-4 text-emerald-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => openCategoryDialog(category)}>
                                                            <Pencil className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedCategory === category.id && (
                                                    (subCategories[category.id] || []).length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={2} className="pl-10 text-sm text-muted-foreground italic bg-slate-50/50">No sub-categories. Click + to add one.</TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        (subCategories[category.id] || []).map(sc => (
                                                            <TableRow key={sc.id} className="bg-slate-50/50">
                                                                <TableCell className="pl-10 text-sm">↳ {sc.name}</TableCell>
                                                                <TableCell className="text-right flex justify-end gap-2">
                                                                    <Button variant="ghost" size="icon" onClick={() => openSubCategoryDialog(category.id, sc)}>
                                                                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSubCategory(sc)}>
                                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- USERS TAB --- */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle>Registered Users</CardTitle>
                                    <CardDescription>View and manage all users on the platform.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback>{(user.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewUserDetails(user)}>
                                                        View Profile
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- VERIFIED CREATORS TAB --- */}
                <TabsContent value="verified_creators">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle>Manage Verified Creators</CardTitle>
                                    <CardDescription>Grant or revoke "Authorized Partner" status.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Verified Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">Loading users...</TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback>{(user.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    {user.full_name || 'N/A'}
                                                    {user.is_verified_creator && <VerifiedBadge size={14} />}
                                                </TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{user.designation || 'Student'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {user.is_verified_creator ? (
                                                        <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> YES
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {user.is_verified_creator ? (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleRevokeVerification(user)}
                                                            className="h-7 text-xs"
                                                        >
                                                            Remove Verified Status
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="default" // "Make Verified Creator"
                                                            size="sm"
                                                            onClick={() => handleVerifyUser(user)}
                                                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            Make Verified Creator
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- COMBINED TESTS TAB --- */}
                <TabsContent value="combined" className="space-y-6">
                    {/* Create Combined Session Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-indigo-600" />
                                Create Combined Session
                            </CardTitle>
                            <CardDescription>
                                Merge two existing tests into a single session (e.g. JEE Advanced Paper I + Paper II). Only admins can create combined sessions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Session Title */}
                                <div className="md:col-span-2 grid gap-1.5">
                                    <Label htmlFor="cs-title">Session Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="cs-title"
                                        placeholder="e.g. JEE Advanced 2025"
                                        value={newSession.title}
                                        onChange={e => setNewSession(p => ({ ...p, title: e.target.value }))}
                                    />
                                </div>

                                {/* Paper I */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="cs-test1">Paper I — Select Test <span className="text-red-500">*</span></Label>
                                    <select
                                        id="cs-test1"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={newSession.test1_id}
                                        onChange={e => setNewSession(p => ({ ...p, test1_id: e.target.value }))}
                                    >
                                        <option value="">— Choose a test —</option>
                                        {tests.map(t => (
                                            <option key={t.id} value={t.id} disabled={t.id === newSession.test2_id}>
                                                {t.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Paper II */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="cs-test2">Paper II — Select Test <span className="text-red-500">*</span></Label>
                                    <select
                                        id="cs-test2"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={newSession.test2_id}
                                        onChange={e => setNewSession(p => ({ ...p, test2_id: e.target.value }))}
                                    >
                                        <option value="">— Choose a test —</option>
                                        {tests.map(t => (
                                            <option key={t.id} value={t.id} disabled={t.id === newSession.test1_id}>
                                                {t.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Paper I Label */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="cs-p1label">Paper I Label</Label>
                                    <Input
                                        id="cs-p1label"
                                        placeholder="Paper I"
                                        value={newSession.paper1_label}
                                        onChange={e => setNewSession(p => ({ ...p, paper1_label: e.target.value }))}
                                    />
                                </div>

                                {/* Paper II Label */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="cs-p2label">Paper II Label</Label>
                                    <Input
                                        id="cs-p2label"
                                        placeholder="Paper II"
                                        value={newSession.paper2_label}
                                        onChange={e => setNewSession(p => ({ ...p, paper2_label: e.target.value }))}
                                    />
                                </div>

                                {/* Break Duration */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="cs-break">Break Duration (minutes)</Label>
                                    <Input
                                        id="cs-break"
                                        type="number"
                                        min={0}
                                        max={180}
                                        value={newSession.break_duration_minutes}
                                        onChange={e => setNewSession(p => ({ ...p, break_duration_minutes: parseInt(e.target.value) || 30 }))}
                                    />
                                </div>

                                {/* Visibility */}
                                <div className="grid gap-1.5">
                                    <Label>Visibility</Label>
                                    <div className="flex items-center gap-3 h-9">
                                        <Checkbox
                                            id="cs-public"
                                            checked={newSession.is_public}
                                            onCheckedChange={v => setNewSession(p => ({ ...p, is_public: !!v }))}
                                        />
                                        <label htmlFor="cs-public" className="text-sm font-medium cursor-pointer">
                                            {newSession.is_public ? 'Public (visible to all users)' : 'Private (admin only)'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleCreateCombinedSession}
                                disabled={isSavingSession || !newSession.title || !newSession.test1_id || !newSession.test2_id}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isSavingSession ? (
                                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Create Combined Session</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Existing Combined Sessions */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Existing Sessions ({combinedSessions.length})</CardTitle>
                            <Button variant="outline" size="sm" onClick={loadCombinedSessions} disabled={combinedLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${combinedLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Paper I</TableHead>
                                        <TableHead>Paper II</TableHead>
                                        <TableHead>Break</TableHead>
                                        <TableHead>Visibility</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {combinedLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                                            </TableCell>
                                        </TableRow>
                                    ) : combinedSessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No combined sessions yet. Create one above.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        combinedSessions.map(session => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium">
                                                    <div>{session.title}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{session.id.slice(0, 8)}…</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-bold text-violet-600">{session.paper1_label || 'Paper I'}</div>
                                                    <div className="text-xs text-slate-500 line-clamp-1">{session.test1_id}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-bold text-blue-600">{session.paper2_label || 'Paper II'}</div>
                                                    <div className="text-xs text-slate-500 line-clamp-1">{session.test2_id}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{session.break_duration_minutes ?? 30}m</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={session.is_public ? 'default' : 'secondary'}>
                                                        {session.is_public ? 'Public' : 'Private'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => handleDeleteCombinedSession(session.id, session.title)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ACTIVITY (LIVE EXAMS) TAB --- */}
                <TabsContent value="activity" className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Active Conduct-Mode Exams</h2>
                            <p className="text-sm text-muted-foreground">Monitor and control exams currently running live on the platform.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadConductModeTests}
                            disabled={conductModeLoading}
                            className="bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${conductModeLoading ? 'animate-spin' : ''}`} />
                            Refresh Live Status
                        </Button>
                    </div>

                    {conductModeLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Loading active exams status...</p>
                        </div>
                    ) : conductModeTests.length === 0 ? (
                        <Card className="border border-dashed border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 text-slate-400 border shadow-sm">
                                <Radio className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-base mb-1">No Active Exams</h3>
                            <p className="text-sm text-slate-500 max-w-sm">There are currently no tests running in conduct mode. When a creator starts a live test, it will appear here.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {conductModeTests.map((t) => (
                                <Card key={t.id} className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1 bg-emerald-50 dark:bg-emerald-950/40 w-fit px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                    Live Now
                                                </div>
                                                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{t.title}</CardTitle>
                                                {t.custom_id && (
                                                    <CardDescription className="text-xs text-slate-400 font-mono">ID: {t.custom_id}</CardDescription>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-4 pt-0 space-y-3">
                                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0" />
                                                <div className="overflow-hidden truncate">
                                                    <span className="font-semibold block text-slate-700 dark:text-slate-300 truncate">{t.creator_name || 'Unknown'}</span>
                                                    <span className="text-slate-400 truncate block text-[10px]">{t.creator_email}</span>
                                                </div>
                                            </div>
                                            {t.end_time && (
                                                <div className="flex items-center gap-2 p-2 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-100/30">
                                                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <div>
                                                        <span className="font-medium text-amber-800 dark:text-amber-300 block">Scheduled Ending</span>
                                                        <span className="text-slate-400 text-[10px]">{new Date(t.end_time).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/20 px-6 py-3 flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/20"
                                            onClick={() => setViewingResultsTest(t)}
                                        >
                                            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                                            Live Results
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full h-8 text-xs font-semibold"
                                            onClick={() => handleStopConductMode(t)}
                                        >
                                            <X className="w-3.5 h-3.5 mr-1.5" />
                                            Stop Exam
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
                            </>
                        )}
                    </main>
                </div>
            </Tabs>


            {/* TEST EDIT DIALOG - Leaving this logic even if using router, for backwards compat/safety */}
            <Dialog open={isTestEditOpen} onOpenChange={setIsTestEditOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Test Details</DialogTitle>
                        <DialogDescription>Update test metadata and settings.</DialogDescription>
                    </DialogHeader>

                    {editingTest && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Test Title</Label>
                                <Input
                                    id="title"
                                    value={editingTest.title}
                                    onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="custom_id">Custom ID</Label>
                                    <Input
                                        id="custom_id"
                                        value={editingTest.custom_id || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, custom_id: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="duration">Duration (mins)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={editingTest.duration || ''}
                                        onChange={(e) => setEditingTest({ ...editingTest, duration: e.target.value })}
                                    />
                                </div>
                            </div>
                            {/* Categories Selection inside Test Edit */}
                            <div className="grid gap-2">
                                <Label>Assigned Categories</Label>
                                <div className="flex flex-wrap gap-2 border p-3 rounded-md bg-slate-50 dark:bg-slate-900">
                                    {categories.map(category => (
                                        <div key={category.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`t - cat - ${category.id} `}
                                                checked={selectedCategoriesForTest.includes(category.id)}
                                                onCheckedChange={() => toggleCategoryForTest(category.id)}
                                            />
                                            <Label htmlFor={`t - cat - ${category.id} `}>{category.name}</Label>
                                        </div>
                                    ))}
                                    {categories.length === 0 && <span className="text-xs text-muted-foreground">No categories customized. Use "Manage Categories" tab to add some.</span>}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editingTest.description || ''}
                                    onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTestEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTest}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CATEGORY EDIT/ADD DIALOG */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cat-name">Category Name</Label>
                            <Input
                                id="cat-name"
                                value={editingCategory.name}
                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                placeholder="e.g. Physics, JEE Mains"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCategory}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SUB-CATEGORY EDIT/ADD DIALOG */}
            <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSubCategory.id ? 'Edit Sub-Category' : 'Add Sub-Category'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subcat-name">Sub-Category Name</Label>
                            <Input
                                id="subcat-name"
                                value={editingSubCategory.name}
                                onChange={(e) => setEditingSubCategory({ ...editingSubCategory, name: e.target.value })}
                                placeholder="e.g. Session 1, Chapter 2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubCategoryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSubCategory}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {viewingResultsTest && (
                <TestResultsPanel
                    test={viewingResultsTest}
                    onClose={() => setViewingResultsTest(null)}
                />
            )}

            {/* Creator Info Dialog */}
            <Dialog open={!!viewingCreator} onOpenChange={(open) => !open && setViewingCreator(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Creator Details</DialogTitle>
                        <DialogDescription>Information about the test creator.</DialogDescription>
                    </DialogHeader>
                    {viewingCreator && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Avatar className="h-20 w-20 border-2 border-slate-200">
                                <AvatarImage src={viewingCreator.avatar_url} />
                                <AvatarFallback className="text-xl bg-slate-100">{viewingCreator.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-center space-y-1">
                                <h3 className="font-bold text-xl">{viewingCreator.full_name}</h3>
                                <Badge variant="secondary">{viewingCreator.designation || 'Member'}</Badge>
                                <p className="text-sm text-muted-foreground">{viewingCreator.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mt-2">
                                <div className="bg-slate-50 p-3 rounded-lg text-center border">
                                    <div className="text-2xl font-bold">{viewingCreator.testCount}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Tests Created</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg text-center border flex flex-col items-center justify-center">
                                    <span className="text-sm font-medium">Status</span>
                                    <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                                </div>
                            </div>

                            {viewingCreator.bio && (
                                <div className="w-full bg-slate-50 p-3 rounded-lg border mt-2">
                                    <h4 className="text-xs font-semibold text-slate-500 mb-1">BIO</h4>
                                    <p className="text-sm text-slate-700 italic">"{viewingCreator.bio}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* USER DETAILS DIALOG (Admin View) */}
            <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                                <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                                    <AvatarImage src={viewingUser.avatar_url} />
                                    <AvatarFallback className="text-xl">{viewingUser.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-center md:text-left space-y-1">
                                    <h2 className="text-2xl font-bold">{viewingUser.full_name}</h2>
                                    <p className="text-muted-foreground">{viewingUser.email}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-2 pt-1 text-xs text-slate-500 font-mono mb-2">
                                        ID: {viewingUser.id}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-[11px] flex items-center gap-1 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300"
                                            onClick={() => {
                                                setViewingUser(null);
                                                window.open(`/my-tests?userId=${viewingUser.id}`, '_blank');
                                            }}
                                        >
                                            <Edit className="w-3 h-3" /> Dashboard
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-[11px] flex items-center gap-1 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-900 dark:text-purple-300"
                                            onClick={() => {
                                                setViewingUser(null);
                                                window.open(`/materials?userId=${viewingUser.id}`, '_blank');
                                            }}
                                        >
                                            <Layers className="w-3 h-3" /> Materials
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-[11px] flex items-center gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300"
                                            onClick={() => {
                                                handleOpenCloneDialogForUser(viewingUser);
                                            }}
                                        >
                                            <Copy className="w-3 h-3" /> Clone Test
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-center p-2 bg-white dark:bg-black rounded border min-w-[80px]">
                                        <div className="text-2xl font-bold">{userDetails.createdTests?.length || 0}</div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tests Created</div>
                                    </div>
                                    <div className="text-center p-2 bg-white dark:bg-black rounded border min-w-[80px]">
                                        <div className="text-2xl font-bold">{userDetails.attempts?.length || 0}</div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tests Taken</div>
                                    </div>
                                    <div className="text-center p-2 bg-white dark:bg-black rounded border min-w-[80px]">
                                        <div className={`text-2xl font-bold ${reportStats[viewingUser.id]?.open > 0 ? 'text-red-500' : ''}`}>
                                            {reportStats[viewingUser.id]?.total || 0}
                                        </div>
                                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Reports</div>
                                    </div>
                                </div>
                            </div>

                            <Tabs defaultValue="created" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="created" className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Created Tests
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" /> Attempt History
                                    </TabsTrigger>
                                    <TabsTrigger value="reports" className="flex items-center gap-2 relative">
                                        <Info className="w-4 h-4" /> Reports
                                        {reportStats[viewingUser.id]?.open > 0 && (
                                            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="created" className="mt-4 border rounded-md p-0 overflow-hidden">
                                    {userDetails.createdTests.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">No tests created by this user.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Test Title</TableHead>
                                                    <TableHead>Created</TableHead>
                                                    <TableHead>Questions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userDetails.createdTests.map((t: any) => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="font-medium">{t.title}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                                        <TableCell>{t.questions?.length || 0}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>

                                <TabsContent value="history" className="mt-4 border rounded-md p-0 overflow-hidden">
                                    {userDetails.attempts.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">No tests taken by this user.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Test Name</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Score</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userDetails.attempts.map((a: any) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="font-medium">{a.test_title}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                                                        <TableCell className="font-mono">{a.score?.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>

                                <TabsContent value="reports" className="mt-4 border rounded-md p-0 overflow-hidden">
                                    {!userDetails.reports || userDetails.reports.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">No reports filed against tests created by this user.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50">
                                                    <TableHead>Test Title</TableHead>
                                                    <TableHead>Q#</TableHead>
                                                    <TableHead>Issue</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userDetails.reports.map((r: any) => (
                                                    <TableRow key={r.id}>
                                                        <TableCell className="font-medium max-w-[200px] truncate" title={`${r.tests?.title} ${r.tests?.custom_id ? `(${r.tests.custom_id})` : ''}`}>
                                                            {r.tests?.title} {r.tests?.custom_id ? <span className="text-xs text-muted-foreground ml-1">({r.tests.custom_id})</span> : ''}
                                                        </TableCell>
                                                        <TableCell>{r.question_id + 1}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-sm">{r.reason}</div>
                                                            {r.details && <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={r.details}>{r.details}</div>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={r.status === 'open' ? 'destructive' : 'secondary'} className={r.status === 'open' ? 'bg-red-500' : ''}>
                                                                {r.status.toUpperCase()}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {configuringTest && (
                <TestSettingsPanel
                    test={configuringTest}
                    onClose={() => setConfiguringTest(null)}
                    onUpdate={handleTestUpdate}
                    onViewResults={() => {
                        setConfiguringTest(null);
                        setViewingResultsTest(configuringTest);
                    }}
                    overridePremium={true}
                />
            )}

            {isCloneDialogOpen && (
                <Dialog open={isCloneDialogOpen} onOpenChange={(open) => !open && setIsCloneDialogOpen(false)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Copy className="w-5 h-5 text-indigo-600" />
                                Clone Test
                            </DialogTitle>
                            <DialogDescription>
                                Duplicate any test in the system and assign it to a target user's dashboard.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {/* Case 1: Test is pre-selected, select User */}
                            {cloningTestSelected && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Selected Test</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">{cloningTestSelected.title}</div>
                                        <div className="text-xs text-slate-400">ID: {cloningTestSelected.id}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold">Select Target User</label>
                                        <Input
                                            placeholder="Search by name or email..."
                                            value={cloneSearchUserQuery}
                                            onChange={(e) => setCloneSearchUserQuery(e.target.value)}
                                        />
                                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                            {users
                                                .filter(u =>
                                                    u.full_name?.toLowerCase().includes(cloneSearchUserQuery.toLowerCase()) ||
                                                    u.email?.toLowerCase().includes(cloneSearchUserQuery.toLowerCase())
                                                )
                                                .slice(0, 5)
                                                .map(u => (
                                                    <div
                                                        key={u.id}
                                                        className={`p-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${cloneTargetUser?.id === u.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                                        onClick={() => setCloneTargetUser(u)}
                                                    >
                                                        <div>
                                                            <div className="font-medium">{u.full_name || 'N/A'}</div>
                                                            <div className="text-xs text-slate-500">{u.email}</div>
                                                        </div>
                                                        {cloneTargetUser?.id === u.id && <Check className="w-4 h-4 text-indigo-600" />}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Case 2: User is pre-selected, select Test */}
                            {cloneTargetUser && !cloningTestSelected && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg">
                                        <div className="text-xs text-slate-500 font-medium">Target User</div>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">{cloneTargetUser.full_name || 'N/A'}</div>
                                        <div className="text-xs text-slate-400">{cloneTargetUser.email}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold">Search Test to Clone</label>
                                        <Input
                                            placeholder="Search test by title or ID..."
                                            value={cloneSearchTestQuery}
                                            onChange={(e) => setCloneSearchTestQuery(e.target.value)}
                                        />
                                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                            {dialogTestsLoading ? (
                                                <div className="p-4 text-center text-xs text-slate-500">Searching tests...</div>
                                            ) : dialogTests.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-500">No tests found.</div>
                                            ) : (
                                                dialogTests.map(t => (
                                                    <div
                                                        key={t.id}
                                                        className={`p-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${cloningTestSelected?.id === t.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                                        onClick={() => setCloningTestSelected(t)}
                                                    >
                                                        <div>
                                                            <div className="font-medium">{t.title}</div>
                                                            <div className="text-xs text-slate-500">Duration: {t.duration}m • Questions: {t.total_questions || t.questions?.length || 0}</div>
                                                        </div>
                                                        {cloningTestSelected?.id === t.id && <Check className="w-4 h-4 text-indigo-600" />}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setIsCloneDialogOpen(false)} disabled={isCloning}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCloneTestToUser}
                                disabled={isCloning || !cloningTestSelected || !cloneTargetUser}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isCloning ? 'Cloning...' : 'Confirm Clone'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

        </div >
    );
}
