/**
 * testoza.com/embed-test-on-website — putting a test on your own website with a button, card,
 * code box or QR code that opens it in its own tab, and where to paste the code.
 *
 * The page itself is HowToPage.tsx, shared with the other three "how to" guides; the writing
 * lives in src/guides/embedTestOnWebsite.ts and the widget data in src/guides/howtoData.ts.
 */
import { HOWTO_PAGES } from '@/guides/howtoData';
import { EMBED_TEST_ON_WEBSITE as GUIDE } from '@/guides/embedTestOnWebsite';
import HowToPage from './HowToPage';

export default function EmbedTestOnWebsite() {
    return (
        <HowToPage
            guide={GUIDE}
            page={HOWTO_PAGES.embed}
            keyPhrase="embed a test on your website"
            jumpTo={{ label: 'Get the code for your test', id: 'get-the-code' }}
        />
    );
}
