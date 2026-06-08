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
    institution_color?: string;
    institution_font?: string;
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
    merged_sections?: { label: string; section_ids: string[] }[];

    // Enriched fields from Backend API
    creator_verified?: boolean;
    categories?: {
        id: string;
        name: string;
    }[];
    total_max_marks?: number;
    total_questions?: number;
    max_attempts_per_question?: number;
    computed_max_marks?: {
        total_max_marks: number;
        section_max_marks: Record<string, number>;
    };
}

export interface TestSettings {
    attempt_limit?: number; // 1 for single attempt
    strict_timer?: boolean; // Server-side time validation
    allow_flexible_timer?: boolean; // Let user disable timer
    tab_switch_mode?: 'warming' | 'strict' | 'on' | 'off'; // 'on' = detect, 'off' = ignore, legacy: 'warming'/'strict'
    disable_copy_paste?: boolean;
    disable_actions?: boolean; // Right click, etc
    force_fullscreen?: boolean;
    shuffle_questions?: boolean;
    show_results_immediate?: boolean;
    violation_limit?: number | null; // null = warn only, number = auto-submit after N violations
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
    disable_exit_button?: boolean;
    conduct_exam?: {
        enabled: boolean;
        conduct_slug: string; // secure slug >10 chars used for exam link
        original_slug?: string; // preserved original slug (public tests)
    };
}

/** Generate a secure conduct slug (always >10 chars): title-slug + 8-char random hex */
export function generateConductSlug(title: string): string {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 20);
    const random = Math.random().toString(36).substring(2, 10); // 8 chars
    const slug = base ? `${base}-${random}` : `exam-${random}`;
    // Guarantee minimum length of 11 chars
    return slug.length >= 11 ? slug : `exam-${slug}-${random}`;
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
    topic?: string; // AI generated or manual topic
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

// ---------------- CLONE ----------------

/**
 * Clone a public test into the cloner's creator dashboard.
 * The backend validates:
 *   - Source test is public
 *   - Cloner is not the original author
 *   - Cloner has an active subscription
 */
