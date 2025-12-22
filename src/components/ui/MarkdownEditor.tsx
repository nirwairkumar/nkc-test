import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, List, Image as ImageIcon, Link as LinkIcon, Heading1, Heading2 } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const previousValue = textarea.value;
        const selectedText = previousValue.substring(start, end);

        const newValue = previousValue.substring(0, start) + before + selectedText + after + previousValue.substring(end);

        onChange(newValue);

        // Reset focus and cursor
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) { // 500kb limit
            toast.error("Image too large. Max 500KB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            insertText(`![Image](${base64})`);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className={`border rounded-md ${className}`}>
            <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')} title="Bold"><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')} title="Italic"><Italic className="w-4 h-4" /></Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={() => insertText('# ')} title="Heading 1"><Heading1 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('## ')} title="Heading 2"><Heading2 className="w-4 h-4" /></Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={() => insertText('- ')} title="Bullet List"><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('[Link text](', ')')} title="Link"><LinkIcon className="w-4 h-4" /></Button>
                <div className="w-px h-4 bg-border mx-1" />
                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <ImageIcon className="w-4 h-4" />
                </label>
            </div>
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="border-0 focus-visible:ring-0 rounded-t-none resize-y min-h-[150px] font-mono text-sm"
            />
        </div>
    );
}
