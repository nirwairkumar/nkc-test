/**
 * testoza.com/online-test-for-tuition-teachers — weekly online tests for home tutors and small tuition centres.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/onlineTestForTuitionTeachers.ts and the widget data in src/guides/testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from '@/guides/testMakerData';
import { ONLINE_TEST_FOR_TUITION_TEACHERS as GUIDE } from '@/guides/onlineTestForTuitionTeachers';
import HowToPage from './HowToPage';

export default function OnlineTestForTuitionTeachers() {
    return <HowToPage guide={GUIDE} page={TEST_MAKER_PAGES.tuition} keyPhrase="Online tests for tuition teachers" jumpTo={{ label: 'Make a test in 15 minutes', id: 'make-test' }} />;
}
