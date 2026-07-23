import apiClient from '@/lib/apiClient';
import { withExponentialRetry } from '@/lib/testResilience';
import { supabase } from '@/integrations/supabase/client';

export async function saveAttempt(user_id: string, test_id: string, answers: any, score?: number, metadata?: any, completion_percentage?: number) {
    try {
        const response = await apiClient.post('attempts/save', {
            user_id,
            test_id,
            answers,
            score,
            metadata,
            completion_percentage
        });
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

/**
 * saveAttemptWithRetry — Same as saveAttempt but wraps it with exponential
 * backoff (up to 5 tries: 1s, 2s, 4s, 8s, 15s). Use this for final submission.
 * @param onRetry optional callback fired before each retry (use to show toast)
 */

export async function saveAttemptWithRetry(
    user_id: string,
    test_id: string,
    answers: any,
    score?: number,
    metadata?: any,
    completion_percentage?: number,
    onRetry?: (attempt: number) => void
) {
    try {
        const data = await withExponentialRetry(
            () => apiClient.post('attempts/save', { user_id, test_id, answers, score, metadata, completion_percentage })
                .then(res => res.data?.data),
            {
                maxAttempts: 5,
                baseDelayMs: 1000,
                maxDelayMs: 15000,
                onRetry: (attempt, _err) => onRetry?.(attempt),
            }
        );
        return { data, error: null };
    } catch (backendError: any) {
        console.warn("Backend saveAttempt failed, trying direct Supabase fallback...", backendError);
        try {
            const { data: dbData, error: dbError } = await (supabase as any)
                .from('user_tests')
                .insert({
                    user_id,
                    test_id,
                    answers,
                    score: score ?? 0,
                    metadata: metadata || {}
                })
                .select();

            if (dbError) throw dbError;

            try {
                await (supabase as any)
                    .from('test_registrations')
                    .update({
                        status: 'submitted',
                        completion_percentage: completion_percentage ?? 100,
                        last_active_at: new Date().toISOString()
                    })
                    .eq('user_id', user_id)
                    .eq('test_id', test_id);
            } catch (regErr) {
                console.warn("Could not update registration status in fallback:", regErr);
            }

            return { data: dbData, error: null };
        } catch (directError: any) {
            console.error("Direct Supabase fallback also failed:", directError);
            return { data: null, error: backendError || directError };
        }
    }
}

export async function fetchUserAttempts(user_id: string) {
    try {
        const response = await apiClient.get(`attempts/user/${user_id}`);
        // The backend returns the enriched list directly
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function checkUserTestAttempt(user_id: string, test_id: string) {
    try {
        const response = await apiClient.get(`attempts/check/${user_id}/${test_id}`);
        return { hasAttempted: response.data?.hasAttempted, error: null };
    } catch (error: any) {
        // Default to safe false if error, or pass error
        return { hasAttempted: false, error };
    }
}

export async function registerTestStart(user_id: string | null, test_id: string) {
    try {
        const response = await apiClient.post('attempts/register', {
            user_id,
            test_id
        });
        return { success: response.data?.success, error: null };
    } catch (error: any) {
        return { success: false, error };
    }
}

export async function fetchAttemptsForTest(testId: string, excludeAnswers: boolean = false) {
    try {
        const response = await apiClient.get(`attempts/test/${testId}`, {
            params: { exclude_answers: excludeAnswers }
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchAttemptById(attemptId: string) {
    try {
        const response = await apiClient.get(`attempts/${attemptId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteAttempt(attemptId: string) {
    try {
        await apiClient.delete(`attempts/${attemptId}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

export async function deleteRegistration(testId: string, userId: string) {
    try {
        await apiClient.delete(`attempts/registration/${testId}/${userId}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}
