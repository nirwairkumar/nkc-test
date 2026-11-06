import { useState, useEffect, lazy, Suspense } from 'react';
import TestBuilder from '@/components/TestBuilder';
const AITestImporter = lazy(() => import('./AITestImporter'));
import { Loader2, ArrowLeft } from 'lucide-react';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Admin copy of frontend/src/pages/CreateTestPage.tsx (the builder itself is shared code).
 * Admin-only differences: no SEO / FAQ block (admin is noindex, behind login), and saving or
 * cancelling returns to the admin Tests tab.
 */
export default function CreateTestPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { id: paramId } = useParams();
    const [showImporter, setShowImporter] = useState(false);
    const [importedData, setImportedData] = useState<any>(null);

    useEffect(() => {
        if (location.state?.importedData) {
            setImportedData(location.state.importedData);
            // Clear state so refresh doesn't re-import
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleImport = (data: any) => {
        setImportedData(data);
        setShowImporter(false);
    };

    if (showImporter) {
        return (
            <div className="container mx-auto py-6">
                <button
                    type="button"
                    onClick={() => setShowImporter(false)}
                    className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-sky-700 hover:bg-sky-50"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to my test
                </button>
                <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <AITestImporter onImport={handleImport} />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            <TestBuilder
                key={importedData ? 'imported-test' : (paramId ? `edit-${paramId}` : 'new-test')}
                initialData={importedData}
                onSuccess={() => navigate('/admin?tab=tests')}
                onCancel={() => navigate('/admin?tab=tests')}
                onAiImport={() => setShowImporter(true)}
            />
        </div>
    );
}
