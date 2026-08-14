import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Strikethrough, Underline,
    Heading1, Heading2, Heading3,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
    Quote, SeparatorHorizontal, Undo, Redo, Table as TableIcon,
    Code, Type
} from 'lucide-react';
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
        const url = window.prompt('Enter Link URL (e.g. https://testoza.com/quiz)', previousUrl || 'https://');

        if (url === null) {
            return;
        }

        if (url.trim() === '' || url.trim() === 'https://') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    // Helper to execute command while preserving cursor focus
    const runCmd = (e: React.MouseEvent, fn: () => void) => {
        e.preventDefault(); // Prevent button from stealing focus from text area
        fn();
    };

    return (
        <div className="border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap items-center gap-1.5 sticky top-0 bg-white/98 dark:bg-slate-900/98 backdrop-blur z-30 shadow-2xs select-none">
            
            {/* Undo / Redo */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().undo().run())}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().redo().run())}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="h-4 w-4" />
                </button>
            </div>

            {/* Direct Heading Selectors (LinkedIn Style) */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().setParagraph().run())}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        editor.isActive('paragraph') && !editor.isActive('heading')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Normal Paragraph"
                >
                    <Type className="h-3.5 w-3.5" />
                    <span>Normal</span>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                    className={`h-8 px-2.5 rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1 ${
                        editor.isActive('heading', { level: 1 })
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Heading 1 (Main Section Title)"
                >
                    <Heading1 className="h-4 w-4" />
                    <span>H1</span>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        editor.isActive('heading', { level: 2 })
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Heading 2 (Subsection Title)"
                >
                    <Heading2 className="h-4 w-4" />
                    <span>H2</span>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                    className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        editor.isActive('heading', { level: 3 })
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Heading 3 (Minor Topic)"
                >
                    <Heading3 className="h-4 w-4" />
                    <span>H3</span>
                </button>
            </div>

            {/* Inline Formatting (Bold, Italic, Underline, Strike) */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleBold().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                        editor.isActive('bold')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleItalic().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('italic')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleUnderline().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('underline')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Underline (Ctrl+U)"
                >
                    <Underline className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleStrike().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('strike')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().setTextAlign('left').run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive({ textAlign: 'left' })
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().setTextAlign('center').run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive({ textAlign: 'center' })
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().setTextAlign('right').run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive({ textAlign: 'right' })
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </button>
            </div>

            {/* Lists, Quote, Code, Divider */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-0.5">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleBulletList().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('bulletList')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleOrderedList().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('orderedList')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleBlockquote().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('blockquote')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Blockquote (Quote Block)"
                >
                    <Quote className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().toggleCodeBlock().run())}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                        editor.isActive('codeBlock')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Code Block"
                >
                    <Code className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, () => editor.chain().focus().setHorizontalRule().run())}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Insert Divider Line"
                >
                    <SeparatorHorizontal className="h-4 w-4" />
                </button>
            </div>

            {/* Media: Link, Image, Table */}
            <div className="flex items-center space-x-1">
                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, setLink)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        editor.isActive('link')
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Insert Hyperlink"
                >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Link</span>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, addImage)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Insert Inline Image"
                >
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Image</span>
                </button>

                <button
                    type="button"
                    onMouseDown={(e) => runCmd(e, insertTable)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Insert 3x3 Table"
                >
                    <TableIcon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Table</span>
                </button>
            </div>

        </div>
    );
}
