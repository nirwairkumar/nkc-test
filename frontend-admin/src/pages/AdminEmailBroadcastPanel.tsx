import React, { useEffect, useState, useMemo } from 'react';
import { 
    Mail, Send, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Settings, 
    Users, Search, ShieldCheck, FileText, Check, HelpCircle, Eye, Code, 
    Layers, ArrowRight, X, Clock, Award, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    fetchRecipients, fetchSmtpStatus, updateSmtpConfig, sendTestEmail, sendBatchEmails,
    EmailRecipient, SmtpStatus, SmtpConfig 
} from '@/lib/emailBroadcastApi';

const TEMPLATE_PRESETS = [
    {
        name: "🎯 Creator Growth & Stats",
        subject: "Hi {name}, see your TestoZa creator achievements!",
        body: `<p>Hello <strong>{name}</strong>,</p>
<p>Thank you for being an active part of the TestoZa test creation community! Here is a quick snapshot of your journey so far:</p>
<div style="background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 8px;">
    <p style="margin: 4px 0;">🎯 <strong>Tests Created:</strong> {tests_created} tests</p>
    <p style="margin: 4px 0;">📝 <strong>Platform Status:</strong> {is_verified}</p>
    <p style="margin: 4px 0;">📅 <strong>Member Since:</strong> {join_date}</p>
</div>
<p>We're building exciting new tools for educators and test creators. Log in today to check your latest test responses and analytics!</p>
<p style="text-align: center; margin-top: 24px;">
    <a href="https://testoza.com/dashboard" class="button">Go to Creator Dashboard</a>
</p>
<p>Warm regards,<br><strong>Nirwair & The TestoZa Team</strong></p>`
    },
    {
        name: "👋 Learner Engagement Blast",
        subject: "Hey {name}, new mock tests are ready for you on TestoZa!",
        body: `<p>Dear <strong>{name}</strong>,</p>
<p>We noticed you have taken <strong>{attempts_count} test attempts</strong> on TestoZa! Top educators on TestoZa have just published new high-yield mock tests in competitive exams.</p>
<p>Keep up your practice to stay ahead in your exam preparation.</p>
<p style="text-align: center; margin-top: 24px;">
    <a href="https://testoza.com" class="button">Explore New Tests</a>
</p>
<p>Best of luck with your studies!<br><strong>TestoZa Support Team</strong></p>`
    },
    {
        name: "📢 General Announcement",
        subject: "Important update for {name} from TestoZa",
        body: `<p>Hello <strong>{name}</strong>,</p>
<p>We are reaching out to inform you about important platform updates designed to improve your test creation and taking experience.</p>
<p>If you have any questions or feedback, feel free to reply directly to this email or contact us at <a href="mailto:support@testoza.com">support@testoza.com</a>.</p>
<p>Thank you for choosing TestoZa!</p>
<p>Best regards,<br><strong>TestoZa Team</strong></p>`
    }
];

