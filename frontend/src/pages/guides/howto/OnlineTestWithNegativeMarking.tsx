/**
 * testoza.com/online-test-with-negative-marking — setting negative marking, every Indian exam's scheme, and when a guess pays.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/onlineTestWithNegativeMarking.ts and the widget data in src/guides/testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from '@/guides/testMakerData';
import { ONLINE_TEST_WITH_NEGATIVE_MARKING as GUIDE } from '@/guides/onlineTestWithNegativeMarking';
import HowToPage from './HowToPage';

export default function OnlineTestWithNegativeMarking() {
    return <HowToPage guide={GUIDE} page={TEST_MAKER_PAGES.negative} keyPhrase="Online test with negative marking" jumpTo={{ label: 'See every exam’s scheme', id: 'schemes' }} />;
}
