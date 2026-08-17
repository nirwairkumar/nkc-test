import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/lib/postsApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Calendar, Eye, Heart, ArrowLeft, Share2, Pin, Clock, 
    Check, Copy, Twitter, Linkedin, Send, MessageCircle, 
    Bookmark, Sparkles, BookOpen
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';

// Tiptap Read-Only Renderer
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';

export default function NewsPostView() {
    const { slug } = useParams<{ slug: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Scroll reading progress state
    const [scrollProgress, setScrollProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const current = (window.scrollY / totalHeight) * 100;
                setScrollProgress(Math.min(100, Math.max(0, current)));
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch Post Data
    const { data: post, isLoading, error } = useQuery({
        queryKey: ['post', slug],
        queryFn: () => postsApi.getPostBySlug(slug!),
        enabled: !!slug,
    });

    // Fetch Related Posts
    const { data: relatedPosts = [] } = useQuery({
        queryKey: ['posts-related', post?.category],
        queryFn: () => postsApi.getFeed(1, 4, post?.category),
        enabled: !!post?.category,
    });

    // Fetch Like Status
    const { data: likeData } = useQuery({
        queryKey: ['post-liked', post?.id],
        queryFn: () => postsApi.checkLiked(post!.id),
        enabled: !!post?.id && !!user,
    });

    // Toggle Like Mutation
    const toggleLikeMutation = useMutation({
        mutationFn: () => postsApi.toggleLike(post!.id),
        onSuccess: (data) => {
            queryClient.setQueryData(['post-liked', post?.id], { liked: data.liked });
            queryClient.setQueryData(['post', slug], (old: any) => ({
                ...old,
                like_count: data.likeCount
            }));
        },
        onError: () => {
            toast.error("Failed to update like status");
        }
    });

    // Feature Flags Check
    const [features, setFeatures] = useState<FeatureFlags | null>(null);
    const [featuresLoading, setFeaturesLoading] = useState(true);

    useEffect(() => {
        fetchFeatureFlags().then(data => {
            setFeatures(data);
            setFeaturesLoading(false);
        }).catch(() => setFeaturesLoading(false));
    }, []);

    const isNewsEnabled = features?.enable_news_updates ?? true;

    // Tiptap Read-only instance
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Highlight,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: true }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl max-w-full my-8 shadow-md mx-auto',
                },
            }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
        ],
        content: post?.content || {},
        editable: false,
    }, [post?.content]);

    useEffect(() => {
        if (editor && !editor.isDestroyed && post?.content) {
            let contentToSet = post.content;
            if (typeof contentToSet === 'string' && (contentToSet.startsWith('{') || contentToSet.startsWith('['))) {
                try {
                    contentToSet = JSON.parse(contentToSet);
                } catch (e) {}
            }
            editor.commands.setContent(contentToSet);
        }
    }, [editor, post?.content]);

    // Estimated Reading Time
    const readTimeMinutes = useMemo(() => {
        if (!post?.content) return 3;
        try {
            const str = JSON.stringify(post.content);
            const words = str.split(/\s+/).length;
            return Math.max(1, Math.ceil(words / 200));
        } catch {
            return 3;
        }
    }, [post?.content]);

    const handleCopyLink = () => {
        const url = `https://blog.testoza.com/${post?.slug || slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Blog link copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShareTwitter = () => {
        const url = encodeURIComponent(`https://blog.testoza.com/${post?.slug || slug}`);
        const text = encodeURIComponent(`Read "${post?.title}" on TestoZa Blog:`);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    const handleShareLinkedIn = () => {
        const url = encodeURIComponent(`https://blog.testoza.com/${post?.slug || slug}`);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    };

    const handleShareWhatsApp = () => {
        const url = encodeURIComponent(`https://blog.testoza.com/${post?.slug || slug}`);
        const text = encodeURIComponent(`Check out this article: "${post?.title}"\n${decodeURIComponent(url)}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const handleLike = () => {
        if (!user) {
            toast("Please log in to like this blog post", {
                action: { label: "Log in", onClick: () => navigate('/login') }
            });
            return;
        }
        toggleLikeMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-6">
                <Skeleton className="h-8 w-32 rounded-xl" />
                <Skeleton className="h-12 w-4/5 rounded-xl" />
                <Skeleton className="h-80 w-full rounded-3xl" />
                <div className="space-y-4 pt-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        );
    }

    if (!user?.user_metadata?.roles?.includes('admin') && !isNewsEnabled) {
        return (
            <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Content Unavailable</h2>
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-600 dark:text-slate-400">
                        {features?.news_updates_notes || "The TestoZa Blog is currently undergoing maintenance."}
                    </p>
                </div>
                <Button className="mt-8" onClick={() => navigate('/')}>Return to Home</Button>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-4">
                <div className="text-5xl">🔍</div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Article Not Found</h2>
                <p className="text-slate-500 text-sm">The article you are looking for might have been moved or removed.</p>
                <Button onClick={() => navigate('/news')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                    Explore All Blog Articles
                </Button>
            </div>
        );
    }

    const canonicalUrl = `https://blog.testoza.com/${post.slug}`;
    const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const jsonLdArticleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.summary || post.title,
        "image": post.cover_image ? [post.cover_image] : ["https://testoza.com/default-og.png"],
        "datePublished": post.published_at || post.created_at,
        "dateModified": post.updated_at || post.published_at || post.created_at,
        "author": {
            "@type": "Person",
            "name": post.profiles?.full_name || "TestoZa Editorial Team",
            "url": "https://testoza.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": "TestoZa",
            "logo": {
                "@type": "ImageObject",
                "url": "https://testoza.com/favicon.ico"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans pb-28">
            
            {/* Scroll Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 z-50">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 transition-all duration-150"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            {/* SEO Meta & Schema.org Structured Data */}
            <SEO
                title={`${post.title} - TestoZa Blog`}
                description={post.summary || `Read ${post.title} on TestoZa Blog for top exam preparation and insights.`}
                image={post.cover_image || undefined}
                type="article"
                canonicalUrl={canonicalUrl}
                schemas={[jsonLdArticleSchema]}
            />

            {/* Top Navigation & Breadcrumbs */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
                <Link
                    to="/news"
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to All Articles</span>
                </Link>
            </div>

            {/* Main Article Container */}
            <article className="max-w-4xl mx-auto px-4 sm:px-6">
                
                {/* Article Header Box */}
                <div className="space-y-4 pb-8">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
                            {post.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {readTimeMinutes} min read
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            {post.view_count || 0} views
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        {post.title}
                    </h1>

                    {post.summary && (
                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {post.summary}
                        </p>
                    )}

                    {/* Author & Share Bar */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                                <AvatarImage src={post.profiles?.avatar_url} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-sm">
                                    {post.profiles?.full_name?.charAt(0) || 'T'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{post.profiles?.full_name || 'TestoZa Team'}</span>
                                    {post.profiles?.is_verified_creator && (
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full">
                                            ✓ Verified
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Educator & Contributor
                                </div>
                            </div>
                        </div>

                        {/* Social Share Pills */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-xs">
                            <button
                                onClick={handleShareTwitter}
                                className="p-2 text-slate-500 hover:text-[#1DA1F2] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="Share on X / Twitter"
                            >
                                <Twitter className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleShareLinkedIn}
                                className="p-2 text-slate-500 hover:text-[#0A66C2] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="Share on LinkedIn"
                            >
                                <Linkedin className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleShareWhatsApp}
                                className="p-2 text-slate-500 hover:text-[#25D366] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="Share on WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCopyLink}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="Copy Link"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Featured Cover Image */}
                {post.cover_image && (
                    <div className="mb-10 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 aspect-video max-h-[480px]">
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Main Article Body (Prose Styling) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-12 shadow-sm">
                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-img:rounded-2xl prose-blockquote:border-l-indigo-600 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-950/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-xl">
                        <EditorContent editor={editor} />
                    </div>

                    {/* Article Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">TAGS:</span>
                            {post.tags.map((tag: string) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Interactive Like & Clap Box */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleLike}
                                variant={likeData?.liked ? "default" : "outline"}
                                className={`rounded-2xl gap-2 font-bold text-xs ${
                                    likeData?.liked 
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                        : 'text-slate-700 dark:text-slate-300 hover:text-rose-600 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <Heart className={`w-4 h-4 ${likeData?.liked ? 'fill-white' : 'text-rose-500'}`} />
                                <span>{post.like_count || 0} Likes</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleCopyLink}
                                variant="outline"
                                className="rounded-2xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Link Copied' : 'Share Link'}</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Author Bio Card */}
                <div className="mt-10 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <Avatar className="w-16 h-16 rounded-2xl border-2 border-indigo-400 shrink-0">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-xl">
                            {post.profiles?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 text-center sm:text-left flex-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <h3 className="text-lg font-bold text-white">
                                {post.profiles?.full_name || 'TestoZa Editorial'}
                            </h3>
                            <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                                Verified Creator
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {post.profiles?.bio || "Creating high-yield mock tests and educational guides to empower learners across India on TestoZa."}
                        </p>
                    </div>
                </div>

                {/* Related Articles Section */}
                {relatedPosts.length > 1 && (
                    <div className="mt-16 space-y-6">
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            <span>Related Articles</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {relatedPosts.filter(p => p.id !== post.id).slice(0, 3).map((r) => (
                                <Link
                                    key={r.id}
                                    to={`/news/${r.slug}`}
                                    className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all p-4 space-y-2"
                                >
                                    <div className="text-[10px] font-bold text-indigo-600 uppercase">
                                        {r.category}
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 line-clamp-2">
                                        {r.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                        {r.summary || "Read more on TestoZa Blog..."}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </article>
        </div>
    );
}
