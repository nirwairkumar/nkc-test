import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clipboard, X, Check, Laptop } from 'lucide-react';
import { toast } from 'sonner';

interface ScreenshotCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (base64: string) => void;
}

export const ScreenshotCaptureModal: React.FC<ScreenshotCaptureModalProps> = ({
    isOpen,
    onClose,
    onCapture,
}) => {
    const [pastedImage, setPastedImage] = useState<string | null>(null);

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setPastedImage(base64);
                        toast.success("Image captured from clipboard! 🚀");
                    };
                    reader.readAsDataURL(blob);
                }
                break;
            }
        }
    }, []);

    const handleConfirm = useCallback(() => {
        if (pastedImage) {
            onCapture(pastedImage);
            onClose();
        }
    }, [pastedImage, onCapture, onClose]);

    const insertButtonRef = React.useRef<HTMLButtonElement>(null);

    // Reset image only when modal actually opens
    useEffect(() => {
        if (isOpen) {
            setPastedImage(null);
        }
    }, [isOpen]);

    // Auto-focus the insert button when an image is pasted
    useEffect(() => {
        if (pastedImage && insertButtonRef.current) {
            insertButtonRef.current.focus();
        }
    }, [pastedImage]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('paste', handlePaste);
        } else {
            window.removeEventListener('paste', handlePaste);
        }
        return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen, handlePaste]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
                <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="flex flex-col">
                    <div className="p-6">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Clipboard className="w-5 h-5 text-blue-600" />
                                </div>
                                <DialogTitle className="text-xl font-bold text-slate-800">Quick Screenshot Capture</DialogTitle>
                            </div>
                        </DialogHeader>
                        
                        <div className="mt-6 flex flex-col items-center gap-6 p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:border-blue-200 transition-all duration-300 min-h-[300px] justify-center">
                            {pastedImage ? (
                                <div className="relative group/preview w-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                                    <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-xl bg-white">
                                        <img src={pastedImage} alt="Pasted" className="max-h-[250px] w-auto object-contain" />
                                        <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover/preview:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-sm font-bold text-slate-700">Image ready! 🚀</p>
                                        <p className="text-xs text-slate-500 font-medium text-center">Press <kbd className="px-1.5 py-0.5 rounded bg-white border shadow-sm font-sans mx-1">Enter</kbd> to insert immediately.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center flex flex-col items-center gap-8 py-4">
                                    <div className="flex items-center gap-4 sm:gap-8">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200 rotate-[-5deg] hover:rotate-0 transition-transform">
                                                <Laptop className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Step 1</span>
                                                <p className="text-xs font-bold text-slate-600">Win + Shift + S</p>
                                            </div>
                                        </div>
                                        
                                        <div className="h-10 w-10 flex items-center justify-center">
                                            <div className="h-[2px] w-8 bg-slate-200 rounded-full"></div>
                                        </div>

                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200 rotate-[5deg] hover:rotate-0 transition-transform">
                                                <Check className="w-7 h-7" />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Step 2</span>
                                                <p className="text-xs font-bold text-slate-600">Ctrl + V here</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="max-w-[280px] text-xs leading-relaxed text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                                        Capture a diagram from any PDF or Document and paste it here for instant use.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 p-4 border-t gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} className="font-semibold text-slate-500 hover:text-slate-700">
                            Cancel
                        </Button>
                        <Button 
                            ref={insertButtonRef}
                            type="submit" 
                            disabled={!pastedImage} 
                            className={`min-w-[140px] font-bold shadow-lg transition-all duration-300 ${pastedImage ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95' : 'bg-slate-300'}`}
                        >
                            <Check className="w-4 h-4 mr-2" /> Insert into Test
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

