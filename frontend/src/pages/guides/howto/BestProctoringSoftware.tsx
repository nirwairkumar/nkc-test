/**
 * testoza.com/best-proctoring-software — eleven proctoring tools, matched to the stakes and the candidates' devices.
 *
 * The page itself is HowToPage.tsx, shared with the "how to" guides; the writing lives in
 * src/guides/bestProctoringSoftware.ts and the widget data in src/guides/comparisonData.ts.
 */
import { COMPARISON_PAGES } from '@/guides/comparisonData';
import { BEST_PROCTORING_SOFTWARE as GUIDE } from '@/guides/bestProctoringSoftware';
import HowToPage from './HowToPage';

export default function BestProctoringSoftware() {
    return <HowToPage guide={GUIDE} page={COMPARISON_PAGES.proctoring} keyPhrase="Best proctoring software" jumpTo={{ label: 'See the eleven tools', id: 'at-a-glance' }} />;
}
