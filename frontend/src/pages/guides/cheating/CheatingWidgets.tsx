/**
 * Interactive parts of /prevent-cheating-in-online-exams. Crawlers get each widget's
 * fallbackHtml from src/guides/preventCheatingOnlineExams.ts instead.
 *
 *   cheat-methods     MethodsExplorer.tsx: 16 ways candidates cheat, at home or in a room
 *   cheat-sandbox     SandboxDemo.tsx: the exam screen watching the reader's own browser
 *   cheat-copy-check  CopyCheck.tsx: shared wrong answers between two candidates
 *   cheat-planner     SetupPlanner.tsx: the setup for each kind of exam
 */
import type { GuideWidget } from '@/guides/types';
import MethodsExplorer from './MethodsExplorer';
import SandboxDemo from './SandboxDemo';
import CopyCheck from './CopyCheck';
import SetupPlanner from './SetupPlanner';

export default function CheatingWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'cheat-methods':
            return <MethodsExplorer />;
        case 'cheat-sandbox':
            return <SandboxDemo />;
        case 'cheat-copy-check':
            return <CopyCheck />;
        case 'cheat-planner':
            return <SetupPlanner />;
        default:
            return null;
    }
}
