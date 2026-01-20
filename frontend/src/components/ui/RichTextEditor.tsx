import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageResize from 'tiptap-extension-resize-image';
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
    Languages
} from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const [language, setLanguage] = React.useState<'en' | 'hi'>('en');
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [lastWordPos, setLastWordPos] = React.useState<{ from: number, to: number } | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            ImageResize,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4',
            },
            handleKeyDown: (view, event) => {
                if (language === 'hi' && event.key === ' ') {
                    // Prevent default space insertion immediately
                    event.preventDefault();

                    const { state, dispatch } = view;
                    const { selection } = state;
                    const { $from } = selection;

                    // Get text before cursor
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

                                    // Use CURRENT state from view to avoid race conditions
                                    const currentState = view.state;
                                    const currentSelection = currentState.selection;
                                    const currentPos = currentSelection.$from.pos;

                                    // Calculate range based on the word length we captured
                                    const from = currentPos - lastWord.length;
                                    const to = currentPos;

                                    // Insert Hindi word + Space
                                    const tr = currentState.tr.insertText(bestMatch + ' ', from, to);
                                    view.dispatch(tr);

                                    // Update suggestions bar
                                    setSuggestions(suggestionsList);
                                    // Update lastWordPos to point to the new Hindi word
                                    setLastWordPos({ from: from, to: from + bestMatch.length });
                                } else {
                                    // Fallback if no suggestions: just insert space
                                    view.dispatch(view.state.tr.insertText(' '));
                                }
                            })
                            .catch(err => {
                                console.error("Transliteration error", err);
                                // Fallback on error: insert space
                                view.dispatch(view.state.tr.insertText(' '));
                            });

                        return true;
                    } else {
                        // Not a valid word, just let space happen? 
                        // But we prevented default. So we must insert space.
                        view.dispatch(view.state.tr.insertText(' '));
                        return true;
                    }
                }

                // Clear suggestions on other keys
                if (suggestions.length > 0 && event.key.length === 1) {
                    setSuggestions([]);
                    setLastWordPos(null);
                }

                return false;
            }
        },
    });

    if (!editor) {
        return null;
    }

    const replaceWord = (word: string) => {
        if (!lastWordPos) return;

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

    const addImage = () => {
        const url = window.prompt('Image URL');

        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className={`border rounded-md flex flex-col bg-background ${className} ${language === 'hi' ? 'border-orange-200 ring-1 ring-orange-200' : ''}`}>
            <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-muted' : ''}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-muted' : ''}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-muted' : ''}
                    title="Underline"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-muted' : ''}
                    title="Strikethrough"
                >
                    <Strikethrough className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-border mx-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-border mx-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-muted' : ''}
                    title="Bullet List"
                >
                    <List className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-muted' : ''}
                    title="Ordered List"
                >
                    <ListOrdered className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive('blockquote') ? 'bg-muted' : ''}
                    title="Blockquote"
                >
                    <Quote className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-border mx-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={setLink}
                    className={editor.isActive('link') ? 'bg-muted' : ''}
                    title="Link"
                >
                    <LinkIcon className="w-4 h-4" />
                </Button>

                <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <ImageIcon className="w-4 h-4" />
                </label>

                <div className="w-px h-4 bg-border mx-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    title="Undo"
                >
                    <Undo className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    title="Redo"
                >
                    <Redo className="w-4 h-4" />
                </Button>

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
            </div>

            {suggestions.length > 0 && (
                <div className="flex items-center gap-2 p-1.5 bg-orange-50 border-b overflow-x-auto">
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
