import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Bell, Sparkles, Building2, UserCheck, Shield, Plus, Command } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

import { useNotifications } from '@/hooks/useNotifications';

interface DashboardHeaderProps {
    user: any;
    profile: any;
    isAdmin: boolean;
    role: string;
    onOpenSearch: () => void;
    onOpenNotifications: () => void;
}

export default function DashboardHeader({
    user,
    profile,
    isAdmin,
    role,
    onOpenSearch,
    onOpenNotifications
}: DashboardHeaderProps) {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();
    const isInstitution = role === 'Institution';

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teacher';

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200/70">
            {/* Left Workspace / Title */}
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                    isInstitution ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-indigo-600 to-blue-700'
                }`}>
                    {isInstitution ? <Building2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                            {isInstitution ? (profile?.institution_name || 'Institution Workspace') : `${displayName}'s Workspace`}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isInstitution ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                            {role}
                        </span>
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-slate-400 font-medium leading-normal truncate">
                        Assessment & Examination Control Center
                    </p>
                </div>
            </div>

            {/* Right Tools & Actions */}
            <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                {/* Search Trigger Button */}
                <button
                    onClick={onOpenSearch}
                    className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200/60 text-xs font-medium transition-all cursor-pointer"
                >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-white px-1.5 py-0.5 rounded text-slate-400 border border-slate-200 ml-1">
                        <Command className="w-2.5 h-2.5" />K
                    </kbd>
                </button>

                {/* Notifications Drawer Button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onOpenNotifications}
                    className="relative h-9 w-9 shrink-0 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Notifications"
                >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 ring-2 ring-white"></span>
                        </span>
                    )}
                </Button>

                {/* Primary CTA */}
                <Button
                    onClick={() => navigate('/create-test')}
                    className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Test</span>
                </Button>
            </div>
        </div>
    );
}
