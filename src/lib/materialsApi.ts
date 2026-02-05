import { supabase } from './supabaseClient';

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
    return await supabase
        .from('materials')
        .select(`
            *,
            classes ( name ) 
        `) // Join to get class name if needed
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
};

export const uploadFileMaterial = async (file: File, title: string, userId: string, classId?: string) => {
    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(fileName, file);

    if (uploadError) return { error: uploadError };

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(fileName);

    // 3. Insert into DB
    return await supabase.from('materials').insert({
        user_id: userId,
        title: title,
        type: 'file',
        url: publicUrl,
        file_path: fileName,
        class_id: classId || null
    }).select().single();
};

export const addLinkMaterial = async (url: string, title: string, userId: string, type: 'link' | 'external' = 'link', thumbnailUrl?: string, classId?: string) => {
    return await supabase.from('materials').insert({
        user_id: userId,
        title: title,
        type: type, // 'link' for video, 'external' for other links
        url: url,
        thumbnail_url: thumbnailUrl,
        class_id: classId || null
    }).select().single();
};

export const deleteMaterial = async (id: string, filePath?: string) => {
    // 1. Delete from Storage if it's a file
    if (filePath) {
        const { error: storageError } = await supabase.storage
            .from('materials')
            .remove([filePath]);

        if (storageError) console.error("Failed to delete file from storage:", storageError);
    }

    // 2. Delete from DB
    return await supabase.from('materials').delete().eq('id', id);
};

// Helper: Extract YouTube info + Title via NoEmbed
export const getYouTubeInfo = async (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
        const videoId = match[2];
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
