import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { postsApi } from '@/lib/postsApi';
import { toast } from 'sonner';

// UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Send, Image as ImageIcon, X, ArrowLeft } from 'lucide-react';

// Tiptap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

import PostToolbar from '@/components/posts/PostToolbar';

const CATEGORIES = ["general", "jee", "neet", "upsc", "ssc"];

export default function NewsPostEditor() {
    const { id } = useParams<{ id: string }>(); // If editing
    const isEditing = !!id;

    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [category, setCategory] = useState('general');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Security check mapping auth state
    useEffect(() => {
        if (!profile) return;
        if (!profile.is_verified_creator && profile.role !== 'admin') {
            toast.error("Unauthorized: Only verified creators can write posts.");
            navigate('/news');
        }
    }, [profile, navigate]);

    // Fetch Existing Post if editing
    const { data: existingPost, isLoading: isLoadingPost } = useQuery({
        queryKey: ['post-edit', id],
        queryFn: async () => {
            if (!id) return null;
            try {
                return await postsApi.getPostById(id);
            } catch {
                const posts = await postsApi.getMyPosts();
                return posts.find(p => p.id === id) || null;
            }
        },
        enabled: isEditing,
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Highlight,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: false }),
            ImageExtension.configure({ inline: false, HTMLAttributes: { class: 'rounded-lg max-w-full my-4 shadow-sm mx-auto' } }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
            Placeholder.configure({ placeholder: 'Start writing your post...' }),
        ],
        editorProps: {
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image/'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (file) {
                        event.preventDefault();
                        toast.info("Uploading pasted image...");
                        postsApi.uploadImage(file)
                            .then((url) => {
                                const { state, dispatch } = view;
                                const { schema } = state;
                                const node = schema.nodes.image.create({ src: url });
                                const transaction = state.tr.replaceSelectionWith(node);
                                dispatch(transaction);
                                toast.success("Image pasted successfully!");
                            })
                            .catch((err: any) => {
                                toast.error("Failed to upload pasted image: " + (err.message || 'Error'));
                            });
                        return true;
                    }
                }
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        event.preventDefault();
                        toast.info("Uploading dropped image...");
                        postsApi.uploadImage(file)
                            .then((url) => {
                                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                                if (coordinates) {
                                    const { state, dispatch } = view;
                                    const { schema } = state;
                                    const node = schema.nodes.image.create({ src: url });
                                    const transaction = state.tr.insert(coordinates.pos, node);
                                    dispatch(transaction);
                                }
                                toast.success("Image uploaded successfully!");
                            })
                            .catch((err: any) => {
                                toast.error("Failed to upload image: " + (err.message || 'Error'));
                            });
                        return true;
                    }
                }
                return false;
            }
        },
        content: '',
    });

    // Populate form if editing
    useEffect(() => {
        if (existingPost && editor && !editor.isDestroyed) {
            setTitle(existingPost.title || '');
            setSummary(existingPost.summary || '');
            setCategory(existingPost.category || 'general');
            setTags(existingPost.tags || []);
            setCoverImage(existingPost.cover_image || null);
            if (existingPost.content) {
                let contentToSet: any = existingPost.content;
                if (typeof contentToSet === 'string' && (contentToSet.startsWith('{') || contentToSet.startsWith('['))) {
                    try {
                        contentToSet = JSON.parse(contentToSet);
                    } catch (e) {
                        // ignore and use string
                    }
                }
                editor.commands.setContent(contentToSet);
            }
        }
    }, [existingPost, editor]);

    const handleTagAdd = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const url = await postsApi.uploadImage(file);
            setCoverImage(url);
            toast.success("Cover image uploaded!");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (status: 'draft' | 'published') => {
            const payload = {
                title,
                summary,
                category,
                tags,
                cover_image: coverImage || undefined,
                content: editor?.getJSON() || {},
                status
            };
            if (isEditing) {
                return postsApi.updatePost(id!, payload);
            }
            return postsApi.createPost(payload);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            toast.success(data.status === 'published' ? "Post Published!" : "Draft Saved!");
            navigate('/my-posts');
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to save post");
        }
    });

    const handleSave = (status: 'draft' | 'published') => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }
        if (editor?.isEmpty) {
            toast.error("Content is empty");
            return;
        }
        saveMutation.mutate(status);
    };

    if (isEditing && isLoadingPost) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
                <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <span className="font-semibold">{isEditing ? 'Edit Post' : 'Create New Post'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saveMutation.isPending}>
                            {saveMutation.isPending && saveMutation.variables === 'draft' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Draft
                        </Button>
                        <Button onClick={() => handleSave('published')} disabled={saveMutation.isPending}>
                            {saveMutation.isPending && saveMutation.variables === 'published' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Publish
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container max-w-4xl mx-auto px-4 py-8">
                <div className="space-y-6">
                    {/* Title Area */}
                    <div>
                        <textarea
                            className="w-full text-4xl md:text-5xl font-extrabold bg-transparent border-none outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 min-h-[80px]"
                            placeholder="Post Title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            rows={1}
                            onInput={(e) => {
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                            }}
                        />
                    </div>

                    {/* Meta Data Row */}
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex-1 space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-[2] space-y-2">
                            <Label>Tags (Press Enter/Comma)</Label>
                            <div className="flex items-center border rounded-md px-2 focus-within:ring-1 focus-within:ring-slate-900 bg-transparent">
                                <div className="flex gap-1 flex-wrap py-1.5">
                                    {tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="px-1.5 py-0 flex items-center gap-1">
                                            {tag}
                                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                                        </Badge>
                                    ))}
                                    <input
                                        className="border-none outline-none bg-transparent min-w-[120px] text-sm py-1"
                                        placeholder="Add tag..."
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagAdd}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Meta */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Short Summary <span className="text-slate-400 font-normal text-xs">(Shown on feed cards)</span></Label>
                            <Textarea
                                placeholder="A brief overview of the post..."
                                className="resize-none h-20"
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                maxLength={300}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cover Image</Label>
                            {coverImage ? (
                                <div className="relative rounded-xl overflow-hidden aspect-video max-h-64 bg-slate-100 group">
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={() => setCoverImage(null)}>
                                            Remove Cover
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/80 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />}
                                        <p className="text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={isUploading} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-8">
                        {editor && <PostToolbar editor={editor} />}
                        <div className="min-h-[500px] p-4 md:p-8 prose prose-slate dark:prose-invert max-w-none focus-within:outline-none placeholder:text-slate-300">
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
