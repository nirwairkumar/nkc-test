import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface TableEditorProps {
  onInsert: (latex: string) => void;
  onClose: () => void;
}

/* Convert 2D cell array → LaTeX array environment */
function tableToLatex(cells: string[][]): string {
  if (!cells.length || !cells[0].length) return '';
  const cols = cells[0].length;
  const colSpec = Array(cols).fill('c').join('|');
  const [header, ...dataRows] = cells;
  const headerStr = header.map(c => c.trim() || '?').join(' & ');
  const dataStr = dataRows.map(row => row.map(c => c.trim() || '?').join(' & ')).join(' \\\\ ');
  return `\\begin{array}{${colSpec}} ${headerStr} \\\\ \\hline ${dataStr} \\end{array}`;
}

export default function TableEditor({ onInsert, onClose }: TableEditorProps) {
  const [cells, setCells] = useState<string[][]>([
    ['x', 'y'],
    ['', ''],
    ['', ''],
    ['', ''],
  ]);

  const rows = cells.length;
  const cols = cells[0]?.length ?? 2;

  const updateCell = (r: number, c: number, val: string) => {
    setCells(prev =>
      prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
      )
    );
  };

  const addColumn = () => setCells(prev => prev.map(row => [...row, '']));
  const removeColumn = () => {
    if (cols <= 1) return;
    setCells(prev => prev.map(row => row.slice(0, -1)));
  };

  const addRow = () => setCells(prev => [...prev, Array(cols).fill('')]);
  const removeRow = () => {
    if (rows <= 2) return; // always keep header + at least 1 data row
    setCells(prev => prev.slice(0, -1));
  };

  return (
    <div className="p-3 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
          田 Table Editor
        </span>
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={removeColumn}
            disabled={cols <= 1}
            className="px-2 py-1 text-[11px] rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
            title="Remove last column"
          >
            −Col
          </button>
          <button
            type="button"
            onClick={removeRow}
            disabled={rows <= 2}
            className="px-2 py-1 text-[11px] rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
            title="Remove last row"
          >
            −Row
          </button>
          <button
            type="button"
            onClick={() => onInsert(tableToLatex(cells))}
            className="flex items-center gap-1 px-3 py-1 text-[11px] rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            <Check className="w-3 h-3" />
            Insert
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Close table editor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid + Add-Column button */}
      <div className="flex gap-1 items-start overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {cells.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((cell, ci) => (
                <input
                  key={ci}
                  type="text"
                  value={cell}
                  onChange={e => updateCell(ri, ci, e.target.value)}
                  placeholder={ri === 0 ? `H${ci + 1}` : '?'}
                  onMouseDown={e => e.stopPropagation()}
                  className={`w-16 h-8 px-1.5 text-sm text-center rounded border font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 select-text ${
                    ri === 0
                      ? 'bg-blue-100 border-blue-400 font-semibold text-blue-900'
                      : 'bg-white border-blue-200 text-slate-800'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* + Column */}
        <button
          type="button"
          onClick={addColumn}
          className="self-center shrink-0 w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold text-lg hover:bg-emerald-200 transition-colors flex items-center justify-center"
          title="Add column"
        >
          +
        </button>
      </div>

      {/* + Row */}
      <button
        type="button"
        onClick={addRow}
        className="w-full h-8 rounded-lg bg-emerald-50 border border-dashed border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
        title="Add row"
      >
        + Add Row
      </button>

      {/* Preview */}
      <p className="text-[10px] text-slate-400 font-mono break-all leading-tight">
        {tableToLatex(cells)}
      </p>
    </div>
  );
}
