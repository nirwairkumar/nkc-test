/**
 * testoza.com/best-online-exam-software-india — thirteen online exam platforms used in
 * India, sorted by what the exam decides, with Indian marking and price meters compared.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/bestOnlineExamSoftwareIndia.ts and the widget data in src/guides/howtoData.ts.
 */
import { HOWTO_PAGES } from '@/guides/howtoData';
import { BEST_ONLINE_EXAM_SOFTWARE_INDIA as GUIDE } from '@/guides/bestOnlineExamSoftwareIndia';
import HowToPage from './HowToPage';

export default function BestOnlineExamSoftwareIndia() {
    return (
        <HowToPage
            guide={GUIDE}
            page={HOWTO_PAGES.bestIndia}
            keyPhrase="Best online exam software in India"
            jumpTo={{ label: 'See the shortlist', id: 'at-a-glance' }}
        />
    );
}
