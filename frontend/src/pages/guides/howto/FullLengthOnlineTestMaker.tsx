/**
 * testoza.com/full-length-online-test-maker — what makes a mock full-length, the patterns of
 * JEE, NEET, SSC and bank papers, and building, running and reading a three-hour paper.
 *
 * The page itself is HowToPage.tsx, shared with the other three "how to" guides; the writing
 * lives in src/guides/fullLengthOnlineTestMaker.ts and the widget data in src/guides/howtoData.ts.
 */
import { HOWTO_PAGES } from '@/guides/howtoData';
import { FULL_LENGTH_ONLINE_TEST_MAKER as GUIDE } from '@/guides/fullLengthOnlineTestMaker';
import HowToPage from './HowToPage';

export default function FullLengthOnlineTestMaker() {
    return (
        <HowToPage
            guide={GUIDE}
            page={HOWTO_PAGES.fullLength}
            keyPhrase="Full-length online test maker"
            jumpTo={{ label: 'See the exam patterns', id: 'patterns' }}
        />
    );
}
