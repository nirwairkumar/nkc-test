import React from 'react';
import { NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import { Target, BookOpen, Menu, Share2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function ResultsLayout() {
    const { testId } = useParams();
    const location = useLocation();
    const { user } = useAuth();
    // Default to 'Guest User' or the metadata name
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

    // Try to extract State Data so we can pass it down through Outlet context or links
    const stateData = location.state;
    // We get testId either from URL or state
    const currentTestId = testId || stateData?.test?.id;

    // Build base URL for navigation
    const basePath = '/results';

    const getLinkStyle = (isActive: boolean) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`;

    const NavigationLinks = () => (
        <div className="flex flex-col gap-2">
            <NavLink
                to={basePath}
                end
                state={stateData}
                className={({ isActive }) => getLinkStyle(isActive)}
            >
                <Target className="h-5 w-5" />
                Overview
            </NavLink>
            {currentTestId && (
                <NavLink
                    to={`${basePath}/solutions/${currentTestId}`}
                    state={stateData}
                    className={({ isActive }) => getLinkStyle(isActive)}
                >
                    <BookOpen className="h-5 w-5" />
                    Solutions
                </NavLink>
            )}
            <NavLink
                to={`${basePath}/analytics`}
                state={stateData}
                className={({ isActive }) => getLinkStyle(isActive)}
            >
                <Target className="h-5 w-5" />
                Advance Analytics
            </NavLink>

            <div className="my-4 border-t border-slate-200 dark:border-slate-800"></div>

            <Button
                variant="ghost"
                className="justify-start px-4 py-6 font-medium text-slate-600 dark:text-slate-400"
                onClick={() => {
                    const url = `${window.location.origin}/test-intro/${currentTestId}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied to clipboard!");
                }}
            >
                <Share2 className="mr-3 h-5 w-5" />
                Share with friends
            </Button>
            <NavLink
                to="/"
                className={({ isActive }) => getLinkStyle(isActive)}
            >
                <Home className="h-5 w-5" />
                Home
            </NavLink>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Desktop Sidebar (Permanent) */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 fixed h-full z-10">
                <div className="mb-8 px-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Results Area</h2>
                </div>
                <nav className="flex-1">
                    <NavigationLinks />
                </nav>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 lg:ml-64 flex flex-col w-full min-h-screen">

                {/* Mobile Header with Hamburger */}
                <header className="lg:hidden flex items-center h-16 px-4 bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-20">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2 mr-2">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0">
                            <SheetHeader className="p-6 text-left border-b">
                                <SheetTitle>Results Area</SheetTitle>
                            </SheetHeader>
                            <div className="p-4">
                                <NavigationLinks />
                            </div>
                        </SheetContent>
                    </Sheet>
                    <h1 className="font-semibold text-lg line-clamp-1 ml-2">
                        {userName}'s Results
                    </h1>
                </header>

                {/* Sub-page Injection Point */}
                <main className="flex-1 w-full bg-slate-50 dark:bg-slate-950 pb-20">
                    {/* We pass stateData through Outlet context just in case child routes need it */}
                    <Outlet context={{ stateData }} />
                </main>
            </div>
        </div>
    );
}
