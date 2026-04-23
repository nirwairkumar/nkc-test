import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/postsApi';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, Calendar, Search, Pin, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';

const CATEGORIES = ["all", "jee", "neet", "upsc", "ssc", "general"];

export default function NewsFeed() {
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { user, profile, isAdmin } = useAuth();
    const navigate = useNavigate();

    const isCreatorOrAdmin = profile?.is_verified_creator || isAdmin;

    const { data: posts, isLoading: postsLoading, error } = useQuery({
        queryKey: ['posts', activeCategory, searchQuery],
        queryFn: () => postsApi.getFeed(1, 100, activeCategory, searchQuery),
    });

    const [features, setFeatures] = useState<FeatureFlags | null>(null);
    const [featuresLoading, setFeaturesLoading] = useState(true);

    useEffect(() => {
        fetchFeatureFlags().then(data => {
            setFeatures(data);
            setFeaturesLoading(false);
        }).catch(() => setFeaturesLoading(false));
    }, []);

    const isNewsEnabled = features?.enable_news_updates ?? true;

    if (featuresLoading) {
        return (
            <div className="container max-w-6xl mx-auto py-20 px-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAdmin && !isNewsEnabled) {
        return (
            <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300 mb-4">News & Updates Unavailable</h2>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-600 dark:text-slate-400">
                        {features?.news_updates_notes || "The News & Updates section is currently undergoing maintenance and is temporarily unavailable."}
                    </p>
                </div>
                <Button className="mt-8" onClick={() => navigate('/')}>Return to Home</Button>
            </div>
        );
    }

    const isLoading = postsLoading || featuresLoading;

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">News & Updates</h1>
                    <p className="text-muted-foreground mt-1">Get the latest exam news, study materials, and updates.</p>
                </div>

                {isCreatorOrAdmin && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/my-posts')}>
                            My Posts
                        </Button>
                        <Button onClick={() => navigate('/news/create')}>
                            <Edit className="w-4 h-4 mr-2" /> Write Post
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search posts..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex overflow-x-auto pb-2 -mb-2 gap-2 hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <Badge
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            className="px-4 py-1.5 cursor-pointer whitespace-nowrap text-sm bg-white"
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat.toUpperCase()}
                        </Badge>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="flex flex-col h-full overflow-hidden">
                            <Skeleton className="h-48 w-full" />
                            <CardHeader className="p-4 space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardHeader>
                            <CardFooter className="p-4 mt-auto">
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    Failed to load posts. Please try again later.
                </div>
            ) : posts && posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map(post => (
                        <Link key={post.id} to={`/news/${post.slug}`} className="group block h-full">
                            <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-slate-200 dark:border-slate-800 bg-white">
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {post.cover_image ? (
                                        <img
                                            src={post.cover_image}
                                            alt={post.title}
                                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-900/20">
                                            <span className="text-4xl">📰</span>
                                        </div>
                                    )}
                                    {post.is_pinned && (
                                        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 flex items-center gap-1 rounded shadow-sm font-medium">
                                            <Pin className="w-3 h-3" /> Pinned
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                                        {post.category.toUpperCase()}
                                    </div>
                                </div>

                                <CardContent className="flex-1 p-5">
                                    <h3 className="text-xl font-bold mb-2 line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4">
                                        {post.summary || "Read the full post for more details and updates..."}
                                    </p>

                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {post.tags && post.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                                #{tag}
                                            </span>
                                        ))}
                                        {post.tags && post.tags.length > 3 && (
                                            <span className="text-[10px] text-slate-500">+{post.tags.length - 3}</span>
                                        )}
                                    </div>
                                </CardContent>

                                <CardFooter className="p-5 pt-0 mt-auto border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8 rounded border border-slate-200">
                                            <AvatarImage src={post.profiles?.avatar_url} />
                                            <AvatarFallback className="rounded bg-blue-100 text-blue-700 font-semibold text-xs">
                                                {post.profiles?.full_name?.charAt(0) || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-900 dark:text-slate-200 line-clamp-1">
                                                {post.profiles?.full_name || 'Anonymous'}
                                            </span>
                                            <div className="flex items-center text-[10px] text-slate-500 gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(post.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                            <Eye className="w-3 h-3" /> {post.view_count || 0}
                                        </span>
                                        <span className="flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                            <Heart className="w-3 h-3 text-rose-500" /> {post.like_count || 0}
                                        </span>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No posts found</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Check back later or try a different category.</p>
                    {isCreatorOrAdmin && (
                        <Button onClick={() => navigate('/news/create')}>Write the first post</Button>
                    )}
                </div>
            )}
        </div>
    );
}
