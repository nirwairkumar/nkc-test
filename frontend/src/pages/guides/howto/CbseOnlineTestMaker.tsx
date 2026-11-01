/**
 * testoza.com/cbse-online-test-maker — CBSE-style online tests for Classes 6 to 12: MCQs, assertion–reason and case-based questions.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/cbseOnlineTestMaker.ts and the widget data in src/guides/testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from '@/guides/testMakerData';
import { CBSE_ONLINE_TEST_MAKER as GUIDE } from '@/guides/cbseOnlineTestMaker';
import HowToPage from './HowToPage';

export default function CbseOnlineTestMaker() {
    return <HowToPage guide={GUIDE} page={TEST_MAKER_PAGES.cbse} keyPhrase="CBSE online test maker" jumpTo={{ label: 'See each question type', id: 'question-types' }} />;
}
