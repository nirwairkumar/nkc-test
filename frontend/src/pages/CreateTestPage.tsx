import React, { useState, useEffect, lazy, Suspense } from 'react';

import { SEO } from '@/components/SEO';
import TestBuilder from '@/components/TestBuilder';
const AITestImporter = lazy(() => import('./AITestImporter'));
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';

import { useLocation } from 'react-router-dom';

export default function CreateTestPage() {
    const location = useLocation();
    const [showImporter, setShowImporter] = useState(false);
    const [importedData, setImportedData] = useState<any>(null);

    // Handle imported data from navigation state (e.g., from /generate-with-ai route)
    useEffect(() => {
        if (location.state?.importedData) {
            setImportedData(location.state.importedData);
            // Clear the state to prevent re-processing on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleImport = (data: any) => {
        // data comes as { title, description, revision_notes, questions }
        // which matches what TestBuilder.populateData() expects directly.
        // It handles questionText -> question mapping, nested option formats, etc.
        setImportedData(data);
        setShowImporter(false);
    };

    if (showImporter) {
        return (
            <div className="container mx-auto py-6">
                <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <AITestImporter onImport={handleImport} />
                </Suspense>
            </div>
        );
    }


    return (
        <div className="relative">
            <SEO
                title="Create Online Test Free \u2013 AI Exam Maker for Teachers | TestoZa"
                description="Create your online test in minutes. Free test maker for teachers with AI \u2014 generate MCQ quizzes, mock exams, and CBT practice tests from PDFs, YouTube videos, or text. No technical skills needed."
                canonicalUrl="https://testoza.com/create-test"
                keywords={[
                    "create online test",
                    "create exam online",
                    "make test online",
                    "make exam online",
                    "free test maker for teachers",
                    "online test maker for teachers",
                    "online quiz maker for teachers",
                    "test creator for teachers",
                    "free quiz creator for teachers",
                    "how to create a test",
                    "online exam software",
                    "best online testing software",
                    "computer-based test platform",
                    "ai quiz generator"
                ]}
            />
            <TestBuilder
                key={importedData ? 'imported-test' : 'new-test'}
                initialData={importedData}
                onAiImport={() => setShowImporter(true)}
            />
        </div>
    );
}
