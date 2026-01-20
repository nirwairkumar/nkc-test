import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleTestLike, getTestLikeCount, getTestLikeStatus } from '@/lib/testsApi';

interface TestLikeButtonProps {
    testId: string;
    userId: string | undefined;
}

export default function TestLikeButton({ testId, userId }: TestLikeButtonProps) {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);

    useEffect(() => {
        getTestLikeCount(testId).then(({ count }) => setCount(count || 0));
        if (userId) {
            getTestLikeStatus(testId, userId).then(({ liked }) => setLiked(liked));
        }
    }, [testId, userId]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId) {
            toast.error("Please login to like tests");
            return;
        }

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setCount(prev => newLiked ? prev + 1 : prev - 1);

        const { error } = await toggleTestLike(testId, userId);
        if (error) {
            // Revert on error
            setLiked(!newLiked);
            setCount(prev => !newLiked ? prev + 1 : prev - 1);
            toast.error("Failed to update like");
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
        >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            <span className="text-xs">{count > 0 ? count : ''}</span>
        </Button>
    );
}
