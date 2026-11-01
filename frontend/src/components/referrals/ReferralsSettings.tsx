import React from 'react';
import { RefreshCw, Send, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReferrals } from '@/lib/referralsApi';
import { roleLabel } from '@/lib/roleLabel';
import { plural, timeAgo } from '@/components/dashboard/format';
import ReferralShareKit from './ReferralShareKit';
import { PersonAvatar, STAGES, StageTrack, Z_CARD } from './referralUi';

/** Settings → Invite educators: your link, how far it has gone, and who joined with it. */
export default function ReferralsSettings() {
    const { user, profile } = useAuth();
    const { data, error, isLoading, refetch, isFetching } = useMyReferrals(!!user);
    const name = profile?.full_name || user?.user_metadata?.full_name || '';

    if (isLoading) {
        return (
            <div className="space-y-4" aria-busy="true">
                <div className="h-[230px] animate-pulse rounded-[26px] bg-violet-200/60" />
                <div className="h-[120px] animate-pulse rounded-[22px] bg-slate-200/70" />
            </div>
        );
    }

    if (error || !data) {
        const off = (error as { response?: { status?: number } } | null)?.response?.status === 503;
        return (
            <div className={`${Z_CARD} px-6 py-10 text-center`}>
                <p className="text-[16px] font-extrabold text-[#2e0a6b]">{off ? 'Invites are almost ready' : 'Couldn’t load your invite link'}</p>
                <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-slate-500">
                    {off ? 'We’re switching them on. Please check back in a little while.' : 'Check your connection and try again.'}
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f3eeff] px-4 text-[13px] font-bold text-[#4c1d95] hover:bg-[#e8deff] disabled:opacity-60 cursor-pointer"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Try again
                </button>
            </div>
        );
    }

    const { stats, people } = data;
    const now = new Date();

    return (
        <div className="space-y-4">
            <ReferralShareKit code={data.code} name={name} where="settings" />

            {/* How far the link has gone */}
            <section className={`${Z_CARD} p-4 sm:p-5`} aria-labelledby="ref-stats">
                <h3 id="ref-stats" className="text-[16px] font-extrabold tracking-[-0.01em] text-[#2e0a6b]">Your invites so far</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Stat label="Opened your link" value={stats.opened} />
                    <Stat label="Joined" value={stats.joined} accent />
                    <Stat label="Made a test" value={stats.made_test} />
                    <Stat label="Getting results" value={stats.getting_results} />
                </dl>
            </section>

            {/* Who joined */}
            <section className={`${Z_CARD} overflow-hidden`} aria-labelledby="ref-people">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <h3 id="ref-people" className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.01em] text-[#2e0a6b]">
                        People who joined
                        {people.length > 0 && <span className="rounded-full bg-[#f3eeff] px-2 py-0.5 text-[12px] font-bold text-[#5b21b6] tabular-nums">{stats.joined}</span>}
                    </h3>
                    {people.length > 0 && (
                        <span className="hidden items-center gap-3 text-[11px] font-semibold text-slate-400 sm:flex">
                            {STAGES.map((s, i) => <span key={s.key}>{i + 1}. {s.label}</span>)}
                        </span>
                    )}
                </div>
                {people.length === 0 ? (
                    <HowItWorks opened={stats.opened} />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {people.map(p => {
                            const stage = STAGES.find(s => s.key === p.stage)!;
                            const role = roleLabel(p.designation);
                            return (
                                <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                    <PersonAvatar name={p.name} url={p.avatar_url} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14.5px] font-bold text-slate-900">{p.name}</p>
                                        <p className="truncate text-[12px] text-slate-500">
                                            {role ? `${role} · ` : ''}joined {timeAgo(new Date(p.joined_at), now)}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <StageTrack stage={p.stage} />
                                        <span className={`text-[11.5px] font-bold ${p.stage === 'getting_results' ? 'text-emerald-700' : p.stage === 'made_test' ? 'text-[#5b21b6]' : 'text-slate-500'}`}>
                                            {p.stage === 'getting_results' ? plural(p.candidates, 'candidate') : stage.label}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
    return (
        <div className={`flex flex-col-reverse rounded-2xl px-3.5 py-3 ${accent ? 'bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] text-white' : 'bg-[#faf7ff] ring-1 ring-inset ring-violet-100'}`}>
            <dt className={`mt-1.5 text-[12px] font-semibold ${accent ? 'text-violet-100' : 'text-slate-500'}`}>{label}</dt>
            <dd className={`text-[26px] font-black leading-none tracking-[-0.02em] tabular-nums ${accent ? 'text-white' : 'text-[#2e0a6b]'}`}>{value}</dd>
        </div>
    );
}

/** Shown until the first person joins. */
function HowItWorks({ opened }: { opened: number }) {
    const steps = [
        { icon: Send, title: 'Send your link', text: 'Copy the message into WhatsApp, or email it to a colleague.' },
        { icon: UserPlus, title: 'They sign up with it', text: 'Their account is linked to you the moment it’s made.' },
        { icon: Users, title: 'Watch them get going', text: 'See them make their first test and get their first results.' },
    ];
    return (
        <div className="px-4 py-5 sm:px-5">
            <p className="text-[13.5px] text-slate-600">
                {opened > 0
                    ? `${plural(opened, 'person has', 'people have')} opened your link. Nobody has signed up with it yet.`
                    : 'Nobody has joined with your link yet. Here’s how it works:'}
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {steps.map((s, i) => (
                    <li key={s.title} className="relative rounded-2xl bg-[#faf7ff] p-3.5 ring-1 ring-inset ring-violet-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#5b21b6] shadow-[0_4px_10px_-6px_rgba(46,10,107,0.5)]">
                            <s.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="absolute right-3.5 top-3 text-[22px] font-black text-violet-200">{i + 1}</span>
                        <p className="mt-2.5 text-[14px] font-extrabold text-[#2e0a6b]">{s.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{s.text}</p>
                    </li>
                ))}
            </ol>
        </div>
    );
}
