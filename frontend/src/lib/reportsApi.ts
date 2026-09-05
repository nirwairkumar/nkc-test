import apiClient from './apiClient';

export interface ReportCreatePayload {
    test_id: string;
    question_id: number;
    creator_id: string;
    reason: string;
    details?: string;
}

export interface Report {
    id: string;
    created_at: string;
    test_id?: string;
    question_id: number;
    reason: string;
    details: string | null;
    status: 'open' | 'solved';
    reporter_id: string | null;
    tests: {
        title: string;
        custom_id?: string;
    } | null;
}

// 1. Submit a report
export async function submitReport(payload: ReportCreatePayload) {
    try {
        const response = await apiClient.post('/reports/', payload);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message || 'Failed to submit report' };
    }
}

// 2. Fetch reports for the logged-in creator
export async function fetchCreatorReports(creatorId: string): Promise<{ data: Report[] | null; error: any }> {
    try {
        const response = await apiClient.get(`/reports/creator/${creatorId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message || 'Failed to fetch reports' };
    }
}

// 3. Update report status
export async function updateReportStatus(reportId: string, status: 'open' | 'solved') {
    try {
        const response = await apiClient.put(`/reports/${reportId}/status`, { status });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message || 'Failed to update report status' };
    }
}

// 4. Admin: Get report stats by user
export async function fetchAdminUsersReportStats(): Promise<{ data: Record<string, { total: number; open: number; solved: number }> | null; error: any }> {
    try {
        const response = await apiClient.get('/reports/admin/users-stats');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message || 'Failed to fetch admin report stats' };
    }
}

// 5. Admin: Get reports for a specific user
export async function fetchAdminUserReports(userId: string): Promise<{ data: Report[] | null; error: any }> {
    try {
        const response = await apiClient.get(`/reports/admin/user/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message || 'Failed to fetch admin user reports' };
    }
}
