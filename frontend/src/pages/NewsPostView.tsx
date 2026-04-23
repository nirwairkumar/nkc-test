import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/lib/postsApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, Heart, ArrowLeft, Share2, Pin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
    const queryClient = useQueryClient();

    // Fetch Post Data
    const { data: post, isLoading, error } = useQuery({
        queryKey: ['post', slug],
        queryFn: () => postsApi.getPostBySlug(slug!),
        enabled: !!slug,
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
            // Optimistically update
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
                    class: 'rounded-lg max-w-full my-4 shadow-sm mx-auto',
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

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: post?.title,
                text: post?.summary,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
        }
    };

    const handleLike = () => {
        if (!user) {
            toast("Please log in to like posts", {
                action: { label: "Log in", onClick: () => window.location.href = '/auth' }
            });
            return;
        }
        toggleLikeMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="container max-w-4xl mx-auto py-8 px-4">
                <Skeleton className="h-8 w-32 mb-8" />
                <Skeleton className="h-64 w-full rounded-2xl mb-8" />
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-8" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        );
    }

    if (!user?.user_metadata?.roles?.includes('admin') && !isNewsEnabled) {
        return (
            <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300 mb-4">Content Unavailable</h2>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-600 dark:text-slate-400">
                        {features?.news_updates_notes || "The News & Updates section is currently undergoing maintenance and is temporarily unavailable."}
                    </p>
                </div>
                <Button className="mt-8" onClick={() => window.location.href = '/'}>Return to Home</Button>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="container max-w-4xl mx-auto py-20 px-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Post not found</h2>
                <p className="text-muted-foreground mb-6">The post you are looking for might have been removed or doesn't exist.</p>
                <Button asChild>
                    <Link to="/news">Return to News Feed</Link>
                </Button>
            </div>
        );
    }

    const isLiked = likeData?.liked;

    return (
        <div className="bg-slate-50 min-h-screen dark:bg-slate-950 pb-20">
            {/* Cover Image Banner */}
            {post.cover_image && (
                <div className="w-full h-[30vh] md:h-[45vh] relative bg-slate-200 dark:bg-slate-900">
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                </div>
            )}

            <div className={`container max-w-4xl mx-auto px-4 ${post.cover_image ? '-mt-24 relative z-10' : 'pt-12'}`}>

                <Link to="/news" className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-6 hover:bg-white/20 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
                </Link>

                {/* Post Header */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 mb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="default" className="bg-blue-600 text-white">
                            {post.category.toUpperCase()}
                        </Badge>
                        {post.is_pinned && (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
                                <Pin className="w-3 h-3 mr-1" /> Pinned
                            </Badge>
                        )}
                        {post.status !== 'published' && (
                            <Badge variant="destructive">{post.status.toUpperCase()}</Badge>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                        {post.title}
                    </h1>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-6 border-y border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                                <AvatarImage src={post.profiles?.avatar_url} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                    {post.profiles?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    {post.profiles?.full_name || 'Anonymous'}
                                    {post.profiles?.is_verified_creator && (
                                        <span className="text-blue-500 text-sm" title="Verified Creator">✓</span>
                                    )}
                                </div>
                                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(post.published_at || post.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-3.5 h-3.5" />
                                        {post.view_count || 0} views
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant={isLiked ? "default" : "outline"}
                                size="sm"
                                className={`rounded-full shadow-sm ${isLiked ? 'bg-rose-500 hover:bg-rose-600 text-white border-transparent' : 'text-slate-600'}`}
                                onClick={handleLike}
                                disabled={toggleLikeMutation.isPending}
                            >
                                <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                                {post.like_count || 0}
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full shadow-sm text-slate-600" onClick={handleShare}>
                                <Share2 className="w-4 h-4 mr-2" /> Share
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Rich Text Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl">
                    <EditorContent editor={editor} />
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-slate-500 py-1 mr-2">Tags:</span>
                        {post.tags.map(tag => (
                            <Link key={tag} to={`/news?tag=${tag}`}>
                                <Badge variant="secondary" className="hover:bg-slate-200">#{tag}</Badge>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
