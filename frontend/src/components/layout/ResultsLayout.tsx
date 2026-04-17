import React, { useState } from 'react';
import { NavLink, Outlet, useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, Target, BookOpen, Menu, Share2, Home, MessageCircle, Download, Facebook, Instagram, Disc as Reddit, Sparkles, LayoutDashboard, RotateCcw, LayoutGrid } from 'lucide-react';
import { useTest } from '@/contexts/TestContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { shareWithFriends, shareResultWhatsApp, shareResultImage, shareToFacebook, shareToReddit } from '@/utils/shareUtils';

const CustomFeedbackIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Top Bubble */}
        <path d="M3 10V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6l-3 3v-3z" />

        {/* 3 Stars (Outlined) */}
        <g strokeWidth="1">
            <polygon points="7.5,5.5 8,7 9.5,7 8.3,8 8.7,9.5 7.5,8.5 6.3,9.5 6.7,8 5.5,7 7,7" />
            <polygon points="12,5.5 12.5,7 14,7 12.8,8 13.2,9.5 12,8.5 10.8,9.5 11.2,8 10,7 11.5,7" />
            <polygon points="16.5,5.5 17,7 18.5,7 17.3,8 17.7,9.5 16.5,8.5 15.3,9.5 15.7,8 14.5,7 16,7" />
        </g>

        {/* Bottom Bubble */}
        <path d="M21 21l-3-3h-11a2 2 0 0 1-2-2v-5" />
        <path d="M21 16v-2a2 2 0 0 0-2-2h-3" />

        {/* Text lines */}
        <path d="M8 15h5" />
        <path d="M8 18h3" />

        {/* Pen */}
        <path d="M14.5 16.5l3.5-3.5 1.5 1.5-3.5 3.5z" />
        <path d="M14.5 16.5l1.5 1.5" />
    </svg>
);

