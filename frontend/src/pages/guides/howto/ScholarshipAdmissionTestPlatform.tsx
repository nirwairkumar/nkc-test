/**
 * testoza.com/scholarship-admission-test-platform — running a coaching institute's admission-cum-scholarship test online or in the centre.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/scholarshipAdmissionTestPlatform.ts and the widget data in src/guides/testMakerData.ts.
 */
import { TEST_MAKER_PAGES } from '@/guides/testMakerData';
import { SCHOLARSHIP_ADMISSION_TEST_PLATFORM as GUIDE } from '@/guides/scholarshipAdmissionTestPlatform';
import HowToPage from './HowToPage';

export default function ScholarshipAdmissionTestPlatform() {
    return <HowToPage guide={GUIDE} page={TEST_MAKER_PAGES.scholarship} keyPhrase="Scholarship admission test platform" jumpTo={{ label: 'Choose the format', id: 'formats' }} />;
}
