import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Strikethrough, Underline,
    Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
    Quote, SeparatorHorizontal, Undo, Redo, Table as TableIcon
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { postsApi } from '@/lib/postsApi';

interface PostToolbarProps {
    editor: Editor;
}

export default function PostToolbar({ editor }: PostToolbarProps) {
    if (!editor) {
        return null;
    }

    const addImage = async () => {
        // Create a hidden input to select file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                toast.info("Uploading image...");
                const url = await postsApi.uploadImage(file);
                editor.chain().focus().setImage({ src: url }).run();
                toast.success("Image added");
            } catch (err: any) {
                toast.error("Failed to upload image");
            }
        };
        input.click();
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <div className="border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap gap-1 sticky top-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-30">
            <div className="flex items-center space-x-1 border-r border-slate-200 pr-2 mr-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0"
                >
                    <Undo className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0"
                >
                    <Redo className="h-4 w-4 text-slate-500" />
                </Button>
            </div>

            <div className="flex items-center space-x-1 border-r border-slate-200 pr-2 mr-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-medium">Text</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'bg-slate-100' : ''}>
                            Normal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-slate-100' : ''}>
                            Heading 1
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-100' : ''}>
                            Heading 2
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-slate-100' : ''}>
                            Heading 3
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <Underline className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center space-x-1 border-r border-slate-200 pr-2 mr-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center space-x-1 border-r border-slate-200 pr-2 mr-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <Quote className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center space-x-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={setLink}
                    className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={addImage}
                    className="h-8 w-8 p-0"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={insertTable}
                    className="h-8 w-8 p-0"
                >
                    <TableIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="h-8 w-8 p-0"
                >
                    <SeparatorHorizontal className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
