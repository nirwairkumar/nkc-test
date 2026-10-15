/**
 * testoza.com/proprofs-alternative — a per-quiz-taker price next to an exam platform with no per-student fee.
 *
 * The page itself is AlternativePage.tsx, shared with the other "alternative" guides; the
 * writing lives in src/guides/proprofsAlternative.ts and the data the widgets read in src/guides/altData.ts.
 * Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { PROPROFS_ALTERNATIVE as GUIDE } from '@/guides/proprofsAlternative';
import AlternativePage from './AlternativePage';

export default function ProprofsAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.proprofs} keyPhrase="ProProfs alternative" jumpTo={{ label: 'See what the price meter costs', id: 'meter' }} fit />;
}
