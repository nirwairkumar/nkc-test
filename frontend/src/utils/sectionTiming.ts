/**
 * Timed sections (SSC CGL / CHSL 2026 style): every section of a test has its own
 * minutes, sections open one after another in the paper's order, and a section closes
 * when its minutes are up. A candidate can't go back to a closed section or move on
 * early, so time left over in a section is lost.
 *
 * A test uses timed sections when it is in section mode and every section has
 * `duration_minutes` above zero. The test's own `duration` is then the sum.
 *
 * The open section is worked out backwards from the time left on the paper's one clock:
 * with T seconds left, it is the first section whose later sections need less than T. So a
 * refresh, a resumed attempt and an exam session's server deadline need no extra state. A
 * late start (less time than the sum) shortens the first sections; extra time from an
 * examiner lengthens the section that is open, because `floor` (the furthest section
 * reached) never lets the candidate move back.
 */

interface SectionLike {
    duration_minutes?: number | string | null;
    questions?: unknown[];
}

interface TestLike {
    enable_section_mode?: boolean;
    sections?: SectionLike[] | null;
}

/** Minutes of each section, or null when the test doesn't time its sections. */
export function sectionMinutes(test: TestLike | null | undefined): number[] | null {
    if (!test?.enable_section_mode || !Array.isArray(test.sections) || test.sections.length === 0) return null;
    const minutes = test.sections.map((s) => Number(s?.duration_minutes));
    return minutes.every((m) => Number.isFinite(m) && m > 0) ? minutes : null;
}

/** Total minutes of a timed-sections test (null when it doesn't time its sections). */
export function sectionMinutesTotal(test: TestLike | null | undefined): number | null {
    const minutes = sectionMinutes(test);
    return minutes ? minutes.reduce((a, b) => a + b, 0) : null;
}

export interface OpenSection {
    /** Index of the open section. */
    index: number;
    /** Seconds left in it. */
    secondsLeft: number;
    /** Its full length in seconds. */
    seconds: number;
}

/**
 * The section open with `secondsLeft` on the paper's clock. `floor` is the furthest
 * section already reached; the result never goes below it.
 */
export function openSection(minutes: number[], secondsLeft: number, floor = 0): OpenSection {
    const last = minutes.length - 1;
    // after[i]: seconds needed by the sections after i.
    const after = minutes.map((_, i) => minutes.slice(i + 1).reduce((a, b) => a + b, 0) * 60);
    let index = last;
    for (let i = 0; i < minutes.length; i++) {
        if (secondsLeft > after[i]) {
            index = i;
            break;
        }
    }
    index = Math.min(last, Math.max(index, floor));
    return { index, secondsLeft: Math.max(0, Math.round(secondsLeft - after[index])), seconds: Math.round(minutes[index] * 60) };
}

/** First and last question index (in the test's flat question list) of every section. */
export function sectionRanges(sections: SectionLike[]): { start: number; end: number }[] {
    let start = 0;
    return sections.map((s) => {
        const count = Array.isArray(s?.questions) ? s.questions.length : 0;
        const range = { start, end: start + count - 1 };
        start += count;
        return range;
    });
}

/** "15 min", "1 h 30 min". */
export function formatSectionMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
}
