import { useState, useEffect } from 'react';
import { fetchPublicCombinedSessions } from '@/lib/combinedSessionsApi';

/**
 * Hook to identify test IDs that are part of a combined session.
 * Used to hide individual "sub-tests" from global lists.
 */
export function useCombinedExclusion() {
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const { data } = await fetchPublicCombinedSessions();
                if (data && Array.isArray(data)) {
                    const ids = new Set<string>();
                    data.forEach(session => {
                        if (session.test1_id) ids.add(session.test1_id);
                        if (session.test2_id) ids.add(session.test2_id);
                    });
                    setExcludedIds(ids);
                }
            } catch (err) {
                console.error('useCombinedExclusion: Failed to fetch', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const isExcluded = (testId: string) => excludedIds.has(testId);

    return { excludedIds, isExcluded, loading };
}
