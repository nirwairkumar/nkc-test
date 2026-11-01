/**
 * Facts shared by testoza.com/moodle-alternative's widgets and its crawler text.
 * Dependency-free, like the rest of src/guides (the Cloudflare worker imports it).
 *
 * Checked 2 October 2026:
 *   - MOODLE_FRACTIONS: question_bank::ensure_fraction_options_initialised() in
 *     moodle/moodle public/question/engine/bank.php. An answer's grade must be one of
 *     these fractions (or its negative), shown in the form as percentages.
 *   - MOODLE_RELEASES: moodledev.io/general/releases.
 *   - MOODLECLOUD_PLANS: moodlecloud.com/standard-plans (INR prices, billed yearly).
 */

/** Positive answer grades Moodle offers, as fractions of the question's mark (plus 0 = "None"). */
export const MOODLE_FRACTIONS = [
    1, 0.9, 0.8333333, 0.8, 0.75, 0.7, 0.6666667, 0.6, 0.5, 0.4, 0.3333333, 0.3, 0.25, 0.2, 0.1666667, 0.1428571, 0.125, 0.1111111, 0.1, 0.05,
];

/** How Moodle's form prints a fraction: 0.3333333 → "33.33333%", 0.25 → "25%". */
export function moodlePercent(fraction: number): string {
    const pct = Math.round(fraction * 1e7) / 1e5;
    return `${Number.isInteger(pct) ? pct : pct.toFixed(5).replace(/0+$/, '')}%`;
}

export interface MarkingMatch {
    /** The wrong-answer penalty as a share of the question's mark (0.25 for +4/−1). */
    wanted: number;
    /** The closest grade Moodle allows. */
    fraction: number;
    /** True when Moodle's grade gives the same penalty to two decimal places. */
    exact: boolean;
    /** The penalty Moodle would actually apply, in marks. */
    penalty: number;
}

/** The Moodle answer grade that gives a wrong answer `wrong` marks off a `right`-mark question. */
export function moodleMatch(right: number, wrong: number): MarkingMatch {
    const wanted = right > 0 ? wrong / right : 0;
    let fraction = 0;
    for (const f of [0, ...MOODLE_FRACTIONS]) {
        if (Math.abs(f - wanted) < Math.abs(fraction - wanted)) fraction = f;
    }
    const penalty = fraction * right;
    return { wanted, fraction, exact: Math.abs(penalty - wrong) < 0.005, penalty };
}

export interface MarkingPreset {
    id: string;
    label: string;
    right: number;
    wrong: number;
}

/** Common Indian schemes (marks for a right answer, marks off for a wrong one). */
export const MARKING_PRESETS: MarkingPreset[] = [
    { id: 'neet', label: 'NEET · JEE Main', right: 4, wrong: 1 },
    { id: 'cuet', label: 'CUET-UG', right: 5, wrong: 1 },
    { id: 'ssc', label: 'SSC CGL', right: 2, wrong: 0.5 },
    { id: 'ibps', label: 'IBPS PO', right: 1, wrong: 0.25 },
    { id: 'upsc', label: 'UPSC prelims', right: 2, wrong: 0.66 },
    { id: 'school', label: 'School test', right: 1, wrong: 0 },
];

export interface MoodleRelease {
    version: string;
    lts?: boolean;
    released: string;
    /** End of general (bug-fix) support. */
    general: string;
    /** End of security support. */
    security: string;
}

export const MOODLE_RELEASES: MoodleRelease[] = [
    { version: '4.5', lts: true, released: '2024-10-07', general: '2025-10-06', security: '2027-10-04' },
    { version: '5.0', released: '2025-04-14', general: '2026-04-20', security: '2026-10-05' },
    { version: '5.1', released: '2025-10-06', general: '2026-10-05', security: '2027-04-19' },
    { version: '5.2', released: '2026-04-20', general: '2027-04-19', security: '2027-10-04' },
];

/** The next long-term support release, as scheduled on 2 October 2026. */
export const MOODLE_NEXT_LTS = { version: '5.3', due: '2026-10-05' };

export interface MoodleCloudPlan {
    name: string;
    users: number;
    storage: string;
    rupees: number;
}

export const MOODLECLOUD_PLANS: MoodleCloudPlan[] = [
    { name: 'Starter', users: 50, storage: '1 GB', rupees: 15340 },
    { name: 'Mini', users: 100, storage: '2.5 GB', rupees: 25350 },
    { name: 'Small', users: 200, storage: '5 GB', rupees: 46690 },
    { name: 'Medium', users: 500, storage: '20 GB', rupees: 113380 },
    { name: 'Standard', users: 750, storage: '50 GB', rupees: 200070 },
];

/** ₹1,13,380 (Indian digit grouping, without relying on Intl in the worker). */
export function rupees(n: number): string {
    const s = String(Math.round(n));
    if (s.length <= 3) return `₹${s}`;
    const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `₹${head},${s.slice(-3)}`;
}

/** "5 October 2026" from an ISO date, without time-zone drift. */
export function longDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${d} ${months[m - 1]} ${y}`;
}
