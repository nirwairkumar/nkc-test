/**
 * Interactive parts of /bank-exam-mock-test-platform. Crawlers get each widget's
 * fallbackHtml from src/guides/bankExamMockTestPlatform.ts instead.
 *
 *   bank-patterns  PatternExplorer.tsx: the IBPS, SBI and RRB papers, and the settings for each
 *   bank-planner   SectionPlanner.tsx: what a 20-minute section does to one candidate
 *   bank-exam      TimedExamDemo.tsx: an IBPS PO prelims paper with timed sections
 *   bank-marking   MarkingLab.tsx: five options, −¼ a wrong answer, and whether a guess pays
 *   bank-cutoff    CutoffLab.tsx: a sectional cut-off against the total
 */
import type { GuideWidget } from '@/guides/types';
import PatternExplorer from './PatternExplorer';
import SectionPlanner from './SectionPlanner';
import TimedExamDemo from './TimedExamDemo';
import MarkingLab from './MarkingLab';
import CutoffLab from './CutoffLab';

export default function BankWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'bank-patterns':
            return <PatternExplorer />;
        case 'bank-planner':
            return <SectionPlanner />;
        case 'bank-exam':
            return <TimedExamDemo />;
        case 'bank-marking':
            return <MarkingLab />;
        case 'bank-cutoff':
            return <CutoffLab />;
        default:
            return null;
    }
}
