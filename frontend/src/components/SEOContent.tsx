import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SEOContentProps {
    test: any;
}

export const SEOContent: React.FC<SEOContentProps> = ({ test }) => {
    if (!test) return null;

    return (
        <div className="space-y-6 mt-8">
            <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl">About this Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                        This online test titled <strong>"{test.title}"</strong> is designed to help students prepare for their exams.
                        It contains {test.questions?.length || 0} questions and covers key topics relevant to the subject.
                        {test.institution_name && (
                            <span> It is officially provided by <strong>{test.institution_name}</strong>.</span>
                        )}
                        {test.creator_name && !test.institution_name && (
                            <span> Created by <strong>{test.creator_name}</strong>.</span>
                        )}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Online Test</Badge>
                        <Badge variant="outline">{test.questions?.length} Questions</Badge>
                        <Badge variant="outline">{test.duration} Minutes</Badge>
                        {test.marks_per_question && <Badge variant="outline">{test.marks_per_question} Marks/Q</Badge>}
                    </div>

                    <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground mt-4">
                        <h3 className="text-foreground font-semibold mb-2">Instructions:</h3>
                        <p>
                            Read the questions carefully. You can navigate between questions using the side panel or next/previous buttons.
                            Ensure you submit the test before the timer runs out. Results will be calculated based on the marking scheme provided ({test.marks_per_question} marks for correct, -{test.negative_marks} for incorrect).
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="text-xs text-center text-muted-foreground">
                <p>Prepare effectively with our comprehensive {test.title} practice test. Ideal for revision and self-assessment.</p>
            </div>
        </div>
    );
};
