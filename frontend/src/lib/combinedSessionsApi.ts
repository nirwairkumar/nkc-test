import apiClient from '@/lib/apiClient';

// ── Combined Sessions ─────────────────────────────────────────────────────

export async function createCombinedSession(data: {
    created_by: string;
    test1_id: string;
    test2_id: string;
    title: string;
    description?: string;
    paper1_label?: string;
    paper2_label?: string;
    break_duration_minutes?: number;
    is_public?: boolean;
}) {
    try {
        const response = await apiClient.post('combined-sessions', data);
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchPublicCombinedSessions() {
    try {
        const response = await apiClient.get('combined-sessions/public');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchAdminCombinedSessions() {
    try {
        const response = await apiClient.get('combined-sessions/admin/all');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}


export async function fetchUserCombinedSessions(userId: string) {
    try {
        const response = await apiClient.get(`combined-sessions/user/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchCombinedSessionById(sessionId: string) {
    try {
        const response = await apiClient.get(`combined-sessions/${sessionId}`);
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteCombinedSession(sessionId: string) {
    try {
        await apiClient.delete(`combined-sessions/${sessionId}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}

// ── Combined Attempts ─────────────────────────────────────────────────────

export async function saveCombinedAttempt(data: {
    user_id: string;
    combined_session_id: string;
    paper1_data: {
        test_id: string;
        answers: any;
        score: number;
        total_marks: number;
        test_title: string;
        question_times?: any;
    };
    paper2_data: {
        test_id: string;
        answers: any;
        score: number;
        total_marks: number;
        test_title: string;
        question_times?: any;
    };
    total_score?: number;
}) {
    try {
        const response = await apiClient.post('combined-sessions/attempts/save', data);
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchUserCombinedAttempts(userId: string) {
    try {
        const response = await apiClient.get(`combined-sessions/attempts/user/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchCombinedAttemptById(attemptId: string) {
    try {
        const response = await apiClient.get(`combined-sessions/attempts/${attemptId}`);
        return { data: response.data?.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteCombinedAttempt(attemptId: string) {
    try {
        await apiClient.delete(`combined-sessions/attempts/${attemptId}`);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}
