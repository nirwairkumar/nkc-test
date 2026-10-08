/**
 * Interactive parts of /jee-advanced-mock-test-software. Crawlers get each widget's
 * fallbackHtml from src/guides/jeeAdvancedMockTestSoftware.ts instead.
 *
 *   jadv-marking    MarkingLab.tsx: JEE Advanced partial marks, the builder's switch
 *   jadv-papers     PapersFlow.tsx: Paper 1, the break and the combined result
 *   jadv-numerical  NumericLab.tsx: range or exact values for a two-decimal answer
 *   jadv-exam       ExamDemo.tsx: a six-question JEE Advanced-style paper on a phone
 *   jadv-options    OptionSplit.tsx: what the wrong options tell the faculty
 */
import type { GuideWidget } from '@/guides/types';
import MarkingLab from './MarkingLab';
import PapersFlow from './PapersFlow';
import NumericLab from './NumericLab';
import ExamDemo from './ExamDemo';
import OptionSplit from './OptionSplit';

export default function JadvWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'jadv-marking':
            return <MarkingLab />;
        case 'jadv-papers':
            return <PapersFlow />;
        case 'jadv-numerical':
            return <NumericLab />;
        case 'jadv-exam':
            return <ExamDemo />;
        case 'jadv-options':
            return <OptionSplit />;
        default:
            return null;
    }
}
