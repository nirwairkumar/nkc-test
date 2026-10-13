/**
 * The hero card the four "how to" guides share: the page's argument as iOS grouped lists,
 * built from the HowtoPage's `hero` data.
 *
 * These pages are for reading, so the hero carries the point of the page instead of a
 * device shot: it is the same height on every screen and never pushes the headline off
 * the first screen. It reuses the alternative guides' card styles (.al-swap-*). Rows arrive
 * once when the card first appears; after that nothing moves.
 */
import { ArrowDown, Check } from 'lucide-react';
import type { HowtoPage } from '@/guides/howtoData';
import HwIcon from './HwIcon';

export default function HowToHero({ page }: { page: HowtoPage }) {
    const { hero } = page;
    let n = 0;
    return (
        <div className="al-swap-card">
            <div className="al-swap-head">
                <h2>{hero.title}</h2>
                <span>{hero.tag}</span>
            </div>

            {hero.groups.map((group, g) => (
                <div key={group.label}>
                    {g > 0 && (
                        <p className="al-swap-arrow" aria-hidden="true">
                            <ArrowDown />
                        </p>
                    )}
                    <div className="al-swap-group" data-side={group.us ? 'us' : undefined}>
                        <p>
                            <HwIcon name={group.icon} /> {group.label}
                        </p>
                        <ul className="al-swap-list">
                            {group.rows.map((row) => (
                                <li key={row.label} style={{ ['--i' as string]: n++ }}>
                                    <HwIcon name={row.icon} strokeWidth={2} />
                                    {row.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}

            <p className="al-swap-foot">
                <Check aria-hidden="true" />
                {hero.foot}
            </p>
        </div>
    );
}
