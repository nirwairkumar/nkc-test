/**
 * testoza.com/best-ai-quiz-generator — twelve AI quiz generators, sorted by the job they do.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/bestAiQuizGenerator.ts and the widget data in src/guides/comparisonData.ts.
 */
import { COMPARISON_PAGES } from '@/guides/comparisonData';
import { BEST_AI_QUIZ_GENERATOR as GUIDE } from '@/guides/bestAiQuizGenerator';
import HowToPage from './HowToPage';

export default function BestAiQuizGenerator() {
    return <HowToPage guide={GUIDE} page={COMPARISON_PAGES.aiQuiz} keyPhrase="Best AI quiz generators" jumpTo={{ label: 'See the twelve tools', id: 'at-a-glance' }} />;
}
