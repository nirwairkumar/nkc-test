

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Youtube, Sparkles, Languages } from 'lucide-react';
import { generateTestFromYouTube } from '@/lib/gemini';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function YouTubeGenerator({ onTestGenerated }: { onTestGenerated: () => void }) {
    const [url, setUrl] = useState('');
    const [language, setLanguage] = useState('English');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const abortControllerRef = React.useRef<AbortController | null>(null);

    const handleGenerate = async () => {
        if (!user) {
            toast.error("Please login to generate tests.");
            navigate('/login');
            return;
        }

        // Basic YouTube URL validation
        if (!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/)) {
            toast.error("Please enter a valid YouTube URL");
            return;
        }

        setLoading(true);
        setStatus('Initializing AI...');

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            // Updated status messages to reflect video processing
            setStatus('Watching Video(this takes 50-60 seconds)...');
            await generateTestFromYouTube(
                url,
                user.id,
                user.user_metadata?.full_name || 'AI Generator',
                user.user_metadata?.avatar_url || '',
                language,
                abortControllerRef.current.signal
            );

            setStatus('Finalizing...');
            toast.success(`Test generated successfully in ${language}!`);
            setUrl('');
            onTestGenerated();
        } catch (error: any) {
            if (error.message === 'Process cancelled') {
                toast.info("Generation processed stopped.");
            } else {
                console.error(error);
                toast.error(error.message || "Failed to generate test.");
            }
        } finally {
            setLoading(false);
            setStatus('');
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setStatus('Stopping...'); // UI feedback
        }
    };

    return (
        <Card className="border-red-100 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50 mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Youtube className="h-5 w-5" />
                    Generate Test from YouTube
                </CardTitle>
                <CardDescription>
                    Paste a lecture link to instantly create a revision test.
                    Works with Hindi/Hinglish videos without captions!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                            className="bg-background"
                        />
                    </div>

                    <div className="w-full md:w-[140px]">
                        <Select value={language} onValueChange={setLanguage} disabled={loading}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Hindi">Hindi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        {!loading ? (
                            <Button
                                onClick={handleGenerate}
                                disabled={!url}
                                className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStop}
                                variant="destructive"
                                className="min-w-[140px]"
                            >
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Stop
                            </Button>
                        )}
                    </div>
                </div>
                {loading && (
                    <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                        {status}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}