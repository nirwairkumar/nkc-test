import React from 'react';
import { Search, Bell, Plus, Building2, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PRIMARY_BTN } from './dashboardUi';
import { plural } from './format';

interface DashboardHeaderProps {
    eyebrow: string;
    title: string;
    summary: React.ReactNode;
    logoUrl?: string | null;
    isInstitution: boolean;
    openReports: number;
    onOpenReports: () => void;
    onOpenSearch: () => void;
    onOpenNotifications: () => void;
    onCreate: () => void;
}

/** Large title, a one-line "what's happening" sentence, and the few actions a teacher reaches for. */
export default function DashboardHeader({
    eyebrow,
    title,
    summary,
    logoUrl,
    isInstitution,
    openReports,
    onOpenReports,
    onOpenSearch,
    onOpenNotifications,
    onCreate,
}: DashboardHeaderProps) {
    const { unreadCount } = useNotifications();

    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt=""
                        className="mt-1 hidden h-12 w-12 shrink-0 rounded-[14px] bg-white object-contain p-1 ring-1 ring-slate-900/[0.08] sm:block"
                    />
                ) : isInstitution ? (
                    <span className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-500/15 to-sky-500/5 text-sky-700 ring-1 ring-inset ring-sky-500/20 sm:flex">
                        <Building2 className="h-6 w-6" />
                    </span>
                ) : null}
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">{eyebrow}</p>
                    <h1 className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:text-[34px]">
                        {title}
                    </h1>
                    <div className="mt-2 text-[15px] leading-relaxed text-slate-600">{summary}</div>
                    {openReports > 0 && (
                        <button
                            type="button"
                            onClick={onOpenReports}
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-3 text-[13px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/15 transition-colors hover:bg-red-100 cursor-pointer"
                        >
                            <Inbox className="h-3.5 w-3.5" />
                            {plural(openReports, 'question')} flagged by students
                        </button>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label="Search your tests"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-200/60 px-3.5 text-[15px] text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer"
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
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/60 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer"
                >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-100" />
                    )}
                </button>
                <button type="button" onClick={onCreate} className={`${PRIMARY_BTN} h-11 flex-1 px-4 sm:flex-none sm:px-5`}>
                    <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                    <span>Create test</span>
                </button>
            </div>
        </header>
    );
}
