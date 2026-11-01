/**
 * Interactive parts of /math-test-maker. Crawlers get each widget's fallbackHtml from
 * src/guides/mathTestMaker.ts instead.
 *
 *   math-paste      PasteDemo.tsx: one formula typed, copied, screenshotted and typeset
 *   math-ai-import  AiImportDemo.tsx: three maths files through the AI import, with Raw
 *   math-sypad      SyPadDemo.tsx: a working Sy Pad (forked from the JEE guide)
 *   math-notation   NotationDemo.tsx: LaTeX to type between dollar signs
 *   math-numerical  NumericLab.tsx: range or exact values for a numerical answer
 *   math-exam       ExamDemo.tsx: a six-question maths test on a student's phone
 *   math-options    OptionSplit.tsx: what the wrong options tell the teacher
 */
import type { GuideWidget } from '@/guides/types';
import PasteDemo from './PasteDemo';
import AiImportDemo from './AiImportDemo';
import SyPadDemo from './SyPadDemo';
import NotationDemo from './NotationDemo';
import NumericLab from './NumericLab';
import ExamDemo from './ExamDemo';
import OptionSplit from './OptionSplit';

export default function MathWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'math-paste':
            return <PasteDemo />;
        case 'math-ai-import':
            return <AiImportDemo />;
        case 'math-sypad':
            return <SyPadDemo />;
        case 'math-notation':
            return <NotationDemo />;
        case 'math-numerical':
            return <NumericLab />;
        case 'math-exam':
            return <ExamDemo />;
        case 'math-options':
            return <OptionSplit />;
        default:
            return null;
    }
}
