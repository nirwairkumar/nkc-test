/**
 * The six widgets the "how to" guides share. Each is driven by the page's HowtoPage
 * (src/guides/howtoData.ts) or by data exported beside it, so four pages run the same code
 * with different text:
 *
 *   hw-compare    one question at a time: the usual way, TestoZa's, and what it means   (all four)
 *   hw-steps      the job as a checklist with minutes                                    (all four)
 *   hw-scenarios  "what happens when…": three short lines per situation                  (mobile, WhatsApp)
 *   hw-embed      code for a button, card, code box or QR code that opens a test          (embed)
 *   hw-patterns   an exam's pattern and the settings that copy it                         (full-length)
 *   hw-whatsapp   the four messages the product writes, as they look in a chat           (WhatsApp)
 *
 * Crawlers get each widget's fallbackHtml from the guide file instead (howtoFallback.ts),
 * written from the same data, so the text Google reads matches what a reader sees.
 *
 * Size: reading pages, so every widget is a card no taller than a laptop window and none
 * has a scroller of its own except the code block, which is short. Nothing animates on a
 * loop, nothing opens full screen, and no type is larger than the H2 above it. Reader input
 * (the embed generator) is never put into the page as HTML: the preview is React elements,
 * and the code is escaped text.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, Copy, Info, Lightbulb, X } from 'lucide-react';
import type { GuideWidget } from '@/guides/types';
import {
    EMBED_COLORS,
    EMBED_SAMPLE,
    EMBED_STYLES,
    type EmbedStyle,
    type HowtoPage,
    PAPER_PATTERNS,
    WA_MESSAGES,
    embedCss,
    embedHtml,
    resolveEmbedLink,
    secondsEach,
} from '@/guides/howtoData';
import HwIcon from './HwIcon';

/** Copies text and says so for two seconds. Falls back to "select it" when the browser refuses. */
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
    useEffect(() => {
        if (state === 'idle') return;
        const t = window.setTimeout(() => setState('idle'), 2000);
        return () => window.clearTimeout(t);
    }, [state]);
    return (
        <button
            type="button"
            className="hw-copy"
            data-state={state}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setState('done');
                } catch {
                    setState('failed');
                }
            }}
        >
            {state === 'done' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span aria-live="polite">{state === 'done' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}</span>
        </button>
    );
}

// ── hw-compare ──────────────────────────────────────────────────────────────

