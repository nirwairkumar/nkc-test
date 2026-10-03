/**
 * Every common way to edit a PDF, compared on what happens to the document. The
 * chips filter for what the reader needs; rows that don't qualify fade back.
 * Facts about other software come from each maker's help pages (see GUIDE_SOURCES)
 * and stay deliberately general: plans and prices change.
 */
import { useState, type ReactNode } from 'react';
import { Check, Minus, X } from 'lucide-react';

type V = 'yes' | 'partly' | 'no' | 'na';
type Col = 'edit' | 'font' | 'free' | 'local' | 'phone';
type Cell = [V, string];

interface Row {
    name: string;
    where: string;
    cells: Record<Col, Cell>;
    us?: boolean;
}

const COLS: { id: Col; label: string; chip: string }[] = [
    { id: 'edit', label: 'Changes the original text', chip: 'Changes the original text' },
    { id: 'font', label: 'Keeps the original font', chip: 'Keeps the font' },
    { id: 'free', label: 'Price', chip: 'Free' },
    { id: 'local', label: 'Where the file goes', chip: 'File stays on my device' },
    { id: 'phone', label: 'On a phone', chip: 'Works on a phone' },
];

const ROWS: Row[] = [
    {
        name: 'Panna',
        where: 'pdf.testoza.com, in any browser',
        us: true,
        cells: {
            edit: ['yes', 'Yes, in place'],
            font: ['yes', 'Uses the embedded font and names any missing letter'],
            free: ['yes', 'Free, no sign-up, no watermark'],
            local: ['yes', 'Stays in your browser'],
            phone: ['yes', 'Android and iPhone'],
        },
    },
    {
        name: 'Adobe Acrobat',
        where: 'Standard or Pro, desktop app',
        cells: {
            edit: ['yes', 'Yes'],
            font: ['partly', 'Falls back to Minion Pro or a similar font when the original isn’t available'],
            free: ['no', 'Paid subscription'],
            local: ['yes', 'Desktop app works on your computer'],
            phone: ['partly', 'Mobile app; editing needs a paid plan'],
        },
    },
    {
        name: 'Microsoft Word',
        where: 'File › Open a PDF',
        cells: {
            edit: ['partly', 'Converts the PDF into a Word document first'],
            font: ['no', 'Layout is rebuilt; Word warns it may not look like the original'],
            free: ['partly', 'Needs Microsoft 365 or Office'],
            local: ['yes', 'On your computer'],
            phone: ['no', 'Not practical'],
        },
    },
    {
        name: 'Google Docs',
        where: 'Drive › Open with Google Docs',
        cells: {
            edit: ['partly', 'Converts with text recognition (OCR)'],
            font: ['no', 'Tables, columns and lists are often lost; files up to 2 MB'],
            free: ['yes', 'Free with a Google account'],
            local: ['no', 'Uploaded to Google Drive'],
            phone: ['partly', 'Easiest on a computer'],
        },
    },
    {
        name: 'LibreOffice Draw',
        where: 'Free desktop office suite',
        cells: {
            edit: ['yes', 'Line by line, as separate text boxes'],
            font: ['partly', 'Swaps in another font when the original isn’t installed'],
            free: ['yes', 'Free and open source'],
            local: ['yes', 'On your computer'],
            phone: ['no', 'Desktop only'],
        },
    },
    {
        name: 'Preview and Markup',
        where: 'Built into Mac, iPhone and iPad',
        cells: {
            edit: ['no', 'Adds text boxes, shapes and signatures on top'],
            font: ['na', 'Not applicable'],
            free: ['yes', 'Built in'],
            local: ['yes', 'On your device'],
            phone: ['yes', 'iPhone and iPad'],
        },
    },
    {
        name: 'Microsoft Edge',
        where: 'The browser’s PDF viewer',
        cells: {
            edit: ['no', 'Adds text, ink and highlights on top'],
            font: ['na', 'Not applicable'],
            free: ['yes', 'Built in'],
            local: ['yes', 'On your computer'],
            phone: ['no', 'Desktop viewer'],
        },
    },
    {
        name: 'Typical online editors',
        where: 'Most “free PDF editor” websites',
        cells: {
            edit: ['partly', 'Some edit text; many paint a box over it'],
            font: ['partly', 'Often retype your change in Arial or Helvetica'],
            free: ['partly', 'Daily limits, sign-up or a paid plan'],
            local: ['no', 'Uploaded, deleted after a few hours'],
            phone: ['yes', 'In the browser'],
        },
    },
];

const ICON: Record<V, ReactNode> = {
    yes: <Check aria-label="Yes" />,
    partly: <Minus aria-label="Partly" />,
    no: <X aria-label="No" />,
    na: null,
};

export default function MethodsTable() {
    const [need, setNeed] = useState<Col[]>([]);
    const fits = (r: Row) => need.every((c) => r.cells[c][0] === 'yes');
    const count = ROWS.filter(fits).length;
    return (
        <figure className="ep-widget ep-wide">
            <div className="ep-methods-head">
                <p className="ep-panel-title">What do you need?</p>
                <div className="ep-chips" role="group" aria-label="Filter the methods">
                    {COLS.map((c) => (
                        <button key={c.id} type="button" aria-pressed={need.includes(c.id)} onClick={() => setNeed((n) => (n.includes(c.id) ? n.filter((x) => x !== c.id) : [...n, c.id]))}>
                            {c.chip}
                        </button>
                    ))}
                </div>
                <p className="ep-methods-count" aria-live="polite">
                    {need.length ? `${count} of ${ROWS.length} methods fit` : `${ROWS.length} ways to edit a PDF`}
                </p>
            </div>
            <div className="ep-table-wrap">
                <table className="ep-table ep-methods">
                    <thead>
                        <tr>
                            <th scope="col">Method</th>
                            {COLS.map((c) => (
                                <th key={c.id} scope="col">
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((r) => (
                            <tr key={r.name} className={`${r.us ? 'is-us' : ''}${need.length && !fits(r) ? ' is-out' : ''}`}>
                                <th scope="row">
                                    <b>{r.name}</b>
                                    <small>{r.where}</small>
                                </th>
                                {COLS.map((c) => {
                                    const [v, note] = r.cells[c.id];
                                    return (
                                        <td key={c.id} data-label={c.label} data-v={v}>
                                            <span className="ep-mark">{ICON[v]}</span>
                                            <span>{note}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <figcaption>Checked against each maker’s help pages in October 2026. Plans change, so check before you pay for anything.</figcaption>
        </figure>
    );
}
