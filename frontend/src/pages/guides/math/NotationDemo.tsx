/**
 * math-notation: the LaTeX a teacher can type between dollar signs, in three groups of
 * six (Basics, Algebra and trigonometry, Calculus and matrices) so a group fits the
 * window. Each row: what you want, the code with a Copy button (copies it with its $
 * signs, ready to paste into a question box), and the formula drawn as the exam screen
 * draws it (tex.tsx).
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { NOTATION, NOTATION_GROUPS } from '@/guides/mathData';
import { DemoFrame } from './replica';
import { Tex } from './tex';

type Group = (typeof NOTATION_GROUPS)[number];
const SHORT: Record<Group, string> = { Basics: 'Basics', 'Algebra and trigonometry': 'Algebra & trig', 'Calculus and matrices': 'Calculus & matrices' };

export default function NotationDemo() {
    const [group, setGroup] = useState<Group>('Basics');
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
            title="LaTeX to type between $ signs"
            tip={copied ? <span key="c">Copied with its $ signs. Paste it into any question box or option.</span> : <span key="t">Pick a group. Copy puts a line on your clipboard, dollar signs included.</span>}
            onRestart={() => setGroup('Basics')}
            wide="md"
            caption="Each formula is drawn the way TestoZa’s exam screen draws it."
        >
            <div className="mt-nt">
                <div className="mt-seg mt-seg--full" style={{ ['--n' as string]: NOTATION_GROUPS.length, ['--i' as string]: NOTATION_GROUPS.indexOf(group) }} role="tablist" aria-label="Group">
                    {NOTATION_GROUPS.map((g) => (
                        <button key={g} type="button" role="tab" aria-selected={group === g} aria-pressed={group === g} onClick={() => setGroup(g)}>
                            {SHORT[g]}
                        </button>
                    ))}
                </div>
                <ul className="mt-nt-list" key={group}>
                    {rows.map((r) => (
                        <li key={r.want} className="mt-rise">
                            <div className="mt-nt-head">
                                <b>{r.want}</b>
                                <button type="button" className="mt-nt-copy" onClick={() => copy(r.type)} aria-label={`Copy the code for ${r.want.toLowerCase()}`}>
                                    {copied === r.type ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                    <span>{copied === r.type ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                            <code className="mt-nt-code">${r.type}$</code>
                            <div className="mt-nt-see" aria-label={`Students see: ${r.plain}`}>
                                <Tex tex={r.type} plain={r.plain} />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </DemoFrame>
    );
}