function CompareWidget({ page }: { page: HowtoPage }) {
    const c = page.compare;
    const [i, setI] = useState(0);
    const theme = c.themes[i];
    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">{c.title}</p>
                        <p className="al-panel-sub">Pick what you want to know.</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="What to compare">
                    {c.themes.map((t, n) => (
                        <button key={t.id} type="button" aria-pressed={n === i} onClick={() => setI(n)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="al-wbody">
                    <p className="al-vs-q">{theme.question}</p>
                    <div className="al-vs" key={theme.id}>
                        <div className="al-vs-card">
                            <h4>
                                <X aria-hidden="true" /> {c.themLabel}
                            </h4>
                            <ul className="al-vs-list">
                                {theme.them.map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="al-vs-card al-vs-card--us" data-side="us">
                            <h4>
                                <Check aria-hidden="true" /> {c.usLabel}
                            </h4>
                            <ul className="al-vs-list">
                                {theme.us.map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <p className="al-vs-takeaway">
                        <Lightbulb aria-hidden="true" />
                        <span>
                            <b>What it means for you. </b>
                            {theme.takeaway}
                        </span>
                    </p>
                </div>
            </div>
            <figcaption>{c.caption}</figcaption>
        </figure>
    );
}

// ── hw-scenarios ────────────────────────────────────────────────────────────

/** The three lines of a situation: grey, blue, green (what happens, what you see, what to do). */
const SCENARIO_TONES = ['plain', 'blue', 'green'] as const;

function ScenariosWidget({ page }: { page: HowtoPage }) {
    const s = page.scenarios!;
    const [i, setI] = useState(0);
    const item = s.items[i];
    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">{s.title}</p>
                        <p className="al-panel-sub">{s.sub}</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="Pick a situation">
                    {s.items.map((it, n) => (
                        <button key={it.id} type="button" aria-pressed={n === i} onClick={() => setI(n)}>
                            {it.label}
                        </button>
                    ))}
                </div>
                <div className="al-wbody" aria-live="polite">
                    <p className="hw-scn-title" key={item.id}>
                        <span className="al-tile" data-tone="indigo" aria-hidden="true">
                            <HwIcon name={item.icon} strokeWidth={2.2} />
                        </span>
                        {item.title}
                    </p>
                    <ul className="hw-scn" key={`${item.id}-rows`}>
                        {item.lines.map((line, n) => (
                            <li key={s.columns[n]} data-tone={SCENARIO_TONES[n]}>
                                <b>{s.columns[n]}</b>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <figcaption>{s.caption}</figcaption>
        </figure>
    );
}

// ── hw-steps ────────────────────────────────────────────────────────────────

function StepsWidget({ page }: { page: HowtoPage }) {
    const st = page.steps;
    const [done, setDone] = useState<Record<string, boolean>>({});
    const total = st.items.length;
    const count = st.items.filter((s) => done[s.id]).length;
    const minutes = st.items.filter((s) => !done[s.id]).reduce((a, s) => a + s.minutes, 0);
    const r = 35;
    const c = 2 * Math.PI * r;

    return (
        <figure className="al-widget">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">{st.title}</p>
                        <p className="al-panel-sub">{st.sub}</p>
                    </div>
                </div>
                <div className="al-wbody">
                    <div className="al-move">
                        <ul className="al-todo">
                            {st.items.map((s) => (
                                <li key={s.id}>
                                    <button type="button" aria-pressed={!!done[s.id]} onClick={() => setDone((d) => ({ ...d, [s.id]: !d[s.id] }))}>
                                        <i>
                                            <Check aria-hidden="true" />
                                        </i>
                                        <span className="al-todo-text">
                                            <b>{s.title}</b>
                                            <span>{s.detail}</span>
                                        </span>
                                        <span className="al-todo-mins">{s.minutes} min</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="al-done">
                            <div className="al-done-ring">
                                <svg viewBox="0 0 84 84" aria-hidden="true">
                                    <circle className="bg" cx="42" cy="42" r={r} />
                                    <circle className="fg" cx="42" cy="42" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - count / total)} />
                                </svg>
                                <b>
                                    {count}/{total}
                                </b>
                            </div>
                            <p aria-live="polite">
                                {count === total ? (
                                    <>
                                        <b>Done</b>
                                        {st.doneText}
                                    </>
                                ) : (
                                    <>
                                        <b>{minutes} min left</b>
                                        {count ? 'Keep going.' : 'Start to finish.'}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <figcaption>{st.caption}</figcaption>
        </figure>
    );
}

// ── hw-embed ────────────────────────────────────────────────────────────────

/** "a:b;c-d:e" → { a: 'b', cD: 'e' }, so the preview uses the very styles the code carries. */
function cssToStyle(css: string): CSSProperties {
    const out: Record<string, string> = {};
    for (const decl of css.split(';')) {
        const at = decl.indexOf(':');
        if (at < 1) continue;
        const prop = decl.slice(0, at).trim().replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
        out[prop] = decl.slice(at + 1).trim();
    }
    return out as CSSProperties;
}

/** The QR code as SVG markup, made in the browser by the same library the exam room uses. */
function useQrSvg(href: string, on: boolean) {
    const [svg, setSvg] = useState<string | null>(null);
    useEffect(() => {
        if (!on) return;
        let cancelled = false;
        import('qrcode')
            // CommonJS package: the functions sit on `default` or on the namespace, depending on the bundler.
            .then((mod) => (mod.default ?? mod).toString(href, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d1d1f', light: '#ffffff' } }))
            .then((markup) => {
                if (!cancelled) setSvg(markup.replace('<svg ', '<svg width="180" height="180" '));
            })
            .catch(() => !cancelled && setSvg(null));
        return () => {
            cancelled = true;
        };
    }, [href, on]);
    return on ? svg : null;
}

function EmbedWidget() {
    const [raw, setRaw] = useState('');
    const [style, setStyle] = useState<EmbedStyle>('card');
    const [title, setTitle] = useState(EMBED_SAMPLE.title);
    const [facts, setFacts] = useState(EMBED_SAMPLE.facts);
    const [button, setButton] = useState(EMBED_SAMPLE.button);
    const [color, setColor] = useState<string>(EMBED_COLORS[0].hex);

    const link = resolveEmbedLink(raw, style);
    const qr = useQrSvg(link.href, style === 'qr');
    const label = button.trim() || (style === 'code' ? 'Enter my code' : EMBED_SAMPLE.button);
    const input = { style, href: link.href, title: title.trim() || EMBED_SAMPLE.title, facts: facts.trim(), button: label, color };
    const code = embedHtml(input, qr ?? undefined);
    const css = useMemo(() => {
        const c = embedCss(color);
        return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, cssToStyle(v)])) as Record<keyof typeof c, CSSProperties>;
    }, [color]);
    const hint = EMBED_STYLES.find((s) => s.id === style)!.hint;

    // Taps in the preview should not leave the guide: it is a picture of the button.
    const btn = <span style={css.button}>{label}</span>;
    let preview: ReactNode;
    if (style === 'button') preview = btn;
    else if (style === 'qr')
        preview = (
            <div style={css.figure}>
                <span className="hw-qr" style={{ display: 'inline-block', width: 180, height: 180 }}>
                    {/* Markup made by the qrcode library from the link; no reader text goes into it. */}
                    {qr ? <span dangerouslySetInnerHTML={{ __html: qr }} /> : null}
                </span>
                <div style={cssToStyle('margin-top:8px;font-size:14px;color:#424245')}>Scan to {label.toLowerCase()}</div>
            </div>
        );
    else
        preview = (
            <div style={css.card}>
                <p style={css.eyebrow}>{style === 'code' ? 'Exam today?' : 'Online test'}</p>
                <p style={css.title}>{style === 'code' ? 'Enter the code your teacher gives you' : input.title}</p>
                <p style={css.facts}>{style === 'code' ? 'Six digits, given out at the start of each exam. No app and no account needed.' : input.facts}</p>
                {btn}
            </div>
        );

    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">Code for your website</p>
                        <p className="al-panel-sub">Paste your test’s link or a join code. The code is written in your browser.</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="What to put on your page">
                    {EMBED_STYLES.map((s) => (
                        <button key={s.id} type="button" aria-pressed={s.id === style} onClick={() => setStyle(s.id)}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="hw-embed">
                    <div className="hw-form">
                        <label className="hw-field">
                            <span>{style === 'code' ? 'Join code (optional)' : 'Test link or join code'}</span>
                            <input
                                type="text"
                                inputMode="url"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder={style === 'code' ? 'testoza.com/join' : 'app.testoza.com/test/…'}
                                value={raw}
                                onChange={(e) => setRaw(e.target.value)}
                            />
                        </label>
                        <p className="hw-field-note" data-ok={link.ok ? undefined : 'no'}>
                            {link.ok ? <Check aria-hidden="true" /> : <Info aria-hidden="true" />}
                            {link.note}
                        </p>
                        {style === 'card' && (
                            <>
                                <label className="hw-field">
                                    <span>Title</span>
                                    <input type="text" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
                                </label>
                                <label className="hw-field">
                                    <span>Line under the title</span>
                                    <input type="text" value={facts} maxLength={120} onChange={(e) => setFacts(e.target.value)} />
                                </label>
                            </>
                        )}
                        <label className="hw-field">
                            <span>{style === 'qr' ? 'Words under the code' : 'Button text'}</span>
                            <input type="text" value={button} maxLength={40} onChange={(e) => setButton(e.target.value)} />
                        </label>
                        <div className="hw-swatches" role="group" aria-label="Colour">
                            {EMBED_COLORS.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    aria-label={c.label}
                                    aria-pressed={c.hex === color}
                                    style={{ ['--sw' as string]: c.hex }}
                                    onClick={() => setColor(c.hex)}
                                    disabled={style === 'qr'}
                                />
                            ))}
                            <span>{style === 'qr' ? 'QR codes stay black on white, so every camera reads them.' : hint}</span>
                        </div>
                    </div>
                    <div className="hw-out">
                        <div className="hw-preview" aria-label="Preview">
                            {preview}
                        </div>
                        <div className="hw-code">
                            <pre>
                                <code>{code}</code>
                            </pre>
                            <CopyButton text={code} label="Copy code" />
                        </div>
                    </div>
                </div>
            </div>
            <figcaption>Inline styles only: no script, no stylesheet and no plugin, so it looks the same on every website builder.</figcaption>
        </figure>
    );
}

// ── hw-patterns ─────────────────────────────────────────────────────────────

function PatternsWidget() {
    const [i, setI] = useState(0);
    const p = PAPER_PATTERNS[i];
    const questions = p.sections.reduce((a, s) => a + s.questions, 0);
    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">Exam patterns, and the settings that copy them</p>
                        <p className="al-panel-sub">Pick an exam.</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="Exam">
                    {PAPER_PATTERNS.map((pt, n) => (
                        <button key={pt.id} type="button" aria-pressed={n === i} onClick={() => setI(n)}>
                            {pt.label}
                        </button>
                    ))}
                </div>
                <div className="al-wbody" key={p.id}>
                    <p className="hw-pt-name">{p.name}</p>
                    <dl className="hw-pt-facts">
                        <div>
                            <dt>Questions</dt>
                            <dd>{questions}</dd>
                        </div>
                        <div>
                            <dt>Minutes</dt>
                            <dd>{p.minutes}</dd>
                        </div>
                        <div>
                            <dt>Marks</dt>
                            <dd>{p.marks.split(' ')[0]}</dd>
                        </div>
                        <div>
                            <dt>{p.timing === 'sections' ? 'A question, tightest section' : 'A question, on average'}</dt>
                            <dd>
                                {p.timing === 'sections'
                                    ? Math.min(...p.sections.map((s) => secondsEach(s.minutes!, s.questions)))
                                    : secondsEach(p.minutes, questions)}
                                <small>sec</small>
                            </dd>
                        </div>
                    </dl>
                    <div className="hw-pt">
                        <div>
                            <p className="al-rows-label">
                                <b>Sections</b>
                                <span>{p.timing === 'sections' ? 'Each closes on its own clock' : 'One clock for the paper'}</span>
                            </p>
                            <ul className="hw-pt-list">
                                {p.sections.map((s) => (
                                    <li key={s.name}>
                                        <span>
                                            {s.name}
                                            {s.note && <small>{s.note}</small>}
                                        </span>
                                        <b>
                                            {s.questions} Q{s.minutes ? ` · ${s.minutes} min` : ''}
                                        </b>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="al-rows-label">
                                <b>In TestoZa</b>
                                <span>The settings to copy it</span>
                            </p>
                            <ul className="hw-pt-list hw-pt-list--set">
                                {p.setup.map((r) => (
                                    <li key={r.label}>
                                        <span>{r.label}</span>
                                        <b>{r.value}</b>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <p className="al-vs-takeaway">
                        <Lightbulb aria-hidden="true" />
                        <span>
                            <b>Marking. </b>
                            {p.marking}. {p.lesson}
                        </span>
                    </p>
                </div>
            </div>
            <figcaption>Patterns as published for 2026, except JEE Advanced, whose paper is announced on the day: the 2024 Paper 1 is shown as an example.</figcaption>
        </figure>
    );
}

// ── hw-whatsapp ─────────────────────────────────────────────────────────────

/** One line of a WhatsApp message: *bold* in bold, links in blue. Plain text in, React out. */
function waLine(line: string): ReactNode[] {
    const out: ReactNode[] = [];
    const re = /(\*[^*\n]+\*)|(https?:\/\/\S+|testoza\.com\/join\S*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
        if (m.index > last) out.push(line.slice(last, m.index));
        if (m[1]) out.push(<b key={m.index}>{m[1].slice(1, -1)}</b>);
        else out.push(<span key={m.index} className="hw-wa-link">{m[2]}</span>);
        last = m.index + m[0].length;
    }
    if (last < line.length) out.push(line.slice(last));
    return out;
}

function WhatsAppWidget() {
    const [i, setI] = useState(0);
    const m = WA_MESSAGES[i];
    return (
        <figure className="al-widget al-wide">
            <div className="al-panel">
                <div className="al-panel-head">
                    <div>
                        <p className="al-panel-title">The four messages TestoZa writes for you</p>
                        <p className="al-panel-sub">As they arrive in the group. Pick one.</p>
                    </div>
                </div>
                <div className="al-chips" role="group" aria-label="Message">
                    {WA_MESSAGES.map((msg, n) => (
                        <button key={msg.id} type="button" aria-pressed={n === i} onClick={() => setI(n)}>
                            {msg.label}
                        </button>
                    ))}
                </div>
                <div className="hw-wa">
                    <div className="hw-wa-chat" aria-label="WhatsApp message">
                        <div className="hw-wa-bubble" key={m.id}>
                            {m.card && (
                                <div className="hw-wa-card">
                                    <b>{m.card.title}</b>
                                    <span>{m.card.text}</span>
                                    <small>{m.card.host}</small>
                                </div>
                            )}
                            <p>
                                {m.text.split('\n').map((line, n) => (
                                    <span key={n} className="hw-wa-line">
                                        {line ? waLine(line) : ' '}
                                    </span>
                                ))}
                            </p>
                            <small className="hw-wa-time">
                                9:41 pm <Check aria-hidden="true" />
                                <Check aria-hidden="true" />
                            </small>
                        </div>
                    </div>
                    <div className="hw-wa-side">
                        <p className="al-rows-label">
                            <b>When to send it</b>
                        </p>
                        <p className="hw-wa-note">{m.when}.</p>
                        <p className="al-rows-label">
                            <b>Where it comes from</b>
                        </p>
                        <p className="hw-wa-note">{m.from}.</p>
                        <CopyButton text={m.text} label="Copy this message" />
                    </div>
                </div>
            </div>
            <figcaption>The product’s own text, for a made-up batch. You can edit any message in WhatsApp before sending; keep the link and the code as they are.</figcaption>
        </figure>
    );
}

export default function HowToWidget({ name, page }: { name: GuideWidget; page: HowtoPage }) {
    switch (name) {
        case 'hw-compare':
            return <CompareWidget page={page} />;
        case 'hw-scenarios':
            return page.scenarios ? <ScenariosWidget page={page} /> : null;
        case 'hw-steps':
            return <StepsWidget page={page} />;
        case 'hw-embed':
            return <EmbedWidget />;
        case 'hw-patterns':
            return <PatternsWidget />;
        case 'hw-whatsapp':
            return <WhatsAppWidget />;
        default:
            return null;
    }
}
