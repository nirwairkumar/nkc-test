/**
 * hindi-ai-language: TestoZa's AI import with two sources and the Language Output
 * setting. The settings card copies AITestImporter.tsx's "AI Settings & Constraints"
 * (light classes only: replicas stay light); the result is the review screen
 * (components/ai-import/PreviewView.tsx) with the product's own stylesheet
 * (aiImport.css, .aix-*). Language buttons behave as in the product: Same as Material
 * on its own, English and Hindi together for a bilingual paper, written in the order
 * selected (pdf_vision_pipeline.build_prompt asks for "Language 1 text followed by
 * Language 2 text").
 *
 * A replay: the questions are written for this page (the example paper in
 * src/guides/hindiData.ts), shown after a short processing shimmer.
 *
 * Size: wide screens put the controls (320 px) beside the review window at
 * --ht-fit-h; narrow screens show one pane at a time, switching to the result when a
 * setting changes.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock, CodeXml, FileText, Image as ImageIcon, Layers, ListChecks, ScanText, Sparkles } from 'lucide-react';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QUESTIONS, bilingual, type BilingualQuestion, type OptionKey } from '@/guides/hindiData';
import { BrowserWindow, DemoFrame, useReducedMotion, useWidth } from './replica';
import '@/components/ai-import/aiImport.css';

type Source = 'chapter' | 'paper';
type Lang = 'default' | 'English' | 'Hindi';

const SOURCES: Record<Source, { label: string; sub: string; native: 'en' | 'hi'; mode: 'generate' | 'extract'; questions: BilingualQuestion[]; title: { en: string; hi: string }; seconds: string; page?: number }> = {
    chapter: {
        label: 'English textbook page',
        sub: 'PDF · Generate new questions',
        native: 'en',
        mode: 'generate',
        questions: [QUESTIONS[1], QUESTIONS[2]],
        title: { en: 'Spherical Mirrors', hi: 'गोलीय दर्पण' },
        seconds: '14.2s',
    },
    paper: {
        label: 'Printed Hindi paper',
        sub: 'Photo · Extract its questions',
        native: 'hi',
        mode: 'extract',
        questions: [QUESTIONS[3], QUESTIONS[4]],
        title: { en: 'General Science: Light', hi: 'सामान्य विज्ञान: प्रकाश' },
        seconds: '9.6s',
        page: 1,
    },
};

/** The output language order for a source and a Language Output selection. */
function order(source: Source, langs: Lang[]): ('en' | 'hi')[] {
    const picked = langs.filter((l) => l !== 'default').map((l) => (l === 'English' ? 'en' : 'hi'));
    return picked.length ? picked : [SOURCES[source].native];
}

const field = (q: BilingualQuestion, part: 'text' | OptionKey, langs: ('en' | 'hi')[]) => {
    const one = (l: 'en' | 'hi') => (part === 'text' ? q[l].text : q[l].options[part]);
    return langs.length > 1 ? bilingual(one(langs[0]), one(langs[1])) : one(langs[0]);
};

function Lines({ text }: { text: string }) {
    return (
        <>
            {text.split('\n').map((p, i) => (
                <span key={i} style={{ display: 'block' }}>
                    {p}
                </span>
            ))}
        </>
    );
}

/** The source, drawn small: a textbook page or a photographed Hindi paper. */
function Thumb({ source }: { source: Source }) {
    if (source === 'chapter') {
        return (
            <span className="ht-thumb ht-thumb--page" aria-hidden="true">
                <b>9.2 Spherical Mirrors</b>
                <span>The radius of curvature is twice the focal length: R = 2f.</span>
                <span>A convex mirror always forms a virtual, erect and diminished image.</span>
            </span>
        );
    }
    return (
        <span className="ht-thumb ht-thumb--photo" aria-hidden="true" lang="hi">
            <b>प्रश्न 4. लेंस की क्षमता का SI मात्रक क्या है?</b>
            <span>(क) डाइऑप्टर (ख) मीटर (ग) वाट (घ) जूल</span>
            <span className="ht-thumb-ans">उत्तर: (क)</span>
        </span>
    );
}

