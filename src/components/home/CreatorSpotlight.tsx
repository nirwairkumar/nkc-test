import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchTests, Test } from '@/lib/testsApi';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreatorSpotlight() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadCreators() {
            // We fetch tests to extract unique creators (simpler than separate API for now)
            const { data } = await fetchTests({ page: 1, limit: 50 });
            if (data) {
                const creators = new Map();
                data.forEach(t => {
                    if (t.created_by && t.creator_name && !creators.has(t.created_by)) {
                        creators.set(t.created_by, {
                            id: t.created_by,
                            name: t.creator_name,
                            avatar: t.creator_avatar
                        });
                    }
                });
                setProfiles(Array.from(creators.values()).slice(0, 6));
            }
            setLoading(false);
        }
        loadCreators();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-wrap gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>
        );
    }

    if (profiles.length === 0) return null;

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h3 className="text-lg font-semibold mb-6 px-1 flex items-center justify-between">
                <span>Top Creators</span>
            </h3>
            <div className="flex flex-wrap gap-8 justify-center sm:justify-start">
                {profiles.map(profile => (
                    <div
                        key={profile.id}
                        className="flex flex-col items-center gap-2 cursor-pointer group hover:-translate-y-1 transition-transform"
                        onClick={() => navigate(`/creator/${profile.id}`)}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-md"></div>
                            <Avatar className="h-16 w-16 border-2 border-slate-100 dark:border-slate-800 group-hover:border-primary transition-all shadow-sm">
                                <AvatarImage src={profile.avatar} />
                                <AvatarFallback className="text-xs">{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="text-sm font-medium text-center text-muted-foreground group-hover:text-primary transition-colors max-w-[100px] truncate">
                            {profile.name}
                        </span>
                    </div>
                ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-8" />
        </div>
    );
}
