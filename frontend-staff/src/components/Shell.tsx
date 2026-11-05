/**
 * The signed-in frame: sidebar on wide screens, top bar + slide-over menu on phones.
 * Only the modules the person holds a permission for are listed; the server refuses the
 * rest anyway.
 */
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, Home, LifeBuoy, LogOut, Mail, Menu, MessageSquareHeart, UserRound, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Inbox, Permission } from '@/lib/types';
import { Logo, cx } from './ui';

type NavItem = { to: string; label: string; icon: React.ElementType; needs?: Permission; badge?: 'inbox' | 'support' };

export const NAV: NavItem[] = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/inbox', label: 'Inbox', icon: Bell, needs: 'inbox.view', badge: 'inbox' },
    { to: '/support', label: 'Support', icon: LifeBuoy, needs: 'support.view', badge: 'support' },
    { to: '/feedback', label: 'Feedback', icon: MessageSquareHeart, needs: 'feedback.view' },
    { to: '/analytics', label: 'Analytics', icon: BarChart3, needs: 'analytics.view' },
    { to: '/email', label: 'Email', icon: Mail, needs: 'email.view' },
    { to: '/account', label: 'My account', icon: UserRound },
];

/** Waiting counts for the badges; a background poll that doesn't keep the session awake. */
export function useInbox() {
    const { can } = useSession();
    return useQuery({
        queryKey: ['inbox'],
        queryFn: () => api<Inbox>('/staff/inbox', { background: true }),
        enabled: can('inbox.view'),
        refetchInterval: 60_000,
        staleTime: 20_000,
    });
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
    const { can } = useSession();
    const inbox = useInbox();
    const counts = inbox.data?.counts;
    return (
        <nav className="space-y-1" aria-label="Main">
            {NAV.filter((n) => !n.needs || can(n.needs)).map((n) => {
                const badge = n.badge === 'inbox'
                    ? (counts ? counts.support_waiting + counts.feedback_unread : 0)
                    : n.badge === 'support' ? counts?.support_waiting ?? 0 : 0;
                return (
                    <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.to === '/'}
                        onClick={onNavigate}
                        className={({ isActive }) => cx(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors',
                            isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                    >
                        <n.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{n.label}</span>
                        {badge > 0 && (
                            <span className="min-w-[20px] rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                                {badge > 99 ? '99+' : badge}
                            </span>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}

function Who() {
    const { me, signOut } = useSession();
    if (!me) return null;
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100/80 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white">
                {initials(me.account.full_name)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{me.account.full_name}</p>
                <p className="truncate text-[12px] text-slate-500">{me.account.role_label}</p>
            </div>
            <button
                type="button"
                onClick={() => void signOut('You signed out.')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-rose-600"
                title="Sign out"
                aria-label="Sign out"
            >
                <LogOut className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function Shell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    useEffect(() => setOpen(false), [location.pathname]);

    return (
        <div className="min-h-[100dvh] bg-slate-50 md:flex">
            {/* Wide screens */}
            <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col gap-6 border-r border-slate-200/80 bg-white p-4 md:flex">
                <Logo className="px-1 pt-1" />
                <div className="min-h-0 flex-1 overflow-y-auto"><NavList /></div>
                <Who />
            </aside>

            {/* Phones */}
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 md:hidden">
                <Logo />
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </header>
            {open && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label="Close menu" onClick={() => setOpen(false)} />
                    <div className="absolute inset-y-0 right-0 flex w-[min(320px,85vw)] flex-col gap-6 bg-white p-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <Logo />
                            <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Close menu">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto"><NavList onNavigate={() => setOpen(false)} /></div>
                        <Who />
                    </div>
                </div>
            )}

            <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-6xl">{children}</div>
            </main>
        </div>
    );
}
