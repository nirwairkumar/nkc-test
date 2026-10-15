/**
 * testoza.com/canvas-quizzes-alternative — quizzes inside a course system next to an exam room, after Free-for-Teacher.
 *
 * The page itself is AlternativePage.tsx, shared with the other "alternative" guides; the
 * writing lives in src/guides/canvasQuizzesAlternative.ts and the data the widgets read in src/guides/altData.ts.
 * Edit those, not this file.
 */
import { ALT_RIVALS } from '@/guides/altData';
import { CANVAS_QUIZZES_ALTERNATIVE as GUIDE } from '@/guides/canvasQuizzesAlternative';
import AlternativePage from './AlternativePage';

export default function CanvasQuizzesAlternative() {
    return <AlternativePage guide={GUIDE} rival={ALT_RIVALS.canvas} keyPhrase="Canvas quizzes alternative" jumpTo={{ label: 'What changed in 2026', id: 'free-for-teacher' }} fit />;
}
