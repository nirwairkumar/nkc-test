/**
 * testoza.com/classplus-alternative — what an app platform sells, which half of it a test platform can replace, and what moving only the exams looks like.
 *
 * The page itself is AlternativePage.tsx, shared with the other three "alternative"
 * guides; the writing lives in src/guides/classplusAlternative.ts and the data the
 * widgets read in src/guides/altData.ts. Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { CLASSPLUS_ALTERNATIVE as GUIDE } from '@/guides/classplusAlternative';
import AlternativePage from './AlternativePage';

export default function ClassplusAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.classplus} keyPhrase="Classplus alternative" />;
}
