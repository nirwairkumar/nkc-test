/**
 * testoza.com/sectional-test-maker — sectional drills and papers split into sections with their own clocks, attempt limits and marks.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/sectionalTestMaker.ts and the widget data in src/guides/testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from '@/guides/testMakerData';
import { SECTIONAL_TEST_MAKER as GUIDE } from '@/guides/sectionalTestMaker';
import HowToPage from './HowToPage';

export default function SectionalTestMaker() {
    return <HowToPage guide={GUIDE} page={TEST_MAKER_PAGES.sectional} keyPhrase="Sectional test maker" jumpTo={{ label: 'See the four section rules', id: 'section-rules' }} />;
}
