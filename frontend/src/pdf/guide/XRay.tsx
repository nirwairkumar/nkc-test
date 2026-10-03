/**
 * "PDF X-ray": one line of the certificate and the drawing instructions behind it,
 * in three states — the original, the same fix made by a white-box editor, and the
 * fix made by rewriting the text (what Panna does). The copy test and a search for
 * "14" show the difference a reader can't see on the page.
 */
import { useState } from 'react';
import { Copy, Search } from 'lucide-react';

type Mode = 'original' | 'whitebox' | 'rewrite';

const MODES: { id: Mode; label: string }[] = [
    { id: 'original', label: 'Original' },
    { id: 'whitebox', label: 'White-box edit' },
    { id: 'rewrite', label: 'Real edit' },
];

type Line = { code: string; note?: string; tone?: 'bad' | 'good' | 'dim' };

const BT = (text: string, tone?: Line['tone'], note?: string): Line[] => [
    { code: 'BT', note: 'begin text' },
    { code: '/F1 14 Tf', note: 'font F1 (Georgia, embedded), 14 pt' },
    { code: '1 0 0 1 171 350 Tm', note: 'start of the line on the page' },
    { code: `(${text}) Tj`, tone, note },
    { code: 'ET', note: 'end text' },
];

const STREAMS: Record<Mode, Line[]> = {
    original: BT('Olympiad held on 14 March 2026 at Pune,'),
    whitebox: [
        ...BT('Olympiad held on 14 March 2026 at Pune,', 'bad', 'the old date is still here'),
        { code: '1 g', note: 'fill colour: white', tone: 'good' },
        { code: '282 346 17 15 re f', note: 'paint a box over “14”', tone: 'good' },
        { code: 'BT', tone: 'good' },
        { code: '/F2 14 Tf', note: 'font F2: Helvetica, a different font', tone: 'good' },
        { code: '1 0 0 1 282 350 Tm', tone: 'good' },
        { code: '(15) Tj', note: 'the new digits, on top', tone: 'good' },
        { code: 'ET', tone: 'good' },
    ],
    rewrite: BT('Olympiad held on 15 March 2026 at Pune,', 'good', 'only this changed, same font'),
};

const COPY: Record<Mode, [string, string?][]> = {
    original: [['Olympiad held on 14 March 2026 at Pune,']],
    whitebox: [['Olympiad held on '], ['14', 'bad'], [' March 2026 at Pune, '], ['15', 'add']],
    rewrite: [['Olympiad held on '], ['15', 'good'], [' March 2026 at Pune,']],
};

const SEARCH: Record<Mode, string> = {
    original: '1 match',
    whitebox: '1 match, hidden under the white box',
    rewrite: 'No matches. The old date is gone.',
};

const FONTS: Record<Mode, string> = {
    original: 'F1 Georgia (embedded subset)',
    whitebox: 'F1 Georgia, F2 Helvetica',
    rewrite: 'F1 Georgia (embedded subset)',
};

export default function XRay() {
    const [mode, setMode] = useState<Mode>('whitebox');
    const [xray, setXray] = useState(false);
    const i = MODES.findIndex((m) => m.id === mode);

    return (
        <figure className="ep-widget ep-wide-md">
            <div className="ep-panel ep-xray">
                <div className="ep-panel-head">
                    <div>
                        <p className="ep-panel-title">PDF X-ray: one date, fixed two ways</p>
                        <p className="ep-panel-sub">The page looks almost the same each time. The file doesn’t.</p>
                    </div>
                    <div className="ep-seg" role="group" aria-label="Show" style={{ ['--n' as string]: 3, ['--i' as string]: i }}>
                        {MODES.map((m) => (
                            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ep-xray-grid">
                    <div className="ep-xray-col">
                        <p className="ep-xray-label">On the page</p>
                        <div className={`ep-xray-paper${xray ? ' is-xray' : ''}`}>
                            <span className="ep-xray-line">
                                Olympiad held on{' '}
                                <span className="ep-xray-date">
                                    {mode === 'rewrite' ? '15' : '14'}
                                    {mode === 'whitebox' && (
                                        <>
                                            <i className="ep-xray-box" aria-hidden="true" />
                                            <b className="ep-xray-new">15</b>
                                        </>
                                    )}
                                </span>{' '}
                                March 2026 at Pune,
                            </span>
                        </div>
                        <label className="ep-switch-row">
                            <span>
                                <b>X-ray</b>
                                <small>See through anything painted on top</small>
                            </span>
                            <button type="button" role="switch" aria-checked={xray} aria-label="X-ray" className="ep-switch" onClick={() => setXray((x) => !x)}>
                                <i />
                            </button>
                        </label>
                        <dl className="ep-xray-facts">
                            <div>
                                <dt>
                                    <Copy aria-hidden="true" /> Copy the line
                                </dt>
                                <dd className="ep-xray-copy">
                                    {COPY[mode].map(([t, tone], k) => (
                                        <span key={k} className={tone ? `is-${tone}` : undefined}>
                                            {t}
                                        </span>
                                    ))}
                                </dd>
                            </div>
                            <div>
                                <dt>
                                    <Search aria-hidden="true" /> Search for “14”
                                </dt>
                                <dd className={mode === 'whitebox' ? 'is-bad' : mode === 'rewrite' ? 'is-good' : undefined}>{SEARCH[mode]}</dd>
                            </div>
                            <div>
                                <dt>Fonts in the file</dt>
                                <dd>{FONTS[mode]}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="ep-xray-col">
                        <p className="ep-xray-label">Inside the file (the page’s content stream)</p>
                        <pre className="ep-code" aria-label="PDF content stream">
                            {STREAMS[mode].map((l, k) => (
                                <span key={`${mode}-${k}`} className={`ep-code-line${l.tone ? ` is-${l.tone}` : ''}`}>
                                    <code>{l.code}</code>
                                    {l.note && <em>% {l.note}</em>}
                                </span>
                            ))}
                        </pre>
                        <p className="ep-xray-foot">Simplified. Real files usually store letters as glyph numbers, such as &lt;002A0013&gt;, and compress the stream. The structure is the same.</p>
                    </div>
                </div>
            </div>
            <figcaption>A white-box editor adds a box and new text on top. A real edit changes the original instruction. Copy the text out and only the real edit reads correctly.</figcaption>
        </figure>
    );
}
