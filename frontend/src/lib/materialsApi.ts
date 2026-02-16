import apiClient from '@/lib/apiClient';

export interface Material {
    id: string;
    user_id: string;
    title: string;
    type: 'file' | 'link' | 'external';
    url: string;
    thumbnail_url?: string;
    created_at: string;
    file_path?: string;
    class_id?: string; // Optional class assignment
}

export const fetchMaterials = async (userId: string) => {
    try {
        const response = await apiClient.get(`/materials/user/${userId}`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const uploadFileMaterial = async (file: File, title: string, userId: string, classId?: string) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('user_id', userId);
        if (classId) formData.append('class_id', classId);

        const response = await apiClient.post('/materials/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const addLinkMaterial = async (url: string, title: string, userId: string, type: 'link' | 'external' = 'link', thumbnailUrl?: string, classId?: string) => {
    try {
        const response = await apiClient.post('/materials/link', {
            user_id: userId,
            title,
            url,
            type,
            thumbnail_url: thumbnailUrl,
            class_id: classId
        });
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};

export const deleteMaterial = async (id: string, filePath?: string) => {
    try {
        const params = filePath ? { file_path: filePath } : {};
        const response = await apiClient.delete(`/materials/${id}`, { params });
        return { error: null };
    } catch (error: any) {
        return { error };
    }
};

// Helper: Extract YouTube info + Title via NoEmbed (Kept Client side as it uses public API)
export const getYouTubeInfo = async (url: string) => {
    // Comprehensive regex to handle all YouTube URL formats including live streams
    const regExp = /^.*(?:youtu\.be\/|youtube\.com\/(?:live\/|watch\?v=|embed\/|v\/|shorts\/)|v\/|u\/\w\/|&v=)([0-9A-Za-z_-]{11})(?:[?&].*)?$/;
    const match = url.match(regExp);

    if (match && match[1].length === 11) {
        const videoId = match[1];
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        // Try Fetching Title using NoEmbed (Public oEmbed service, no API key needed)
        let title = "";
        try {
            const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.title) title = data.title;
        } catch (e) {
            console.warn("Failed to fetch YouTube title", e);
        }

        return { videoId, thumbnail, title };
    }
    return null;
};
