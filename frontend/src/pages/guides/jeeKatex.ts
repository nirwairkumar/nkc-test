/**
 * KaTeX for the JEE guide, loaded on demand (see jeeKatexBundle.ts) so the
 * guide's text never waits for it. Components that draw maths are in jeeTex.tsx.
 */
import { useEffect, useState } from 'react';

type Bundle = typeof import('./jeeKatexBundle');
export interface Katex {
    katex: Bundle['default'];
    prepare: Bundle['prepareExpressionForKaTeX'];
}

let loaded: Katex | null = null;
let loading: Promise<Katex> | null = null;

export function loadKatex(): Promise<Katex> {
    if (!loading) {
        loading = import('./jeeKatexBundle')
            .then((m) => (loaded = { katex: m.default, prepare: m.prepareExpressionForKaTeX }))
            .catch((err) => {
                loading = null;
                throw err;
            });
    }
    return loading;
}

/** KaTeX once it has loaded (starts loading on first use). */
export function useKatex(): Katex | null {
    const [k, setK] = useState<Katex | null>(loaded);
    useEffect(() => {
        if (k) return;
        let alive = true;
        loadKatex()
            .then((mod) => alive && setK(mod))
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [k]);
    return k;
}

/** Renders TeX, or null when it doesn't parse. `trust` allows the Sy Pad's \htmlClass markers. */
export function texToHtml(k: Katex, tex: string, display = false): string | null {
    try {
        return k.katex.renderToString(tex, { throwOnError: true, displayMode: display, trust: true, strict: 'ignore' });
    } catch {
        return null;
    }
}
