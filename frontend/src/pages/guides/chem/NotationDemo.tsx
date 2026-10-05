/**
 * chem-notation: the mhchem and LaTeX a teacher can type between dollar signs, in three
 * groups of six (Formulas and ions, Equations, Units, nuclei and organic) so a group fits
 * the window. Each row: what you want, the code with a Copy button (copies it with its $
 * signs, ready to paste into a question box), and the result drawn as the exam screen
 * draws it (tex.tsx).
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { NOTATION, NOTATION_GROUPS } from '@/guides/chemData';
import { DemoFrame } from './replica';
import { Tex } from './tex';

type Group = (typeof NOTATION_GROUPS)[number];
const SHORT: Record<Group, string> = { 'Formulas and ions': 'Formulas & ions', Equations: 'Equations', 'Units, nuclei and organic': 'Units & organic' };
const FIRST: Group = NOTATION_GROUPS[0];

export default function NotationDemo() {
    const [group, setGroup] = useState<Group>(FIRST);
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (code: string) => {
        navigator.clipboard
            ?.writeText(`$${code}$`)
            .then(() => {
                setCopied(code);
                window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1400);
            })
            .catch(() => {});
    };

    const rows = NOTATION.filter((r) => r.group === group);
    return (
        <DemoFrame
            title="Chemistry to type between $ signs"
            tip={copied ? <span key="c">Copied with its $ signs. Paste it into any question box or option.</span> : <span key="t">Pick a group. Copy puts a line on your clipboard, dollar signs included.</span>}
            onRestart={() => setGroup(FIRST)}
            wide="md"
            caption="Each line is drawn the way TestoZa’s exam screen draws it: KaTeX with the mhchem extension."
        >
            <div className="cq-nt">
                <div className="cq-seg cq-seg--full" style={{ ['--n' as string]: NOTATION_GROUPS.length, ['--i' as string]: NOTATION_GROUPS.indexOf(group) }} role="tablist" aria-label="Group">
                    {NOTATION_GROUPS.map((g) => (
                        <button key={g} type="button" role="tab" aria-selected={group === g} aria-pressed={group === g} onClick={() => setGroup(g)}>
                            {SHORT[g]}
                        </button>
                    ))}
                </div>
                <ul className="cq-nt-list" key={group}>
                    {rows.map((r) => (
                        <li key={r.want} className="cq-rise">
                            <div className="cq-nt-head">
                                <b>{r.want}</b>
                                <button type="button" className="cq-nt-copy" onClick={() => copy(r.type)} aria-label={`Copy the code for ${r.want.toLowerCase()}`}>
                                    {copied === r.type ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                    <span>{copied === r.type ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                            <code className="cq-nt-code">${r.type}$</code>
                            <div className="cq-nt-see" aria-label={`Students see: ${r.plain}`}>
                                <Tex tex={r.type} plain={r.plain} />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </DemoFrame>
    );
}
