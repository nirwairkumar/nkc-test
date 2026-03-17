import apiClient from '@/lib/apiClient';

export async function saveAttempt(user_id: string, test_id: string, answers: any, score?: number, metadata?: any) {
    try {
        const response = await apiClient.post('attempts/save', {
            user_id,
            test_id,
            answers,
            score,
            metadata
        });
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
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

export async function fetchAttemptsForTest(testId: string) {
    try {
        const response = await apiClient.get(`attempts/test/${testId}`);
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
