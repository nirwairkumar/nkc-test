import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { toast } from 'sonner';
import { voteTest, getTestVoteStats } from '@/lib/testsApi';
import { useAuth } from '@/contexts/AuthContext';

interface TestVoteButtonsProps {
    testId: string;
    userId?: string;
    isCreatorOrAdmin?: boolean;
    className?: string; // Allow custom styling from parent
}

export default function TestVoteButtons({ testId, userId: propUserId, isCreatorOrAdmin = false, className }: TestVoteButtonsProps) {
    const { user, isAdmin } = useAuth();
    const userId = propUserId || user?.id;
    // Derive if creator/admin if not explicitly passed
    const isSpecialView = isCreatorOrAdmin || isAdmin;

    const [userVote, setUserVote] = useState<number>(0); // 1 = upvote, -1 = downvote, 0 = none
    const [upvotes, setUpvotes] = useState(0);
    const [downvotes, setDownvotes] = useState(0);

    useEffect(() => {
        getTestVoteStats(testId, userId || undefined).then(({ upvotes, downvotes, user_vote }) => {
            setUpvotes(upvotes || 0);
            setDownvotes(downvotes || 0);
            setUserVote(user_vote || 0);
        });
    }, [testId, userId]);

    const handleVote = async (e: React.MouseEvent, type: 1 | -1) => {
        e.stopPropagation();
        if (!userId) {
            toast.error("Please login to vote");
            return;
        }

        const prevVote = userVote;
        let newVote: number = type;

        if (prevVote === type) {
            // Un-voting
            newVote = 0;
            if (type === 1) setUpvotes(prev => prev - 1);
            else setDownvotes(prev => prev - 1);
        } else {
            // New vote or change vote
            if (type === 1) {
                setUpvotes(prev => prev + 1);
                if (prevVote === -1) setDownvotes(prev => prev - 1);
            } else {
                setDownvotes(prev => prev + 1);
                if (prevVote === 1) setUpvotes(prev => prev - 1);
            }
        }

        setUserVote(newVote);

        const { error, vote } = await voteTest(testId, type, userId);
        if (error) {
            console.error("Vote registration failed:", error);
            // Revert on error
            setUserVote(prevVote);

            // Revert counts
            if (prevVote === type) { // was un-voting
                if (type === 1) setUpvotes(prev => prev + 1);
                else setDownvotes(prev => prev + 1);
            } else {
                if (type === 1) { // was upvoting
                    setUpvotes(prev => prev - 1);
                    if (prevVote === -1) setDownvotes(prev => prev + 1);
                } else { // was downvoting
                    setDownvotes(prev => prev - 1);
                    if (prevVote === 1) setUpvotes(prev => prev + 1);
                }
            }
            const errMsg = error.response?.data?.detail || error.message || "Unknown error";
            toast.error(`Failed to register vote: ${errMsg}`);
        } else if (vote !== undefined) {
            // Sync with backend confirmed vote
            setUserVote(vote);
        }
    };

    return (
        <div className={`flex items-center space-x-0 bg-slate-100/50 dark:bg-slate-800/50 px-1 ${className || 'rounded-full'}`}>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleVote(e, 1)}
                className={`h-8 w-8 rounded-full ${userVote === 1 ? 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
            >
                <ArrowBigUp className={`h-5 w-5 ${userVote === 1 ? 'fill-current' : ''}`} />
            </Button>

            {/* Display counts conditionally based on role */}
            <div className="flex items-center text-xs font-medium -ml-1 mr-1 text-slate-600 dark:text-slate-400 min-w-[12px] justify-center">
                {isCreatorOrAdmin ? (
                    <div className="flex space-x-1.5">
                        <span className="text-orange-600 dark:text-orange-400 font-bold" title="Upvotes">{upvotes}</span>
                        <span className="text-blue-500 dark:text-blue-400 font-bold" title="Downvotes">{downvotes}</span>
                    </div>
                ) : (
                    <span className={userVote === 1 ? 'text-orange-600 font-bold dark:text-orange-400' : ''}>
                        {upvotes > 0 ? upvotes : ''}
                    </span>
                )}
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleVote(e, -1)}
                className={`h-8 w-8 rounded-full ${userVote === -1 ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' : 'text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
                <ArrowBigDown className={`h-5 w-5 ${userVote === -1 ? 'fill-current' : ''}`} />
            </Button>
        </div>
    );
}