export default function AiLanguageDemo() {
    const bodyRef = useRef<HTMLDivElement>(null);
    const width = useWidth(bodyRef);
    const wide = width >= 900;
    const reduced = useReducedMotion();
    const [source, setSource] = useState<Source>('chapter');
    const [langs, setLangs] = useState<Lang[]>(['default']);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Tough'>('Tough');
    const [busy, setBusy] = useState(false);
    const [pane, setPane] = useState<'settings' | 'result'>('settings');
    const timer = useRef<number>();

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const rerun = () => {
        window.clearTimeout(timer.current);
        if (reduced) return;
        setBusy(true);
        timer.current = window.setTimeout(() => setBusy(false), 650);
    };

    // AITestImporter.handleLanguageToggle
    const toggle = (lang: Lang) => {
        if (lang === 'default') setLangs(['default']);
        else
            setLangs((prev) => {
                const withoutDefault = prev.filter((l) => l !== 'default');
                if (withoutDefault.includes(lang)) {
                    const next = withoutDefault.filter((l) => l !== lang);
                    return next.length === 0 ? ['default'] : next;
                }
                return [...withoutDefault, lang];
            });
        rerun();
        if (!wide) setPane('result');
    };

    const pickSource = (s: Source) => {
        setSource(s);
        rerun();
        if (!wide) setPane('result');
    };

    const restart = () => {
        setSource('chapter');
        setLangs(['default']);
        setDifficulty('Tough');
        setPane('settings');
        setBusy(false);
    };

    const src = SOURCES[source];
    const out = order(source, langs);
    const generated = src.mode === 'generate';
    const title = out.length > 1 ? `${src.title[out[0]]} / ${src.title[out[1]]}` : src.title[out[0]];
    const bilingualOn = langs.length > 1;
    const langBtn = (on: boolean) => `px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${on ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

    const tip =
        source === 'paper' ? (
            out.length > 1 ? (
                <span key="pb">Kept, and written in both languages: {out[0] === 'hi' ? 'Hindi first, then English' : 'English first, then Hindi'}.</span>
            ) : out[0] === 'en' ? (
                <span key="pe">The Hindi paper, translated into English. (क) to (घ) became A to D.</span>
            ) : (
                <span key="ph">Kept in Hindi. (क) to (घ) became A to D; the printed उत्तर set the answer.</span>
            )
        ) : out.length > 1 ? (
            <span key="cb">Every question and option in both languages, in the order you picked them.</span>
        ) : out[0] === 'hi' ? (
            <span key="ch">An English page, Hindi-medium questions. Check the terms against your textbook.</span>
        ) : (
            <span key="ce">Same as Material: an English page gives English questions. Now choose Hindi.</span>
        );

    const settings = (
        <div className="ht-ai-controls">
            <p className="ht-mini-label">Your file</p>
            <div className="ht-ai-sources" role="radiogroup" aria-label="Your file">
                {(Object.keys(SOURCES) as Source[]).map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={source === s} className="ht-ai-source" onClick={() => pickSource(s)}>
                        <Thumb source={s} />
                        <span className="ht-ai-source-text">
                            <b>
                                {s === 'chapter' ? <FileText aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
                                {SOURCES[s].label}
                            </b>
                            <small>{SOURCES[s].sub}</small>
                        </span>
                    </button>
                ))}
            </div>

            <div className="ht-screen ht-ai-card">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Settings &amp; Constraints</p>
                        </div>
                        <span className="text-[10px] text-slate-400">Customizable</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-650 flex items-center gap-1.5">
                                <span>🌐 Language Output</span>
                                {bilingualOn && <span className={cn(badgeVariants(), 'text-[9px] h-4 px-1.5 bg-indigo-500 text-white font-medium')}>Bilingual</span>}
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button type="button" onClick={() => toggle('default')} className={langBtn(langs.includes('default'))} aria-pressed={langs.includes('default')}>
                                    Same as Material
                                </button>
                                <button type="button" onClick={() => toggle('English')} className={langBtn(langs.includes('English'))} aria-pressed={langs.includes('English')}>
                                    English
                                </button>
                                <button type="button" onClick={() => toggle('Hindi')} className={cn(langBtn(langs.includes('Hindi')), langs.includes('default') && 'ht-nudge-ring')} aria-pressed={langs.includes('Hindi')}>
                                    Hindi
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">Select multiple (e.g. English + Hindi) for bilingual questions.</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                                <label className="text-xs font-semibold text-slate-650">🎯 Target Difficulty</label>
                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/50">For generating questions only</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {(['Easy', 'Moderate', 'Tough'] as const).map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setDifficulty(lvl)}
                                        aria-pressed={difficulty === lvl}
                                        className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                                            difficulty === lvl
                                                ? lvl === 'Easy'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : lvl === 'Moderate'
                                                      ? 'bg-amber-600 text-white shadow-sm'
                                                      : 'bg-rose-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {lvl === 'Easy' ? '🟢 Easy' : lvl === 'Moderate' ? '🟡 Moderate' : '🔴 Tough'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const result = (
        <BrowserWindow url="app.testoza.com/generate-with-ai" phone={width < 560} className="ht-ai-window">
            <div className="ht-scroll">
                <div className="ht-screen aix aix-page ht-aix">
                    <div className="aix-rv">
                        <header className="aix-hero">
                            <div className="aix-eyebrow">
                                {generated ? (
                                    <span className="aix-chip aix-chip--purple">
                                        <Sparkles />
                                        Generated with AI
                                    </span>
                                ) : (
                                    <span className="aix-chip aix-chip--blue">
                                        <ScanText />
                                        Extracted from your file
                                    </span>
                                )}
                                <span>Review, then save or fine-tune in the editor.</span>
                            </div>
                            {/* The product's <h1>, as a plain element inside the guide (.ht-aix-title copies its style). */}
                            <p className="ht-aix-title" lang={out[0] === 'hi' ? 'hi' : undefined}>
                                {title}
                            </p>
                            <div className="aix-widgets">
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon" aria-hidden="true">
                                        <ListChecks />
                                    </span>
                                    <div>
                                        <b>{src.questions.length}</b>
                                        <span>Questions</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--green" aria-hidden="true">
                                        <CheckCircle2 />
                                    </span>
                                    <div>
                                        <b>
                                            {src.questions.length}/{src.questions.length}
                                        </b>
                                        <span>Answers set</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--indigo" aria-hidden="true">
                                        <Layers />
                                    </span>
                                    <div>
                                        <b>Single choice</b>
                                        <span>{src.questions.length} single choice</span>
                                    </div>
                                </div>
                                <div className="aix-card aix-widget">
                                    <span className="aix-widget-icon aix-widget-icon--purple" aria-hidden="true">
                                        <Clock />
                                    </span>
                                    <div>
                                        <b>{src.seconds}</b>
                                        <span>Processing time</span>
                                    </div>
                                </div>
                            </div>
                        </header>
                        <div className="aix-qlist">
                            {src.questions.map((q, i) =>
                                busy ? (
                                    <article key={`s${i}`} className="aix-card aix-qc ht-shimmer" aria-hidden="true">
                                        <i style={{ width: '38%' }} />
                                        <i />
                                        <i style={{ width: '82%' }} />
                                        <i style={{ width: '64%' }} />
                                    </article>
                                ) : (
                                    <article key={`${source}-${out.join('')}-${i}`} className="aix-card aix-qc ht-rise">
                                        <header className="aix-qc-head">
                                            <span className="aix-num">
                                                <span className="aix-sr">Question </span>
                                                {i + 1}
                                            </span>
                                            <span className="aix-chip">Single choice</span>
                                            {src.page ? <span className="aix-chip">Page {src.page}</span> : null}
                                            <div className="aix-qc-tools">
                                                <span className="aix-iconbtn" aria-hidden="true">
                                                    <CodeXml />
                                                    <span>Raw</span>
                                                </span>
                                            </div>
                                        </header>
                                        <div className="aix-qtext aix-tex">
                                            <div className="latex-renderer-container font-medium text-slate-800" lang="hi">
                                                <Lines text={field(q, 'text', out)} />
                                            </div>
                                        </div>
                                        <div className="aix-opts" role="list">
                                            {(Object.keys(q.hi.options) as OptionKey[]).map((key) => {
                                                const correct = key === q.answer;
                                                return (
                                                    <div key={key} role="listitem" className={`aix-opt ${correct ? 'is-correct' : ''}`}>
                                                        <span className="aix-opt-key">{key}</span>
                                                        <div className="aix-opt-body">
                                                            <span className="aix-tex">
                                                                <span className="latex-renderer-container font-medium text-slate-800" lang="hi">
                                                                    <Lines text={field(q, key, out)} />
                                                                </span>
                                                            </span>
                                                        </div>
                                                        {correct && (
                                                            <span className="aix-opt-seal">
                                                                <Check />
                                                                <span className="aix-sr">Correct answer</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BrowserWindow>
    );

    return (
        <DemoFrame id="language-demo" title="Hindi, English or both" tip={tip} onRestart={restart} wide="lg" caption="A replay of TestoZa’s AI import with questions written for this page. The settings card and the review screen are the product’s own.">
            <div ref={bodyRef} className={`ht-ai${wide ? ' is-wide' : ''}`}>
                {!wide && (
                    <div className="ht-seg ht-seg--full" style={{ ['--n' as string]: 2, ['--i' as string]: pane === 'settings' ? 0 : 1 }} role="group" aria-label="Show">
                        <button type="button" aria-pressed={pane === 'settings'} onClick={() => setPane('settings')}>
                            File and language
                        </button>
                        <button type="button" aria-pressed={pane === 'result'} onClick={() => setPane('result')}>
                            Result
                        </button>
                    </div>
                )}
                {(wide || pane === 'settings') && settings}
                {(wide || pane === 'result') && result}
            </div>
        </DemoFrame>
    );
}
