/**
 * testoza.com/blooket-gimkit-alternative — other classroom games for Blooket and Gimkit users, and when to switch to a marked test.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/blooketGimkitAlternative.ts and the widget data in src/guides/comparisonData.ts.
 */
import { COMPARISON_PAGES } from '@/guides/comparisonData';
import { BLOOKET_GIMKIT_ALTERNATIVE as GUIDE } from '@/guides/blooketGimkitAlternative';
import HowToPage from './HowToPage';

export default function BlooketGimkitAlternative() {
    return <HowToPage guide={GUIDE} page={COMPARISON_PAGES.blooketGimkit} keyPhrase="Blooket and Gimkit alternatives" jumpTo={{ label: 'Game or test? Six moments', id: 'which-one' }} />;
}
