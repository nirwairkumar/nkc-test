import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Award, ChevronLeft, ChevronRight, Crown, Gift, KeyRound, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel } from '@/lib/roleLabel';
import { CARD, IconTile, type Tone } from '@/components/dashboard/dashboardUi';
import SecuritySettings from '@/components/settings/SecuritySettings';
import BillingSettings from '@/components/settings/BillingSettings';
import RewardsSettings from '@/components/settings/RewardsSettings';
import ReferralsSettings from '@/components/referrals/ReferralsSettings';

/**
 * /settings — one list of sections, grouped. A computer shows the list on the left and
 * the open section on the right; a phone shows the list first and each section on its
 * own screen with a back button, like iOS Settings. ?tab=<id> opens a section directly
 * (Rewards links back with ?tab=rewards, invite notifications with ?tab=referrals).
 *
 * A new section is one entry in SECTIONS plus its component.
 */

type SectionId = 'security' | 'billing' | 'referrals' | 'rewards';

interface Section {
    id: SectionId;
    group: 'account' | 'grow';
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: Tone;
    Body: React.ComponentType;
}

const GROUPS: { id: Section['group']; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'grow', label: 'Grow with TestoZa' },
];

const SECTIONS: Section[] = [
    { id: 'security', group: 'account', label: 'Password & security', hint: 'Change your password', icon: KeyRound, tone: 'sky', Body: SecuritySettings },
    { id: 'billing', group: 'account', label: 'Subscription', hint: 'Your plan and billing', icon: Crown, tone: 'amber', Body: BillingSettings },
    { id: 'referrals', group: 'grow', label: 'Invite educators', hint: 'Your invite link and who joined', icon: Gift, tone: 'violet', Body: ReferralsSettings },
    { id: 'rewards', group: 'grow', label: 'Rewards', hint: 'Badges for the exams you run', icon: Award, tone: 'emerald', Body: RewardsSettings },
];

/** What a computer opens on /settings with no tab. */
const DEFAULT_SECTION: SectionId = 'security';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const asked = SECTIONS.find(s => s.id === searchParams.get('tab'));
    const active = asked || SECTIONS.find(s => s.id === DEFAULT_SECTION)!;

    // From the phone's list: a real step, so Back returns to the list. On a computer: replace.
    const open = (id: SectionId, push = false) => setSearchParams({ tab: id }, { replace: !push });

    if (!user) return null;

    const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Your account';
    const avatar = profile?.avatar_url || user.user_metadata?.avatar_url;
    const role = roleLabel(profile?.designation || user.user_metadata?.designation);

    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
            {/* Phone, inside a section: back to the list */}
            {asked && (
                <button
                    type="button"
                    onClick={() => setSearchParams({}, { replace: true })}
                    className="-ml-2 mb-2 inline-flex h-9 items-center gap-0.5 rounded-full px-2 text-[15px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 lg:hidden cursor-pointer"
                >
                    <ChevronLeft className="h-5 w-5" /> Settings
                </button>
            )}

            <div className={asked ? 'hidden lg:block' : ''}>
                <h1 className="text-[28px] font-bold tracking-[-0.02em] text-slate-900">Settings</h1>

                {/* Who you are, with a way to change it */}
                <div className={`${CARD} mt-4 flex items-center gap-3.5 px-4 py-3.5 sm:px-5`}>
                    {avatar ? (
                        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]" />
                    ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-[16px] font-bold text-white">
                            {name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[16px] font-semibold text-slate-900">
                            <span className="truncate">{name}</span>
                            {role && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{role}</span>}
                        </p>
                        <p className="truncate text-[13px] text-slate-500">{user.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 cursor-pointer"
                    >
                        <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit profile</span><span className="sm:hidden">Edit</span>
                    </button>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start">
                {/* The list: always on a computer, on a phone only until a section is open */}
                <nav aria-label="Settings" className={`space-y-5 lg:sticky lg:top-20 ${asked ? 'hidden lg:block' : ''}`}>
                    {GROUPS.map(g => (
                        <div key={g.id}>
                            <p className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">{g.label}</p>
                            <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
                                {SECTIONS.filter(s => s.group === g.id).map(s => {
                                    const on = s.id === active.id;
                                    return (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                onClick={() => open(s.id, !asked)}
                                                aria-current={on ? 'page' : undefined}
                                                className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/50 cursor-pointer ${on ? 'lg:bg-sky-50/80' : 'hover:bg-slate-50'}`}
                                            >
                                                <IconTile icon={s.icon} tone={s.tone} size="sm" />
                                                <span className="min-w-0 flex-1">
                                                    <span className={`block truncate text-[14.5px] font-semibold ${on ? 'lg:text-sky-800' : ''} text-slate-900`}>{s.label}</span>
                                                    <span className="block truncate text-[12px] text-slate-500">{s.hint}</span>
                                                </span>
                                                <ChevronRight className={`h-4 w-4 shrink-0 ${on ? 'lg:text-sky-600' : ''} text-slate-300`} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* The open section: on a phone only once one is picked */}
                <section className={`min-w-0 ${asked ? '' : 'hidden lg:block'}`} aria-labelledby="settings-section-title">
                    <div className="mb-3.5 flex items-center gap-3">
                        <IconTile icon={active.icon} tone={active.tone} />
                        <div className="min-w-0">
                            <h2 id="settings-section-title" className="truncate text-[20px] font-bold tracking-[-0.02em] text-slate-900">{active.label}</h2>
                            <p className="truncate text-[13px] text-slate-500">{active.hint}</p>
                        </div>
                    </div>
                    <div className="max-w-3xl">
                        <active.Body />
                    </div>
                </section>
            </div>
        </div>
    );
}
