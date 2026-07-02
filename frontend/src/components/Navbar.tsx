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
import { LogOut, User, History, Shield, Home, HelpCircle, Menu, Plus, Bell, Crown, DollarSign, Settings, TicketPercent, FileText, LayoutDashboard, Book, ChartSpline, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TestoZaLogo from './TestoZaLogo';
import { getAppUrl } from '@/utils/subdomain';

// Lazy load heavy components to keep them out of the main bundle
const NotificationBox = React.lazy(() => import('./NotificationBox'));

// Lazy Load Guides to keep them out of the main index bundle
const TestUploadFormatGuide = React.lazy(() => 
    import('./TestUploadFormatGuide').then(module => ({ default: module.TestUploadFormatGuide }))
);
const SolutionUploadGuide = React.lazy(() => 
    import('./SolutionUploadGuide').then(module => ({ default: module.SolutionUploadGuide }))
);


export default function Navbar() {
    const { user, isAdmin, profile } = useAuth();

    // Feature Flag for News — read from cache synchronously, defer network call
    const [isNewsEnabled, setIsNewsEnabled] = React.useState(() => {
        try {
            const cached = localStorage.getItem('testoza_feature_flags_cache');
            if (cached) {
                const { data } = JSON.parse(cached);
                return data?.enable_news_updates ?? true;
            }
        } catch {}
        return true;
    });

    // Lazy background refresh — non-blocking, only after idle
    React.useEffect(() => {
        const refresh = () => {
            import('@/lib/featuresApi').then(({ fetchFeatureFlags }) => {
                fetchFeatureFlags().then(data => {
                    setIsNewsEnabled(data.enable_news_updates ?? true);
                }).catch(() => {});
            });
        };
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(refresh);
        } else {
            setTimeout(refresh, 3000);
        }
    }, []);

    // If admin hide it no one can see except admin
    // Before this change, the news link was only visible to verified creators and admins.
    // Assuming we want students to see the news too when it's enabled, we'll allow it if enabled.
    // If you only meant creators, keeping profile?.is_verified_creator would be needed.
    // Based on standard platform logic: News should be visible to all logged-in users when enabled.
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

    return (
        <header className="w-full sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                <Link to="/" className="hover:opacity-90 transition-opacity">
                    <TestoZaLogo size={36} />
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Visible Navbar Buttons: Order depends on login state */}
                    {user ? (
                        <>
                            {/* Logged In: Dashboard first, Create Test second, Your Tests in between, Support last */}
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/dashboard')}
                                aria-label="Dashboard"
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/dashboard' 
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <LayoutDashboard className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Dashboard</span>
                                {location.pathname === '/dashboard' && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => navigate('/create-test')}
                                aria-label="Create Test"
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/create-test' || location.pathname.startsWith('/edit-test/') || location.pathname === '/generate-with-ai'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <Plus className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Create Test</span>
                                {(location.pathname === '/create-test' || location.pathname.startsWith('/edit-test/') || location.pathname === '/generate-with-ai') && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => navigate(isAdmin ? '/manage-tests' : '/my-tests')}
                                aria-label={isAdmin ? 'Manage Tests' : 'Your Tests'}
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/my-tests' || location.pathname === '/manage-tests'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <FileText className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">{isAdmin ? 'Manage Tests' : 'Your Tests'}</span>
                                {(location.pathname === '/my-tests' || location.pathname === '/manage-tests') && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => navigate('/support')}
                                className={`relative flex items-center h-10 hidden md:flex ${
                                    location.pathname === '/support'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Support</span>
                                {location.pathname === '/support' && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Logged Out: Create Test visible */}
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/create-test')}
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/create-test' || location.pathname.startsWith('/edit-test/') || location.pathname === '/generate-with-ai'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <Plus className="mr-0 h-4 w-4" />
                                <span>Create Test</span>
                                {(location.pathname === '/create-test' || location.pathname.startsWith('/edit-test/') || location.pathname === '/generate-with-ai') && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => handleLoginNavigation(false, '/my-tests')}
                                aria-label="Your Tests"
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/my-tests' || location.pathname === '/manage-tests'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <FileText className="mr-0 sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Your Tests</span>
                                {(location.pathname === '/my-tests' || location.pathname === '/manage-tests') && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>
                        </>
                    )}

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-2">
                        {!user && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/dashboard')}
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/dashboard'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                                {location.pathname === '/dashboard' && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>
                        )}

                        {/* Support is visible only when NOT logged in (since logged in Support is handled above) */}
                        {!user && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/support')}
                                className={`relative flex items-center h-10 ${
                                    location.pathname === '/support'
                                        ? 'text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary dark:bg-primary/10 font-semibold' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
                                }`}
                            >
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Support</span>
                                {location.pathname === '/support' && (
                                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Mobile Menu (Hamburger) - Hide if user is logged in (content moved to Avatar dropdown), Show if guest */}
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

                    {/* Authenticated User Avatar (Visible on both) */}
                    {user ? (
                        <>
                            {/* Hide Bell on Mobile, Show on Desktop */}
                            <div className="hidden md:block">
                                <React.Suspense fallback={
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="h-5 w-5" />
                                    </Button>
                                }>
                                    <NotificationBox />
                                </React.Suspense>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="Open user account menu">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
                                            <AvatarFallback>{getInitials(user.user_metadata?.full_name)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {/* Mobile Only Links moved here */}
                                    <div className="md:hidden">
                                        <DropdownMenuItem onClick={() => navigate('/notifications')} className="flex justify-between items-center">
                                            <div className="flex items-center">
                                                <Bell className="mr-2 h-4 w-4" />
                                                <span>Notifications</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => navigate('/support')}>
                                            <HelpCircle className="mr-2 h-4 w-4" />
                                            <span>Support</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {canSeeNews && (
                                            <DropdownMenuItem onClick={() => navigate('/news')}>
                                                <FileText className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">News & Updates</span>
                                            </DropdownMenuItem>
                                        )}
                                    </div>

                                    <DropdownMenuItem onClick={() => navigate('/')}>
                                        <Home className="mr-2 h-4 w-4" />
                                        <span>Home</span>
                                    </DropdownMenuItem>
                                    {canSeeNews && (
                                        <DropdownMenuItem onClick={() => navigate('/news')} className="hidden md:flex">
                                            <FileText className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">News & Updates</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>
                                    {isAdmin ? (
                                        <>
                                            <DropdownMenuItem onClick={() => navigate('/manage-tests')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Manage Tests</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin?tab=migration')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Admin Data Migration</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin?tab=analytics')}>
                                                <ChartSpline className="mr-2 h-4 w-4 text-orange-500" />
                                                <span>Visitor Analytics</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin?tab=pricing')}>
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                <span>Manage Pricing</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin?tab=features')}>
                                                <Wrench className="mr-2 h-4 w-4" />
                                                <span>Feature Control</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin?tab=promos')}>
                                                <TicketPercent className="mr-2 h-4 w-4" />
                                                <span>Manage Promo Codes</span>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem onClick={() => navigate('/my-tests')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Your Tests</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/materials')}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>Materials</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/history')}>
                                                <History className="mr-2 h-4 w-4" />
                                                <span>Test History</span>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => window.open('/user-guide', '_blank')}>
                                        <Book className="mr-2 h-4 w-4 text-indigo-600" />
                                        <span>User Guide</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => navigate('/create-test')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span>Create Test</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <div className="hidden md:flex gap-2">
                            <Button variant="ghost" onClick={() => handleLoginNavigation(false, location.pathname)}>
                                Login
                            </Button>
                            <Button onClick={() => handleLoginNavigation(true, location.pathname)}>
                                Sign Up
                            </Button>
                        </div>
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
