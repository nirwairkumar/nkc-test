/**
 * Interactive parts of /chemistry-question-paper-maker. Crawlers get each widget's
 * fallbackHtml from src/guides/chemistryQuestionPaperMaker.ts instead.
 *
 *   chem-paste      PasteDemo.tsx: one reaction typed, copied, screenshotted and typeset
 *   chem-ai-import  AiImportDemo.tsx: three chemistry files through the AI import, with Raw
 *   chem-sypad      SyPadDemo.tsx: a working Sy Pad on its Chemistry tab
 *   chem-notation   NotationDemo.tsx: mhchem to type between dollar signs
 *   chem-numerical  NumericLab.tsx: range or exact values for a pH answer
 *   chem-exam       ExamDemo.tsx: a six-question chemistry test on a student's phone
 *   chem-options    OptionSplit.tsx: what the wrong options tell the teacher
 */
import type { GuideWidget } from '@/guides/types';
import PasteDemo from './PasteDemo';
import AiImportDemo from './AiImportDemo';
import SyPadDemo from './SyPadDemo';
import NotationDemo from './NotationDemo';
import NumericLab from './NumericLab';
import ExamDemo from './ExamDemo';
import OptionSplit from './OptionSplit';

export default function ChemWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'chem-paste':
            return <PasteDemo />;
        case 'chem-ai-import':
            return <AiImportDemo />;
        case 'chem-sypad':
            return <SyPadDemo />;
        case 'chem-notation':
            return <NotationDemo />;
        case 'chem-numerical':
            return <NumericLab />;
        case 'chem-exam':
            return <ExamDemo />;
        case 'chem-options':
            return <OptionSplit />;
        default:
            return null;
    }
}
