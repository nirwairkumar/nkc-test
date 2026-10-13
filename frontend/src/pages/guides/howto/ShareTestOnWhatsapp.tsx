/**
 * testoza.com/share-test-on-whatsapp — sending a test to a batch on WhatsApp so the whole group
 * opens it, the messages word for word, and sending results back to the group and to parents.
 *
 * The page itself is HowToPage.tsx, shared with the other three "how to" guides; the writing
 * lives in src/guides/shareTestOnWhatsapp.ts and the widget data in src/guides/howtoData.ts.
 */
import { HOWTO_PAGES } from '@/guides/howtoData';
import { SHARE_TEST_ON_WHATSAPP as GUIDE } from '@/guides/shareTestOnWhatsapp';
import HowToPage from './HowToPage';

export default function ShareTestOnWhatsapp() {
    return (
        <HowToPage
            guide={GUIDE}
            page={HOWTO_PAGES.whatsapp}
            keyPhrase="share a test on WhatsApp"
            jumpTo={{ label: 'See the messages, word for word', id: 'the-messages' }}
        />
    );
}
