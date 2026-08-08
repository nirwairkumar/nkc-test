import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/hooks/useAuthActions';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, User, History, Shield, Home, HelpCircle, Menu, Plus, Bell, Crown, DollarSign, Settings, TicketPercent, FileText, LayoutDashboard, Book, ChartSpline, Wrench, Sparkles, PanelLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TestoZaLogo from './TestoZaLogo';
import { getAppUrl, getMarketingUrl } from '@/utils/subdomain';

// Lazy load heavy components to keep them out of the main bundle
const NotificationBox = React.lazy(() => import('./NotificationBox'));

// Lazy Load Guides to keep them out of the main index bundle
const TestUploadFormatGuide = React.lazy(() =>
    import('./TestUploadFormatGuide').then(module => ({ default: module.default || module.TestUploadFormatGuide }))
);
const SolutionUploadGuide = React.lazy(() =>
    import('./SolutionUploadGuide').then(module => ({ default: module.default || module.SolutionUploadGuide }))
);


interface NavbarProps {
    onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps = {}) {
    const { user, isAdmin, profile } = useAuth();

    // Feature Flag for News — read from cache synchronously, defer network call
    const [isNewsEnabled, setIsNewsEnabled] = React.useState(() => {
        try {
            const cached = localStorage.getItem('testoza_feature_flags_cache');
            if (cached) {
                const { data } = JSON.parse(cached);
                return data?.enable_news_updates ?? true;
            }
        } catch { }
        return true;
    });

    // Lazy background refresh — non-blocking, only after idle
    React.useEffect(() => {
        if (!user) return; // Skip cold-start API overhead for guest visitors and bots

        const refresh = () => {
            import('@/lib/featuresApi').then(({ fetchFeatureFlags }) => {
                fetchFeatureFlags().then(data => {
                    setIsNewsEnabled(data.enable_news_updates ?? true);
                }).catch(() => { });
            });
        };
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(refresh);
        } else {
            setTimeout(refresh, 3000);
        }
    }, [user]);

    const canSeeNews = isAdmin || isNewsEnabled;
    const navigate = useNavigate();
    const location = useLocation();
    const isLiveTest = location.pathname.startsWith('/live');

    const [isSolutionGuideOpen, setIsSolutionGuideOpen] = React.useState(false);
    const [isUploadGuideOpen, setIsUploadGuideOpen] = React.useState(false);

    if (isLiveTest) return null;

    const handleLoginNavigation = (isSignup: boolean = false, fromPath: string = '') => {
        const path = `/login${isSignup ? '?signup=true' : ''}${fromPath ? `${isSignup ? '&' : '?'}from=${encodeURIComponent(fromPath)}` : ''}`;
        const targetUrl = getAppUrl(path);
        if (targetUrl.startsWith('http')) {
            window.location.href = targetUrl;
        } else {
            navigate(path, { state: { isSignup, from: fromPath } });
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const isLandingPage = location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/support';

    return (
        <header className="w-full sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <Link to="/" className="hover:opacity-90 transition-opacity">
                        <TestoZaLogo size={36} />
                    </Link>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Logged Out Navigation */}
                    {!user && (
                        <div className="hidden md:flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/create-test')}
                                className="text-slate-600 hover:text-slate-900 font-medium"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                <span>Create Test</span>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => handleLoginNavigation(false, location.pathname)}
                            >
                                Login
                            </Button>
                            <Button onClick={() => handleLoginNavigation(true, location.pathname)}>
                                Sign Up
                            </Button>
                        </div>
                    )}

                    {/* Guest Mobile Menu */}
                    {!user && (
                        <div className="md:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        <span>Dashboard</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/support')}>
                                        <HelpCircle className="mr-2 h-4 w-4" />
                                        <span>Support</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => window.open('/user-guide', '_blank')}>
                                        <Book className="mr-2 h-4 w-4 text-indigo-600" />
                                        <span>User Guide</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleLoginNavigation(false, location.pathname)}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Login</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleLoginNavigation(true, location.pathname)}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Sign Up</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Authenticated User Actions */}
                    {user && (
                        <>
                            {/* Landing Page Nav Links for Logged-In Users */}
                            {isLandingPage && (
                                <div className="hidden md:flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate('/dashboard')}
                                        className="text-slate-700 dark:text-slate-200 hover:text-slate-900 font-medium text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-3"
                                    >
                                        <LayoutDashboard className="mr-1.5 h-4 w-4 text-slate-500" />
                                        <span>Dashboard</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate('/create-test')}
                                        className="text-slate-700 dark:text-slate-200 hover:text-slate-900 font-medium text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-3"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4 text-emerald-600" />
                                        <span>Create Test</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate('/my-tests')}
                                        className="text-slate-700 dark:text-slate-200 hover:text-slate-900 font-medium text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-3"
                                    >
                                        <FileText className="mr-1.5 h-4 w-4 text-indigo-600" />
                                        <span>My Tests</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate('/support')}
                                        className="text-slate-700 dark:text-slate-200 hover:text-slate-900 font-medium text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2.5 sm:px-3"
                                    >
                                        <HelpCircle className="mr-1.5 h-4 w-4 text-amber-600" />
                                        <span>Support</span>
                                    </Button>
                                </div>
                            )}

                            {/* Landing Page Mobile Menu for Logged-In Users */}
                            {isLandingPage && (
                                <div className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                                                <Menu className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                                            <DropdownMenuItem onClick={() => navigate('/dashboard')} className="rounded-xl cursor-pointer">
                                                <LayoutDashboard className="mr-2 h-4 w-4 text-slate-500" />
                                                <span>Dashboard</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/create-test')} className="rounded-xl cursor-pointer">
                                                <Plus className="mr-2 h-4 w-4 text-emerald-600" />
                                                <span>Create Test</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/my-tests')} className="rounded-xl cursor-pointer">
                                                <FileText className="mr-2 h-4 w-4 text-indigo-600" />
                                                <span>My Tests</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/support')} className="rounded-xl cursor-pointer">
                                                <HelpCircle className="mr-2 h-4 w-4 text-amber-600" />
                                                <span>Support</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}

                            {/* Notification Bell */}
                            <React.Suspense fallback={
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                </Button>
                            }>
                                <NotificationBox />
                            </React.Suspense>

                            {/* User Avatar Dropdown - ONLY Home, Profile, Settings, Log out */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-slate-200/60 dark:ring-slate-800 hover:ring-primary/40 transition-all" aria-label="Open user account menu">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{getInitials(user.user_metadata?.full_name)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 rounded-2xl p-1.5 shadow-xl border border-slate-200/80 dark:border-slate-800" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal px-3 py-2">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">{user.user_metadata?.full_name || 'User'}</p>
                                            <p className="text-xs leading-none text-slate-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="my-1" />

                                    <DropdownMenuItem
                                        onClick={() => {
                                            const url = getMarketingUrl('/');
                                            if (url.startsWith('http')) {
                                                window.location.href = url;
                                            } else {
                                                navigate('/');
                                            }
                                        }}
                                        className={`rounded-xl px-3 py-2 cursor-pointer font-medium text-xs ${location.pathname === '/' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <Home className="mr-2.5 h-4 w-4" />
                                        <span>Home</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => navigate('/profile')}
                                        className={`rounded-xl px-3 py-2 cursor-pointer font-medium text-xs ${location.pathname === '/profile' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <User className="mr-2.5 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => navigate('/settings')}
                                        className={`rounded-xl px-3 py-2 cursor-pointer font-medium text-xs ${location.pathname === '/settings' ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <Settings className="mr-2.5 h-4 w-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem
                                        onClick={handleSignOut}
                                        className="rounded-xl px-3 py-2 cursor-pointer font-medium text-xs text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40"
                                    >
                                        <LogOut className="mr-2.5 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>

            {/* User Guides (Controlled) - Render dynamically to prevent parsing overhead on guest/login pages */}
            {isSolutionGuideOpen && (
                <React.Suspense fallback={null}>
                    <SolutionUploadGuide
                        open={isSolutionGuideOpen}
                        onOpenChange={setIsSolutionGuideOpen}
                    />
                </React.Suspense>
            )}
            {isUploadGuideOpen && (
                <React.Suspense fallback={null}>
                    <TestUploadFormatGuide
                        open={isUploadGuideOpen}
                        onOpenChange={setIsUploadGuideOpen}
                    />
                </React.Suspense>
            )}
        </header>
    );
}
