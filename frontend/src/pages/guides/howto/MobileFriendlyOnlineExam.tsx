/**
 * testoza.com/mobile-friendly-online-exam — what a phone exam has to survive, the exam screen
 * on a six-inch phone, and what happens when a call, a dead battery or lost signal interrupts.
 *
 * The page itself is HowToPage.tsx, shared with the other three "how to" guides; the writing
 * lives in src/guides/mobileFriendlyOnlineExam.ts and the widget data in src/guides/howtoData.ts.
 */
import { HOWTO_PAGES } from '@/guides/howtoData';
import { MOBILE_FRIENDLY_ONLINE_EXAM as GUIDE } from '@/guides/mobileFriendlyOnlineExam';
import HowToPage from './HowToPage';

export default function MobileFriendlyOnlineExam() {
    return (
        <HowToPage
            guide={GUIDE}
            page={HOWTO_PAGES.mobile}
            keyPhrase="Mobile-friendly online exam"
            jumpTo={{ label: 'What happens when the signal drops', id: 'what-happens' }}
        />
    );
}
