/**
 * hindi-unicode-check: paste a line from an old Hindi file and see whether it is
 * Unicode Hindi, text from a legacy font (Kruti Dev, DevLys, Chanakya: English
 * letters drawn as Hindi), or plain English letters, with what students would see in
 * TestoZa's exam font and what to do next. Runs entirely in the browser.
 *
 * Telling legacy-font text from English or Hindi typed in English letters: in Kruti
 * Dev the letter "k" is the ā sign (ा), the commonest mark in Hindi, so it makes up a
 * large share of the letters, while "a" (the anusvara) is rare; English and romanised
 * Hindi are the other way round. Mid-word capitals (gS for है) are another sign.
 * Good enough to say "looks like"; the advice is the same either way.
 */
import { useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { LEGACY_SAMPLES } from '@/guides/hindiData';

type Verdict = 'empty' | 'unicode' | 'legacy' | 'latin' | 'other';

const ENGLISH = new Set(['the', 'is', 'of', 'and', 'to', 'in', 'an', 'what', 'which', 'who', 'are', 'was', 'for', 'on', 'with', 'by', 'this', 'that', 'from', 'it']);

export function classify(text: string): { verdict: Verdict; deva: number; latin: number } {
    const deva = (text.match(/[ऀ-ॿ]/g) || []).length;
    const letters = text.match(/[A-Za-z]/g) || [];
    const latin = letters.length;
    if (!text.trim()) return { verdict: 'empty', deva, latin };
    if (deva > 0) return { verdict: 'unicode', deva, latin };
    if (latin === 0) return { verdict: 'other', deva, latin };
    const k = letters.filter((c) => c === 'k').length / latin;
    const a = letters.filter((c) => c === 'a' || c === 'A').length / latin;
    const midCaps = (text.match(/[a-z][A-Z]/g) || []).length;
    const english = text
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => ENGLISH.has(w)).length;
    const looksLegacy = latin >= 6 && a < 0.12 && (k >= 0.1 || (k >= 0.06 && midCaps >= 1)) && (english === 0 || k > 0.2);
    return { verdict: looksLegacy ? 'legacy' : 'latin', deva, latin };
}

const RESULT: Record<Exclude<Verdict, 'empty'>, { tone: 'green' | 'orange' | 'blue'; title: string; body: string; next: string }> = {
    unicode: {
        tone: 'green',
        title: 'Unicode Hindi',
        body: 'This is real Hindi text. It will look the same on every phone, in every browser.',
        next: 'Paste it into a TestoZa question as it is.',
    },
    legacy: {
        tone: 'orange',
        title: 'Looks like a legacy Hindi font',
        body: 'This is English letters that only looked like Hindi in a font such as Kruti Dev, DevLys or Chanakya. Students would see exactly what is shown below.',
        next: 'Before pasting, convert it with a Kruti Dev to Unicode converter and check it here again. Or skip the pasting: upload the PDF or photos of the paper, and TestoZa reads the Hindi on the page.',
    },
    latin: {
        tone: 'blue',
        title: 'English letters',
        body: 'There is no Devanagari here: it is English, or Hindi written in English letters.',
        next: 'To turn Hindi written in English letters into Devanagari, type it into a card set to हिंदी (pasted text isn’t converted).',
    },
    other: {
        tone: 'blue',
        title: 'No letters to check',
        body: 'There are no Hindi or English letters in this text.',
        next: 'Paste a line with words in it.',
    },
};

const ICON = { green: CheckCircle2, orange: TriangleAlert, blue: Info };

export default function UnicodeCheck() {
    const [text, setText] = useState<string>(LEGACY_SAMPLES[1].text);
    const { verdict, deva, latin } = useMemo(() => classify(text), [text]);
    const result = verdict === 'empty' ? null : RESULT[verdict];
    const Icon = result ? ICON[result.tone] : Info;

    return (
        <figure className="ht-widget ht-check" aria-label="Is this Unicode Hindi?">
            <div className="ht-panel">
                <div className="ht-panel-head">
                    <div>
                        <p className="ht-panel-title">Is this Unicode Hindi?</p>
                        <p className="ht-panel-sub">Paste a line from your old paper. Nothing leaves this page.</p>
                    </div>
                </div>
                <div className="ht-check-grid">
                    <div className="ht-check-in">
                        <label className="ht-mini-label" htmlFor="ht-check-text">
                            Text from your file
                        </label>
                        <textarea id="ht-check-text" className="ht-check-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} spellCheck={false} placeholder="Paste a line here" />
                        <div className="ht-chips" role="group" aria-label="Examples">
                            {LEGACY_SAMPLES.map((s) => (
                                <button key={s.label} type="button" aria-pressed={text === s.text} onClick={() => setText(s.text)}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="ht-check-out" aria-live="polite">
                        {result ? (
                            <>
                                <p className={`ht-verdict is-${result.tone}`} key={verdict}>
                                    <Icon aria-hidden="true" />
                                    {result.title}
                                </p>
                                <p className="ht-check-body">{result.body}</p>
                                <p className="ht-mini-label">In a TestoZa question, students see</p>
                                <div className="ht-check-preview ht-screen">
                                    <span className="font-medium text-slate-800">{text.trim().slice(0, 140)}</span>
                                </div>
                                <dl className="ht-check-stats">
                                    <div>
                                        <dt>Hindi letters</dt>
                                        <dd>{deva}</dd>
                                    </div>
                                    <div>
                                        <dt>English letters</dt>
                                        <dd>{latin}</dd>
                                    </div>
                                </dl>
                                <p className="ht-check-next">
                                    <b>Next:</b> {result.next}
                                </p>
                            </>
                        ) : (
                            <p className="ht-check-body">Paste a line to check it.</p>
                        )}
                    </div>
                </div>
            </div>
        </figure>
    );
}
