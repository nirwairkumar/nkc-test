import React from 'react';
import { Navigate, useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTest } from '@/contexts/TestContext';
import { resultViewOn } from '@/lib/resultView';
import { ExamFeedbackForm, candidateName, examinerName } from '@/components/results/ExamFeedback';

/** Result Hub → Give feedback: stars and a note for the creator, when they asked for it. */
export default function FeedbackViewPage() {
    const { testId } = useParams();
    const { stateData } = useOutletContext<any>() || {};
    const { user } = useAuth();
    const { studentName: contextStudentName, selectedTest: contextSelectedTest } = useTest();

    // Use stateData first (from navigation), fallback to TestContext
    const selectedTest = stateData?.test || contextSelectedTest;

    if (!testId) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-slate-500">Invalid Test ID</p>
            </div>
        );
    }

    if (!resultViewOn(selectedTest?.settings, 'feedback')) {
        return <Navigate to="/results" state={stateData} replace />;
    }

    const examiner = examinerName(selectedTest);

    return (
        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:ring-white/10 sm:p-6">
                <h1 className="text-center text-xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-white">How was this exam?</h1>
                <p className="mb-4 mt-1 text-center text-[13px] text-slate-500 dark:text-slate-400">
                    {selectedTest?.title ? <>Rate "{selectedTest.title}". </> : null}Only {examiner} sees your answer.
                </p>
                <ExamFeedbackForm
                    testId={testId}
                    examiner={examiner}
                    testCustomId={selectedTest?.custom_id}
                    senderName={candidateName(stateData, user) || contextStudentName || undefined}
                />
            </div>
        </div>
    );
}
