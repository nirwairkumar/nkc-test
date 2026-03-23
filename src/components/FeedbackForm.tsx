import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { toast } from 'sonner';
import { createNotification } from '@/lib/socialApi';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackFormProps {
    testId: string;
    studentName?: string;
    creatorId?: string;
    testTitle?: string;
    testCustomId?: string;
}

export function FeedbackForm({ testId, studentName, creatorId, testTitle, testCustomId }: FeedbackFormProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [improvements, setImprovements] = useState('');
    const [requirements, setRequirements] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [testExperience, setTestExperience] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Determines if the extended form should be visible (only shown if a rating is selected)
    const showExtendedForm = rating > 0;

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating");
            return;
        }

        setIsSubmitting(true);
        try {
            // Fetch Creator Details (Receiver)
            let receiverName = '';
            let receiverEmail = '';
            if (creatorId) {
                const { fetchUserDetails } = await import('@/lib/usersApi');
                const { data: creatorProfile } = await fetchUserDetails(creatorId);

                if (creatorProfile) {
                    receiverName = creatorProfile.full_name || '';
                    receiverEmail = creatorProfile.email || '';
                }
            }

            // Get Current User Details (Sender) from Auth Context
            const senderId = user?.id || '';
            const senderName = user?.user_metadata?.full_name || studentName || 'Anonymous';
            const senderEmail = user?.email || '';

            const feedbackData = {
                test_id: testId,
                rating: rating,
                comment: comment,
                improvements: improvements,
                requirements: requirements,
                dislikes: dislikes,
                test_experience: testExperience,
                custom_test_id: testCustomId || testId,
                sender_name: senderName,
                sender_email: senderEmail,
                receiver_name: receiverName,
                receiver_email: receiverEmail
            };

            const { submitFeedback } = await import('@/lib/supportApi');
            const { error } = await submitFeedback(feedbackData);

            if (error) throw error;

            setIsSubmitted(true);
            toast.success("Thank you for your valuable feedback!");

            // Notify Creator
            if (creatorId) {
                // Get current user details for the notification link
                const notifTitle = `New Feedback: ${testTitle || 'Test'}`;
                const msg = `User Rated: ${rating}/5 stars. ${improvements ? 'Suggested Improvements.' : ''}`;

                // Encode details into a custom protocol link
                const params = new URLSearchParams({
                    testId: testCustomId || testId, // Use custom ID if valid, else fallback
                    testTitle: testTitle || 'Test',
                    senderId: senderId,
                    senderName: senderName,
                    rating: rating.toString(),
                    comment: comment ? comment.substring(0, 500) : ''
                });

                const customLink = `feedback://details?${params.toString()}`;

                // Pass structured metadata for DB columns + link for legacy/popup support
                await createNotification(creatorId, notifTitle, msg, customLink, {
                    customTestId: testCustomId || testId,
                    senderName,
                    senderEmail
                });
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to submit feedback");
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
            >
                <Card className="bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/50 shadow-lg">
                    <CardContent className="pt-8 pb-8 text-center text-green-700 dark:text-green-300 flex flex-col items-center gap-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        >
                            <Sparkles className="w-12 h-12 text-green-500" />
                        </motion.div>
                        <p className="font-bold text-2xl">Feedback Submitted!</p>
                        <p className="text-sm">Thank you for helping us improve our platform. Your insights are invaluable.</p>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    const experienceLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
        >
            <Card className="shadow-xl overflow-hidden border-indigo-100 dark:border-indigo-900/50 relative">
                {/* Decorative header element */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        Help Us Improve
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        We value your honest opinion to make this platform better for everyone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-6 sm:px-8 mt-4">
                    {/* Star Rating Section */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Rate your overall experience</span>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <motion.button
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    key={star}
                                    type="button"
                                    className="focus:outline-none transition-colors"
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                >
                                    <Star
                                        className={`w-10 h-10 transition-all duration-300 ${star <= (hoverRating || rating)
                                                ? "fill-yellow-400 text-yellow-500 drop-shadow-sm"
                                                : "text-slate-200 dark:text-slate-700"
                                            }`}
                                    />
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Extended Form - Animates in when rating is provided */}
                    <AnimatePresence>
                        {showExtendedForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
                            >
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        What is your level of experience with these topics?
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {experienceLevels.map((lvl) => (
                                            <Button
                                                key={lvl}
                                                type="button"
                                                variant={testExperience === lvl ? "default" : "outline"}
                                                size="sm"
                                                className={`rounded-full transition-all ${testExperience === lvl
                                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md transform scale-105'
                                                        : 'hover:border-indigo-300 hover:text-indigo-600'
                                                    }`}
                                                onClick={() => setTestExperience(lvl)}
                                            >
                                                {lvl}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5 cursor-text group" onClick={(e) => (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement)?.focus()}>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                            How can we improve?
                                        </label>
                                        <Textarea
                                            placeholder="Suggest improvements or share what you disliked..."
                                            value={improvements}
                                            onChange={(e) => setImprovements(e.target.value)}
                                            rows={2}
                                            className="resize-none focus-visible:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5 cursor-text group" onClick={(e) => (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement)?.focus()}>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                            Any specific requirements or features you need?
                                        </label>
                                        <Textarea
                                            placeholder="I would love to see a feature that..."
                                            value={requirements}
                                            onChange={(e) => setRequirements(e.target.value)}
                                            rows={2}
                                            className="resize-none focus-visible:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5 cursor-text group" onClick={(e) => (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement)?.focus()}>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                            What did you dislike about the platform/test?
                                        </label>
                                        <Textarea
                                            placeholder="Be honest, what didn't work well for you?"
                                            value={dislikes}
                                            onChange={(e) => setDislikes(e.target.value)}
                                            rows={2}
                                            className="resize-none focus-visible:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5 cursor-text group" onClick={(e) => (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement)?.focus()}>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                            Any other comments? (Optional)
                                        </label>
                                        <Textarea
                                            placeholder="General thoughts..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={2}
                                            className="resize-none focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 pt-4 px-6 sm:px-8 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || rating === 0}
                        className="w-full h-12 text-base font-semibold transition-all shadow-md group"
                        variant={rating > 0 ? "default" : "secondary"}
                    >
                        {isSubmitting ? (
                            "Submitting..."
                        ) : (
                            <span className="flex items-center justify-center gap-2 relative">
                                Submit Feedback
                                <motion.div
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: rating > 0 ? 0 : -10, opacity: rating > 0 ? 1 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.div>
                            </span>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
