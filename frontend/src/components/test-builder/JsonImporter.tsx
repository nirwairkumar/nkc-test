import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileJson, ClipboardPaste, FileCode2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { jsonrepair } from 'jsonrepair';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
    
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
    const [pastedJson, setPastedJson] = useState('');

    const processFile = async (file: File) => {
        setIsImporting(true);
        try {
            const { importTestJson } = await import('@/lib/testsApi');
            const { data, error } = await importTestJson(file);

            if (error) {
                throw new Error(error);
            }

            toast.success("JSON imported successfully!");
            onImportSuccess(data);
            setIsPasteDialogOpen(false);
            setPastedJson('');
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
    };

    const handlePasteImport = async () => {
        if (!pastedJson.trim()) {
            toast.error("Please paste some JSON first.");
            return;
        }

        // Validate basic parsing first
        try {
            JSON.parse(pastedJson);
        } catch (e: any) {
            toast.error("Invalid JSON. Try using Auto Repair.");
            return;
        }

        const blob = new Blob([pastedJson], { type: 'application/json' });
        const file = new File([blob], 'pasted.json', { type: 'application/json' });
        await processFile(file);
    };

    const handleAutoRepair = () => {
        if (!pastedJson.trim()) return;
        try {
            const repaired = jsonrepair(pastedJson);
            // Format it nicely
            const formatted = JSON.stringify(JSON.parse(repaired), null, 2);
            setPastedJson(formatted);
            toast.success("JSON auto-repaired successfully!");
        } catch (e: any) {
            toast.error("Could not repair JSON syntax. It might be too corrupted.");
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

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={buttonVariant}
                        size={buttonSize}
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
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        Upload File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsPasteDialogOpen(true)} className="gap-2 cursor-pointer">
                        <ClipboardPaste className="w-4 h-4 text-muted-foreground" />
                        Paste JSON
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileCode2 className="w-5 h-5 text-indigo-600" />
                            Paste JSON
                        </DialogTitle>
                        <DialogDescription>
                            Paste your raw test JSON syntax below. You can use the Auto Repair tool to fix syntax errors like missing quotes or trailing commas.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <Textarea
                            value={pastedJson}
                            onChange={(e) => setPastedJson(e.target.value)}
                            placeholder="Paste your JSON here..."
                            className="min-h-[300px] font-mono text-sm"
                        />
                    </div>
                    
                    <DialogFooter className="flex items-center sm:justify-between">
                        <Button 
                            variant="secondary" 
                            onClick={handleAutoRepair}
                            className="gap-2"
                            type="button"
                            disabled={isImporting}
                        >
                            <Wrench className="w-4 h-4" />
                            Auto Repair
                        </Button>
                        <div className="flex gap-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsPasteDialogOpen(false)}
                                disabled={isImporting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handlePasteImport}
                                disabled={isImporting || !pastedJson.trim()}
                                className="gap-2"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Import
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default JsonImporter;
