import React from 'react';
import { Search, Bell, Plus, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PRIMARY_BTN } from './dashboardUi';
import { plural } from './format';

interface DashboardHeaderProps {
    eyebrow: string;
    title: string;
    summary: React.ReactNode;
    openReports: number;
    onOpenReports: () => void;
    onOpenSearch: () => void;
    onOpenNotifications: () => void;
    onCreate: () => void;
}

/** Title, a one-line "what's happening" sentence, and the few actions an educator reaches for. */
export default function DashboardHeader({
    eyebrow,
    title,
    summary,
    openReports,
    onOpenReports,
    onOpenSearch,
    onOpenNotifications,
    onCreate,
}: DashboardHeaderProps) {
    const { unreadCount } = useNotifications();

    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-sky-700">{eyebrow}</p>
                <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[28px]">
                    {title}
                </h1>
                <div className="mt-1 text-[14px] leading-relaxed text-slate-600">{summary}</div>
                {openReports > 0 && (
                    <button
                        type="button"
                        onClick={onOpenReports}
                        className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-3 text-[13px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/15 transition-colors hover:bg-red-100 cursor-pointer"
                    >
                        <Inbox className="h-3.5 w-3.5" />
                        {plural(openReports, 'question')} flagged by candidates
                    </button>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label="Search your tests"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-200/60 px-3.5 text-[14px] text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer"
                >
                    <Search className="h-[18px] w-[18px]" />
                    <span className="hidden md:inline">Search</span>
                    <kbd className="hidden rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-500 ring-1 ring-slate-900/[0.06] lg:inline">
                        Ctrl K
                    </kbd>
                </button>
                <button
                    type="button"
                    onClick={onOpenNotifications}
                    aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/60 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer"
                >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-100" />
                    )}
                </button>
                <button type="button" onClick={onCreate} className={`${PRIMARY_BTN} h-10 flex-1 px-4 text-[14px] sm:flex-none sm:px-5`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    <span>Create test</span>
                </button>
            </div>
        </header>
    );
}
