import apiClient from '@/lib/apiClient';

export interface TestSection {
    id: string;
    name: string;
    instructions?: string;
    marks_per_question?: number | string;
    negative_marks?: number | string;
    question_type?: string;
    questions: Question[];
}

export interface Test {
    id: string; // uuid
    title: string;
    description: string;
    questions: Question[]; // JSONB (Used for Flat Mode)
    created_at: string;
    updated_at?: string;
    custom_id?: string;
    marks_per_question?: number | string;
    negative_marks?: number | string;
    duration?: number; // minutes
    revision_notes?: string;
    is_public?: boolean;
    visibility?: 'public' | 'unlisted' | 'private';
    creator_name?: string;
    creator_avatar?: string;
    created_by?: string;
    institution_name?: string;
    institution_logo?: string;
    slug?: string;
    og_image?: string; // Open Graph Image URL
    tags?: string[]; // Array of strings
    custom_category?: string;
    class_id?: string; // Optional Class Assignment
    settings?: TestSettings;

    // New Features
    has_scientific_calculator?: boolean;
    enable_section_mode?: boolean;
    sections?: TestSection[];
    section_marking_model?: 'section-wise' | 'question-wise'; // 'section-wise' is default

    // Enriched fields from Backend API
    creator_verified?: boolean;
    categories?: {
        id: string;
        name: string;
    }[];
    computed_max_marks?: {
        total_max_marks: number;
        section_max_marks?: Record<string, number>;
    };
}

export interface TestSettings {
    attempt_limit?: number; // 1 for single attempt
    strict_timer?: boolean; // Server-side time validation
    allow_flexible_timer?: boolean; // Let user disable timer
    tab_switch_mode?: 'warming' | 'strict' | 'off'; // 2 warning then submit, or instant submit
    disable_copy_paste?: boolean;
    disable_actions?: boolean; // Right click, etc
    force_fullscreen?: boolean;
    shuffle_questions?: boolean;
    show_results_immediate?: boolean;
    schedule?: {
        enabled: boolean;
        start_time?: string;
        end_time?: string;
    };
    start_form?: {
        enabled: boolean;
        fields: { label: string; required: boolean }[];
    };
    block_back_button?: boolean;
}


export interface Question {
    id: number;
    type?: 'single' | 'multiple' | 'numerical' | 'single-advance' | 'comprehension'; // Default 'single'
    question: string;
    image?: string;
    passageContent?: string; // For comprehension type
    groupId?: string; // To group questions in editor
    options?: { [key: string]: string }; // Optional for numerical
    optionImages?: { [key: string]: string };
    correctAnswer: string | string[] | { min: number, max: number }; // Dynamic type
    marks?: number | string;
    negativeMarks?: number | string;
    typingMode?: 'en' | 'hi';
    originalIndex?: number; // Added to strictly track index when shuffling
}

// ---------------- TEST MANAGEMENT (BACKEND) ----------------

export async function fetchAllTests(options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    signal?: AbortSignal;
}) {
    const { page = 1, limit = 12, searchQuery = '', signal } = options || {};
    try {
        const response = await apiClient.get('/tests/all', {
            params: {
                page,
                limit,
                search_query: searchQuery
            },
            signal
        });
        return { data: response.data.tests, error: null, meta: response.data.meta };
    } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            // Rethrow cancellation so caller knows
            throw error;
        }
        return { data: null, error };
    }
}


