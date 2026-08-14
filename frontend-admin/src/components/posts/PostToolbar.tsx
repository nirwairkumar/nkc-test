import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Strikethrough, Underline,
    Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
    Quote, SeparatorHorizontal, Undo, Redo, Table as TableIcon,
    Code, Sparkles
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
                toast.success("Image inserted into post!");
            } catch (err: any) {
                toast.error("Failed to upload image: " + (err.message || 'Error'));
            }
        };
        input.click();
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter Link URL (e.g. https://testoza.com/quiz)', previousUrl);

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
        <div className="border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap items-center gap-1 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-30">
            {/* Undo / Redo */}
            <div className="flex items-center space-x-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title="Undo"
                >
                    <Undo className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title="Redo"
                >
                    <Redo className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Typography / Headings */}
            <div className="flex items-center space-x-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {editor.isActive('heading', { level: 1 }) ? 'H1 Title' :
                             editor.isActive('heading', { level: 2 }) ? 'H2 Section' :
                             editor.isActive('heading', { level: 3 }) ? 'H3 Subheading' :
                             'Paragraph'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}>
                            Paragraph
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}>
                            <Heading1 className="h-4 w-4 mr-2 text-indigo-500" /> Heading 1
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}>
                            <Heading2 className="h-4 w-4 mr-2 text-indigo-500" /> Heading 2 (Major Section)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}>
                            <Heading3 className="h-4 w-4 mr-2 text-indigo-500" /> Heading 3 (Subsection)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Bold"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Italic"
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Underline"
                >
                    <Underline className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('strike') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Formatting & Alignment */}
            <div className="flex items-center space-x-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`h-7 w-7 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Align Left"
                >
                    <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`h-7 w-7 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Align Center"
                >
                    <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`h-7 w-7 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Align Right"
                >
                    <AlignRight className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Lists & Quotes */}
            <div className="flex items-center space-x-0.5 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Bullet List"
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Numbered List"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('blockquote') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Blockquote"
                >
                    <Quote className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`h-7 w-7 p-0 ${editor.isActive('codeBlock') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Code Block"
                >
                    <Code className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400"
                    title="Divider Line"
                >
                    <SeparatorHorizontal className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Media & Links */}
            <div className="flex items-center space-x-0.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={setLink}
                    className={`h-7 px-2 text-xs flex items-center gap-1 ${editor.isActive('link') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Add Link"
                >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Link</span>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addImage}
                    className="h-7 px-2 text-xs flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    title="Insert Image into Content"
                >
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Image</span>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={insertTable}
                    className="h-7 px-2 text-xs flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    title="Insert Table"
                >
                    <TableIcon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Table</span>
                </Button>
            </div>
        </div>
    );
}
