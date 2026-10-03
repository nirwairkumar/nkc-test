/**
 * Why Hindi breaks in many PDF editors: the same words drawn with text shaping
 * (matras reordered, conjuncts joined, reph placed) and without it (each stored
 * character drawn on its own, as an editor that skips shaping would), plus the
 * Unicode characters the file actually stores.
 */
import { useMemo, useState } from 'react';

const SAMPLES = ['प्रमाण पत्र', 'विद्यार्थी', 'क्षेत्र', 'धर्म', 'श्रीमती', 'हिन्दी'];

const NOTES: [RegExp, string][] = [
    [/ि/, 'The ि matra is stored after its consonant but drawn before it.'],
    [/्(?=[क-ह])/, 'The halant ् joins two consonants into one shape, such as क्ष, त्र or द्य.'],
    [/र्(?=[क-ह])/, 'र् before a consonant becomes the small hook (reph) on top, as in धर्म.'],
];

const hex = (ch: string) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;

export default function HindiShaping() {
    const [text, setText] = useState(SAMPLES[1]);
    const chars = useMemo(() => Array.from(text.trim()).slice(0, 24), [text]);
    const notes = NOTES.filter(([re]) => re.test(text)).map(([, n]) => n);

    return (
        <figure className="ep-widget ep-wide-md">
            <div className="ep-panel">
                <div className="ep-panel-head">
                    <div>
                        <p className="ep-panel-title">Hindi with and without shaping</p>
                        <p className="ep-panel-sub">Pick a word or type your own (Gboard, or the Windows Hindi keyboard).</p>
                    </div>
                </div>
                <div className="ep-chips" role="group" aria-label="Sample words">
                    {SAMPLES.map((w) => (
                        <button key={w} type="button" lang="hi" aria-pressed={text === w} onClick={() => setText(w)}>
                            {w}
                        </button>
                    ))}
                </div>
                <input className="ep-input" lang="hi" value={text} onChange={(e) => setText(e.target.value)} aria-label="Hindi text" placeholder="हिंदी में लिखें" maxLength={40} />

                <div className="ep-shape-grid">
                    <div className="ep-shape-card is-good">
                        <p className="ep-shape-label">Shaped, as Panna writes it</p>
                        <p className="ep-deva" lang="hi">
                            {text || ' '}
                        </p>
                    </div>
                    <div className="ep-shape-card is-bad">
                        <p className="ep-shape-label">Without shaping</p>
                        <p className="ep-deva" lang="hi" aria-label="The same characters drawn one by one">
                            {chars.map((c, i) => (
                                <span key={i} className="ep-deva-iso">
                                    {c === ' ' ? ' ' : c}
                                </span>
                            ))}
                        </p>
                    </div>
                </div>

                <p className="ep-shape-label ep-shape-label--stored">What the file stores</p>
                <ol className="ep-codepoints" lang="hi">
                    {chars.map((c, i) =>
                        c === ' ' ? null : (
                            <li key={i}>
                                <span className="ep-deva-iso">{c}</span>
                                <small>{hex(c)}</small>
                            </li>
                        ),
                    )}
                </ol>
                {notes.length > 0 && (
                    <ul className="ep-shape-notes">
                        {notes.map((n) => (
                            <li key={n}>{n}</li>
                        ))}
                    </ul>
                )}
            </div>
            <figcaption>Shaping turns stored characters into the shapes Hindi readers expect. Panna shapes new Hindi with Noto Sans Devanagari’s rules and keeps the real characters, so the text stays searchable.</figcaption>
        </figure>
    );
}
