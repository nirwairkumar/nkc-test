import React from 'react';
import { BarChart3, FileText, Smartphone } from 'lucide-react';
import LaunchVideo, { LAUNCH_VIDEO } from '@/components/LaunchVideo';
import { CARD } from './dashboardUi';

const BEATS = [
    { icon: FileText, text: 'A question paper becomes a test' },
    { icon: Smartphone, text: 'A class writes it on their phones' },
    { icon: BarChart3, text: 'Marks and ranks arrive. No copies to check.' },
];

/** The walkthrough film, beside the main column for every educator. Only the poster loads until play. */
export default function WatchFilmCard({ className = '' }: { className?: string }) {
    return (
        <section aria-labelledby="film-heading" className={`${CARD} flex flex-col overflow-hidden ${className}`}>
            <LaunchVideo where="dashboard" label="How TestoZa works" />
            <div className="flex flex-1 flex-col px-5 py-4">
                <h2 id="film-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                    Watch a whole exam in {LAUNCH_VIDEO.duration}
                </h2>
                <ul className="mt-2.5 space-y-2">
                    {BEATS.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                            <Icon className="h-4 w-4 shrink-0 text-sky-600" />
                            {text}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
