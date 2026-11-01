/**
 * testoza.com/socrative-alternative — a lesson check-in next to a marked test, and how to keep both.
 *
 * The page itself is AlternativePage.tsx, shared with the other "alternative" guides; the
 * writing lives in src/guides/socrativeAlternative.ts and the data the widgets read in src/guides/altData.ts.
 * Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { SOCRATIVE_ALTERNATIVE as GUIDE } from '@/guides/socrativeAlternative';
import AlternativePage from './AlternativePage';

export default function SocrativeAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.socrative} keyPhrase="Socrative alternative" jumpTo={{ label: 'Percentage or marks?', id: 'two-scores' }} fit />;
}
