import { useRef, useState } from 'react';
import { FileUp, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { isPdfFile } from '../handoff';

/** Big drag-and-drop target for a PDF. */
export default function Dropzone({ onFile, busy = false, label = 'Choose PDF' }: { onFile: (f: File) => void; busy?: boolean; label?: string }) {
    const input = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);

    const take = (f: File | undefined | null) => {
        if (!f) return;
        if (!isPdfFile(f)) {
            toast.error('Please choose a PDF file');
            return;
        }
        onFile(f);
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                take(e.dataTransfer.files?.[0]);
            }}
            className={`relative flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-14 ${
                over ? 'border-emerald-500 bg-emerald-50/80' : 'border-emerald-300/70 bg-white/80'
            }`}
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-[0_12px_30px_-12px_rgba(5,150,105,0.8)]">
                <FileUp className="h-8 w-8" />
            </div>
            <p className="mt-5 text-lg font-semibold text-slate-900">Drop your PDF here</p>
            <p className="mt-1 text-sm text-slate-500">or</p>
            <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className="mt-3 inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_24px_-10px_rgba(5,150,105,0.9)] transition hover:bg-emerald-700 disabled:opacity-70"
            >
                {busy ? 'Opening…' : label}
            </button>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" /> Your file never leaves your device
            </p>
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </div>
    );
}
