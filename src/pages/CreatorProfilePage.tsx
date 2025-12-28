import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Clock, FileText } from 'lucide-react';
import { Test, fetchTestsByUserId } from '@/lib/testsApi';
import TestLikeButton from '@/components/TestLikeButton';
import { useAuth } from '@/contexts/AuthContext';

interface CreatorProfile {
    id: string;
    full_name: string;
    bio: string;
    avatar_url: string;
    designation: string;
}

export default function CreatorProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadCreatorData(id);
        }
    }, [id]);

    async function loadCreatorData(creatorId: string) {
        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', creatorId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // 2. Fetch Creator's Public Tests
            const { data: testsData, error: testsError } = await supabase
                .from('tests')
                .select('*')
                .eq('created_by', creatorId)
                .eq('is_public', true) // Only show public tests
                .order('created_at', { ascending: false });

            if (testsError) throw testsError;
            setTests(testsData || []);

        } catch (error) {
            console.error("Error loading creator profile", error);
        } finally {
            setLoading(false);
        }
    }

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Custom badge styling (Same as ProfilePage)
    const getBadgeStyle = (role: string) => {
        switch (role) {
            case 'Teacher': return { backgroundColor: '#3b82f6', color: 'white' }; // Blue
            case 'Institution': return { backgroundColor: '#eab308', color: 'black' }; // Gold
            case 'Student': return { backgroundColor: '#6b7280', color: 'white' }; // Gray
            case 'Guest': return { backgroundColor: '#9ca3af', color: 'white' }; // Lighter Gray
            default: return {};
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h2 className="text-xl font-bold">Creator not found</h2>
                <Button variant="link" onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            {/* Profile Header */}
            <Card className="mb-8 border-none shadow-none bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="flex flex-col md:flex-row items-center gap-6 py-8">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="text-4xl">{getInitials(profile.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                        <Badge style={getBadgeStyle(profile.designation)} className="text-xs px-2 py-0.5 pointer-events-none">
                            {profile.designation || 'Student'}
                        </Badge>
                        {profile.bio && (
                            <p className="text-muted-foreground max-w-lg mx-auto md:mx-0 whitespace-pre-wrap text-left">
                                {profile.bio}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-500 justify-center md:justify-start pt-2">
                            <FileText className="w-4 h-4" />
                            <span>{tests.length} Public Tests</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tests Grid */}
            <h2 className="text-2xl font-bold mb-6">Tests by {profile.full_name}</h2>

            {tests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    This creator hasn't published any public tests yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map((test) => (
                        <Card key={test.id} className="flex flex-col hover:shadow-lg transition-all">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg line-clamp-2">{test.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 pb-2">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                    {test.description || "No description provided."}
                                </p>
                                <div className="flex items-center text-sm text-slate-500 gap-4">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> {test.questions?.length || 0} Qs
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {test.duration || 30}m
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between gap-2 p-3 mt-auto">
                                <TestLikeButton testId={test.id} userId={user?.id} />
                                <Button className="flex-1" onClick={() => navigate(`/test-intro/${test.id}`)}>
                                    Take Test <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
