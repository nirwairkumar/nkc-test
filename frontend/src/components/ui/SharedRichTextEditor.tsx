import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageResize from 'tiptap-extension-resize-image';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Undo,
    Redo,
    Heading1,
    Heading2,
    Quote,
    Languages,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify
} from 'lucide-react';
import { toast } from 'sonner';
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- SHARED TOOLBAR COMPONENT ---

interface SharedToolbarProps {
    editor: Editor | null;
    language: 'en' | 'hi';
    setLanguage: (lang: 'en' | 'hi') => void;
    className?: string;
}

export function SharedToolbar({ editor, language, setLanguage, className }: SharedToolbarProps) {

    return (
        <div className={`flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap ${!editor ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
            <ToolbarContent editor={editor} language={language} setLanguage={setLanguage} />
        </div>
    );
}

function ToolbarContent({ editor, language, setLanguage }: { editor: Editor | null, language: 'en' | 'hi', setLanguage: (l: 'en' | 'hi') => void }) {

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editor) return;
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            toast.error("Image too large. Max 500KB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor?.can().chain().focus().toggleBold().run()}
                className={editor?.isActive('bold') ? 'bg-muted' : ''}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor?.can().chain().focus().toggleItalic().run()}
                className={editor?.isActive('italic') ? 'bg-muted' : ''}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={editor?.isActive('underline') ? 'bg-muted' : ''}
                title="Underline"
            >
                <UnderlineIcon className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                disabled={!editor?.can().chain().focus().toggleStrike().run()}
                className={editor?.isActive('strike') ? 'bg-muted' : ''}
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Alignment Controls */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className={editor?.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
                title="Align Left"
            >
                <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className={editor?.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
                title="Align Center"
            >
                <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className={editor?.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
                title="Align Right"
            >
                <AlignRight className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor?.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
                title="Heading 1"
            >
                <Heading1 className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor?.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                title="Heading 2"
            >
                <Heading2 className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={editor?.isActive('bulletList') ? 'bg-muted' : ''}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={editor?.isActive('orderedList') ? 'bg-muted' : ''}
                title="Ordered List"
            >
                <ListOrdered className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                onClick={setLink}
                className={editor?.isActive('link') ? 'bg-muted' : ''}
                title="Link"
                disabled={!editor}
            >
                <LinkIcon className="w-4 h-4" />
            </Button>

            <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 ${!editor ? 'pointer-events-none opacity-50' : ''}`}>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={!editor} />
                <ImageIcon className="w-4 h-4" />
            </label>

            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md border bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer group pointer-events-auto">
                <Languages className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700" />
                <Select value={language} onValueChange={(val: 'en' | 'hi') => setLanguage(val)}>
                    <SelectTrigger className="h-4 p-0 border-none bg-transparent focus:ring-0 focus:ring-offset-0 text-xs font-medium text-slate-700 dark:text-slate-300 w-auto gap-1">
                        <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}


// --- SHARED EDITOR COMPONENT ---

interface SharedEditorProps {
    value: string;
    onChange: (value: string) => void;
    onFocus: (editor: Editor) => void;
    language: 'en' | 'hi';
    placeholder?: string;
    className?: string;
    minHeight?: string;
}

export function SharedEditor({ value, onChange, onFocus, language, placeholder, className, minHeight = "100px" }: SharedEditorProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [lastWordPos, setLastWordPos] = useState<{ from: number, to: number } | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
            ImageResize,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify'],
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onFocus: ({ editor }) => {
            onFocus(editor);
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4 ${className}`,
                style: `min-height: ${minHeight}`,
            },
            handleKeyDown: (view, event) => {
                if (language === 'hi' && event.key === ' ') {
                    event.preventDefault();

                    const { state } = view;
                    const { selection } = state;
                    const { $from } = selection;

                    const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);
                    const words = textBefore.split(' ');
                    const lastWord = words[words.length - 1];

                    if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
                        fetch(`https://inputtools.google.com/request?text=${lastWord}&itc=hi-t-i0-und&num=5`)
                            .then(res => res.json())
                            .then(data => {
                                if (data[0] === 'SUCCESS' && data[1][0] && data[1][0][1]) {
                                    const suggestionsList = data[1][0][1];
                                    const bestMatch = suggestionsList[0];

                                    const currentState = view.state;
                                    const currentSelection = currentState.selection;
                                    const currentPos = currentSelection.$from.pos;

                                    const from = currentPos - lastWord.length;
                                    const to = currentPos;

                                    const tr = currentState.tr.insertText(bestMatch + ' ', from, to);
                                    view.dispatch(tr);

                                    setSuggestions(suggestionsList);
                                    setLastWordPos({ from: from, to: from + bestMatch.length });
                                } else {
                                    view.dispatch(view.state.tr.insertText(' '));
                                }
                            })
                            .catch(err => {
                                console.error("Transliteration error", err);
                                view.dispatch(view.state.tr.insertText(' '));
                            });
                        return true;
                    } else {
                        view.dispatch(view.state.tr.insertText(' '));
                        return true;
                    }
                }

                if (suggestions.length > 0 && event.key.length === 1) {
                    setSuggestions([]);
                    setLastWordPos(null);
                }

                return false;
            }
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const replaceWord = (word: string) => {
        if (!lastWordPos || !editor) return;

        editor.chain().focus().command(({ tr, dispatch }) => {
            if (dispatch) {
                tr.insertText(word, lastWordPos.from, lastWordPos.to);
                return true;
            }
            return false;
        }).run();

        setSuggestions([]);
        setLastWordPos(null);
    };

    if (!editor) return null;

    return (
        <div className="relative">
            {suggestions.length > 0 && (
                <div className="absolute z-50 bottom-full left-0 mb-1 flex items-center gap-2 p-1.5 bg-orange-50 border shadow rounded overflow-x-auto max-w-full">
                    {suggestions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => replaceWord(s)}
                            className="text-sm px-2 py-0.5 rounded hover:bg-orange-100 text-orange-900 whitespace-nowrap"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
