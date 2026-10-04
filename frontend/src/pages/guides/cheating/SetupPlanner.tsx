/**
 * "Your exam, your setup": the kind of exam (class quiz → recruitment test) and where
 * candidates sit, and the setup the guide recommends (src/guides/cheatingData.ts
 * setupFor): check-in, exam rules, what happens after violations, results, the paper,
 * the room, and a plain verdict. Every setting named exists in TestoZa (test settings
 * and the New exam sheet); the advice is the guide's.
 */
import { useRef, useState } from 'react';
import { BadgeCheck, CalendarClock, FileText, KeyRound, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { STAKES, setupFor, type Place, type Stakes } from '@/guides/cheatingData';
import { DemoFrame, useWidth } from './replica';

export default function SetupPlanner() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 700;
    const [stakes, setStakes] = useState<Stakes>('weekly');
    const [place, setPlace] = useState<Place>('home');
    const s = setupFor(stakes, place);
    const label = STAKES.find((x) => x.id === stakes)?.label ?? '';

    const rows = [
        { icon: KeyRound, tone: 'indigo', name: 'Check-in', value: s.checkIn },
        { icon: TriangleAlert, tone: 'orange', name: 'After violations', value: s.policy },
        { icon: CalendarClock, tone: 'teal', name: 'Results', value: s.results },
        { icon: FileText, tone: 'blue', name: 'The paper', value: s.paper },
        { icon: Users, tone: 'purple', name: 'In the room', value: s.room },
    ] as const;

    return (
        <DemoFrame
            title="Your exam, your setup"
            tip={<span key={`${stakes}-${place}`}>{label}, {place === 'home' ? 'taken at home' : 'in a supervised room'}.</span>}
            onRestart={() => {
                setStakes('weekly');
                setPlace('home');
            }}
            wide="md"
        >
            <div ref={bodyRef} className={`pc-pl${wide ? ' is-wide' : ''}`}>
                <div className="pc-pl-controls">
                    <p className="pc-mini-label">The exam</p>
                    <div className="pc-chips pc-pl-chips" role="group" aria-label="The exam">
                        {STAKES.map((x) => (
                            <button key={x.id} type="button" aria-pressed={stakes === x.id} onClick={() => setStakes(x.id)}>
                                {wide ? x.label : x.short}
                            </button>
                        ))}
                    </div>
                    <p className="pc-mini-label">Where candidates sit</p>
                    <div className="pc-seg pc-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: place === 'home' ? 0 : 1 }} role="group" aria-label="Where candidates sit">
                        <button type="button" aria-pressed={place === 'home'} onClick={() => setPlace('home')}>
                            At home
                        </button>
                        <button type="button" aria-pressed={place === 'room'} onClick={() => setPlace('room')}>
                            Supervised room
                        </button>
                    </div>
                </div>
                <div className="pc-pl-result" key={`${stakes}-${place}`}>
                    <div className="pc-pl-group">
                        <div className="pc-pl-row is-rules">
                            <span className="pc-tile" data-tone="green">
                                <ShieldCheck aria-hidden="true" />
                            </span>
                            <div>
                                <p className="pc-pl-name">Exam rules</p>
                                <ul className="pc-pl-rules">
                                    {s.rules.map((r) => (
                                        <li key={r}>{r}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        {rows.map(({ icon: Icon, tone, name, value }) => (
                            <div key={name} className="pc-pl-row">
                                <span className="pc-tile" data-tone={tone}>
                                    <Icon aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="pc-pl-name">{name}</p>
                                    <p className="pc-pl-value">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pc-pl-verdict" data-warn={(place === 'home' && (stakes === 'term' || stakes === 'recruit')) || undefined}>
                        <BadgeCheck aria-hidden="true" />
                        <p>{s.verdict}</p>
                    </div>
                </div>
            </div>
        </DemoFrame>
    );
}
