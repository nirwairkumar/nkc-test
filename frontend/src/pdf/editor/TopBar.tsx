import { Download, Loader2, Maximize2, PanelLeft, Redo2, Search, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import PannaLogo from '../ui/PannaLogo';
import { useEditor } from './EditorContext';

export default function TopBar({
    fileName,
    onFileName,
    zoom,
    onDownload,
    exporting,
    onToggleFind,
    onTogglePanel,
    panelOpen,
}: {
    fileName: string;
    onFileName: (n: string) => void;
    zoom: number;
    onDownload: () => void;
    exporting: boolean;
    onToggleFind: () => void;
    onTogglePanel: () => void;
    panelOpen: boolean;
}) {
    const { state, dispatch } = useEditor();
    const btn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent';
    const changes = state.edits.length + (state.past.length && !state.edits.length ? 1 : 0);
    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:px-3">
            <PannaLogo compact />
            <button type="button" className={`${btn} hidden md:inline-flex`} onClick={onTogglePanel} aria-label={panelOpen ? 'Hide pages' : 'Show pages'} aria-pressed={panelOpen} title="Pages">
                <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                    value={fileName}
                    onChange={(e) => onFileName(e.target.value)}
                    aria-label="File name"
                    spellCheck={false}
                    className="h-9 w-full min-w-0 max-w-[280px] truncate rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {state.dirty && changes > 0 && (
                    <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 lg:inline">
                        {state.edits.length} {state.edits.length === 1 ? 'change' : 'changes'} · saved in this browser
                    </span>
                )}
            </div>

            <div className="flex items-center">
                <button type="button" className={btn} onClick={() => dispatch({ type: 'undo' })} disabled={!state.past.length} aria-label="Undo" title="Undo (Ctrl+Z)">
                    <Undo2 className="h-[18px] w-[18px]" />
                </button>
                <button type="button" className={btn} onClick={() => dispatch({ type: 'redo' })} disabled={!state.future.length} aria-label="Redo" title="Redo (Ctrl+Y)">
                    <Redo2 className="h-[18px] w-[18px]" />
                </button>
            </div>

            <div className="hidden items-center rounded-lg border border-slate-200 sm:flex">
                <button type="button" className={`${btn} h-8 w-8`} onClick={() => dispatch({ type: 'zoom', zoom: zoom / 1.2 })} aria-label="Zoom out" title="Zoom out (Ctrl −)">
                    <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-[12.5px] font-medium tabular-nums text-slate-700">{Math.round(zoom * 100)}%</span>
                <button type="button" className={`${btn} h-8 w-8`} onClick={() => dispatch({ type: 'zoom', zoom: zoom * 1.2 })} aria-label="Zoom in" title="Zoom in (Ctrl +)">
                    <ZoomIn className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    className={`${btn} h-8 w-8 ${state.fitWidth ? 'text-emerald-700' : ''}`}
                    onClick={() => dispatch({ type: 'zoom', zoom, fitWidth: true })}
                    aria-label="Fit to width"
                    title="Fit to width (Ctrl 0)"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            </div>

            <button type="button" className={btn} onClick={onToggleFind} aria-label="Find and replace" title="Find & replace (Ctrl+F)">
                <Search className="h-[18px] w-[18px]" />
            </button>

            <button
                type="button"
                onClick={onDownload}
                disabled={exporting}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_6px_16px_-8px_rgba(5,150,105,0.9)] transition hover:bg-emerald-800 disabled:opacity-70 sm:px-4"
            >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="hidden sm:inline">{exporting ? 'Preparing…' : 'Download PDF'}</span>
            </button>
        </header>
    );
}
