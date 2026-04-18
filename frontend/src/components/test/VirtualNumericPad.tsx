import React from 'react';
import { Delete, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualNumericPadProps {
  onKeyPress: (key: string) => void;
  className?: string;
}

const VirtualNumericPad: React.FC<VirtualNumericPadProps> = ({ onKeyPress, className }) => {
  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', '-'
  ];

  return (
    <div className={cn("bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm select-none", className)}>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKeyPress(key)}
            className="h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-blue-50 dark:active:bg-blue-900/30 active:border-blue-300 transition-all shadow-sm"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onKeyPress('AC')}
          className="h-12 flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-black text-red-600 uppercase hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all shadow-sm"
          title="Clear All"
        >
          AC
        </button>
        <button
          type="button"
          onClick={() => onKeyPress('BACKSPACE')}
          className="h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm col-span-2"
          title="Backspace"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VirtualNumericPad;