export async function cloneTest(testId: string, clonerId: string) {
    try {
        const response = await apiClient.post(`tests/${testId}/clone`, { cloner_id: clonerId });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

export async function adminCloneTest(testId: string, targetUserId: string) {
    try {
        const response = await apiClient.post(`tests/admin/${testId}/clone`, { target_user_id: targetUserId });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
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

// ---------------- AI & UTILITIES ----------------

export async function generateTopics(questions: { id: string | number; text: string }[]) {
    try {
        const response = await apiClient.post('ai/generate/topics', {
            questions: questions.map(q => ({ id: String(q.id), text: q.text }))
        });
        return { data: response.data.topics as Record<string, string>, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

// ---------------- SOLUTIONS MANAGEMENT ----------------

export async function saveSolutions(testId: string, solutions: Record<string, string>) {
    try {
        const response = await apiClient.put(`tests/${testId}/solutions`, { solutions });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

export async function fetchSolutions(testId: string) {
    try {
        const response = await apiClient.get(`tests/${testId}/solutions`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
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
    options?: { searchQuery?: string; signal?: AbortSignal; idsOnly?: boolean; profileView?: boolean }
) {
    const { searchQuery = '', signal, idsOnly = false, profileView = false } = options || {};
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await apiClient.get(`tests/user/${userId}`, {
                params: { search_query: searchQuery, ids_only: idsOnly, profile_view: profileView },
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
        // Prevent invalid IDs (e.g. skeletons) from crashing the PostgreSQL batch query
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!testId || !uuidRegex.test(testId)) {
            resolve({ data: null, error: new Error('Invalid Test ID') });
            return;
        }

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
        const response = await apiClient.get('tests/next-id', {
            params: { prefix }
        });
        return response.data?.next_id || `${prefix}001`;
    } catch (e) {
        console.error("Error generating ID", e);
        // Fallback
        return `${prefix}${Math.floor(Math.random() * 1000)}`;
    }
}

export async function fetchConductModeTests() {
    try {
        const response = await apiClient.get('tests/admin/conduct-mode-tests');
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.response?.data?.detail || error.message };
    }
}

// ─── Test Data Cache (stale-while-revalidate) ─────────────────
const TEST_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function _getCachedTest(id: string, excludeQuestions: boolean = false): any | null {
    try {
        const raw = localStorage.getItem(`test_cache_${id}_eq_${excludeQuestions}`);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > TEST_CACHE_TTL) {
            localStorage.removeItem(`test_cache_${id}_eq_${excludeQuestions}`);
            return null;
        }
        return data;
    } catch { return null; }
}

function _setCachedTest(id: string, data: any, excludeQuestions: boolean = false) {
    try {
        localStorage.setItem(`test_cache_${id}_eq_${excludeQuestions}`, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* storage full — ignore */ }
}

export async function fetchTestById(id: string, onCacheHit?: (data: any) => void, excludeQuestions: boolean = false) {
    // Serve stale cache immediately, revalidate in background
    const cached = _getCachedTest(id, excludeQuestions);
    if (cached && onCacheHit) {
        onCacheHit(cached);
    }

    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await apiClient.get(`tests/${id}`, {
                params: { exclude_questions: excludeQuestions }
            });
            const data = response.data;
            _setCachedTest(id, data, excludeQuestions);
            return { data, error: null };
        } catch (error: any) {
            // Don't retry on 404 (test genuinely doesn't exist or access revoked)
            if (error.response?.status === 404) {
                try { localStorage.removeItem(`test_cache_${id}_eq_${excludeQuestions}`); } catch {}
                return { data: null, error: error };
            }

            // Retryable: network errors, timeouts, 5xx server errors
            const isRetryable = !error.response ||
                error.response?.status >= 500 ||
                error.code === 'ECONNABORTED' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Network Error');

            if (isRetryable && attempt < maxRetries) {
                console.warn(`[testsApi] fetchTestById attempt ${attempt + 1} failed, retrying in ${(attempt + 1)}s...`);
                await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
                continue;
            }

            // All retries exhausted
            if (cached) return { data: cached, error: null }; // fallback to cache on error
            console.error("Error fetching test details:", error);
            return { data: null, error: error };
        }
    }

    // Should not reach here, but safety fallback
    if (cached) return { data: cached, error: null };
    return { data: null, error: new Error('Max retries exceeded') };
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

let progressQueue: string[] = [];
let progressResolvers: Map<string, { resolve: Function, reject: Function }[]> = new Map();
let progressTimeout: any = null;

export function getTestAttemptStatus(testId: string, userIdArg?: string): Promise<{ status: 'in_progress' | 'submitted' | null, score: number | null, total_marks: number | null, error: any }> {
    return new Promise((resolve, reject) => {
        const userId = userIdArg || getUserIdFromToken();
        if (!userId) {
            resolve({ status: null, score: null, total_marks: null, error: null });
            return;
        }

        if (!progressResolvers.has(testId)) {
            progressResolvers.set(testId, []);
            progressQueue.push(testId);
        }
        progressResolvers.get(testId)!.push({ resolve, reject });

        if (!progressTimeout) {
            progressTimeout = setTimeout(() => processProgressQueue(userId), 50);
        }
    });
}

async function processProgressQueue(userId: string) {
    const idsToFetch = [...progressQueue];
    const resolversMap = new Map(progressResolvers);

    progressQueue = [];
    progressResolvers.clear();
    progressTimeout = null;

    try {
        const chunkSize = 20;
        for (let i = 0; i < idsToFetch.length; i += chunkSize) {
            const chunk = idsToFetch.slice(i, i + chunkSize);
            const response = await apiClient.post('attempts/batch-status', {
                user_id: userId,
                test_ids: chunk
            });
            const dataMap = response.data || {};

            for (const id of chunk) {
                const resolvers = resolversMap.get(id);
                if (resolvers) {
                    // Try exact match then lowercase match for ID consistency
                    const statusData = dataMap[id] || dataMap[id.toLowerCase()] || { status: null, score: null, total_marks: null };
                    resolvers.forEach(({ resolve }) => resolve({ ...statusData, error: null }));
                    resolversMap.delete(id);
                }
            }
        }
    } catch (error: any) {
        for (const [id, resolvers] of resolversMap.entries()) {
            resolvers.forEach(({ resolve }) => resolve({ status: null, score: null, total_marks: null, error }));
        }
    }
}
