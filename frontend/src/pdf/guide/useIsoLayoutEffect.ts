import { useEffect, useLayoutEffect } from 'react';

/** useLayoutEffect in the browser, useEffect while the page is pre-rendered (no SSR warning). */
export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
