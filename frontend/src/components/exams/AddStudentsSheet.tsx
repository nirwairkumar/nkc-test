import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { batchesApi, problemOf } from '@/lib/examSessionsApi';
import { Group, IOS_PRIMARY, IosSheet, Segmented } from './ios';

type Mode = 'paste' | 'file' | 'one';
interface Parsed { roll_no: string; full_name: string; parent_phone?: string | null }

const ROLL_HEADERS = ['roll', 'roll no', 'roll no.', 'roll number', 'rollno', 'admission no', 'admission number', 'reg no', 'registration no', 'id', 'student id', 'candidate id', 'application no', 'application number'];
const NAME_HEADERS = ['name', 'student name', 'candidate name', 'applicant name', 'full name', 'student', 'candidate', 'applicant'];
const PHONE_HEADERS = ['phone', 'mobile', 'parent phone', 'parent mobile', 'whatsapp', 'contact', 'contact no', 'phone number', 'mobile number', "father's mobile", 'guardian phone'];

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Turn rows (first row may be headers) into students. Works for pasted Excel and for files. */
function rowsToStudents(rows: unknown[][]): { students: Parsed[]; problems: string[] } {
    const clean = rows.map(r => r.map(c => String(c ?? '').trim())).filter(r => r.some(Boolean));
    if (!clean.length) return { students: [], problems: [] };
    let rollIdx = 0, nameIdx = 1, phoneIdx = 2;
    let body = clean;
    const header = clean[0].map(norm);
    const found = (names: string[]) => header.findIndex(h => names.includes(h));
    if (found(ROLL_HEADERS) >= 0 || found(NAME_HEADERS) >= 0) {
        rollIdx = found(ROLL_HEADERS);
        nameIdx = found(NAME_HEADERS);
        phoneIdx = found(PHONE_HEADERS);
        body = clean.slice(1);
    } else if (clean[0].length >= 2 && /[a-z]{3,}/i.test(clean[0][0]) && /\d/.test(clean[0][1])) {
        // "Rahul Kumar, 23A017": name first
        rollIdx = 1;
        nameIdx = 0;
    }
    const problems: string[] = [];
    if (rollIdx < 0) problems.push('No "Roll number" column found.');
    if (nameIdx < 0) problems.push('No "Name" column found.');
    if (problems.length) return { students: [], problems };
    const students: Parsed[] = [];
    body.forEach((r, i) => {
        const roll = r[rollIdx] || '';
        const name = r[nameIdx] || '';
        if (!roll || !name) {
            problems.push(`Row ${i + 1}: needs both a roll number and a name`);
            return;
        }
        students.push({ roll_no: roll, full_name: name, parent_phone: phoneIdx >= 0 ? (r[phoneIdx] || null) : null });
    });
    return { students, problems };
}

function splitLine(line: string): string[] {
    if (line.includes('\t')) return line.split('\t');
    if (line.includes(',')) return line.split(',');
    if (line.includes(';')) return line.split(';');
    // "23A017 Rahul Kumar": first word is the roll number
    const m = line.trim().match(/^(\S+)\s+(.+)$/);
    return m ? [m[1], m[2]] : [line];
}

