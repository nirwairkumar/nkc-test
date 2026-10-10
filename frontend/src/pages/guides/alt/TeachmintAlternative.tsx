/**
 * testoza.com/teachmint-alternative — what Teachmint became, who that leaves out, and the exam half bought on its own.
 *
 * The page itself is AlternativePage.tsx, shared with the other three "alternative"
 * guides; the writing lives in src/guides/teachmintAlternative.ts and the data the
 * widgets read in src/guides/altData.ts. Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { TEACHMINT_ALTERNATIVE as GUIDE } from '@/guides/teachmintAlternative';
import AlternativePage from './AlternativePage';

export default function TeachmintAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.teachmint} keyPhrase="Teachmint alternative" />;
}
