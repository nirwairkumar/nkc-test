import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface TableEditorProps {
  initialType?: string;
  onInsert: (latex: string) => void;
  onClose: () => void;
}

/* Convert 2D cell array → LaTeX array environment based on selected layout style */
export function tableToLatex(cells: string[][], tableType: string = 'header'): string {
  if (!cells.length || !cells[0].length) return '';
  const cols = cells[0].length;

  // Clean all cells by stripping any copy-pasted math mode $ delimiters to prevent KaTeX nested environment errors
  const cleanCells = cells.map(row =>
    row.map(cell => cell.replace(/\$/g, '').trim())
  );

  if (tableType === 'matrix') {
    const rowsStr = cleanCells.map(row => row.map(c => c || '?').join(' & ')).join(' \\\\ ');
    return `\\begin{pmatrix} ${rowsStr} \\end{pmatrix}`;
  }

  if (tableType === 'determinant') {
    const rowsStr = cleanCells.map(row => row.map(c => c || '?').join(' & ')).join(' \\\\ ');
    return `\\begin{vmatrix} ${rowsStr} \\end{vmatrix}`;
  }

  if (tableType === 'match' || tableType === 'list') {
    // Left-aligned columns, no borders or horizontal lines
    const colSpec = Array(cols).fill('l').join('');
    const rowsStr = cleanCells.map(row => row.map(c => c || '?').join(' & ')).join(' \\\\ ');
    return `\\begin{array}{${colSpec}} ${rowsStr} \\end{array}`;
  }

  if (tableType === 'grid') {
    // Fully bordered grid table
    const colSpec = '|' + Array(cols).fill('c').join('|') + '|';
    const rowsStr = cleanCells.map(row => row.map(c => c || '?').join(' & ')).join(' \\\\ \\hline ');
    return `\\begin{array}{${colSpec}} \\hline ${rowsStr} \\\\ \\hline \\end{array}`;
  }

  // Default: 'header' (centered columns with vertical dividers, single horizontal line under header row)
  const colSpec = Array(cols).fill('c').join('|');
  const [header, ...dataRows] = cleanCells;
  const headerStr = header.map(c => c || '?').join(' & ');
  const dataStr = dataRows.map(row => row.map(c => c || '?').join(' & ')).join(' \\\\ ');
  return `\\begin{array}{${colSpec}} ${headerStr} \\\\ \\hline ${dataStr} \\end{array}`;
}

export default function TableEditor({ initialType = 'header', onInsert, onClose }: TableEditorProps) {
  const [tableType, setTableType] = useState<string>(initialType);

  // Initialize cells based on selected table type
  const getInitialCells = (type: string): string[][] => {
    switch (type) {
      case 'match':
        return [
          ['', '\\textbf{List-I}', '', '\\textbf{List-II}'],
          ['(P)', '', '(1)', ''],
          ['(Q)', '', '(2)', ''],
          ['(R)', '', '(3)', ''],
          ['(S)', '', '(4)', '']
        ];
      case 'list':
        return [
          ['Item A', 'Item B'],
          ['', ''],
          ['', '']
        ];
      case 'matrix':
      case 'determinant':
        return [
          ['1', '0'],
          ['0', '1']
        ];
      case 'grid':
        return [
          ['Row 1', 'Data'],
          ['Row 2', 'Data'],
          ['Row 3', 'Data']
        ];
      default: // 'header' / 'empty'
        return [
          ['x', 'y'],
          ['', ''],
          ['', ''],
          ['', '']
        ];
    }
  };

  const [cells, setCells] = useState<string[][]>(() => getInitialCells(initialType));

  // Sync state if initialType changes from parent component
  useEffect(() => {
    setTableType(initialType);
    setCells(getInitialCells(initialType));
  }, [initialType]);

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
    // Keep at least 1 row for matrix/det, or 2 (header + 1) for tables
    const minRows = (tableType === 'matrix' || tableType === 'determinant') ? 1 : 2;
    if (rows <= minRows) return;
    setCells(prev => prev.slice(0, -1));
  };

  return (
    <div className="p-3 space-y-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-xl">
      {/* Table Type Selector Tab Controls */}
      <div className="flex flex-wrap gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'header', label: 'Header Table' },
          { id: 'grid', label: 'Bordered Grid' },
          { id: 'match', label: 'Match Columns' },
          { id: 'list', label: 'Simple List' },
          { id: 'matrix', label: 'Matrix' },
          { id: 'determinant', label: 'Determinant' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTableType(t.id);
              setCells(getInitialCells(t.id));
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
              tableType === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">
          田 Table Configuration
        </span>
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={removeColumn}
            disabled={cols <= 1}
            className="px-2 py-1 text-[11px] rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 transition-colors font-medium"
            title="Remove last column"
          >
            −Col
          </button>
          <button
            type="button"
            onClick={removeRow}
            disabled={rows <= ((tableType === 'matrix' || tableType === 'determinant') ? 1 : 2)}
            className="px-2 py-1 text-[11px] rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 transition-colors font-medium"
            title="Remove last row"
          >
            −Row
          </button>
          <button
            type="button"
            onClick={() => onInsert(tableToLatex(cells, tableType))}
            className="flex items-center gap-1 px-3 py-1 text-[11px] rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
          >
            <Check className="w-3 h-3" />
            Insert
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
            title="Close editor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Inputs + Add Column Control */}
      <div className="flex gap-1 items-start overflow-x-auto py-1">
        <div className="inline-flex flex-col gap-1">
          {cells.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((cell, ci) => (
                <input
                  key={ci}
                  type="text"
                  value={cell}
                  onChange={e => updateCell(ri, ci, e.target.value)}
                  placeholder={
                    tableType === 'matrix' || tableType === 'determinant'
                      ? '?'
                      : ri === 0 && tableType === 'header'
                      ? `H${ci + 1}`
                      : '?'
                  }
                  onMouseDown={e => e.stopPropagation()}
                  className={`w-16 h-8 px-1.5 text-xs text-center rounded border font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 select-text ${
                    ri === 0 && tableType === 'header'
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-100'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Add Column Button */}
        <button
          type="button"
          onClick={addColumn}
          className="self-center shrink-0 w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-lg hover:bg-emerald-200 dark:hover:bg-emerald-950/50 transition-colors flex items-center justify-center"
          title="Add column"
        >
          +
        </button>
      </div>

      {/* Add Row Control */}
      <button
        type="button"
        onClick={addRow}
        className="w-full h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border border-dashed border-emerald-300 dark:border-emerald-900/45 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/20 transition-colors"
        title="Add row"
      >
        + Add Row
      </button>

      {/* Latex Syntax Preview */}
      <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 select-all">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono break-all leading-tight">
          {tableToLatex(cells, tableType)}
        </p>
      </div>
    </div>
  );
}
