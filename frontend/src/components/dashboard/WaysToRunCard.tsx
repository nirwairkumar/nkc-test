import React from 'react';
import { Panel } from './dashboardUi';

const WAYS = [
    { src: '/classroom/class-phones.webp', title: 'In class, on their phones', body: 'Phones on the desk, rough work on paper. You see who is writing from your own phone.' },
    { src: '/classroom/batch-hall.webp', title: 'A whole batch at once', body: 'Sixty candidates, one link. Each copy is checked the moment it is submitted.' },
    { src: '/classroom/computer-lab.webp', title: 'In the computer lab', body: 'Open the same link on every computer. Nothing to install.' },
    { src: '/classroom/school-lab.webp', title: 'In a school lab', body: 'Rough sheets on the desk, answers on screen. Maths and diagrams show as you typed them.' },
];

/** What a room looks like during an online exam, so the first one doesn't feel like a leap. */
export default function WaysToRunCard() {
    return (
        <Panel id="ways-heading" title="Ways to run it" note="A classroom, a hall, a lab, or at home with a start and end time">
            <ul className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto p-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-4">
                {WAYS.map(w => (
                    <li key={w.src} className="w-[78%] shrink-0 snap-start sm:w-auto">
                        <img
                            src={w.src}
                            alt=""
                            width={720}
                            height={480}
                            loading="lazy"
                            decoding="async"
                            className="aspect-[3/2] w-full rounded-xl bg-slate-100 object-cover ring-1 ring-slate-900/[0.06]"
                        />
                        <p className="mt-3 text-[14px] font-semibold text-slate-900">{w.title}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{w.body}</p>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}
