import React from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound } from 'lucide-react';
import { formatCode, joinUrl } from '@/lib/examSessionsApi';

/**
 * The second way into a live exam: under the exam link, "go to testoza.com/join and enter
 * 482 913". Shown once the teacher picks "Get a join code" from the exam's ••• menu.
 */
export default function JoinCodeLine({ code }: { code: string }) {
    const site = joinUrl().replace(/^https?:\/\//, '');
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Code copied');
        } catch {
            toast.error('Could not copy');
        }
    };
    return (
        <>
            <p className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
                Or tell candidates: go to <span className="font-semibold text-slate-700">{site}</span> and enter
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pl-3">
                <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 select-all text-[20px] font-bold tracking-[0.12em] text-slate-900 tabular-nums">
                    {formatCode(code)}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-sky-700 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 motion-safe:active:scale-[0.97] cursor-pointer"
                >
                    <Copy className="h-3.5 w-3.5" /> Copy
                </button>
            </div>
        </>
    );
}
