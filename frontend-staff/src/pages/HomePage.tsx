import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAV, useInbox } from '@/components/Shell';
import { CARD, PageTitle, cx } from '@/components/ui';
import { dateOnly, greeting } from '@/lib/format';
import { useSession } from '@/lib/session';

const BLURB: Record<string, string> = {
    '/inbox': 'New help messages, feedback and ratings as they arrive.',
    '/support': 'Read and answer help messages from educators.',
    '/feedback': 'What educators say about TestoZa, and their after-exam ratings.',
    '/analytics': 'Visitors, sign-ups and growth. Numbers only.',
    '/email': 'Past email sends and how people responded.',
    '/account': 'Your details and password.',
};

export default function HomePage() {
    const { me, can } = useSession();
    const inbox = useInbox();
    if (!me) return null;
    const counts = inbox.data?.counts;
    const modules = NAV.filter((n) => n.to !== '/' && (!n.needs || can(n.needs)));

    const countFor = (to: string) => {
        if (!counts) return null;
        if (to === '/support') return counts.support_waiting ? `${counts.support_waiting} waiting` : null;
        if (to === '/inbox') {
            const n = counts.support_waiting + counts.feedback_unread;
            return n ? `${n} new` : null;
        }
        if (to === '/feedback') return counts.feedback_unread ? `${counts.feedback_unread} unread` : null;
        return null;
    };

    return (
        <>
            <PageTitle
                title={`${greeting()}, ${me.account.full_name.split(' ')[0]}`}
                subtitle={<>Signed in as <b className="font-semibold text-slate-700">{me.account.login_id}</b> · {me.account.role_label}</>}
            />

            <div className="grid gap-3 sm:grid-cols-2">
                {modules.map((m) => {
                    const badge = countFor(m.to);
                    return (
                        <Link key={m.to} to={m.to} className={cx(CARD, 'group flex items-start gap-3 p-4 transition-shadow hover:shadow-md')}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white">
                                <m.icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="text-[15px] font-semibold text-slate-900">{m.label}</span>
                                    {badge && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
                                </span>
                                <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{BLURB[m.to]}</span>
                            </span>
                            <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                        </Link>
                    );
                })}
            </div>

            {modules.length === 1 && (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
                    You don’t have access to any sections yet. Ask your admin to give you access.
                </p>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/60 px-4 py-3 text-[13px] leading-relaxed text-slate-500 ring-1 ring-slate-900/[0.05]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <p>
                    You’ll be signed out after {me.idle_minutes} minutes without activity. What you open and send here is
                    recorded. Don’t copy people’s details out of this dashboard or share your screen with anyone outside TestoZa.
                    {me.account.expires_at && <> Your access runs until {dateOnly(me.account.expires_at)}.</>}
                </p>
            </div>
        </>
    );
}
