/**
 * testoza.com/testportal-alternative — a business-first assessment tool next to software built for Indian student exams.
 *
 * The page itself is AlternativePage.tsx, shared with the other three "alternative"
 * guides; the writing lives in src/guides/testportalAlternative.ts and the data the
 * widgets read in src/guides/altData.ts. Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { TESTPORTAL_ALTERNATIVE as GUIDE } from '@/guides/testportalAlternative';
import AlternativePage from './AlternativePage';

export default function TestportalAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.testportal} keyPhrase="Testportal alternative" jumpTo={{ label: 'Where the marking differs', id: 'marking' }} />;
}
