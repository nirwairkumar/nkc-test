import { useEffect, type RefObject } from 'react';

/** Sets the `inert` attribute (React 18 has no prop for it), so decorative UI can't take focus or clicks. */
export function useInert(ref: RefObject<HTMLElement>, on: boolean) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (on) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    }, [ref, on]);
}
