/**
 * testoza.com/mercer-mettl-alternative — enterprise proctoring next to everyday tests on students’ phones.
 *
 * The page itself is AlternativePage.tsx, shared with the other "alternative" guides; the
 * writing lives in src/guides/mettlAlternative.ts and the data the widgets read in src/guides/altData.ts.
 * Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { METTL_ALTERNATIVE as GUIDE } from '@/guides/mettlAlternative';
import AlternativePage from './AlternativePage';

export default function MettlAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.mettl} keyPhrase="Mercer Mettl alternative" jumpTo={{ label: 'Laptop or phone?', id: 'phones' }} fit />;
}
