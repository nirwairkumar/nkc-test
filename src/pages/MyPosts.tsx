import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { postsApi } from '@/lib/postsApi';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Heart, MoreVertical, Trash2, Send, Archive, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PostDetailed } from '@/lib/types';

export default function MyPosts() {
    const { user, profile, isAdmin } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Security
    if (profile && !profile.is_verified_creator && !isAdmin) {
        navigate('/news');
        return null;
    }

    const { data: posts, isLoading } = useQuery({
        queryKey: ['my-posts'],
        queryFn: () => postsApi.getMyPosts(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => postsApi.deletePost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            toast.success("Post deleted successfully");
            setDeleteConfirm(null);
        },
        onError: () => {
            toast.error("Failed to delete post");
            setDeleteConfirm(null);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'draft' | 'published' | 'archived' }) =>
            postsApi.updatePost(id, { status }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['my-posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            toast.success(`Post marked as ${variables.status}`);
        },
        onError: () => toast.error("Failed to update status")
    });

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Posts</h1>
                    <p className="text-muted-foreground mt-1">Manage your drafts and published articles.</p>
                </div>
                <Button onClick={() => navigate('/news/create')}>
                    <Edit className="w-4 h-4 mr-2" /> Write New Post
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : posts && posts.length > 0 ? (
                <div className="grid gap-4">
                    {posts.map(post => (
                        <Card key={post.id} className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <CardContent className="p-0 sm:flex items-center">
                                {/* Image */}
                                <div className="w-full sm:w-48 h-32 bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative border-r border-slate-100 dark:border-slate-800">
                                    {post.cover_image ? (
                                        <img src={post.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">📝</div>
                                    )}
                                    {post.status === 'draft' && (
                                        <div className="absolute top-2 left-2"><Badge variant="secondary" className="bg-slate-900/70 text-white backdrop-blur-sm">DRAFT</Badge></div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-5 lg:flex items-center justify-between">
                                    <div className="mb-4 lg:mb-0 mr-4 flex-1">
                                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 tracking-wider uppercase">
                                            {post.category}
                                        </div>
                                        <h3 className="text-xl font-bold line-clamp-1 mb-1" title={post.title}>{post.title}</h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                                            {post.status === 'published' && (
                                                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.view_count || 0}</span>
                                            )}
                                            {post.status === 'published' && (
                                                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> {post.like_count || 0}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {post.status === 'published' && (
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/news/${post.slug}`)}>
                                                View
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/news/edit/${post.id}`)}>
                                            Edit
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {post.status === 'draft' && (
                                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'published' })}>
                                                        <Send className="w-4 h-4 mr-2" /> Publish
                                                    </DropdownMenuItem>
                                                )}
                                                {post.status === 'published' && (
                                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'archived' })}>
                                                        <Archive className="w-4 h-4 mr-2" /> Archive
                                                    </DropdownMenuItem>
                                                )}
                                                {post.status === 'archived' && (
                                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'draft' })}>
                                                        <Edit className="w-4 h-4 mr-2" /> Move to Draft
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem className="text-red-500 hover:text-red-600 focus:text-red-600" onClick={() => setDeleteConfirm(post.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                    <p className="text-slate-500 mb-6 font-medium">Start writing to share your knowledge.</p>
                    <Button onClick={() => navigate('/news/create')}>
                        Create Your First Post
                    </Button>
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your post. It cannot be undone. All views and likes associated with this post will also be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Yes, delete post"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