/** Add students to a batch: paste from Excel, upload a sheet, or type one. Adds or updates by roll number. */
export default function AddStudentsSheet({ open, onOpenChange, classId, onDone }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    onDone: () => void;
}) {
    const [mode, setMode] = useState<Mode>('paste');
    const [text, setText] = useState('');
    const [fileRows, setFileRows] = useState<unknown[][] | null>(null);
    const [fileName, setFileName] = useState('');
    const [one, setOne] = useState({ roll_no: '', full_name: '', parent_phone: '' });
    const [saving, setSaving] = useState(false);

    const parsed = useMemo(() => {
        if (mode === 'paste') return rowsToStudents(text.split(/\r?\n/).map(splitLine));
        if (mode === 'file') return fileRows ? rowsToStudents(fileRows) : { students: [], problems: [] };
        return one.roll_no.trim() && one.full_name.trim()
            ? { students: [{ ...one, parent_phone: one.parent_phone || null }], problems: [] }
            : { students: [], problems: [] };
    }, [mode, text, fileRows, one]);

    const readFile = async (file: File) => {
        setFileName(file.name);
        try {
            const XLSX = await import('xlsx');
            const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const sheet = book.Sheets[book.SheetNames[0]];
            setFileRows(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][]);
        } catch {
            toast.error('Could not read that file. Save it as .xlsx or .csv and try again.');
            setFileRows(null);
        }
    };

    const save = async () => {
        if (!parsed.students.length) return;
        setSaving(true);
        try {
            const res = await batchesApi.importStudents(classId, parsed.students);
            toast.success(`${res.added} added${res.updated ? `, ${res.updated} updated` : ''}${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}.`);
            setText('');
            setFileRows(null);
            setOne({ roll_no: '', full_name: '', parent_phone: '' });
            onDone();
            onOpenChange(false);
        } catch (err) {
            toast.error(problemOf(err).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <IosSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Add candidates"
            wide
            footer={(
                <button type="button" className={IOS_PRIMARY} disabled={!parsed.students.length || saving} onClick={save}>
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : parsed.students.length ? `Add ${parsed.students.length} candidate${parsed.students.length === 1 ? '' : 's'}` : 'Add candidates'}
                </button>
            )}
        >
            <Segmented<Mode> value={mode} onChange={setMode} ariaLabel="How to add" options={[
                { value: 'paste', label: 'Paste' },
                { value: 'file', label: 'Excel / CSV' },
                { value: 'one', label: 'One by one' },
            ]} />

            {mode === 'paste' && (
                <Group header="Paste from Excel or WhatsApp" footer="One candidate per line: roll number, name, parent's phone (optional). Copying columns from Excel works as is.">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={8}
                        placeholder={'23A017, Rahul Kumar, 9876543210\n23A018, Priya Sharma\n23A019, Aman Verma, 9123456780'}
                        className="block w-full resize-y bg-white px-4 py-3 font-mono text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none"
                        aria-label="Candidates"
                    />
                </Group>
            )}

            {mode === 'file' && (
                <Group header="Upload a sheet" footer='Columns named "Roll No", "Name" and "Parent Phone" are picked up automatically. Only the first sheet is read.'>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-slate-50">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[17px] text-slate-900">{fileName || 'Choose a file'}</span>
                            <span className="block text-[13px] text-slate-500">.xlsx, .xls or .csv</span>
                        </span>
                        <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
                    </label>
                </Group>
            )}

            {mode === 'one' && (
                <Group header="Candidate">
                    {([['roll_no', 'Roll number'], ['full_name', 'Full name'], ['parent_phone', "Parent's phone (optional)"]] as const).map(([key, label]) => (
                        <div key={key} className="px-4 py-2">
                            <input
                                value={one[key]}
                                onChange={(e) => setOne(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder={label}
                                inputMode={key === 'parent_phone' ? 'tel' : undefined}
                                className="h-10 w-full bg-transparent text-[17px] text-slate-900 placeholder:text-slate-400 outline-none"
                                aria-label={label}
                            />
                        </div>
                    ))}
                </Group>
            )}

            {(parsed.students.length > 0 || parsed.problems.length > 0) && mode !== 'one' && (
                <Group header={`Preview · ${parsed.students.length} candidate${parsed.students.length === 1 ? '' : 's'}`}
                    footer={parsed.problems.length ? `${parsed.problems.slice(0, 3).join('. ')}${parsed.problems.length > 3 ? ` (+${parsed.problems.length - 3} more)` : ''}.` : 'Existing roll numbers are updated, not duplicated.'}>
                    {parsed.students.slice(0, 6).map((s, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-[15px]">
                            <span className="w-24 shrink-0 truncate font-medium tabular-nums text-slate-500">{s.roll_no}</span>
                            <span className="min-w-0 flex-1 truncate text-slate-900">{s.full_name}</span>
                            {s.parent_phone && <span className="shrink-0 text-[13px] text-slate-500">{s.parent_phone}</span>}
                        </div>
                    ))}
                    {parsed.students.length > 6 && <p className="px-4 py-2.5 text-[13px] text-slate-500">and {parsed.students.length - 6} more</p>}
                </Group>
            )}
        </IosSheet>
    );
}
