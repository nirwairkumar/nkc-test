import type { TestSettings } from '@/lib/testsApi';

/**
 * "Candidate inputs": what a candidate types in before the test starts (Name, Roll No…).
 * Stored as settings.start_form. The Settings panel and the live-exam card both edit it
 * through these helpers, so the two can never disagree about the rules.
 */

export type CandidateInput = { label: string; required: boolean };

export const CANDIDATE_INPUTS_TITLE = 'Candidate inputs';

const NAME: CandidateInput = { label: 'Name', required: true };

const SUGGESTIONS = ['Roll No', 'Batch', 'Phone', 'Email', 'School', 'City'];

export function inputsOn(settings?: TestSettings | null): boolean {
    return !!settings?.start_form?.enabled;
}

/** The fields candidates see. Blank labels are skipped; none left means just Name. */
export function inputFields(settings?: TestSettings | null): CandidateInput[] {
    const fields = (settings?.start_form?.fields || []).filter(f => f.label?.trim());
    return fields.length > 0 ? fields : [NAME];
}

/** Placeholder for a blank field: the next sensible label not already asked for. */
export function suggestLabel(taken: CandidateInput[], skip = 0): string {
    const used = new Set(taken.map(f => f.label.trim().toLowerCase()).filter(Boolean));
    const free = SUGGESTIONS.filter(l => !used.has(l.toLowerCase()));
    return free[skip] ?? 'Field name';
}

/** A blank label would show candidates an unnamed box, so blanks never get saved. */
export function cleanInputs(fields: CandidateInput[]): CandidateInput[] {
    return fields
        .map(f => ({ label: f.label.trim(), required: !!f.required }))
        .filter(f => f.label.length > 0);
}

export function withInputs(settings: TestSettings, fields: CandidateInput[]): TestSettings {
    return {
        ...settings,
        start_form: { enabled: settings.start_form?.enabled ?? true, fields },
    };
}

/**
 * Turning inputs off with results held would leave results nobody can match to a name,
 * so results switch to "show right away" — the panel has always done this.
 */
export function switchInputs(settings: TestSettings, on: boolean): { settings: TestSettings; notice?: string } {
    const fields = settings.start_form?.fields?.length ? settings.start_form.fields : [NAME];
    const next: TestSettings = { ...settings, start_form: { enabled: on, fields } };
    if (!on && settings.show_results_immediate === false) {
        next.show_results_immediate = true;
        return { settings: next, notice: `Results now show right after submitting, since ${CANDIDATE_INPUTS_TITLE.toLowerCase()} are off.` };
    }
    return { settings: next };
}
