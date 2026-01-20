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
import { LogOut, User, History, Shield, Home, HelpCircle, Menu, Plus, Bell } from 'lucide-react';
import NotificationBox from './NotificationBox';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';


export default function Navbar() {
    const { user, isAdmin } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();
    const isLiveTest = location.pathname.startsWith('/live');

    if (isLiveTest) return null;

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
        <header className="w-full">
            <div className="container mx-auto flex h-16 items-center justify-between px-1 sm:px-4">
                <Link to="/" className="text-xl font-bold text-primary">
                    TestoZa
                </Link>


                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/create-test')}
                        className="flex items-center"
                    >
                        <Plus className="mr-0 h-4 w-4" />
                        <span>Create Test</span>
                    </Button>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/')}
                            className="flex items-center"
                        >
                            <Home className="mr-2 h-4 w-4" />
                            <span>Home</span>
                        </Button>



                        <Button
                            variant="ghost"
                            onClick={() => navigate('/support')}
                            className="flex items-center"
                        >
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>Support</span>
                        </Button>

                        {!user && (
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/admin-login')}
                            >
                                <Shield className="mr-2 h-4 w-4" />
                                Admin
                            </Button>
                        )}
                    </div>

                    {/* Mobile Menu (Hamburger) - Hide if user is logged in (content moved to Avatar dropdown), Show if guest */}
                    {!user && (
                        <div className="md:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => navigate('/')}>
                                        <Home className="mr-2 h-4 w-4" />
                                        <span>Home</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/support')}>
                                        <HelpCircle className="mr-2 h-4 w-4" />
                                        <span>Support</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => navigate('/admin-login')}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        <span>Admin</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => navigate('/login')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Login</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate('/login', { state: { isSignup: true } })}>
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
                                <NotificationBox />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
                                            {unreadCount > 0 && (
                                                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </Badge>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate('/')}>
                                            <Home className="mr-2 h-4 w-4" />
                                            <span>Home</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate('/support')}>
                                            <HelpCircle className="mr-2 h-4 w-4" />
                                            <span>Support</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </div>

                                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    {isAdmin ? (
                                        <>
                                            <DropdownMenuItem onClick={() => navigate('/manage-tests')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Manage Tests</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/admin-migration')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Admin Data Migration</span>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem onClick={() => navigate('/my-tests')}>
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>Your Tests</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate('/history')}>
                                                <History className="mr-2 h-4 w-4" />
                                                <span>Test History</span>
                                            </DropdownMenuItem>
                                        </>
                                    )}
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
                            <Button variant="ghost" onClick={() => navigate('/login')}>
                                Login
                            </Button>
                            <Button onClick={() => navigate('/login', { state: { isSignup: true } })}>
                                Sign Up
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
