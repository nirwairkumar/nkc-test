/**
 * Everything the JEE guide needs to draw maths, in one module that jeeKatex.ts
 * imports on demand: KaTeX with mhchem (\ce{}) and its CSS, plus the Sy Pad's
 * own preview builder (which imports KaTeX itself). Keeping it behind a dynamic
 * import means the guide's text never waits for the ~75 KB KaTeX chunk.
 */
import katex from 'katex';
import 'katex/dist/contrib/mhchem'; // registers \ce{} and \pu{} on this katex instance
import 'katex/dist/katex.min.css';

export { prepareExpressionForKaTeX } from '@/components/math-keyboard/previewTex';
export default katex;