export default function AdminEmailBroadcastPanel() {
    // Recipients state
    const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState<boolean>(true);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    
    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'creators' | 'takers'>('all');

    // SMTP status state
    const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
    const [showSmtpModal, setShowSmtpModal] = useState<boolean>(false);
    const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
        host: 'smtp.zoho.com',
        port: 465,
        user: 'no-reply@testoza.com',
        password: '',
        from_name: 'TestoZa Team',
        use_ssl: true
    });
    const [savingSmtp, setSavingSmtp] = useState<boolean>(false);

    // Email composer state
    const [senderEmail, setSenderEmail] = useState<string>('no-reply@testoza.com');
    const [senderName, setSenderName] = useState<string>('TestoZa Team');
    const [subject, setSubject] = useState<string>('Hi {name}, see your TestoZa creator achievements!');
    const [bodyHtml, setBodyHtml] = useState<string>(TEMPLATE_PRESETS[0].body);
    const [activeComposerTab, setActiveComposerTab] = useState<'edit' | 'preview'>('edit');
    const [previewUserId, setPreviewUserId] = useState<string>('');

    // Dispatch & Progress state
    const [sendingTest, setSendingTest] = useState<boolean>(false);
    const [testEmailTarget, setTestEmailTarget] = useState<string>('nirwair@testoza.com');
    const [showTestModal, setShowTestModal] = useState<boolean>(false);
    
    const [isSendingBatch, setIsSendingBatch] = useState<boolean>(false);
    const [sendProgress, setSendProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    // Fetch initial data
    const loadRecipientsData = async () => {
        setLoadingRecipients(true);
        const { data, error } = await fetchRecipients();
        if (error) {
            toast.error("Failed to fetch user list for email broadcast");
        } else if (data) {
            setRecipients(data.users || []);
            // Default select preview user
            if (data.users && data.users.length > 0) {
                setPreviewUserId(data.users[0].id);
            }
        }
        setLoadingRecipients(false);
    };

    const loadSmtpStatusData = async () => {
        const { data } = await fetchSmtpStatus();
        if (data) {
            setSmtpStatus(data);
            setSmtpForm(prev => ({
                ...prev,
                host: data.host || 'smtp.zoho.com',
                port: data.port || 465,
                user: data.user || 'no-reply@testoza.com',
                from_name: data.from_name || 'TestoZa Team'
            }));
            if (data.user) {
                setSenderEmail(data.user);
            }
        }
    };

    useEffect(() => {
        loadRecipientsData();
        loadSmtpStatusData();
    }, []);

    // Filtered users list
    const filteredRecipients = useMemo(() => {
        return recipients.filter(user => {
            if (searchTerm.trim()) {
                const s = searchTerm.toLowerCase();
                const matchName = user.full_name.toLowerCase().includes(s);
                const matchEmail = user.email.toLowerCase().includes(s);
                if (!matchName && !matchEmail) return false;
            }

            if (activeFilter === 'verified') return user.is_verified_creator;
            if (activeFilter === 'creators') return user.tests_created > 0;
            if (activeFilter === 'takers') return user.attempts_count > 0;

            return true;
        });
    }, [recipients, searchTerm, activeFilter]);

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedUserIds.size === filteredRecipients.length && filteredRecipients.length > 0) {
            setSelectedUserIds(new Set());
        } else {
            const nextSet = new Set<string>();
            filteredRecipients.forEach(u => nextSet.add(u.id));
            setSelectedUserIds(nextSet);
        }
    };

    const toggleSelectUser = (id: string) => {
        const nextSet = new Set(selectedUserIds);
        if (nextSet.has(id)) {
            nextSet.delete(id);
        } else {
            nextSet.add(id);
        }
        setSelectedUserIds(nextSet);
    };

    // Insert Tag helper into focused editor or text
    const insertTag = (tag: string) => {
        setBodyHtml(prev => prev + ` ${tag}`);
        toast.info(`Inserted placeholder ${tag}`);
    };

    // Apply template preset
    const applyPreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
        setSubject(preset.subject);
        setBodyHtml(preset.body);
        toast.success(`Applied template "${preset.name}"`);
    };

    // Save SMTP Config
    const handleSaveSmtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSmtp(true);
        const { data, error } = await updateSmtpConfig(smtpForm);
        setSavingSmtp(false);
        if (error) {
            toast.error("Failed to update SMTP settings: " + (error?.response?.data?.detail || error.message));
        } else {
            toast.success("Zoho SMTP Credentials Updated!");
            setShowSmtpModal(false);
            loadSmtpStatusData();
        }
    };

    // Send Test Email
    const handleSendTestEmail = async () => {
        if (!testEmailTarget.trim()) {
            toast.error("Please enter a target email address for test message");
            return;
        }
        setSendingTest(true);
        const { error } = await sendTestEmail({
            target_email: testEmailTarget.trim(),
            sender_email: senderEmail,
            sender_name: senderName,
            subject,
            body_html: bodyHtml,
            smtp_config: smtpForm.password ? smtpForm : undefined
        });
        setSendingTest(false);
        if (error) {
            toast.error("Test email delivery failed: " + (error?.response?.data?.detail || error.message));
        } else {
            toast.success(`Test email sent to ${testEmailTarget}! Check your inbox.`);
            setShowTestModal(false);
        }
    };

    // Dispatch Batch Emails
    const handleDispatchBatch = async () => {
        if (selectedUserIds.size === 0) {
            toast.error("Please select at least one recipient user");
            return;
        }
        setShowConfirmModal(false);
        setIsSendingBatch(true);
        setSendProgress({ total: selectedUserIds.size, sent: 0, failed: 0 });

        const recipientIdsArray = Array.from(selectedUserIds);
        const { data, error } = await sendBatchEmails({
            recipient_ids: recipientIdsArray,
            sender_email: senderEmail,
            sender_name: senderName,
            subject,
            body_html: bodyHtml,
            smtp_config: smtpForm.password ? smtpForm : undefined
        });

        setIsSendingBatch(false);

        if (error) {
            toast.error("Batch send failed: " + (error?.response?.data?.detail || error.message));
        } else if (data) {
            setSendProgress({
                total: data.total_requested,
                sent: data.sent,
                failed: data.failed
            });
            if (data.failed === 0) {
                toast.success(`🎉 Successfully dispatched email to ${data.sent} users!`);
            } else {
                const firstErr = data.failures?.[0]?.error || "Unknown error";
                toast.error(`Dispatch Failed (${data.failed}/${data.total_requested}): ${firstErr}`, { duration: 8000 });
            }
            loadRecipientsData();
        }
    };

    // Selected preview user object
    const selectedPreviewUser = useMemo(() => {
        return recipients.find(u => u.id === previewUserId) || recipients[0] || {
            id: 'sample',
            email: 'user@example.com',
            full_name: 'John Doe',
            tests_created: 4,
            attempts_count: 15,
            is_verified_creator: true,
            created_at: new Date().toISOString()
        };
    }, [recipients, previewUserId]);

    // Live Rendered HTML for preview
    const renderedPreviewHtml = useMemo(() => {
        let text = bodyHtml;
        const name = selectedPreviewUser.full_name || selectedPreviewUser.email.split('@')[0];
        const email = selectedPreviewUser.email;
        const tests = String(selectedPreviewUser.tests_created || 0);
        const attempts = String(selectedPreviewUser.attempts_count || 0);
        const isVerified = selectedPreviewUser.is_verified_creator ? 'Verified Creator' : 'Member';
        const joinDate = selectedPreviewUser.created_at ? selectedPreviewUser.created_at.substring(0, 10) : 'N/A';

        text = text.replace(/{name}/g, name).replace(/{{name}}/g, name);
        text = text.replace(/{email}/g, email).replace(/{{email}}/g, email);
        text = text.replace(/{tests_created}/g, tests).replace(/{{tests_created}}/g, tests);
        text = text.replace(/{attempts_count}/g, attempts).replace(/{{attempts_count}}/g, attempts);
        text = text.replace(/{is_verified}/g, isVerified).replace(/{{is_verified}}/g, isVerified);
        text = text.replace(/{join_date}/g, joinDate).replace(/{{join_date}}/g, joinDate);

        return text;
    }, [bodyHtml, selectedPreviewUser]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                                <Mail className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Email Broadcast Center</h1>
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                100% Free via Zoho SMTP
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                            Send customized email notifications directly to your users using your existing Zoho domain emails (<code>no-reply@testoza.com</code>, <code>support@testoza.com</code>, <code>nirwair@testoza.com</code>).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowSmtpModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all hover:scale-[1.02]"
                        >
                            <Settings className="h-4 w-4 text-indigo-400" />
                            <span>Zoho SMTP Settings</span>
                            {smtpStatus?.configured ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                            )}
                        </button>

                        <button
                            onClick={() => setShowTestModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition-all"
                        >
                            <Eye className="h-4 w-4" />
                            <span>Send Test Email</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Total Users</span>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        {loadingRecipients ? '...' : recipients.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Available recipients in database</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Selected Recipients</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                        {selectedUserIds.size}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Ready for custom broadcast</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Verified Creators</span>
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        {recipients.filter(u => u.is_verified_creator).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Verified creator badge holders</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <span>Active SENDER</span>
                        <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-sm font-bold mt-1.5 text-slate-900 dark:text-white truncate" title={senderEmail}>
                        {senderEmail}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Zoho Mail SMTP Connected</div>
                </div>
            </div>

            {/* Main Content Layout: Split Recipient Selection & Email Composer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: User Selection Table & Filters (5 cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[750px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-600" />
                                <span>Select Recipients</span>
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Select users to send personalized notifications
                            </p>
                        </div>
                        <button
                            onClick={loadRecipientsData}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Refresh users list"
                        >
                            <RefreshCw className={`h-4 w-4 ${loadingRecipients ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Search & Filter pills */}
                    <div className="py-3 space-y-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by user name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                        activeFilter === 'all'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    All ({recipients.length})
                                </button>
                                <button
                                    onClick={() => setActiveFilter('verified')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                        activeFilter === 'verified'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    Verified
                                </button>
                                <button
                                    onClick={() => setActiveFilter('creators')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                        activeFilter === 'creators'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    Test Creators
                                </button>
                                <button
                                    onClick={() => setActiveFilter('takers')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                        activeFilter === 'takers'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    Test Takers
                                </button>
                            </div>

                            <button
                                onClick={toggleSelectAll}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                            >
                                {selectedUserIds.size === filteredRecipients.length && filteredRecipients.length > 0
                                    ? 'Deselect All'
                                    : 'Select All'}
                            </button>
                        </div>
                    </div>

                    {/* Users Scrollable Table */}
                    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60">
                        {loadingRecipients ? (
                            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                                <span>Loading user database...</span>
                            </div>
                        ) : filteredRecipients.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                No users match your search criteria.
                            </div>
                        ) : (
                            filteredRecipients.map((user) => {
                                const isSelected = selectedUserIds.has(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleSelectUser(user.id)}
                                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                        {user.full_name}
                                                    </span>
                                                    {user.is_verified_creator && (
                                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded shrink-0">
                                                            ✓ Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2 text-right">
                                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                                🎯 {user.tests_created} {user.tests_created === 1 ? 'test' : 'tests'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                📝 {user.attempts_count} attempts
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
                        <span>Showing {filteredRecipients.length} of {recipients.length} users</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {selectedUserIds.size} Selected
                        </span>
                    </div>
                </div>

                {/* Right Column: Email Composer & Live Preview (7 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[750px]">
                    
                    {/* Composer Header & Tab Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveComposerTab('edit')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeComposerTab === 'edit'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Code className="h-3.5 w-3.5" />
                                <span>Compose Mail</span>
                            </button>
                            <button
                                onClick={() => setActiveComposerTab('preview')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeComposerTab === 'preview'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Live User Preview</span>
                            </button>
                        </div>

                        {/* Template Preset Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
                            <select
                                onChange={(e) => {
                                    const idx = Number(e.target.value);
                                    if (TEMPLATE_PRESETS[idx]) applyPreset(TEMPLATE_PRESETS[idx]);
                                }}
                                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-1 font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                <option value="">Select Template...</option>
                                {TEMPLATE_PRESETS.map((p, i) => (
                                    <option key={i} value={i}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Editor Tab Content */}
                    {activeComposerTab === 'edit' && (
                        <div className="flex-1 flex flex-col space-y-4 pt-4 min-h-0 overflow-y-auto">
                            
                            {/* Sender Info Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                        From Address (Zoho Mail)
                                    </label>
                                    <select
                                        value={senderEmail}
                                        onChange={(e) => setSenderEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="no-reply@testoza.com">no-reply@testoza.com</option>
                                        <option value="support@testoza.com">support@testoza.com</option>
                                        <option value="nirwair@testoza.com">nirwair@testoza.com</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                        Sender Name
                                    </label>
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="e.g. TestoZa Team"
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Subject Field */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Email Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Enter email subject with placeholders like {name}..."
                                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Dynamic Tag Placeholder Bar */}
                            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 p-2.5 rounded-xl">
                                <div className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Click to insert User Customization Tags:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => insertTag('{name}')}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        &#123;name&#125;
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertTag('{tests_created}')}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        &#123;tests_created&#125;
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertTag('{attempts_count}')}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        &#123;attempts_count&#125;
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertTag('{is_verified}')}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        &#123;is_verified&#125;
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertTag('{join_date}')}
                                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        &#123;join_date&#125;
                                    </button>
                                </div>
                            </div>

                            {/* HTML Editor Text Area */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    Email Body Content (HTML Supported)
                                </label>
                                <textarea
                                    value={bodyHtml}
                                    onChange={(e) => setBodyHtml(e.target.value)}
                                    placeholder="Write HTML content here..."
                                    className="flex-1 w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Preview Tab Content */}
                    {activeComposerTab === 'preview' && (
                        <div className="flex-1 flex flex-col pt-4 min-h-0 space-y-3">
                            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Previewing for user:
                                </span>
                                <select
                                    value={previewUserId}
                                    onChange={(e) => setPreviewUserId(e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500 max-w-[260px] truncate"
                                >
                                    {recipients.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Mock Email Frame */}
                            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-4 overflow-y-auto">
                                <div className="max-w-[550px] mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-slate-800 font-sans">
                                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-center text-white">
                                        <div className="font-extrabold text-xl tracking-tight">TestoZa</div>
                                        <div className="text-[11px] text-indigo-200">Empowering Test Creators & Learners</div>
                                    </div>
                                    <div className="p-6 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }} />
                                    <div className="bg-slate-100 p-4 text-center text-xs text-slate-500 border-t border-slate-200">
                                        Sent with ❤️ from TestoZa Platform<br />
                                        Contact: support@testoza.com
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="text-xs text-slate-500">
                            Ready to send to <strong className="text-indigo-600 dark:text-indigo-400">{selectedUserIds.size} users</strong>
                        </div>
                        <button
                            onClick={() => {
                                if (selectedUserIds.size === 0) {
                                    toast.error("Please select at least one recipient user");
                                    return;
                                }
                                setShowConfirmModal(true);
                            }}
                            disabled={selectedUserIds.size === 0 || isSendingBatch}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Send className="h-4 w-4" />
                            <span>Dispatch Email Broadcast ({selectedUserIds.size})</span>
                        </button>
                    </div>

                </div>

            </div>

            {/* Zoho SMTP Configuration Modal */}
            {showSmtpModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                                <Settings className="h-5 w-5" />
                                <span>Zoho Mail SMTP Setup</span>
                            </div>
                            <button
                                onClick={() => setShowSmtpModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSmtp} className="space-y-3 text-xs">
                            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl text-indigo-900 dark:text-indigo-300">
                                <p className="font-semibold">How to get your Zoho App Password:</p>
                                <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-[11px]">
                                    <li>Log into your Zoho Account (accounts.zoho.com)</li>
                                    <li>Go to <strong>Security</strong> → <strong>App Passwords</strong></li>
                                    <li>Generate an App Password for <strong>TestoZa Email Broadcast</strong></li>
                                </ol>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Zoho Server Region & Host</label>
                                <div className="flex gap-2">
                                    <select
                                        value={['smtp.zoho.com', 'smtp.zoho.in', 'smtp.zoho.eu'].includes(smtpForm.host) ? smtpForm.host : 'custom'}
                                        onChange={(e) => {
                                            if (e.target.value !== 'custom') {
                                                setSmtpForm({ ...smtpForm, host: e.target.value });
                                            }
                                        }}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                                    >
                                        <option value="smtp.zoho.com">smtp.zoho.com (Global/US)</option>
                                        <option value="smtp.zoho.in">smtp.zoho.in (India)</option>
                                        <option value="smtp.zoho.eu">smtp.zoho.eu (Europe)</option>
                                        <option value="custom">Custom Host...</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={smtpForm.host}
                                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                                        required
                                        placeholder="e.g. smtp.zoho.com"
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">SMTP Port</label>
                                    <select
                                        value={smtpForm.port}
                                        onChange={(e) => {
                                            const p = Number(e.target.value);
                                            setSmtpForm({ ...smtpForm, port: p, use_ssl: p === 465 });
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                                    >
                                        <option value={465}>465 (SSL - Recommended)</option>
                                        <option value={587}>587 (TLS)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sender / Auth Email</label>
                                    <input
                                        type="email"
                                        value={smtpForm.user}
                                        onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                        required
                                        placeholder="e.g. no-reply@testoza.com"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Zoho App Password
                                </label>
                                <input
                                    type="password"
                                    value={smtpForm.password || ''}
                                    onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                                    placeholder="Enter your Zoho App Password..."
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSmtpModal(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSmtp}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    {savingSmtp ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Test Email Modal */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
                                <Eye className="h-5 w-5" />
                                <span>Send Test Email</span>
                            </div>
                            <button
                                onClick={() => setShowTestModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-500">
                                Send a single test message formatted with sample user data to verify SMTP delivery before launching the broadcast.
                            </p>
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Email</label>
                                <input
                                    type="email"
                                    value={testEmailTarget}
                                    onChange={(e) => setTestEmailTarget(e.target.value)}
                                    placeholder="your-email@domain.com"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTestModal(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendTestEmail}
                                    disabled={sendingTest}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                    <span>{sendingTest ? 'Sending Test...' : 'Send Test Now'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal Before Batch Dispatch */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-500">
                            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Email Broadcast</h3>
                                <p className="text-xs text-slate-500">Are you sure you want to send this broadcast?</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Recipients Count:</span>
                                <strong className="text-indigo-600 dark:text-indigo-400">{selectedUserIds.size} users</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">From Account:</span>
                                <strong className="text-slate-800 dark:text-slate-200">{senderEmail}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Subject Line:</span>
                                <strong className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{subject}</strong>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDispatchBatch}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
                            >
                                <Send className="h-4 w-4" />
                                <span>Yes, Send Broadcast</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Progress Overlay */}
            {isSendingBatch && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
                        <div className="relative inline-flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                            <Mail className="h-6 w-6 text-indigo-600 absolute" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sending Email Broadcast</h3>
                            <p className="text-xs text-slate-400 mt-1">Delivering personalized emails via Zoho SMTP...</p>
                        </div>
                        {sendProgress && (
                            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                Processing {sendProgress.total} recipients
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
