/**
 * Admin → Team → Activity: every sign-in, conversation opened, reply and change, newest first.
 * The log is append-only in the database (staff_audit_log trigger): nobody can edit it,
 * including the server.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { History, Loader2 } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { istDateTime, relative } from '../analytics/format';
import { ErrorState } from '../analytics/shared';
import { CARD, Chip, Empty, PILL_BTN, Skeleton } from '../analytics/ui';
import { teamApi, type AuditRow } from './api';

const ACTIONS: Record<string, { label: string; tone?: 'slate' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' }> = {
    'auth.login': { label: 'Signed in', tone: 'emerald' },
    'auth.password_ok': { label: 'Password accepted, waiting for code' },
    'auth.login_failed': { label: 'Failed sign-in', tone: 'amber' },
    'auth.login_locked': { label: 'Sign-in while locked', tone: 'rose' },
    'auth.login_blocked': { label: 'Sign-in to a switched-off account', tone: 'rose' },
    'auth.login_throttled': { label: 'Too many sign-ins from one network', tone: 'rose' },
    'auth.logout': { label: 'Signed out' },
    'auth.password_changed': { label: 'Changed password', tone: 'sky' },
    'auth.password_change_wrong_current': { label: 'Wrong current password', tone: 'amber' },
    'auth.2fa_setup_started': { label: 'Started 2-step set-up' },
    'auth.2fa_enabled': { label: 'Turned on 2-step', tone: 'emerald' },
    'auth.2fa_wrong_code': { label: 'Wrong 6-digit code', tone: 'amber' },
    'auth.2fa_secret_unreadable': { label: '2-step secret unreadable', tone: 'rose' },
    'access.denied': { label: 'Tried something not allowed', tone: 'rose' },
    'support.open': { label: 'Opened a help conversation' },
    'support.reply': { label: 'Replied to a help message', tone: 'sky' },
    'support.status': { label: 'Changed a help message status', tone: 'sky' },
    'analytics.view': { label: 'Viewed analytics' },
    'email.view': { label: 'Viewed email history' },
    'staff.create': { label: 'Added employee', tone: 'violet' },
    'staff.update': { label: 'Edited employee', tone: 'violet' },
    'staff.suspend': { label: 'Suspended employee', tone: 'rose' },
    'staff.reactivate': { label: 'Reactivated employee', tone: 'emerald' },
    'staff.remove': { label: 'Removed employee', tone: 'rose' },
    'staff.reset_password': { label: 'Reset password', tone: 'violet' },
    'staff.reset_2fa': { label: 'Reset 2-step', tone: 'violet' },
    'staff.sign_out': { label: 'Signed employee out everywhere', tone: 'violet' },
};

/** "Chrome on Android" from a user-agent string; good enough to spot a new device. */
export function deviceLabel(ua: string | null | undefined): string {
    if (!ua) return '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows'
        : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
    return os ? `${browser} on ${os}` : browser;
}

function detailText(row: AuditRow): string | null {
    const d = row.detail || {};
    if (row.action === 'access.denied') return `${d.path ?? ''}${d.needs ? ` (needs ${d.needs.join(', ')})` : ''}`;
    if (row.action === 'auth.login_failed') return d.reason === 'unknown_id' ? `Unknown login ID “${d.login_id}”` : 'Wrong password';
    if (row.action === 'support.reply') return `${d.chars ?? '?'} characters${d.resolve ? ', marked resolved' : ''}`;
    if (row.action === 'support.status') return `→ ${d.status}`;
    if (row.action === 'analytics.view') return `${d.report} · ${d.period}`;
    if (row.action === 'staff.create') return `${d.login_id} · ${(d.permissions || []).join(', ') || 'no permissions'}`;
    if (row.action.startsWith('staff.')) {
        const keys = Object.keys(d.changes || {});
        return [d.login_id, keys.length ? `changed ${keys.join(', ')}` : null].filter(Boolean).join(' · ');
    }
    return null;
}

export default function ActivityLog({ staffId, compact = false }: { staffId?: string; compact?: boolean }) {
    const q = useInfiniteQuery({
        queryKey: ['team', 'audit', staffId ?? 'all'],
        queryFn: ({ pageParam }) => teamApi.audit({ staff_id: staffId, before_id: pageParam as number | undefined, limit: compact ? 20 : 50 }),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (last) => last.next_before ?? undefined,
        refetchInterval: 60_000,
    });

    if (q.isLoading) return <Skeleton className="h-40 w-full" />;
    if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
    const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
    if (!rows.length) {
        return (
            <div className={CARD}>
                <Empty icon={History} title="Nothing yet">Sign-ins, replies and changes will show here.</Empty>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ul className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                {rows.map((r) => {
                    const meta = ACTIONS[r.action] ?? { label: r.action };
                    const extra = detailText(r);
                    return (
                        <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Chip tone={meta.tone ?? 'slate'}>{meta.label}</Chip>
                                    {!compact && (
                                        <span className="text-[13px] font-semibold text-slate-900">
                                            {r.actor_type === 'anonymous' ? 'Unknown' : r.actor_label}
                                        </span>
                                    )}
                                    {r.actor_type === 'admin' && <Chip tone="violet">admin</Chip>}
                                </div>
                                {extra && <p className="mt-0.5 truncate text-[12px] text-slate-500" title={extra}>{extra}</p>}
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {[r.ip, deviceLabel(r.user_agent)].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <span className="shrink-0 text-[12px] text-slate-400" title={istDateTime(r.created_at)}>
                                {relative(r.created_at)}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {q.hasNextPage && (
                <div className="flex justify-center">
                    <button type="button" className={PILL_BTN} onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                        {q.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Show older
                    </button>
                </div>
            )}
        </div>
    );
}
