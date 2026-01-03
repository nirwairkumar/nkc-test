import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DialogClose } from '@/components/ui/dialog';
import { Delete, History, RotateCcw, X } from 'lucide-react';

export function ScientificCalculator() {
    const [display, setDisplay] = useState('0');
    const [memory, setMemory] = useState<number>(0);
    const [showScientific, setShowScientific] = useState(true);
    const [isDegree, setIsDegree] = useState(true); // Degree vs Radian

    // Helper to evaluate safe math
    const calculate = () => {
        try {
            // Replace visual symbols with JS math
            let expression = display
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E')
                .replace(/\^/g, '**')
                .replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)'); // Basic sqrt handle

            // Handle Scientific Functions
            // Note: This simple replace doesn't handle nested parentheses perfectly for functions like sin(cos(x))
            // But for a basic implementation without a parser library, it works for simple cases.
            // We'll wrap common functions.

            const trigFactor = isDegree ? `* (Math.PI / 180)` : '';

            // We need a safer eval or a proper parser. 
            // For this snippet, we will use Function constructor which is slightly safer than direct eval but still allows arbitrary code.
            // Since this is client-side only and user input is controlled via buttons (mostly), it's acceptable for a mock tool.
            // However, to support functions like sin(30), we need to rewrite them to Math.sin(...)

            expression = expression
                .replace(/sin\(/g, `Math.sin(${isDegree ? '(Math.PI/180)*' : ''}`)
                .replace(/cos\(/g, `Math.cos(${isDegree ? '(Math.PI/180)*' : ''}`)
                .replace(/tan\(/g, `Math.tan(${isDegree ? '(Math.PI/180)*' : ''}`)
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(');

            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + expression)();

            // Format result
            const formatted = parseFloat(result.toFixed(8)).toString();
            setDisplay(formatted);
        } catch (e) {
            setDisplay('Error');
            setTimeout(() => setDisplay('0'), 1500);
        }
    };

    const handlePress = (val: string) => {
        if (display === '0' || display === 'Error') {
            setDisplay(val);
        } else {
            setDisplay(display + val);
        }
    };

    const clear = () => setDisplay('0');
    const backspace = () => {
        if (display.length === 1 || display === 'Error') setDisplay('0');
        else setDisplay(display.slice(0, -1));
    };

    const addFunc = (func: string) => {
        const val = func + '(';
        if (display === '0') setDisplay(val);
        else setDisplay(display + val);
    };

    return (
        <Card className="w-full max-w-[360px] p-4 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative">
            <DialogClose className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors">
                <X className="w-4 h-4" />
            </DialogClose>
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg mb-4 text-right">
                <div className="text-xs text-slate-500 mb-1 h-4">{isDegree ? 'DEG' : 'RAD'}</div>
                <div className="text-3xl font-mono tracking-wider overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {display}
                </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {/* Row 1 */}
                <Button variant="secondary" size="sm" onClick={() => setIsDegree(!isDegree)} className="text-xs">
                    {isDegree ? 'RAD' : 'DEG'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addFunc('sin')}>sin</Button>
                <Button variant="secondary" size="sm" onClick={() => addFunc('cos')}>cos</Button>
                <Button variant="secondary" size="sm" onClick={() => addFunc('tan')}>tan</Button>
                <Button variant="destructive" size="sm" onClick={clear}>AC</Button>

                {/* Row 2 */}
                <Button variant="secondary" size="sm" onClick={() => addFunc('log')}>log</Button>
                <Button variant="secondary" size="sm" onClick={() => addFunc('ln')}>ln</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress('(')}>(</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress(')')}>)</Button>
                <Button variant="secondary" size="sm" onClick={backspace}><Delete className="w-4 h-4" /></Button>

                {/* Row 3 */}
                <Button variant="secondary" size="sm" onClick={() => handlePress('^')}>^</Button>
                <Button variant="secondary" size="sm" onClick={() => addFunc('√')}>√</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('7')}>7</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('8')}>8</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('9')}>9</Button>

                {/* Row 4 */}
                <Button variant="secondary" size="sm" onClick={() => handlePress('π')}>π</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress('e')}>e</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('4')}>4</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('5')}>5</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('6')}>6</Button>

                {/* Row 5 */}
                <Button variant="secondary" size="sm" onClick={() => handlePress('.')}>.</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress('/')}>÷</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('1')}>1</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('2')}>2</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('3')}>3</Button>

                {/* Row 6 */}
                <Button variant="secondary" size="sm" onClick={() => handlePress('*')}>×</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress('-')}>-</Button>
                <Button variant="secondary" size="sm" onClick={() => handlePress('+')}>+</Button>
                <Button variant="outline" size="sm" onClick={() => handlePress('0')}>0</Button>
                <Button variant="default" size="sm" onClick={calculate} className="bg-emerald-600 hover:bg-emerald-700">=</Button>
            </div>
        </Card>
    );
}

// Ensure it's exported as default too if needed, but named is safer
export default ScientificCalculator;
