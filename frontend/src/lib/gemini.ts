import apiClient from '@/lib/apiClient';

export async function generateTestFromYouTube(
    url: string,
    userId: string,
    creatorName: string,
    creatorAvatar: string,
    language: string = 'English',
    signal?: AbortSignal
) {
    try {
        const response = await apiClient.post('/ai/generate/youtube', {
            url,
            language,
            user_id: userId,
            creator_name: creatorName,
            creator_avatar: creatorAvatar
        }, {
            signal
        });

        return response.data;
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        throw new Error(error.response?.data?.detail || "Failed to generate test.");
    }
}