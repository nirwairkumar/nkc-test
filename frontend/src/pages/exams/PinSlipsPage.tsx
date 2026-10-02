import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Copy, KeyRound, Printer, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { NewPin, joinUrl } from '@/lib/examSessionsApi';

/**
 * /batches/:id/slips — cut-out PIN slips, 3 across on A4. The PINs exist only in the
 * page state that made them (the server keeps a scrambled copy), so this page can't be
 * reopened later: a lost slip means a new PIN.
 */
export default function PinSlipsPage() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const state = (useLocation().state || {}) as { pins?: NewPin[]; batchName?: string };
    const pins = state.pins || [];
    const site = joinUrl().replace(/^https?:\/\//, '');

    useEffect(() => {
        // Warn before the PINs are lost by closing the tab.
        if (!pins.length) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [pins.length]);

    const copyAll = async () => {
        const text = pins.map(p => `${p.roll_no}\t${p.full_name}\t${p.pin}`).join('\n');
        try {
            await navigator.clipboard.writeText(`Roll\tName\tPIN\n${text}`);
            toast.success('Copied — paste into Excel to keep a copy');
        } catch {
            toast.error('Could not copy');
        }
    };

    if (!pins.length) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
                <KeyRound className="h-8 w-8 text-slate-400" />
                <h1 className="mt-3 text-[20px] font-semibold text-slate-900">PINs are shown only once</h1>
                <p className="mt-1.5 text-[15px] text-slate-600">For safety TestoZa never stores PINs in readable form. Make new PINs on the batch page to print slips again.</p>
                <button type="button" onClick={() => navigate(`/batches/${id}`)} className="mt-5 text-[15px] font-semibold text-sky-700 hover:underline cursor-pointer">Back to the batch</button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-100 print:bg-white">
            <Helmet><title>{`PIN slips · ${state.batchName || 'Batch'}`}</title></Helmet>
            <style>{'@page { size: A4; margin: 10mm; }'}</style>

            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
                <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <button type="button" onClick={() => navigate(`/batches/${id}`)} className="-ml-2 inline-flex h-9 items-center rounded-full pr-3 text-[15px] font-medium text-sky-700 hover:bg-sky-50 cursor-pointer">
                        <ChevronLeft className="h-5 w-5" /> Batch
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={copyAll} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-[14px] font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer">
                            <Copy className="h-4 w-4 text-sky-600" /> Copy list
                        </button>
                        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-white hover:bg-[hsl(200,95%,30%)] cursor-pointer">
                            <Printer className="h-4 w-4" /> Print {pins.length} slip{pins.length === 1 ? '' : 's'}
                        </button>
                    </div>
                </div>
                <p className="mx-auto max-w-[860px] px-4 pb-3 text-[13px] text-amber-800">
                    Print or copy these now. Once you leave this page the PINs can't be shown again.
                </p>
            </div>

            <div className="mx-auto grid max-w-[860px] grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3 print:max-w-none print:grid-cols-3 print:gap-0 print:p-0">
                {pins.map(p => (
                    <div key={p.id} className="relative break-inside-avoid rounded-xl border border-dashed border-slate-300 bg-white p-4 print:rounded-none">
                        <Scissors className="absolute -left-2 -top-2 h-4 w-4 rotate-90 text-slate-300 print:hidden" />
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{state.batchName || 'Exam PIN'}</p>
                        <p className="mt-1 truncate text-[15px] font-semibold text-slate-900">{p.full_name}</p>
                        <p className="text-[13px] text-slate-600">Roll {p.roll_no}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">PIN</p>
                        <p className="text-[30px] font-bold leading-none tracking-[0.25em] text-slate-900 tabular-nums">{p.pin}</p>
                        <p className="mt-3 text-[11px] leading-snug text-slate-500">At exam time: open <span className="font-semibold text-slate-700">{site}</span>, type the code from your teacher, then your roll number and this PIN. Keep it secret.</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
