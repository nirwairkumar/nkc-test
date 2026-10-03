/**
 * "PDF check-up": the reader picks what they see in their PDF and gets the method
 * that works for that kind of file. Advice matches Panna as built (no OCR, no
 * form-filling mode, Kruti Dev can't be edited in place).
 */
import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Binary, Check, ChevronRight, ClipboardList, Languages, Lock, ScanLine, TextCursorInput } from 'lucide-react';
import { PANNA } from '../brand';

interface Kind {
    id: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
    symptom: string;
    name: string;
    verdict: string;
    steps: string[];
    link: { to: string; label: string };
}

const KINDS: Kind[] = [
    {
        id: 'text',
        icon: TextCursorInput,
        tone: 'green',
        symptom: 'I can select words with my mouse or finger',
        name: 'A digital PDF with real text',
        verdict: 'The easy case. Edit the text in place and it keeps its font.',
        steps: ['Open it in the PDF editor and click the line.', 'Type your change; press Enter (Ctrl+Enter in a paragraph).', 'Use Find to change the same word everywhere at once.'],
        link: { to: PANNA.routes.editor, label: 'Edit the text' },
    },
    {
        id: 'scan',
        icon: ScanLine,
        tone: 'orange',
        symptom: 'Nothing selects. It looks like a photo of paper',
        name: 'A scanned PDF',
        verdict: 'There is no text to change, only a picture of it. Cover and retype.',
        steps: ['Drag White-out over the words; it takes the paper’s colour.', 'Click with Add text and type the new words on top.', 'For a whole document you need OCR, which Panna doesn’t have yet.'],
        link: { to: PANNA.routes.editor, label: 'White-out and type' },
    },
    {
        id: 'kruti',
        icon: Languages,
        tone: 'purple',
        symptom: 'Copied Hindi pastes as letters like “fgUnh”',
        name: 'Hindi in an old font (Kruti Dev, DevLys, Chanakya)',
        verdict: 'These fonts store Hindi as English letters, so editing in place gives gibberish.',
        steps: ['Erase the line you want to change.', 'Type it again with Add text in Noto Sans Devanagari.', 'The new line is real Unicode Hindi: searchable and copyable.'],
        link: { to: PANNA.routes.hindi, label: 'Edit a Hindi PDF' },
    },
    {
        id: 'garbled',
        icon: Binary,
        tone: 'indigo',
        symptom: 'Copied English pastes as symbols or nonsense',
        name: 'Text without a character map',
        verdict: 'The PDF draws letters but doesn’t record which letters they are.',
        steps: ['Editing in place depends on that map, so erase the line instead.', 'Retype it with Add text in the closest font (Times or Helvetica).', 'Check by copying a line out of the downloaded file.'],
        link: { to: PANNA.routes.editor, label: 'Erase and retype' },
    },
    {
        id: 'form',
        icon: ClipboardList,
        tone: 'teal',
        symptom: 'It has boxes or lines to fill in',
        name: 'A form',
        verdict: 'Type on the lines and sign. No conversion needed.',
        steps: ['Choose Add text and click inside each box.', 'Use Sign to draw, type or upload your signature.', 'Panna has no separate form-filling mode; Add text works on any form.'],
        link: { to: PANNA.routes.editor, label: 'Fill in and sign' },
    },
    {
        id: 'locked',
        icon: Lock,
        tone: 'red',
        symptom: 'It asks for a password',
        name: 'A password-protected PDF',
        verdict: 'You need the password to open it. Ask the sender if you don’t have it.',
        steps: ['Open it in the editor and type the password when asked.', 'It is used only in your browser and never stored.', 'The copy you download opens without a password.'],
        link: { to: PANNA.routes.editor, label: 'Open with the password' },
    },
];

export default function Triage() {
    const [pick, setPick] = useState('text');
    const k = KINDS.find((x) => x.id === pick)!;
    const Icon = k.icon;
    return (
        <figure className="ep-widget ep-wide-md">
            <div className="ep-panel">
                <div className="ep-panel-head">
                    <div>
                        <p className="ep-panel-title">PDF check-up</p>
                        <p className="ep-panel-sub">Open your PDF, try to select a word, then pick what you see.</p>
                    </div>
                </div>
                <div className="ep-triage">
                    <div className="ep-choices" role="radiogroup" aria-label="What do you see in your PDF?">
                        {KINDS.map((x) => {
                            const XIcon = x.icon;
                            return (
                                <button key={x.id} type="button" role="radio" aria-checked={pick === x.id} onClick={() => setPick(x.id)} className="ep-choice">
                                    <span className="ep-tile" data-tone={x.tone}>
                                        <XIcon />
                                    </span>
                                    <span className="ep-choice-text">{x.symptom}</span>
                                    {pick === x.id ? <Check className="ep-choice-check" aria-hidden="true" /> : <span className="ep-choice-gap" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="ep-verdict" key={k.id} aria-live="polite">
                        <span className="ep-tile ep-tile--lg" data-tone={k.tone}>
                            <Icon />
                        </span>
                        <p className="ep-verdict-kind">You have</p>
                        <p className="ep-verdict-name">{k.name}</p>
                        <p className="ep-verdict-text">{k.verdict}</p>
                        <ol className="ep-verdict-steps">
                            {k.steps.map((s) => (
                                <li key={s}>{s}</li>
                            ))}
                        </ol>
                        <Link to={k.link.to} className="ep-verdict-link">
                            {k.link.label} <ChevronRight aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </figure>
    );
}
