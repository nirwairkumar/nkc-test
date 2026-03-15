import apiClient from '@/lib/apiClient';

export interface TestSection {
    id: string;
    name: string;
    instructions?: string;
    marks_per_question?: number | string;
    negative_marks?: number | string;
    question_type?: string;
    questions: Question[];
    attempt_control?: {
        enabled: boolean;
        max_attempts?: number;
        mode?: 'hard' | 'soft' | string;
        soft_type?: 'first_n' | 'best_n' | string;
    };
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
        const response = await apiClient.get('tests/all', {
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
        const response = await apiClient.post('tests/', testData, {
            timeout: 60000, // 60s — test payloads can be very large
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function importTestJson(file: File) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('tests/import/json', formData, {
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
        const response = await apiClient.post('results/analyze', {
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
        const endpoint = isAdmin ? `tests/admin/${id}` : `tests/${id}`;
        const response = await apiClient.put(endpoint, updates);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteTest(id: string, isAdmin: boolean = false) {
    try {
        const endpoint = isAdmin ? `tests/admin/${id}` : `tests/${id}`;
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
    idsOnly?: boolean;
}) {
    const { page = 1, limit = 12, searchQuery = '', categoryId, signal, idsOnly = false } = options || {};

    try {
        const response = await apiClient.get('tests/feed', {
            params: {
                page,
                limit,
                search_query: searchQuery,
                category_id: categoryId,
                ids_only: idsOnly
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
    options?: { searchQuery?: string; signal?: AbortSignal; idsOnly?: boolean }
) {
    const { searchQuery = '', signal, idsOnly = false } = options || {};
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await apiClient.get(`tests/user/${userId}`, {
                params: { search_query: searchQuery, ids_only: idsOnly },
                signal
            });
            return { data: response.data, error: null };
        } catch (error: any) {
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                throw error;
            }
            // Retry on timeout or network errors (not on 4xx/5xx)
            const isRetryable = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network Error'));
            if (isRetryable && attempt < maxRetries) {
                console.warn(`[testsApi] fetchTestsByCreator attempt ${attempt + 1} failed, retrying...`);
                await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
                continue;
            }
            return { data: null, error };
        }
    }
    return { data: null, error: new Error('Max retries exceeded') };
}

// Alias for compatibility
export const fetchTestsByUserId = fetchTestsByCreator;

let snippetQueue: string[] = [];
let snippetResolvers: Map<string, { resolve: Function, reject: Function }[]> = new Map();
let snippetTimeout: any = null;

export function fetchTestCardSnippet(testId: string): Promise<{ data: any, error: any }> {
    return new Promise((resolve, reject) => {
        if (!snippetResolvers.has(testId)) {
            snippetResolvers.set(testId, []);
            snippetQueue.push(testId);
        }
        snippetResolvers.get(testId)!.push({ resolve, reject });

        if (!snippetTimeout) {
            snippetTimeout = setTimeout(processSnippetQueue, 50);
        }
    });
}

async function processSnippetQueue() {
    const idsToFetch = [...snippetQueue];
    const resolversMap = new Map(snippetResolvers);

    snippetQueue = [];
    snippetResolvers.clear();
    snippetTimeout = null;

    try {
        // Chunk requests to avoid URL too long, though UUIDs are ~36 chars so 50 is fine.
        const chunkSize = 20;
        for (let i = 0; i < idsToFetch.length; i += chunkSize) {
            const chunk = idsToFetch.slice(i, i + chunkSize);
            const response = await apiClient.get('tests/batch', {
                params: { ids: chunk.join(',') }
            });
            const fetchedData = response.data || [];
            const dataMap = new Map();
            fetchedData.forEach((d: any) => dataMap.set(d.id, d));

            for (const id of chunk) {
                const resolvers = resolversMap.get(id);
                if (resolvers) {
                    const data = dataMap.get(id);
                    resolvers.forEach(({ resolve }) => {
                        if (data) resolve({ data, error: null });
                        else resolve({ data: null, error: new Error('Test not found') });
                    });
                    resolversMap.delete(id);
                }
            }
        }
    } catch (error: any) {
        // Reject any remaining
        for (const [id, resolvers] of resolversMap.entries()) {
            resolvers.forEach(({ resolve }) => resolve({ data: null, error }));
        }
    }
}

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
        const response = await apiClient.get(`tests/${id}`);
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

export async function voteTest(testId: string, voteType: 1 | -1, userIdArg?: string) {
    try {
        const userId = userIdArg || getUserIdFromToken();
        if (!userId) throw new Error("Not authenticated");
        const response = await apiClient.post(`social/tests/${testId}/vote`, {
            user_id: userId,
            vote_type: voteType
        });
        return { error: null, vote: response.data.vote };
    } catch (error) {
        return { error };
    }
}

let voteQueue: string[] = [];
let voteResolvers: Map<string, { resolve: Function, reject: Function }[]> = new Map();
let voteTimeout: any = null;

export function getTestVoteStats(testId: string, userIdArg?: string): Promise<{ upvotes: number, downvotes: number, user_vote: number, error: any }> {
    return new Promise((resolve, reject) => {
        const userId = userIdArg || getUserIdFromToken();

        if (!voteResolvers.has(testId)) {
            voteResolvers.set(testId, []);
            voteQueue.push(testId);
        }
        voteResolvers.get(testId)!.push({ resolve, reject });

        if (!voteTimeout) {
            voteTimeout = setTimeout(() => processVoteQueue(userId), 50);
        }
    });
}

async function processVoteQueue(userId: string | null) {
    const idsToFetch = [...voteQueue];
    const resolversMap = new Map(voteResolvers);

    voteQueue = [];
    voteResolvers.clear();
    voteTimeout = null;

    try {
        const chunkSize = 20;
        for (let i = 0; i < idsToFetch.length; i += chunkSize) {
            const chunk = idsToFetch.slice(i, i + chunkSize);
            const params: any = { ids: chunk.join(',') };
            if (userId) params.user_id = userId;

            const response = await apiClient.get('social/tests/batch/votes', { params });
            const fetchedData = response.data || [];
            const dataMap = new Map();
            fetchedData.forEach((d: any) => dataMap.set(d.test_id, d));

            for (const id of chunk) {
                const resolvers = resolversMap.get(id);
                if (resolvers) {
                    const data = dataMap.get(id) || { upvotes: 0, downvotes: 0, user_vote: 0 };
                    resolvers.forEach(({ resolve }) => resolve({ ...data, error: null }));
                    resolversMap.delete(id);
                }
            }
        }
    } catch (error: any) {
        for (const [id, resolvers] of resolversMap.entries()) {
            resolvers.forEach(({ resolve }) => resolve({ upvotes: 0, downvotes: 0, user_vote: 0, error }));
        }
    }
}
