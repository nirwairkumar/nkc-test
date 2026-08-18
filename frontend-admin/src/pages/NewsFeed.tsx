import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '@/lib/postsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, Eye, Heart, Calendar, Pin, Edit, Trash2, 
    ExternalLink, FileText, CheckCircle2, Clock, Globe, Filter,
    Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
    { value: "all", label: "All Categories" },
    { value: "general", label: "General" },
    { value: "jee", label: "JEE" },
    { value: "neet", label: "NEET" },
    { value: "upsc", label: "UPSC" },
    { value: "ssc", label: "SSC" },
    { value: "study-tips", label: "Study Tips" },
    { value: "product-news", label: "Product News" }
];

export default function NewsFeed() {
    const [activeCategory, setActiveCategory] = useState("all");
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: posts = [], isLoading, refetch } = useQuery({
        queryKey: ['my-posts'],
        queryFn: () => postsApi.getMyPosts(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => postsApi.deletePost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            toast.success("Blog post deleted");
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to delete post");
        }
    });

    const togglePinMutation = useMutation({
        mutationFn: ({ id, is_pinned }: { id: string; is_pinned: boolean }) => 
            postsApi.updatePost(id, { is_pinned: !is_pinned }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            toast.success("Updated pin status");
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to update pin status");
        }
    });

    const filteredPosts = posts.filter(post => {
        if (activeCategory !== 'all' && post.category !== activeCategory) return false;
        if (statusFilter !== 'all' && post.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = (post.title || '').toLowerCase().includes(q);
            const matchSlug = (post.slug || '').toLowerCase().includes(q);
            const matchSummary = (post.summary || '').toLowerCase().includes(q);
            if (!matchTitle && !matchSlug && !matchSummary) return false;
        }
        return true;
    });

    const stats = {
        total: posts.length,
        published: posts.filter(p => p.status === 'published').length,
        drafts: posts.filter(p => p.status === 'draft').length,
        totalViews: posts.reduce((acc, p) => acc + (p.view_count || 0), 0),
        totalLikes: posts.reduce((acc, p) => acc + (p.like_count || 0), 0),
    };

    const handleDelete = (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete the blog post "${title}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6 font-sans pb-16">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                                <Globe className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Blog & News Management</h1>
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                                blog.testoza.com
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                            Publish news, study guides, exam strategies, and company announcements. Posts are instantly indexed and publicly crawlable at <code>blog.testoza.com</code> and <code>testoza.com/blog</code>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => window.open('https://blog.testoza.com', '_blank')}
                            variant="outline"
                            className="bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                        >
                            <ExternalLink className="h-4 w-4 mr-1.5 text-indigo-400" />
                            <span>View Public Blog</span>
                        </Button>
                        <Button
                            onClick={() => navigate('/news/create')}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>Write New Blog Post</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-between">
                        <span>Total Posts</span>
                        <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.total}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-between">
                        <span>Published</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.published}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-between">
                        <span>Drafts</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.drafts}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-between">
                        <span>Total Views</span>
                        <Eye className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.totalViews}</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs col-span-2 sm:col-span-1">
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-between">
                        <span>Total Likes</span>
                        <Heart className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{stats.totalLikes}</div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search posts by title, slug, or summary..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs rounded-xl"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    {/* Status Pill Filters */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                        {(['all', 'published', 'draft'] as const).map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                                    statusFilter === st
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    {/* Category Dropdown */}
                    <select
                        value={activeCategory}
                        onChange={(e) => setActiveCategory(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        className="text-slate-500 hover:text-slate-900 rounded-xl h-8 w-8 p-0"
                        title="Refresh list"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Posts List / Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                        <span>Loading blog posts...</span>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-xs space-y-3">
                        <div className="text-4xl">📝</div>
                        <div className="font-bold text-sm text-slate-700 dark:text-slate-300">No blog posts found</div>
                        <p className="text-slate-400 max-w-sm mx-auto">
                            {searchQuery ? "Try refining your search query or filters." : "Create your first blog post to start publishing news and study tips on blog.testoza.com."}
                        </p>
                        <Button onClick={() => navigate('/news/create')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold mt-2">
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>Write First Post</span>
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredPosts.map((post) => {
                            const isPublished = post.status === 'published';
                            const dateStr = (post.published_at || post.created_at || '').substring(0, 10) || 'N/A';
                            
                            return (
                                <div 
                                    key={post.id} 
                                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                        {/* Cover Image Thumbnail */}
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                            {post.cover_image ? (
                                                <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                                    📰
                                                </div>
                                            )}
                                        </div>

                                        {/* Post Details */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Status Pill */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                    isPublished
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                                }`}>
                                                    {isPublished ? '● Published' : '○ Draft'}
                                                </span>

                                                {/* Pinned Pill */}
                                                {post.is_pinned && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1 border border-amber-300">
                                                        <Pin className="h-2.5 w-2.5" /> Featured Lead
                                                    </span>
                                                )}

                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md">
                                                    {post.category}
                                                </span>
                                            </div>

                                            <h3 
                                                onClick={() => navigate(`/news/edit/${post.id}`)}
                                                className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 cursor-pointer transition-colors"
                                            >
                                                {post.title}
                                            </h3>

                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                                                <span>blog.testoza.com/{post.slug}</span>
                                                <span>•</span>
                                                <span className="font-sans flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>
                                                <span>•</span>
                                                <span className="font-sans flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> {post.view_count || 0} views</span>
                                                <span>•</span>
                                                <span className="font-sans flex items-center gap-1"><Heart className="h-3 w-3 text-rose-500" /> {post.like_count || 0} likes</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {/* Pin Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => togglePinMutation.mutate({ id: post.id, is_pinned: !!post.is_pinned })}
                                            className={`rounded-lg h-8 px-2.5 text-xs font-semibold ${
                                                post.is_pinned 
                                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40' 
                                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                            title={post.is_pinned ? "Unpin featured" : "Pin as featured"}
                                        >
                                            <Pin className="h-3.5 w-3.5 mr-1" />
                                            <span>{post.is_pinned ? 'Pinned' : 'Pin'}</span>
                                        </Button>

                                        {/* View Live Public Post */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(`https://blog.testoza.com/${post.slug}`, '_blank')}
                                            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg h-8 px-2.5 text-xs font-semibold"
                                            title="Open public blog post in new tab"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                            <span>View</span>
                                        </Button>

                                        {/* Edit Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/news/edit/${post.id}`)}
                                            className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-8 px-3 text-xs font-bold"
                                        >
                                            <Edit className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                                            <span>Edit</span>
                                        </Button>

                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(post.id, post.title)}
                                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg h-8 w-8 p-0"
                                            title="Delete post"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
