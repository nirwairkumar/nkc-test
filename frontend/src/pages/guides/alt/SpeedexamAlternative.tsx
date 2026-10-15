/**
 * testoza.com/speedexam-alternative — an attempt-metered exam service next to an exam platform with a join code.
 *
 * The page itself is AlternativePage.tsx, shared with the other "alternative" guides; the
 * writing lives in src/guides/speedexamAlternative.ts and the data the widgets read in src/guides/altData.ts.
 * Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { SPEEDEXAM_ALTERNATIVE as GUIDE } from '@/guides/speedexamAlternative';
import AlternativePage from './AlternativePage';

export default function SpeedexamAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.speedexam} keyPhrase="SpeedExam alternative" jumpTo={{ label: 'Do the attempt sums', id: 'attempts' }} fit />;
}
