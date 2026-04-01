import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { submitExitFeedback } from '@/lib/supportApi';
import { toast } from 'sonner';

interface ExitFeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    testId: string;
    userId?: string;
    onConfirmExit: () => void;
}

export default function ExitFeedbackDialog({
    open,
    onOpenChange,
    testId,
    userId,
    onConfirmExit
}: ExitFeedbackDialogProps) {
    const [experience, setExperience] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!experience.trim()) {
            onConfirmExit();
            return;
        }

        setIsSubmitting(true);
        const { error } = await submitExitFeedback({
            test_id: testId,
            experience: experience.trim(),
            user_id: userId
        });
        setIsSubmitting(false);

        if (error) {
            toast.error("Failed to submit feedback, but you can still exit.");
        } else {
            toast.success("Thank you for your feedback!");
        }
        onConfirmExit();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you leaving?</AlertDialogTitle>
                    <AlertDialogDescription>
                        We noticed you are leaving the test. Have you faced any error or issue? Please report here to help us improve.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Type your experience or errors faced here..."
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="min-h-[100px] resize-none"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={onConfirmExit}
                            disabled={isSubmitting}
                        >
                            Skip & Exit
                        </Button>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleSubmit();
                            }}
                            disabled={isSubmitting || !experience.trim()}
                        >
                            {isSubmitting ? "Submitting..." : "Submit & Exit"}
                        </AlertDialogAction>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
