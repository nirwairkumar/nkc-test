import React, { useState, useEffect } from 'react';

import { SEO } from '@/components/SEO';
import TestBuilder from '@/components/TestBuilder';
import AITestImporter from './AITestImporter';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

import { useLocation } from 'react-router-dom';

export default function CreateTestPage() {
    const location = useLocation();
    const [showImporter, setShowImporter] = useState(false);
    const [importedData, setImportedData] = useState<any>(null);

    // Handle imported data from navigation state (e.g., from /generate-with-ai route)
    useEffect(() => {
        console.log("[CreateTestPage] useEffect triggered. location.state:", location.state);
        if (location.state?.importedData) {
            console.log("[CreateTestPage] Found importedData in location.state:", location.state.importedData);
            setImportedData(location.state.importedData);
            // Clear the state to prevent re-processing on refresh
            window.history.replaceState({}, document.title);
            console.log("[CreateTestPage] Cleared location.state");
        }
    }, [location.state]);

    const handleImport = (data: any) => {
        console.log("[CreateTestPage] handleImport called with data:", data);
        // data comes as { title, description, revision_notes, questions }
        // which matches what TestBuilder.populateData() expects directly.
        // It handles questionText -> question mapping, nested option formats, etc.
        setImportedData(data);
        setShowImporter(false);
        console.log("[CreateTestPage] State updated: importedData set, showImporter set to false");
    };

    if (showImporter) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => setShowImporter(false)} className="mb-4">
                    Back to Editor
                </Button>
                <AITestImporter onImport={handleImport} />
            </div>
        );
    }

    console.log("[CreateTestPage] Rendering. importedData:", importedData, "showImporter:", showImporter);

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
