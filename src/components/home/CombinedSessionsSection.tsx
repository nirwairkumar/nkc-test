import React, { useEffect, useState } from 'react';
import { fetchPublicCombinedSessions } from '@/lib/combinedSessionsApi';
import { fetchTestById } from '@/lib/testsApi';
import CombinedTestCard from '@/components/CombinedTestCard';
import { Layers } from 'lucide-react';

interface CombinedSessionsSectionProps {
    user?: any;
    filterTestIds?: Set<string>;
}

export default function CombinedSessionsSection({ user, filterTestIds }: CombinedSessionsSectionProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const { data } = await fetchPublicCombinedSessions();
                if (!data || !Array.isArray(data)) { setLoading(false); return; }

                // Enrich any session where test1/test2 are missing (backend enrichment failed)
                const enriched = await Promise.all(
                    data.map(async (session: any) => {
                        let { test1, test2 } = session;

                        // Fallback: fetch test data directly if backend didn't enrich
                        if (!test1 && session.test1_id) {
                            const res = await fetchTestById(session.test1_id).catch(() => ({ data: null }));
                            test1 = res.data ?? null;
                        }
                        if (!test2 && session.test2_id) {
                            const res = await fetchTestById(session.test2_id).catch(() => ({ data: null }));
                            test2 = res.data ?? null;
                        }

                        return { ...session, test1, test2 };
                    })
                );

                let processed = enriched;
                if (filterTestIds) {
                    processed = enriched.filter(s => filterTestIds.has(s.test1_id) || filterTestIds.has(s.test2_id));
                }

                setSessions(processed);
            } catch (err) {
                console.error('CombinedSessionsSection: failed to load', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (!loading && sessions.length === 0) return null;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                    <Layers className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        Combined Test Sessions
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        JEE Advanced-style sessions with Paper I + Break + Paper II
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                    <CombinedTestCard
                        key={session.id}
                        session={session}
                        user={user}
                    />
                ))}
            </div>
        </section>
    );
}
