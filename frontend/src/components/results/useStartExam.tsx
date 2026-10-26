import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { updateTest } from '@/lib/testsApi';
import { buildStartConductPayload } from '@/lib/conductExam';
import ConductExamDialog from '@/components/ConductExamDialog';

/**
 * "Start the exam" from a results page: the same dialog and payload as /dashboard.
 * `onStarted` gets the test with its new live settings, so the page can show the send step.
 */
export function useStartExam(onStarted: (test: any) => void) {
    const { isAdmin } = useAuth();
    const [target, setTarget] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const confirm = async (conductSlug: string) => {
        const test = target;
        if (!test) return;
        setLoading(true);
        const payload = buildStartConductPayload(test, conductSlug);
        const { error } = await updateTest(test.id, payload, isAdmin);
        setLoading(false);
        if (error) {
            toast.error(`Could not start the exam: ${(error as any).message || 'please try again'}`);
            return;
        }
        setTarget(null);
        toast.success('Exam is live. Now send the link to your class.');
        onStarted({ ...test, ...payload });
    };

    const dialog = target ? (
        <ConductExamDialog open test={target} loading={loading} onClose={() => setTarget(null)} onConfirm={confirm} />
    ) : null;

    return { startExam: setTarget as (test: any) => void, dialog };
}
