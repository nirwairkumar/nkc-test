/**
 * Interactive parts of /hindi-online-test-maker. Crawlers get each widget's
 * fallbackHtml from src/guides/hindiOnlineTestMaker.ts instead.
 *
 *   hindi-typing         TypingDemo.tsx: the question card, typing Hindi in English letters
 *   hindi-unicode-check  UnicodeCheck.tsx: is this line Unicode Hindi or Kruti Dev?
 *   hindi-ai-language    AiLanguageDemo.tsx: Language Output, Same as Material / Hindi / both
 *   hindi-exam-screen    ExamDemo.tsx: the paper on a student's phone
 */
import type { GuideWidget } from '@/guides/types';
import TypingDemo from './TypingDemo';
import UnicodeCheck from './UnicodeCheck';
import AiLanguageDemo from './AiLanguageDemo';
import ExamDemo from './ExamDemo';

export default function HindiWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'hindi-typing':
            return <TypingDemo />;
        case 'hindi-unicode-check':
            return <UnicodeCheck />;
        case 'hindi-ai-language':
            return <AiLanguageDemo />;
        case 'hindi-exam-screen':
            return <ExamDemo />;
        default:
            return null;
    }
}
