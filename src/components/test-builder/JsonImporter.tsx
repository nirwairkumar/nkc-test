import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileJson } from 'lucide-react';
import { toast } from 'sonner';

interface JsonImporterProps {
    onImportSuccess: (data: any) => void;
    buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
    buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function JsonImporter({
    onImportSuccess,
    buttonVariant = 'outline',
    buttonSize = 'default',
    className = ''
}: JsonImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            // Import the API call dynamically to avoid circular dependencies 
            // if this component is used in various places
            const { importTestJson } = await import('@/lib/testsApi');
            const { data, error } = await importTestJson(file);

            if (error) {
                throw new Error(error);
            }

            toast.success("JSON imported successfully!");
            onImportSuccess(data);

        } catch (err: any) {
            console.error("JSON Import Error:", err);
            toast.error("Failed to import JSON: " + (err.message || 'Unknown error'));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isImporting}
            />
            <Button
                variant={buttonVariant}
                size={buttonSize}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="gap-2 shrink-0 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
            >
                {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                    <FileJson className="w-4 h-4 text-indigo-500" />
                )}
                {isImporting ? 'Importing...' : 'Import JSON'}
            </Button>
        </div>
    );
}
