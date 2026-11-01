import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ExamSession, examSessionsApi, problemOf } from '@/lib/examSessionsApi';
import { Group, IOS_PRIMARY, IosSheet, Row } from './ios';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * A second sitting of the same paper for students who missed this one. Anyone who
 * already submitted here is turned away at check-in.
 */
export default function RetestSheet({ open, onOpenChange, session }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: ExamSession;
}) {
    const navigate = useNavigate();
    const [when, setWhen] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const d = new Date(Date.now() + 24 * 3600_000);
        const start = new Date(session.opens_at);
        d.setHours(start.getHours(), start.getMinutes(), 0, 0);
        setWhen(toLocalInput(d));
        setError(null);
    }, [open, session.opens_at]);

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            const created = await examSessionsApi.retest(session.id, new Date(when).toISOString());
            onOpenChange(false);
            navigate(`/exams/${created.id}`);
        } catch (err) {
            setError(problemOf(err).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <IosSheet open={open} onOpenChange={onOpenChange} title="Re-test"
            footer={(
                <>
                    {error && <p className="mb-2 text-center text-[14px] text-red-600">{error}</p>}
                    <button type="button" className={IOS_PRIMARY} onClick={create} disabled={busy || !when}>
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create re-test'}
                    </button>
                </>
            )}
        >
            <Group footer={`Same paper and rules as "${session.name}", with a new code. Candidates who already submitted can't join it.`}>
                <Row label="Starts">
                    <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                        className="rounded-lg bg-slate-100 px-2 py-1.5 text-[15px] text-slate-900 outline-none" aria-label="Re-test start time" />
                </Row>
            </Group>
        </IosSheet>
    );
}