export default function ResultsLayout() {
    const { testId } = useParams();
    const location = useLocation();
    const { user } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // Default to 'Guest User' or the metadata name
    const fullUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
    const userName = fullUserName.split(' ')[0];

    // Try to extract State Data so we can pass it down through Outlet context or links
    const stateData = location.state as any;
    // We get testId either from URL or state
    const currentTestId = testId || stateData?.test?.id;

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { resetTest } = useTest();
    // Build base URL for navigation
    const basePath = '/results';

    const getLinkStyle = (isActive: boolean) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`;

    const NavigationLinks = ({ onItemClick }: { onItemClick?: () => void }) => {
        // Read current tab from URL parameters to highlight proper NavLinks
        const searchParams = new URLSearchParams(location.search);
        const currentTab = searchParams.get('tab') || 'overview';

        return (
            <div className="flex flex-col gap-2">
                <div className="px-4 py-2 mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overview</span>
                </div>

                <NavLink
                    to={`${basePath}?tab=overview`}
                    end
                    state={stateData}
                    className={getLinkStyle(currentTab === 'overview' && location.pathname === basePath)}
                    onClick={onItemClick}
                >
                    <Target className="h-5 w-5" />
                    Overview
                </NavLink>

                <NavLink
                    to={`${basePath}?tab=topics`}
                    state={stateData}
                    className={getLinkStyle(currentTab === 'topics' && location.pathname === basePath)}
                    onClick={onItemClick}
                >
                    <BookOpen className="h-5 w-5" />
                    Topic Analysis
                </NavLink>

                <NavLink
                    to={`${basePath}?tab=solution-key`}
                    state={stateData}
                    className={getLinkStyle(currentTab === 'solution-key' && location.pathname === basePath)}
                    onClick={onItemClick}
                >
                    <BookOpen className="h-5 w-5" />
                    Solution Key
                </NavLink>

                <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>

                {currentTestId && (
                    <NavLink
                        to={`${basePath}/solutions/${stateData?.test?.slug || currentTestId}`}
                        state={stateData}
                        className={({ isActive }) => getLinkStyle(isActive)}
                        onClick={onItemClick}
                    >
                        <BookOpen className="h-5 w-5" />
                        Solutions
                    </NavLink>
                )}

                <NavLink
                    to={`${basePath}?tab=${currentTab}&ai_chat=true`}
                    state={stateData}
                    className={({ isActive }) => getLinkStyle(searchParams.get('ai_chat') === 'true')}
                    onClick={onItemClick}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            Analysis with AI
                        </div>
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md animate-pulse">
                            NEW
                        </span>
                    </div>
                </NavLink>

                <div className="my-2 border-t border-slate-200 dark:border-slate-800"></div>

                {currentTestId && (
                    <NavLink
                        to={`${basePath}/feedback/${stateData?.test?.slug || currentTestId}`}
                        state={stateData}
                        className={({ isActive }) => getLinkStyle(isActive)}
                        id="left-menu-feedback-btn"
                        onClick={onItemClick}
                    >
                        <CustomFeedbackIcon className="h-5 w-5" />
                        Give Feedback
                    </NavLink>
                )}

                <Button
                    variant="ghost"
                    className="justify-start px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                    onClick={() => {
                        const test = stateData?.test || { id: currentTestId, title: "Test" };
                        const score = stateData?.score || 0;
                        const totalMarks = stateData?.test?.total_marks || (stateData?.totalQuestions ? stateData.totalQuestions * (stateData?.marksPerQuestion || 1) : 0);
                        shareWithFriends(test, score, totalMarks);
                    }}
                >
                    <Share2 className="mr-3 h-5 w-5" />
                    Share with friends
                </Button>

                <Button
                    variant="ghost"
                    className="justify-start px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                    onClick={() => {
                        const test = stateData?.test || { id: currentTestId, title: "Test" };
                        const score = stateData?.score || 0;
                        const totalMarks = stateData?.test?.total_marks || (stateData?.totalQuestions ? stateData.totalQuestions * (stateData?.marksPerQuestion || 1) : 0);
                        shareResultWhatsApp(test, score, totalMarks);
                    }}
                >
                    <MessageCircle className="mr-3 h-5 w-5 text-green-500" />
                    Share on WhatsApp
                </Button>

                <Button
                    variant="ghost"
                    className="justify-start px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                    onClick={() => {
                        const test = stateData?.test || { id: currentTestId, title: "Test" };
                        const score = stateData?.score || 0;
                        const totalMarks = stateData?.test?.total_marks || (stateData?.totalQuestions ? stateData.totalQuestions * (stateData?.marksPerQuestion || 1) : 0);
                        shareResultImage(test, score, totalMarks);
                    }}
                >
                    <Download className="mr-3 h-5 w-5 text-blue-500" />
                    Share Result Image
                </Button>

                <Button
                    variant="ghost"
                    className="justify-start px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                    onClick={() => {
                        const test = stateData?.test || { id: currentTestId, title: "Test" };
                        const url = `${window.location.origin}/test/${test.slug || test.id}`;
                        shareToFacebook(url);
                    }}
                >
                    <Facebook className="mr-3 h-5 w-5 text-blue-600" />
                    Share on Facebook
                </Button>

                <Button
                    variant="ghost"
                    className="justify-start px-4 py-3 font-medium text-slate-600 dark:text-slate-400"
                    onClick={() => {
                        const test = stateData?.test || { id: currentTestId, title: "Test" };
                        const score = stateData?.score || 0;
                        const totalMarks = stateData?.test?.total_marks || (stateData?.totalQuestions ? stateData.totalQuestions * (stateData?.marksPerQuestion || 1) : 0);
                        const url = `${window.location.origin}/test/${test.slug || test.id}`;
                        const title = `I scored ${score}/${totalMarks} in "${test.title}"!`;
                        shareToReddit(url, title);
                    }}
                >
                    <Reddit className="mr-3 h-5 w-5 text-orange-600" />
                    Share on Reddit
                </Button>

                <NavLink
                    to="/"
                    className={({ isActive }) => getLinkStyle(isActive)}
                    onClick={onItemClick}
                >
                    <Home className="h-5 w-5" />
                    Home
                </NavLink>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Desktop Sidebar (Permanent) */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 fixed h-full z-10">
                <div className="mb-8 px-4 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Result Hub</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</p>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <NavigationLinks />
                </nav>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 lg:ml-64 flex flex-col w-full min-h-screen">

                {/* Mobile Header with Hamburger */}
                <header className="lg:hidden flex items-center h-16 pl-0 pr-4 bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-20">
                    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="relative h-10 px-4 rounded-r-3xl rounded-l-none bg-indigo-50/80 dark:bg-indigo-900/40 backdrop-blur-md border border-l-0 border-indigo-200/50 dark:border-indigo-800/50 shadow-[2px_2px_10px_rgba(0,0,0,0.05)] transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 group flex items-center gap-3"
                            >
                                <div className="relative">
                                    <Menu className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                                    {/* iOS-style Notification Dot / Pulse */}
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 group-hover:text-indigo-800 dark:group-hover:text-indigo-200 transition-colors">
                                    More
                                </span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                            <SheetHeader className="p-6 text-left border-b bg-indigo-600 dark:bg-indigo-900">
                                <SheetTitle className="text-white flex items-center gap-2 text-xl font-bold">
                                    <Trophy className="h-6 w-6 text-yellow-400" />
                                    Result Hub
                                </SheetTitle>
                                <p className="text-indigo-100/70 text-[10px] font-bold uppercase tracking-widest mt-1">Analytics Dashboard</p>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <NavigationLinks onItemClick={() => setIsDrawerOpen(false)} />
                            </div>
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-sm font-medium text-slate-800 dark:text-slate-100 ml-2 tracking-wide leading-relaxed" style={{ fontFamily: "'Dancing Script', cursive" }}>
                        {userName}'s Results
                    </h1>
                </header>

                {/* Sub-page Injection Point */}
                <main className="flex-1 w-full bg-slate-50 dark:bg-slate-950 pb-20">
                    {/* We pass stateData through Outlet context just in case child routes need it */}
                    <Outlet context={{ stateData }} />
                </main>

                {/* Mobile Sticky Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-around items-center h-16">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <LayoutGrid className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Dashboard</span>
                        </button>

                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className={`flex-1 flex flex-col items-center gap-1 transition-colors ${isDrawerOpen ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <Trophy className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Hub</span>
                        </button>

                        <button
                            onClick={() => navigate(`${basePath}?tab=topics`, { state: stateData })}
                            className={`flex-1 flex flex-col items-center gap-1 transition-colors ${searchParams.get('tab') === 'topics' && location.pathname === basePath ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <Target className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Topics</span>
                        </button>

                        <button
                            onClick={() => navigate(`${basePath}?tab=solution-key`, { state: stateData })}
                            className={`flex-1 flex flex-col items-center gap-1 transition-colors ${searchParams.get('tab') === 'solution-key' && location.pathname === basePath ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <BookOpen className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Solution Key</span>
                        </button>

                        <button
                            onClick={() => {
                                if (currentTestId) {
                                    resetTest();
                                    const test = stateData?.test || { id: currentTestId };
                                    navigate(`/test/${test.slug || test.id}`);
                                } else {
                                    navigate('/');
                                }
                            }}
                            className="flex-1 flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <RotateCcw className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Retake</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
