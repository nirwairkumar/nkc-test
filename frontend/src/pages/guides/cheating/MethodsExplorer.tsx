/**
 * The 16 ways candidates cheat (src/guides/cheatingData.ts METHODS), at home or in a
 * supervised room: what happens to each (blocked, flagged, stopped by the setup, partly
 * stopped, stopped by the room, not seen), what the exam can see, and what to do. A
 * summary row doubles as a filter. Wide: the list beside the selected method; narrow:
 * rows open in place. Fits the window and scrolls inside.
 */
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { METHODS, METHOD_GROUPS, VERDICT_LABEL, type Method, type Place, type Verdict } from '@/guides/cheatingData';
import { DemoFrame, useWidth } from './replica';

const ORDER: Verdict[] = ['blocked', 'setup', 'flagged', 'partly', 'room', 'unseen'];

function Pill({ v }: { v: Verdict }) {
    return (
        <span className="pc-verdict" data-v={v}>
            {VERDICT_LABEL[v]}
        </span>
    );
}

function Detail({ m, place }: { m: Method; place: Place }) {
    return (
        <div className="pc-mx-detail" key={`${m.id}-${place}`}>
            <p className="pc-mx-group">{m.group}</p>
            <p className="pc-mx-name">{m.name}</p>
            <div className="pc-mx-places">
                <div data-on={place === 'home' || undefined}>
                    <span>At home</span>
                    <Pill v={m.verdict.home} />
                </div>
                <div data-on={place === 'room' || undefined}>
                    <span>In a supervised room</span>
                    <Pill v={m.verdict.room} />
                </div>
            </div>
            <dl className="pc-mx-facts">
                <div>
                    <dt>How it works</dt>
                    <dd>{m.how}</dd>
                </div>
                <div>
                    <dt>What the exam can see</dt>
                    <dd>{m.sees}</dd>
                </div>
                <div>
                    <dt>What to do</dt>
                    <dd>{m.fix}</dd>
                </div>
            </dl>
        </div>
    );
}

export default function MethodsExplorer() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const wide = useWidth(bodyRef) >= 760;
    const [place, setPlace] = useState<Place>('home');
    const [filter, setFilter] = useState<Verdict | null>(null);
    const [picked, setPicked] = useState<string>(METHODS[0].id);
    const [open, setOpen] = useState<string | null>(null);

    const counts = ORDER.map((v) => [v, METHODS.filter((m) => m.verdict[place] === v).length] as const).filter(([, n]) => n > 0);
    const shown = METHODS.filter((m) => !filter || m.verdict[place] === filter);
    const current = METHODS.find((m) => m.id === picked) ?? METHODS[0];

    const restart = () => {
        setPlace('home');
        setFilter(null);
        setPicked(METHODS[0].id);
        setOpen(null);
    };

    const tip =
        filter === 'unseen' ? (
            <span key="unseen">Nothing on the exam device changes for these. Only the paper, the time and a room can help.</span>
        ) : place === 'room' ? (
            <span key="room">In a supervised room, a person stops most of the list. The rest is stopped by how the exam is set up.</span>
        ) : (
            <span key="home">Choose a method to see what the exam can see, and what to do.</span>
        );

    return (
        <DemoFrame title="16 ways candidates cheat, and what stops each" tip={tip} onRestart={restart} wide="md">
            <div ref={bodyRef} className={`pc-mx${wide ? ' is-wide' : ''}`}>
                <div className="pc-mx-top">
                    <div className="pc-seg" style={{ ['--n' as string]: 2, ['--i' as string]: place === 'home' ? 0 : 1 }} role="group" aria-label="Where candidates sit">
                        <button type="button" aria-pressed={place === 'home'} onClick={() => setPlace('home')}>
                            At home
                        </button>
                        <button type="button" aria-pressed={place === 'room'} onClick={() => setPlace('room')}>
                            In a supervised room
                        </button>
                    </div>
                    <div className="pc-chips pc-mx-chips" role="group" aria-label="Show only">
                        {counts.map(([v, n]) => (
                            <button key={v} type="button" data-v={v} aria-pressed={filter === v} onClick={() => setFilter((f) => (f === v ? null : v))}>
                                {VERDICT_LABEL[v]} <b>{n}</b>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pc-mx-main">
                    <div className="pc-mx-list" role="list">
                        {METHOD_GROUPS.map((group) => {
                            const rows = shown.filter((m) => m.group === group);
                            if (!rows.length) return null;
                            return (
                                <div key={group} className="pc-mx-section">
                                    <p className="pc-group-label">{group}</p>
                                    <ul>
                                        {rows.map((m) => {
                                            const on = wide ? picked === m.id : open === m.id;
                                            return (
                                                <li key={m.id} role="listitem">
                                                    <button
                                                        type="button"
                                                        aria-expanded={wide ? undefined : on}
                                                        aria-current={wide && on ? 'true' : undefined}
                                                        onClick={() => (wide ? setPicked(m.id) : setOpen((o) => (o === m.id ? null : m.id)))}
                                                    >
                                                        <span>{m.name}</span>
                                                        <Pill v={m.verdict[place]} />
                                                        {!wide && <ChevronDown aria-hidden="true" className="pc-mx-chev" />}
                                                    </button>
                                                    {!wide && on && <Detail m={m} place={place} />}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                    {wide && (
                        <div className="pc-mx-side">
                            <Detail m={current} place={place} />
                        </div>
                    )}
                </div>
            </div>
        </DemoFrame>
    );
}
