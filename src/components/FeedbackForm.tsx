import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface FeedbackFormProps {
    testId: string;
    studentName?: string;
}

export function FeedbackForm({ testId, studentName }: FeedbackFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('feedback')
                .insert({
                    test_id: testId,
                    rating: rating,
                    comment: comment,
                    // user_id is optional, or we can assume anonymous if not logged in
                    // If we want to capture student name, we'd need a column for it or put it in comment
                });

            if (error) throw error;

            setIsSubmitted(true);
            toast.success("Thank you for your feedback!");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to submit feedback");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/50">
                <CardContent className="pt-6 text-center text-green-700 dark:text-green-300">
                    <p className="font-semibold">Feedback Submitted!</p>
                    <p className="text-sm">Thank you for helping us improve.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Rate this Test</CardTitle>
                <CardDescription>How was your experience with this test?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="focus:outline-none transition-transform hover:scale-110"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <Star
                                className={`w-8 h-8 ${star <= (hoverRating || rating)
                                        ? "fill-yellow-400 text-yellow-500"
                                        : "text-slate-300"
                                    }`}
                            />
                        </button>
                    ))}
                </div>
                <Textarea
                    placeholder="Any suggestions or issues? (Optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                />
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full"
                >
                    {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
            </CardFooter>
        </Card>
    );
}
