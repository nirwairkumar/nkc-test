/**
 * Admin → Team: employees who sign in at team.testoza.com, what each may open, and the
 * activity log. Plan: TestoZa/Team-Dashboard/TEAM_DASHBOARD_PLAN.md
 */
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ExternalLink, ShieldCheck, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { initials, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, PILL_BTN, Segmented, SectionTitle, Skeleton } from '../analytics/ui';
import ActivityLog from './ActivityLog';
import MemberSheet from './MemberSheet';
import { errorText, TEAM_URL, teamApi, type StaffAccount } from './api';

type View = 'people' | 'activity';
const VIEWS: readonly View[] = ['people', 'activity'];

function StatusChips({ m }: { m: StaffAccount }) {
    return (
        <>
            {m.status === 'suspended' && <Chip tone="rose">Suspended</Chip>}
            {m.expired && <Chip tone="rose">Access ended</Chip>}
            {m.locked && <Chip tone="amber">Locked 15 min</Chip>}
            {m.status === 'active' && !m.expired && m.must_change_password && <Chip tone="amber">First sign-in pending</Chip>}
            {m.status === 'active' && !m.must_change_password && !m.two_step && <Chip tone="amber">2-step not set up</Chip>}
            {m.two_step && <Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> 2-step</Chip>}
            {m.live_sessions > 0 && <Chip tone="sky">Online</Chip>}
        </>
    );
}

export default function TeamPanel() {
    const [view, setView] = usePersisted<View>('tz_admin_team_view', 'people', VIEWS);
    const [sheet, setSheet] = useState<{ open: boolean; member: StaffAccount | null }>({ open: false, member: null });

    const catalog = useQuery({ queryKey: ['team', 'catalog'], queryFn: teamApi.catalog, staleTime: 10 * 60_000 });
    const list = useQuery({ queryKey: ['team', 'accounts'], queryFn: teamApi.list, refetchInterval: 60_000 });
    const labels = Object.fromEntries((catalog.data?.permissions ?? []).map((p) => [p.key, p.label]));

    // Keep the open sheet pointed at the freshest copy of the member.
    const openMember = sheet.member ? list.data?.rows.find((r) => r.id === sheet.member!.id) ?? sheet.member : null;

    return (
        <div className="space-y-5">
            <SectionTitle
                title="Team"
                subtitle="Employees sign in at team.testoza.com with a login ID, password and 6-digit phone code. They see only what you tick."
                action={
                    <button type="button" className={cn(PILL_BTN, 'bg-slate-900 text-white ring-slate-900 hover:bg-slate-800')} onClick={() => setSheet({ open: true, member: null })}>
                        <UserPlus className="h-4 w-4" /> Add member
                    </button>
                }
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented value={view} onChange={setView} options={[{ value: 'people', label: 'People' }, { value: 'activity', label: 'Activity log' }]} />
                <a href={TEAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-sky-700 hover:underline">
                    team.testoza.com <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

            {view === 'activity' ? (
                <ActivityLog />
            ) : list.isLoading ? (
                <Skeleton className="h-48 w-full" />
            ) : list.isError ? (
                <div className="space-y-2">
                    <ErrorState error={list.error} onRetry={() => list.refetch()} />
                    <p className="px-1 text-[12px] text-slate-500">{errorText(list.error)}</p>
                </div>
            ) : !list.data?.rows.length ? (
                <div className={CARD}>
                    <Empty icon={Users} title="No employees yet">
                        Add someone, choose what they can open, and send them their login ID and temporary password.
                    </Empty>
                </div>
            ) : (
                <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                    {list.data.rows.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                onClick={() => setSheet({ open: true, member: m })}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                            >
                                <span className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                                    m.status === 'active' && !m.expired ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
                                )}>
                                    {initials(m.full_name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[14px] font-semibold text-slate-900">{m.full_name}</span>
                                        <span className="text-[13px] text-slate-500">@{m.login_id}</span>
                                        <Chip>{m.role_label}</Chip>
                                        <StatusChips m={m} />
                                    </div>
                                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                                        {m.permissions.length ? m.permissions.map((p) => labels[p] ?? p).join(' · ') : 'No permissions yet'}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {m.last_login_at ? `Last sign-in ${relative(m.last_login_at)}` : 'Never signed in'}
                                        {m.expires_at && !m.expired ? ` · access ends ${new Date(m.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : ''}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {view === 'people' && (
                <div className={cn(CARD, 'p-4 text-[13px] leading-relaxed text-slate-600')}>
                    <p className="font-semibold text-slate-900">Hiring, role changes and exits</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        <li><b>New person:</b> add them, then send the login ID and the temporary password in two separate messages.</li>
                        <li><b>Job changes:</b> edit their ticks. It applies on their next click.</li>
                        <li><b>Leaving:</b> Suspend. They’re signed out within seconds and the activity log stays.</li>
                        <li><b>Monthly:</b> check this list and skim the activity log.</li>
                    </ul>
                </div>
            )}

            <MemberSheet
                open={sheet.open}
                onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
                catalog={catalog.data}
                member={openMember}
            />
        </div>
    );
}
