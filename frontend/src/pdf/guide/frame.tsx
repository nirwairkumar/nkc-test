/**
 * The frame every demo sits in: a title row with a live tip, Restart and Full
 * window, then a macOS-style window whose height is --ep-fit-h (what is left of
 * the screen under the site bar and the chapter bar). Demos scroll inside the
 * window instead of growing past the screen; Full window gives them all of it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

export function DemoFrame({
    id,
    title,
    tip,
    onRestart,
    caption,
    wide = 'ep-wide',
    children,
}: {
    id?: string;
    title: string;
    tip?: ReactNode;
    onRestart?: () => void;
    caption?: ReactNode;
    wide?: string;
    children: (full: boolean) => ReactNode;
}) {
    const [full, setFull] = useState(false);

    useEffect(() => {
        if (!full) return;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('textarea, input')) setFull(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [full]);

    return (
        <figure id={id} className={`ep-widget ep-demo ${wide}${full ? ' is-full' : ''}`} role={full ? 'dialog' : undefined} aria-modal={full || undefined} aria-label={full ? title : undefined}>
            <div className="ep-demo-bar">
                <div className="ep-demo-head">
                    <p className="ep-demo-title">{title}</p>
                    {tip && (
                        <p className="ep-demo-tip" aria-live="polite">
                            {tip}
                        </p>
                    )}
                </div>
                <div className="ep-demo-controls">
                    {onRestart && (
                        <button type="button" className="ep-pill" onClick={onRestart} aria-label="Start again">
                            <RotateCcw aria-hidden="true" />
                            <span>Start again</span>
                        </button>
                    )}
                    <button type="button" className="ep-pill" aria-pressed={full} onClick={() => setFull((f) => !f)} aria-label={full ? 'Done' : 'Full window'}>
                        {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                        <span>{full ? 'Done' : 'Full window'}</span>
                    </button>
                </div>
            </div>
            <div className="ep-demo-body">{children(full)}</div>
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}

/** A Safari window around a product replica. */
export function MacWindow({ url, children, className = '' }: { url: string; children: ReactNode; className?: string }) {
    return (
        <div className={`ep-window ${className}`}>
            <div className="ep-window-bar" aria-hidden="true">
                <span className="ep-lights">
                    <i />
                    <i />
                    <i />
                </span>
                <span className="ep-url">
                    <Lock />
                    {url}
                </span>
            </div>
            <div className="ep-window-body">{children}</div>
        </div>
    );
}
