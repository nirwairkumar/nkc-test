import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { findLatexIssues, getKeptVersion, isKept, subscribeKept, type LatexIssue } from '@/lib/latexFixes';

/** The maths fixes for `text` the creator hasn't dismissed; with `delay`, only once typing has paused. */
export function useLatexFixes(text: string, delay = 0): LatexIssue[] {
    const [settled, setSettled] = useState(text);
    useEffect(() => {
        if (!delay) return;
        const id = window.setTimeout(() => setSettled(text), delay);
        return () => window.clearTimeout(id);
    }, [text, delay]);
    // A fix offered for older text would wipe out what was typed since, so none while typing.
    const ready = !delay || settled === text;
    const issues = useMemo(() => (ready && text ? findLatexIssues(text) : []), [ready, text]);
    const keptVersion = useSyncExternalStore(subscribeKept, getKeptVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keptVersion changes when one is dismissed
    return useMemo(() => issues.filter(issue => !isKept(issue.key)), [issues, keptVersion]);
}

/** Underline ranges for LatexRenderer, in the same order as the fixes. */
export const fixFlags = (issues: readonly LatexIssue[]) => issues.map(({ start, end }) => ({ start, end }));
