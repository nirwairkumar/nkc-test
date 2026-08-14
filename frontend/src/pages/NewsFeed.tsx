import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/postsApi';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, Calendar, Search, Pin, Clock, ArrowRight, Sparkles, BookOpen, Newspaper } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeatureFlags, FeatureFlags } from '@/lib/featuresApi';
import { SEO } from '@/components/SEO';

const CATEGORIES = [
    { value: "all", label: "All Topics" },
    { value: "general", label: "Announcements" },
    { value: "jee", label: "JEE Main & Adv" },
    { value: "neet", label: "NEET Medical" },
    { value: "upsc", label: "UPSC Civil Services" },
    { value: "ssc", label: "SSC & Govt Exams" },
    { value: "study-tips", label: "Study Tips" },
    { value: "product-news", label: "Platform News" }
];

export default function NewsFeed() {
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { user, profile, isAdmin } = useAuth();
    const navigate = useNavigate();

    const { data: posts = [], isLoading: postsLoading, error } = useQuery({
        queryKey: ['posts', activeCategory, searchQuery],
        queryFn: () => postsApi.getFeed(1, 100, activeCategory === 'all' ? undefined : activeCategory, searchQuery),
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
    const isLoading = postsLoading || featuresLoading;

    // Separate pinned hero post from rest of feed
    const { featuredPost, regularPosts } = useMemo(() => {
        if (!posts || posts.length === 0) return { featuredPost: null, regularPosts: [] };
        
        const pinned = posts.find(p => p.is_pinned);
        if (pinned && activeCategory === 'all' && !searchQuery.trim()) {
            return {
                featuredPost: pinned,
                regularPosts: posts.filter(p => p.id !== pinned.id)
            };
        }
        return {
            featuredPost: activeCategory === 'all' && !searchQuery.trim() ? posts[0] : null,
            regularPosts: activeCategory === 'all' && !searchQuery.trim() ? posts.slice(1) : posts
        };
    }, [posts, activeCategory, searchQuery]);

    if (!isAdmin && !isNewsEnabled) {
        return (
            <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Blog Under Maintenance</h2>
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-600 dark:text-slate-400">
                        {features?.news_updates_notes || "The TestoZa Blog & News section is currently undergoing updates and will be back shortly."}
                    </p>
                </div>
                <Button className="mt-8" onClick={() => navigate('/')}>Return to Home</Button>
            </div>
        );
    }

    const blogSchema = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "TestoZa Blog & News",
        "description": "Latest exam notifications, study strategies, tips, and product announcements from TestoZa.",
        "url": "https://blog.testoza.com",
        "publisher": {
            "@type": "Organization",
            "name": "TestoZa",
            "logo": {
                "@type": "ImageObject",
                "url": "https://testoza.com/favicon.ico"
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans pb-24">
            <SEO
                title="TestoZa Blog - Exam Insights, Study Tips & Product Updates"
                description="Explore top articles, exam preparation tips, JEE/NEET syllabus changes, quiz creator strategies, and platform announcements on TestoZa Blog."
                canonicalUrl="https://blog.testoza.com"
                schemas={[blogSchema]}
            />

            {/* Professional Compact Blog Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 sm:py-7 shadow-2xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Official Publication</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                TestoZa Blog & News
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                                Exam prep strategies, JEE/NEET insights, study techniques, and platform updates.
                            </p>
                        </div>

                        {/* Integrated Search Box */}
                        <div className="w-full md:w-72">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search articles, topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="mt-5 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setActiveCategory(cat.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                    activeCategory === cat.value
                                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">

                {isLoading ? (
                    <div className="space-y-8">
                        <Skeleton className="h-96 w-full rounded-2xl" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl border border-rose-200">
                        Failed to load articles. Please check your connection and try again.
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="text-5xl">📰</div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Articles Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {searchQuery ? "No blog posts match your keyword search. Try searching for other exam terms." : "New articles are being drafted. Check back soon!"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        
                        {/* Featured Lead Article Hero */}
                        {featuredPost && (
                            <Link 
                                to={`/news/${featuredPost.slug}`} 
                                className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-center">
                                    <div className="lg:col-span-7 aspect-video lg:aspect-auto lg:h-[380px] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                        {featuredPost.cover_image ? (
                                            <img
                                                src={featuredPost.cover_image}
                                                alt={featuredPost.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-6xl">
                                                ✍️
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                                            FEATURED ARTICLE
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 p-6 sm:p-8 space-y-4">
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                                                {featuredPost.category}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(featuredPost.published_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight">
                                            {featuredPost.title}
                                        </h2>

                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                            {featuredPost.summary || "Read the full article on TestoZa to discover actionable insights and strategies..."}
                                        </p>

                                        <div className="pt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-8 h-8 rounded-full border border-slate-200">
                                                    <AvatarImage src={featuredPost.profiles?.avatar_url} />
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                                                        {featuredPost.profiles?.full_name?.charAt(0) || 'T'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {featuredPost.profiles?.full_name || 'TestoZa Team'}
                                                </span>
                                            </div>

                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                <span>Read Article</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Regular Articles Grid */}
                        {regularPosts.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                    <span>Latest Articles</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {regularPosts.map((post) => (
                                        <Link
                                            key={post.id}
                                            to={`/news/${post.slug}`}
                                            className="group flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                        >
                                            <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                                {post.cover_image ? (
                                                    <img
                                                        src={post.cover_image}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 text-4xl">
                                                        📰
                                                    </div>
                                                )}
                                                <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                    {post.category}
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                                <div className="space-y-2">
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{new Date(post.published_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    </div>

                                                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                                        {post.title}
                                                    </h4>

                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                        {post.summary || "Explore the complete article on TestoZa Blog..."}
                                                    </p>
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="w-5 h-5 rounded-full">
                                                            <AvatarImage src={post.profiles?.avatar_url} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                                                                {post.profiles?.full_name?.charAt(0) || 'T'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-[11px] font-medium truncate max-w-[100px]">
                                                            {post.profiles?.full_name || 'TestoZa'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-500" /> {post.view_count || 0}</span>
                                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {post.like_count || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

            </div>
        </div>
    );
}
