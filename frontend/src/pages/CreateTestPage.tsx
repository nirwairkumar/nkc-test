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
                title="Create Test Online Free - TestoZa AI Test Maker"
                description="Create custom online tests and quizzes for free. Use AI to generate questions from text or PDF. Best for teachers and students."
                keywords={["create test online", "free quiz maker", "exam builder", "test generator"]}
            />
            {!importedData && !showImporter && (
                <div className="absolute top-4 right-4 z-10">
                    <Button onClick={() => setShowImporter(true)} variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Import from PDF
                    </Button>
                </div>
            )}
            <TestBuilder 
                key={importedData ? `imported-${importedData.questions?.length || 0}` : 'new'} 
                initialData={importedData} 
            />
        </div>
    );
}
