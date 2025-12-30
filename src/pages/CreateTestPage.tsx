import React, { useState } from 'react';
import TestBuilder from '@/components/TestBuilder';
import AITestImporter from './AITestImporter';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function CreateTestPage() {
    const [showImporter, setShowImporter] = useState(false);
    const [importedData, setImportedData] = useState<any>(null);
    const [searchParams] = useSearchParams();

    const handleImport = (questions: any[]) => {
        // Map imported questions to TestBuilder format
        const mappedQuestions = questions.map(q => ({
            id: q.id,
            type: 'single', // Default to single choice
            question: q.question,
            image: q.image || '',
            options: q.options,
            optionImages: q.optionImages || {},
            correctAnswer: q.correctAnswer || '',
            typingMode: 'en'
        }));

        setImportedData({
            questions: mappedQuestions
        });
        setShowImporter(false);
    };

    if (showImporter) {
        return (
            <div className="container mx-auto py-8">
                <Button variant="ghost" onClick={() => setShowImporter(false)} className="mb-4">
                    Back to Editor
                </Button>
                <AITestImporter onImport={handleImport} />
            </div>
        );
    }

    const showPdfImport = searchParams.get('enable_pdf') === 'true';

    return (
        <div className="relative">
            {!importedData && showPdfImport && (
                <div className="absolute top-4 right-4 z-10">
                    <Button onClick={() => setShowImporter(true)} variant="outline" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Import from PDF
                    </Button>
                </div>
            )}
            <TestBuilder initialData={importedData} />
        </div>
    );
}
