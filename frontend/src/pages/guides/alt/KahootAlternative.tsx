/**
 * testoza.com/kahoot-alternative — where the line falls between a quiz game and a test, and how to keep both.
 *
 * The page itself is AlternativePage.tsx, shared with the other three "alternative"
 * guides; the writing lives in src/guides/kahootAlternative.ts and the data the
 * widgets read in src/guides/altData.ts. Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { KAHOOT_ALTERNATIVE as GUIDE } from '@/guides/kahootAlternative';
import AlternativePage from './AlternativePage';

export default function KahootAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.kahoot} keyPhrase="Kahoot alternative" jumpTo={{ label: 'See how the points work', id: 'points' }} />;
}
