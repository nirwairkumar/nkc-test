import React, { useState, useEffect, useMemo } from 'react';
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
import { 
    Loader2, Save, Send, Image as ImageIcon, X, ArrowLeft, 
    Eye, Sparkles, Pin, Globe, Search, Clock, FileText, CheckCircle2,
    Calendar, Share2, HelpCircle
} from 'lucide-react';

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

const CATEGORIES = [
    { value: "general", label: "General Announcements" },
    { value: "jee", label: "JEE Main & Advanced" },
    { value: "neet", label: "NEET Medical Preparation" },
    { value: "upsc", label: "UPSC & Civil Services" },
    { value: "ssc", label: "SSC & Government Exams" },
    { value: "study-tips", label: "Study Strategies & Tips" },
    { value: "product-news", label: "TestoZa Features & Updates" }
];

export default function NewsPostEditor() {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [isCustomSlug, setIsCustomSlug] = useState(false);
    const [summary, setSummary] = useState('');
    const [category, setCategory] = useState('general');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Fetch Existing Post if editing
    const { data: existingPost, isLoading: isLoadingPost } = useQuery({
        queryKey: ['post-edit', id],
        queryFn: async () => {
            const posts = await postsApi.getMyPosts();
            return posts.find(p => p.id === id) || null;
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
            ImageExtension.configure({ inline: false, HTMLAttributes: { class: 'rounded-xl max-w-full my-6 shadow-md mx-auto' } }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
            Placeholder.configure({ placeholder: 'Write your story here... Use headings, bullet points, images, and rich formatting.' }),
        ],
        content: '',
    });

    // Auto-generate slug from title if user hasn't set a custom slug
    const generateSlugFromTitle = (t: string) => {
        return t
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '-');
    };

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isCustomSlug && !isEditing) {
            setSlug(generateSlugFromTitle(val));
        }
    };

    // Calculate word count & estimated read time
    const { wordCount, readTimeMinutes } = useMemo(() => {
        if (!editor) return { wordCount: 0, readTimeMinutes: 1 };
        const text = editor.getText();
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        return { wordCount: words, readTimeMinutes: minutes };
    }, [editor?.getText()]);

    // Populate form if editing
    useEffect(() => {
        if (existingPost && editor) {
            setTitle(existingPost.title);
            setSlug(existingPost.slug || '');
            setIsCustomSlug(true);
            setSummary(existingPost.summary || '');
            setCategory(existingPost.category || 'general');
            setTags(existingPost.tags || []);
            setCoverImage(existingPost.cover_image || null);
            setIsPinned(!!existingPost.is_pinned);
            if (!editor.isDestroyed && existingPost.content) {
                editor.commands.setContent(existingPost.content);
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
            toast.success("Cover image uploaded successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload cover image");
        } finally {
            setIsUploading(false);
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (status: 'draft' | 'published') => {
            const finalSlug = slug.trim() || generateSlugFromTitle(title);
            const payload = {
                title: title.trim(),
                slug: finalSlug,
                summary: summary.trim(),
                category,
                tags,
                cover_image: coverImage || undefined,
                content: editor?.getJSON() || {},
                status,
                is_pinned: isPinned
            };
            if (isEditing) {
                return postsApi.updatePost(id!, payload);
            }
            return postsApi.createPost(payload);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            toast.success(data.status === 'published' ? "🎉 Blog Post Published Live!" : "💾 Draft Saved Successfully!");
            navigate('/posts');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || err.message || "Failed to save blog post");
        }
    });

    const handleSave = (status: 'draft' | 'published') => {
        if (!title.trim()) {
            toast.error("Please enter a blog post title");
            return;
        }
        if (editor?.isEmpty) {
            toast.error("Please write some content in the blog editor");
            return;
        }
        saveMutation.mutate(status);
    };

    if (isEditing && isLoadingPost) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-slate-500">Loading blog post for editing...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans">
            
            {/* Top Fixed Studio Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/posts')}
                            className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            <span>Back to Blog Posts</span>
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:border-slate-700 hidden sm:block" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            {isEditing ? 'Editing Blog Post' : 'Write New Blog Post'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Word & Read Time Badge */}
                        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{readTimeMinutes} min read</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>{wordCount} words</span>
                        </div>

                        {/* Live Preview Button */}
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowPreviewModal(true)}
                            className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                        >
                            <Eye className="w-4 h-4 mr-1.5 text-indigo-600" />
                            <span>Live Preview</span>
                        </Button>

                        {/* Save Draft */}
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSave('draft')} 
                            disabled={saveMutation.isPending}
                            className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                        >
                            {saveMutation.isPending && saveMutation.variables === 'draft' ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-1.5 text-slate-500" />
                            )}
                            <span>Save Draft</span>
                        </Button>

                        {/* Publish Live */}
                        <Button 
                            type="button" 
                            size="sm"
                            onClick={() => handleSave('published')} 
                            disabled={saveMutation.isPending}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 rounded-xl transition-all"
                        >
                            {saveMutation.isPending && saveMutation.variables === 'published' ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 mr-1.5" />
                            )}
                            <span>Publish to Blog</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content: 2-Column Split */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left 8 Cols: Main Writing Canvas */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Title & Slug Box */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Blog Article Title
                                </label>
                                <textarea
                                    className="w-full text-2xl sm:text-3xl font-extrabold bg-transparent border-none outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white leading-tight min-h-[60px]"
                                    placeholder="Enter a compelling blog post title..."
                                    value={title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    rows={1}
                                    onInput={(e) => {
                                        e.currentTarget.style.height = 'auto';
                                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                    }}
                                />
                            </div>

                            {/* Public URL / Slug Row */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-500 flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Live URL:</span>
                                </span>
                                <span className="font-mono text-slate-400">https://blog.testoza.com/</span>
                                <div className="flex-1 min-w-[200px] flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => {
                                            setIsCustomSlug(true);
                                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                                        }}
                                        placeholder="custom-post-slug"
                                        className="w-full font-mono text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {isCustomSlug && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomSlug(false);
                                                setSlug(generateSlugFromTitle(title));
                                                toast.info("Slug regenerated from title");
                                            }}
                                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
                                            title="Reset slug from title"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Short Summary Box */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Summary / Excerpt
                                </label>
                                <span className="text-[11px] text-slate-400">
                                    {summary.length}/300 chars (Used for Google Snippets & Social Cards)
                                </span>
                            </div>
                            <Textarea
                                placeholder="Write a concise 2-3 sentence overview of this article to entice readers on Google and social media..."
                                className="resize-none h-20 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs rounded-xl"
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                maxLength={300}
                            />
                        </div>

                        {/* Rich Document Editor Canvas (LinkedIn Article Style) */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {editor && <PostToolbar editor={editor} />}
                            <div 
                                onClick={() => editor?.commands.focus()}
                                className="tiptap-editorial-canvas min-h-[550px] p-6 sm:p-10 cursor-text focus-within:outline-none"
                            >
                                <EditorContent editor={editor} />
                            </div>
                        </div>

                    </div>

                    {/* Right 4 Cols: Sidebar Settings & SEO Preview */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
                        
                        {/* Status & Options Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                <span>Publishing Settings</span>
                            </h3>

                            {/* Pinned to Top Toggle */}
                            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <Pin className="w-4 h-4 text-amber-500" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Pin as Featured Post</div>
                                        <div className="text-[11px] text-slate-500">Showcases this article as hero banner</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </label>

                            {/* Category Selector */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value} className="text-xs font-medium">
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tags Input */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tags (Press Enter)</Label>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        {tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-[11px] flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                                <span>#{tag}</span>
                                                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                                            </Badge>
                                        ))}
                                    </div>
                                    <input
                                        className="w-full border-none outline-none bg-transparent text-xs py-1 px-1 placeholder:text-slate-400"
                                        placeholder="Add tag (e.g. jee2026, mocktest)..."
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagAdd}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Featured Cover Image Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <ImageIcon className="w-4 h-4 text-indigo-600" />
                                <span>Featured Cover Image</span>
                            </h3>

                            {coverImage ? (
                                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 group border border-slate-200 dark:border-slate-800">
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-100">
                                            Replace
                                            <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={isUploading} />
                                        </label>
                                        <Button variant="destructive" size="sm" onClick={() => setCoverImage(null)}>
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-700 dark:hover:bg-slate-800/80 transition-colors">
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                                        ) : (
                                            <ImageIcon className="w-7 h-7 text-slate-400 mb-2" />
                                        )}
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to upload cover</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WebP up to 5MB (16:9 recommended)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={isUploading} />
                                </label>
                            )}
                        </div>

                        {/* Google SERP Search Snippet Simulation */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Search className="w-4 h-4 text-emerald-600" />
                                    <span>Google Search Preview</span>
                                </h3>
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                    SEO Ready
                                </span>
                            </div>

                            {/* Google SERP Card */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 font-sans space-y-1">
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate flex items-center gap-1">
                                    <span>https://blog.testoza.com</span>
                                    <span>›</span>
                                    <span>{slug || 'post-slug'}</span>
                                </div>
                                <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 line-clamp-1 hover:underline cursor-pointer">
                                    {title.trim() ? `${title} - TestoZa Blog` : 'Enter a post title to see Google search preview'}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                    {summary.trim() ? summary : 'A clear summary provides a preview snippet in search engine results and social card shares.'}
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* Live Reader Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-indigo-600" />
                                <span className="text-sm font-bold text-slate-900 dark:text-white">Public Blog Reader Preview</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                                    blog.testoza.com
                                </span>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6">
                            {/* Article Category & Meta */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider text-[10px]">
                                    {category}
                                </span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span>•</span>
                                <span>{readTimeMinutes} min read</span>
                            </div>

                            {/* Article Title */}
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                {title || 'Untitled Blog Post'}
                            </h1>

                            {/* Author Row */}
                            <div className="flex items-center gap-3 py-3 border-y border-slate-100 dark:border-slate-800">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {profile?.full_name || 'TestoZa Team'}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Educator & Creator at TestoZa
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image */}
                            {coverImage && (
                                <div className="rounded-2xl overflow-hidden shadow-md aspect-video">
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Article Body Content */}
                            <div 
                                className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
                                dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '<p>No content written yet.</p>' }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