export async function createTest(testData: Partial<Test>) {
    try {
        const response = await apiClient.post('/tests/', testData);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function importTestJson(file: File) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/tests/import/json', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

export async function fetchAdvancedAnalysis(test: any, answers: Record<number, string>) {
    try {
        const response = await apiClient.post('/results/analyze', {
            test,
            answers
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

export async function updateTest(id: string, updates: Partial<Test>, isAdmin: boolean = false) {
    try {
        const endpoint = isAdmin ? `/tests/admin/${id}` : `/tests/${id}`;
        const response = await apiClient.put(endpoint, updates);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteTest(id: string, isAdmin: boolean = false) {
    try {
        const endpoint = isAdmin ? `/tests/admin/${id}` : `/tests/${id}`;
        const response = await apiClient.delete(endpoint);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function fetchTests(options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    excludeIds?: string[];
    categoryId?: string;
    signal?: AbortSignal;
}) {
    const { page = 1, limit = 12, searchQuery = '', categoryId, signal } = options || {};

    try {
        const response = await apiClient.get('/tests/feed', {
            params: {
                page,
                limit,
                search_query: searchQuery,
                category_id: categoryId
            },
            signal
        });
        // The backend returns { tests: [], meta: {} }
        return { data: response.data.tests, error: null, meta: response.data.meta };
    } catch (error: any) {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
            throw error;
        }
        console.error("Error fetching tests:", error);
        return { data: null, error: error };
    }
}

export async function fetchTestsByCreator(
    userId: string,
    options?: { searchQuery?: string; signal?: AbortSignal }
) {
    const { searchQuery = '', signal } = options || {};
    try {
        // Assuming we rely on the generic fetch with filter or add a specific one later.
        // For now, if backend has /tests/user/{uid} or we use filter:
        // Let's us /tests/user/{uid} if available, else filter.
        // Looking at backend `tests.py`, we haven't added `get_user_tests`.
        // But `ManageTests` expects it.
        // Let's implement it as a filter on `all` or `feed` or add endpoint.
        // We actually typically have `fetchUserTests`.
        // Let's check if we removed it.
        // I'll assume we need to add GET /tests/user/{uid} to backend or use client-side filter.
        // For now, let's use the /feed endpoint with a creator filter if supported, OR just /all and filter (bad performance).
        // Wait, `ManageTests` calls this.
        // I will add `get_user_tests` to `tests.py` later if needed.
        // For now, I'll return an empty list or error if not implemented, BUT
        // the user's `tests.py` likely DOES NOT have it yet based on my reads.
        // actually `tests.py` has `get_tests_feed`.

        // I will implement a quick workaround: fetch all and filter in frontend OR
        // Request the user to let me add the endpoint.
        // BUT I CAN add the endpoint to `tests.py` now.
        // Use `fetchUserTests` logic.

        // But to be safe and "Industrial Norm", I should have the endpoint.
        // I will add the function here and make it call `/tests/user/${userId}`.
        // And I will Ensure `routers/tests.py` has it.

        const response = await apiClient.get(`/tests/user/${userId}`, {
            params: { search_query: searchQuery },
            signal
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            throw error;
        }
        return { data: null, error };
    }
}

// Alias for compatibility
export const fetchTestsByUserId = fetchTestsByCreator;

export async function getNextTestId(prefix: 'M' | 'YT'): Promise<string> {
    try {
        const response = await apiClient.get('/tests/next-id', {
            params: { prefix }
        });
        return response.data?.next_id || `${prefix}001`;
    } catch (e) {
        console.error("Error generating ID", e);
        // Fallback
        return `${prefix}${Math.floor(Math.random() * 1000)}`;
    }
}

// ─── Test Data Cache (stale-while-revalidate) ─────────────────
const TEST_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function _getCachedTest(id: string): any | null {
    try {
        const raw = localStorage.getItem(`test_cache_${id}`);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > TEST_CACHE_TTL) {
            localStorage.removeItem(`test_cache_${id}`);
            return null;
        }
        return data;
    } catch { return null; }
}

function _setCachedTest(id: string, data: any) {
    try {
        localStorage.setItem(`test_cache_${id}`, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* storage full — ignore */ }
}

export async function fetchTestById(id: string, onCacheHit?: (data: any) => void) {
    // Serve stale cache immediately, revalidate in background
    const cached = _getCachedTest(id);
    if (cached && onCacheHit) {
        onCacheHit(cached);
    }
    try {
        const response = await apiClient.get(`/tests/${id}`);
        const data = response.data;
        _setCachedTest(id, data);
        return { data, error: null };
    } catch (error: any) {
        if (cached) return { data: cached, error: null }; // fallback to cache on error
        console.error("Error fetching test details:", error);
        return { data: null, error: error };
    }
}

// --- Aliases for Backend Unified Lookup ---
export const fetchTestBySlug = fetchTestById;
export const fetchTestByCustomId = fetchTestById;
export const fetchTestByCustomIdOrSlug = fetchTestById;

// Helper to get user ID from token
const getUserIdFromToken = () => {
    const token = localStorage.getItem('testoza_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub;
    } catch {
        return null;
    }
};

// ---------------- LIKE FUNCTIONALITY (Backend Proxy) ----------------

export async function toggleTestLike(testId: string, userIdArg?: string) {
    try {
        const userId = userIdArg || getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.post(`/social/tests/${testId}/like?user_id=${userId}`);
        return { error: null, liked: response.data.liked };
    } catch (error) {
        return { error };
    }
}

export async function getTestLikeCount(testId: string) {
    try {
        const response = await apiClient.get(`/social/tests/${testId}/like-count`);
        return { count: response.data.count, error: null };
    } catch (error) {
        return { count: 0, error };
    }
}

export async function getTestLikeStatus(testId: string, userIdArg?: string) {
    try {
        const userId = userIdArg || getUserIdFromToken();
        if (!userId) return { liked: false, error: null };
        const response = await apiClient.get(`/social/tests/${testId}/like-status?user_id=${userId}`);
        return { liked: response.data.liked, error: null };
    } catch (error) {
        return { liked: false, error };
    }
}
