/**
 * The hero card the four "alternative" guides share: what stays with the other product
 * and what only needs a test platform, as two iOS grouped lists.
 *
 * These pages are for reading, so the hero carries the argument instead of a device shot:
 * it is the page's thesis in twelve lines, it is the same height on every screen, and it
 * never pushes the headline off the first screen the way a phone mock-up does. Rows arrive
 * once when the card first appears; after that nothing moves.
 */
import { ArrowDown, Check } from 'lucide-react';
import type { AltRival } from '@/guides/altData';
import AltIcon from './AltIcon';

export default function AltHero({ rival }: { rival: AltRival }) {
    const { swap } = rival;
    return (
        <div className="al-swap-card">
            <div className="al-swap-head">
                <h2>Which half of this is your problem?</h2>
                <span>{rival.name}</span>
            </div>

            <div className="al-swap-group" data-side="them">
                <p>
                    <AltIcon name="lock" /> {swap.keepLabel}
                </p>
                <ul className="al-swap-list">
                    {swap.keep.map((row, i) => (
                        <li key={row.label} style={{ ['--i' as string]: i }}>
                            <AltIcon name={row.icon} strokeWidth={2} />
                            {row.label}
                        </li>
                    ))}
                </ul>
            </div>

            <p className="al-swap-arrow" aria-hidden="true">
                <ArrowDown />
            </p>

            <div className="al-swap-group" data-side="us">
                <p>
                    <AltIcon name="sparkles" /> {swap.moveLabel}
                </p>
                <ul className="al-swap-list">
                    {swap.move.map((row, i) => (
                        <li key={row.label} style={{ ['--i' as string]: i + swap.keep.length }}>
                            <AltIcon name={row.icon} strokeWidth={2} />
                            {row.label}
                        </li>
                    ))}
                </ul>
            </div>

            <p className="al-swap-foot">
                <Check aria-hidden="true" />
                {swap.foot}
            </p>
        </div>
    );
}
