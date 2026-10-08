/**
 * Interactive parts of /ssc-mock-test-platform. Crawlers get each widget's fallbackHtml
 * from src/guides/sscMockTestPlatform.ts instead.
 *
 *   ssc-patterns  PatternExplorer.tsx: SSC papers and the TestoZa settings for each
 *   ssc-planner   SectionPlanner.tsx: what 15-minute sections do to one candidate
 *   ssc-exam      TimedExamDemo.tsx: a CGL Tier 1 paper with timed sections
 *   ssc-guess     GuessLab.tsx: when a guess is worth it under SSC marking
 */
import type { GuideWidget } from '@/guides/types';
import PatternExplorer from './PatternExplorer';
import SectionPlanner from './SectionPlanner';
import TimedExamDemo from './TimedExamDemo';
import GuessLab from './GuessLab';

export default function SscWidget({ name }: { name: GuideWidget }) {
    switch (name) {
        case 'ssc-patterns':
            return <PatternExplorer />;
        case 'ssc-planner':
            return <SectionPlanner />;
        case 'ssc-exam':
            return <TimedExamDemo />;
        case 'ssc-guess':
            return <GuessLab />;
        default:
            return null;
    }
}
