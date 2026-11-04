/**
 * Tiny toast. Written here instead of a library because the common ones inject a <style>
 * tag, which this app's CSP (style-src 'self') blocks.
 */
import { CheckCircle2, XCircle } from 'lucide-react';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { cx } from './ui';

type Toast = { id: number; kind: 'ok' | 'error'; text: string };
type Show = (text: string, kind?: Toast['kind']) => void;

const ToastContext = createContext<Show>(() => undefined);

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<Toast[]>([]);
    const seq = useRef(0);
    const show = useCallback<Show>((text, kind = 'ok') => {
        const id = ++seq.current;
        setItems((list) => [...list.slice(-2), { id, kind, text }]);
        window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
                {items.map((t) => (
                    <div
                        key={t.id}
                        className={cx(
                            'pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-[14px] font-medium shadow-lg',
                            t.kind === 'ok' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white',
                        )}
                        role={t.kind === 'error' ? 'alert' : 'status'}
                    >
                        {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
