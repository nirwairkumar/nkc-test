import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { FeedbackForm } from '@/components/FeedbackForm';
import { useAuth } from '@/contexts/AuthContext';
import { useTest } from '@/contexts/TestContext';

export default function FeedbackViewPage() {
    const { testId } = useParams();
    const { stateData } = useOutletContext<any>() || {};
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

    return (
        <div className="p-4 md:p-8 min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Soft background glows */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl mix-blend-multiply dark:mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-3xl mix-blend-multiply dark:mix-blend-screen" />
            </div>

            <div className="max-w-3xl w-full mx-auto">
                <FeedbackForm
                    testId={testId}
                    studentName={contextStudentName}
                    creatorId={selectedTest?.created_by}
                    testTitle={selectedTest?.title}
                    testCustomId={selectedTest?.custom_id}
                />
            </div>
        </div>
    );
}
