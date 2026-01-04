import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScientificCalculator({ onClose }: { onClose?: () => void }) {
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState(''); // Stores the full math string for evaluation
    const [memory, setMemory] = useState<number>(0);
    const [isDegrees, setIsDegrees] = useState(true);
    const [isScientific, setIsScientific] = useState(false); // Default to Basic
    const [isShift, setIsShift] = useState(false);
    const [error, setError] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // --- Key Handlers ---

    // Append number or operator
    const handlePress = useCallback((val: string) => {
        if (error) {
            setDisplay(val);
            setExpression(val);
            setError(false);
            return;
        }

        if (display === '0' && !['.', '+', '-', '*', '/', '^'].includes(val)) {
            setDisplay(val);
            setExpression(val);
        } else {
            // Prevent multiple operators in a row roughly
            const lastChar = display.slice(-1);
            if (['+', '-', '*', '/', '^'].includes(lastChar) && ['+', '-', '*', '/', '^'].includes(val)) {
                setDisplay(display.slice(0, -1) + val);
                setExpression(expression.slice(0, -1) + val);
            } else {
                setDisplay(display + val);
                setExpression(expression + val);
            }
        }
    }, [display, expression, error]);

    // Clear All
    const clear = useCallback(() => {
        setDisplay('0');
        setExpression('');
        setError(false);
    }, []);

    // Backspace
    const backspace = useCallback(() => {
        if (error) {
            clear();
            return;
        }
        if (display.length === 1) {
            setDisplay('0');
            setExpression('');
        } else {
            setDisplay(display.slice(0, -1));
            setExpression(expression.slice(0, -1));
        }
    }, [display, expression, error, clear]);

    // Calculate Result
    const calculate = useCallback(() => {
        try {
            // Prepare expression for Evaluation
            let evalStr = expression
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E')
                .replace(/\^/g, '**')
                .replace(/×/g, '*')
                .replace(/÷/g, '/');

            // Handle Trig functions with Degree conversion
            const toRad = isDegrees ? `*(Math.PI/180)` : '';

            // Standard Trig replacements
            evalStr = evalStr.replace(/sin\(/g, `Math.sin(${isDegrees ? '(Math.PI/180)*' : ''}`);
            evalStr = evalStr.replace(/cos\(/g, `Math.cos(${isDegrees ? '(Math.PI/180)*' : ''}`);
            evalStr = evalStr.replace(/tan\(/g, `Math.tan(${isDegrees ? '(Math.PI/180)*' : ''}`);

            // Inverse Trig placehodlers (simplified for this context)
            evalStr = evalStr.replace(/asin\(/g, `Math.asin(`);

            // Other functions
            evalStr = evalStr
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/√\(/g, 'Math.sqrt(');

            // Safe Eval
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + evalStr)();

            if (!isFinite(result) || isNaN(result)) {
                throw new Error("Invalid");
            }

            const formatted = parseFloat(result.toFixed(10)).toString();
            setDisplay(formatted);
            setExpression(formatted);
        } catch (e) {
            setDisplay('Error');
            setError(true);
        }
    }, [expression, isDegrees]);

    const addFunc = (func: string) => {
        const val = func + '(';
        if (display === '0') {
            setDisplay(val);
            setExpression(val);
        } else {
            setDisplay(display + val);
            setExpression(expression + val);
        }
    };

    const memClear = () => setMemory(0);
    const memRecall = () => {
        if (display === '0') {
            setDisplay(memory.toString());
            setExpression(memory.toString());
        } else {
            setDisplay(display + memory.toString());
            setExpression(expression + memory.toString());
        }
    };
    const memAdd = () => {
        try {
            const val = parseFloat(display);
            if (!isNaN(val)) setMemory(memory + val);
        } catch { }
    };
    const memSub = () => {
        try {
            const val = parseFloat(display);
            if (!isNaN(val)) setMemory(memory - val);
        } catch { }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') handlePress(e.key);
            if (e.key === '.') handlePress('.');
            if (e.key === '+') handlePress('+');
            if (e.key === '-') handlePress('-');
            if (e.key === '*') handlePress('*');
            if (e.key === '/') handlePress('/');
            if (e.key === '^') handlePress('^');
            if (e.key === '=' || e.key === 'Enter') { e.preventDefault(); calculate(); }
            if (e.key === 'Backspace') backspace();
            if (e.key === 'Escape') { if (onClose) onClose(); }
            if (e.key === '(') handlePress('(');
            if (e.key === ')') handlePress(')');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePress, calculate, backspace, clear, onClose]);

    if (!mounted) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* 1. Use an absolute distinct backdrop sibling to avoid bubbling issues */}
            <div
                className="absolute inset-0 bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* 2. Calculator Body - Sibling to backdrop */}
            {/* Added animate-in directly to this container */}
            <div
                className="relative z-10 w-full max-w-[340px] md:max-w-[400px] max-h-[90vh] overflow-y-auto bg-[#222] rounded-xl shadow-2xl border border-slate-700 flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="bg-[#333] px-3 py-2 flex justify-between items-center cursor-move border-b border-slate-600 shrink-0 select-none">
                    <span className="text-xs font-bold text-slate-400 tracking-wider">SCIENTIFIC CALCULATOR</span>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Close Calculator"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Display */}
                <div className="bg-[#2a2a2a] p-5 text-right relative border-b border-slate-600 shrink-0">
                    <div className="absolute top-2 left-3 flex gap-2 text-[10px] font-bold tracking-wider opacity-70 select-none">
                        <span className={cn("px-1 rounded bg-[#444] text-cyan-400", isDegrees ? "opacity-100" : "opacity-30")}>DEG</span>
                        <span className={cn("px-1 rounded bg-[#444] text-cyan-400", !isDegrees ? "opacity-100" : "opacity-30")}>RAD</span>
                        {memory !== 0 && <span className="text-yellow-400">M</span>}
                        {isShift && <span className="text-orange-400">SHIFT</span>}
                    </div>

                    <div className="h-16 flex items-end justify-end overflow-hidden">
                        <span className="text-3xl md:text-4xl font-mono text-white font-light tracking-wide break-all">
                            {display}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-[#333] p-2 flex justify-between items-center text-[10px] md:text-xs shrink-0 select-none">
                    <div className="flex bg-[#222] rounded p-0.5 border border-slate-600">
                        <button
                            className={cn("px-3 py-1 rounded transition-colors", !isScientific ? "bg-slate-600 text-white font-bold" : "text-slate-400 hover:text-slate-200")}
                            onClick={() => setIsScientific(false)}
                            type="button"
                        >
                            BASIC
                        </button>
                        <button
                            className={cn("px-3 py-1 rounded transition-colors", isScientific ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200")}
                            onClick={() => setIsScientific(true)}
                            type="button"
                        >
                            SCI
                        </button>
                    </div>

                    <button
                        className={cn("px-3 py-1.5 rounded border font-bold transition-all", isDegrees ? "bg-[#222] border-slate-600 text-slate-300" : "bg-cyan-900/50 border-cyan-500 text-cyan-200")}
                        onClick={() => setIsDegrees(!isDegrees)}
                        type="button"
                    >
                        {isDegrees ? 'DEG' : 'RAD'}
                    </button>
                </div>

                {/* Keypad */}
                <div className="p-3 bg-[#111] grid gap-2 flex-1">
                    {isScientific && (
                        <div className="grid grid-cols-5 gap-1.5 mb-1">
                            <CalcButton variant="sci" onClick={() => setIsShift(!isShift)} active={isShift} label="Shift" />
                            <CalcButton variant="sci" onClick={() => addFunc(isShift ? 'asin' : 'sin')} label={isShift ? 'sin⁻¹' : 'sin'} />
                            <CalcButton variant="sci" onClick={() => addFunc(isShift ? 'acos' : 'cos')} label={isShift ? 'cos⁻¹' : 'cos'} />
                            <CalcButton variant="sci" onClick={() => addFunc(isShift ? 'atan' : 'tan')} label={isShift ? 'tan⁻¹' : 'tan'} />
                            <CalcButton variant="sci" onClick={() => handlePress('^')} label="^" />

                            <CalcButton variant="sci" onClick={() => addFunc('log')} label="log" />
                            <CalcButton variant="sci" onClick={() => addFunc('ln')} label="ln" />
                            <CalcButton variant="sci" onClick={() => handlePress('(')} label="(" />
                            <CalcButton variant="sci" onClick={() => handlePress(')')} label=")" />
                            <CalcButton variant="sci" onClick={() => addFunc('√')} label="√" />

                            <CalcButton variant="sci" onClick={() => handlePress('π')} label="π" />
                            <CalcButton variant="sci" onClick={() => handlePress('e')} label="e" />
                            <CalcButton variant="sci" onClick={() => handlePress('Math.abs(')} label="abs" />
                            <CalcButton variant="sci" onClick={() => handlePress('1/')} label="1/x" />
                            <CalcButton variant="sci" onClick={() => handlePress('!')} label="n!" disabled />
                        </div>
                    )}

                    <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                        {/* Row 1 */}
                        <CalcButton variant="memory" onClick={memClear} label="MC" />
                        <CalcButton variant="memory" onClick={memRecall} label="MR" />
                        <CalcButton variant="memory" onClick={memAdd} label="M+" />
                        <CalcButton variant="memory" onClick={memSub} label="M-" />
                        <CalcButton variant="destructive" onClick={clear} label="AC" />

                        {/* Row 2 */}
                        <CalcButton variant="num" onClick={() => handlePress('7')} label="7" />
                        <CalcButton variant="num" onClick={() => handlePress('8')} label="8" />
                        <CalcButton variant="num" onClick={() => handlePress('9')} label="9" />
                        <CalcButton variant="op" onClick={() => handlePress('/')} label="÷" />
                        <CalcButton variant="destructive" onClick={backspace} label="DEL" />

                        {/* Row 3 */}
                        <CalcButton variant="num" onClick={() => handlePress('4')} label="4" />
                        <CalcButton variant="num" onClick={() => handlePress('5')} label="5" />
                        <CalcButton variant="num" onClick={() => handlePress('6')} label="6" />
                        <CalcButton variant="op" onClick={() => handlePress('*')} label="×" />
                        <CalcButton variant="sci" onClick={() => addFunc('√')} label="√" />

                        {/* Row 4 */}
                        <CalcButton variant="num" onClick={() => handlePress('1')} label="1" />
                        <CalcButton variant="num" onClick={() => handlePress('2')} label="2" />
                        <CalcButton variant="num" onClick={() => handlePress('3')} label="3" />
                        <CalcButton variant="op" onClick={() => handlePress('-')} label="-" />
                        <CalcButton variant="sci" onClick={() => handlePress('^')} label="xʸ" />

                        {/* Row 5 */}
                        <CalcButton variant="num" onClick={() => handlePress('0')} label="0" />
                        <CalcButton variant="num" onClick={() => handlePress('.')} label="." />
                        <CalcButton variant="sci" onClick={() => handlePress('e')} label="e" />
                        <CalcButton variant="op" onClick={() => handlePress('+')} label="+" />
                        <CalcButton variant="primary" onClick={calculate} label="=" />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Button Component
type CalcButtonProps = {
    label: string;
    onClick: () => void;
    variant?: 'num' | 'op' | 'sci' | 'memory' | 'primary' | 'destructive';
    className?: string;
    active?: boolean;
    disabled?: boolean;
};

const CalcButton = ({ label, onClick, variant = 'num', className, active, disabled }: CalcButtonProps) => {
    const baseStyles = "relative flex items-center justify-center rounded text-sm md:text-base font-medium transition-all active:scale-95 select-none h-10 md:h-11";

    const variants = {
        num: "bg-[#3a3a3a] text-white hover:bg-[#4a4a4a] shadow-[0_2px_0_#2a2a2a]",
        op: "bg-[#FF9F0A] text-white hover:bg-[#ffb03b] shadow-[0_2px_0_#c47800] text-lg",
        sci: "bg-[#282828] text-slate-300 hover:bg-[#333] hover:text-white border border-[#333] text-xs md:text-sm",
        memory: "bg-[#1c1c1c] text-slate-400 hover:text-white border border-[#333] text-xs",
        primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_2px_0_#1e40af] text-xl font-bold",
        destructive: "bg-red-900/40 text-red-200 hover:bg-red-900/60 border border-red-900/50 text-xs uppercase"
    };

    const activeStyle = active ? "ring-2 ring-white/50 bg-[#444]" : "";

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(baseStyles, variants[variant], activeStyle, className, disabled && "opacity-30 cursor-not-allowed")}
            type="button"
        >
            {label}
        </button>
    );
};

export default ScientificCalculator;
