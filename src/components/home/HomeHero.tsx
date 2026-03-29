import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, Library, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HomeHeroProps {
    onRefresh: () => void;
    isLoading: boolean;
}

export default function HomeHero({ onRefresh, isLoading }: HomeHeroProps) {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const name = profile?.full_name || user?.user_metadata?.full_name?.split(' ')[0] || 'there';

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm mb-2 mt-2 animate-slide-up-fade">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 -mb-20 w-48 h-48 rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />
            
            <div className="relative p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3 z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                            Dashboard Workspace
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {user ? `${greeting}, ${name}!` : 'Welcome to TestoZa'}
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl">
                        {user 
                            ? "Track your progress, explore new assessments, and master your subjects." 
                            : "Discover thousands of premium assessments or create your own with AI."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto z-10">
                    {user && (
                        <>
                            <Button 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                                onClick={() => navigate('/create-test')}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Test
                            </Button>
                            <Button 
                                variant="outline" 
                                className="bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 hidden sm:flex"
                                onClick={() => navigate('/history')}
                            >
                                <Play className="h-4 w-4 mr-2 text-slate-500" />
                                Resume Learning
                            </Button>
                        </>
                    )}
                    <Button 
                        variant="outline" 
                        size={user ? "icon" : "default"}
                        className="bg-white/50 backdrop-blur-sm dark:bg-slate-900/50" 
                        onClick={onRefresh} 
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${user ? '' : 'mr-2'} ${isLoading ? 'animate-spin' : ''}`} />
                        {!user && "Refresh Feed"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
