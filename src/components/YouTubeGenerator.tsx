// import React, { useState } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Loader2, Youtube, Sparkles } from 'lucide-react';
// import { generateTestFromYouTube } from '@/lib/gemini';
// import { toast } from 'sonner';
// import { useAuth } from '@/contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';

// export default function YouTubeGenerator({ onTestGenerated }: { onTestGenerated: () => void }) {
//     const [url, setUrl] = useState('');
//     const [loading, setLoading] = useState(false);
//     const [status, setStatus] = useState('');
//     const { user } = useAuth();
//     const navigate = useNavigate();

//     const handleGenerate = async () => {
//         if (!user) {
//             toast.error("Please login to generate tests.");
//             navigate('/login');
//             return;
//         }

//         if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
//             toast.error("Please enter a valid YouTube URL");
//             return;
//         }

//         setLoading(true);
//         setStatus('Fetching transcript...');

//         try {
//             setStatus('Analyzing lecture with AI...');
//             await generateTestFromYouTube(url, user.email || 'unknown');

//             setStatus('Finalizing...');
//             toast.success("Test generated successfully!");
//             setUrl('');
//             onTestGenerated(); // Valid callback to refresh list
//         } catch (error: any) {
//             console.error(error);
//             toast.error(error.message || "Failed to generate test. Ensure the video has captions.");
//         } finally {
//             setLoading(false);
//             setStatus('');
//         }
//     };

//     return (
//         <Card className="border-red-100 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50 mb-8">
//             <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
//                     <Youtube className="h-5 w-5" />
//                     Generate Test from YouTube
//                 </CardTitle>
//                 <CardDescription>
//                     Paste a lecture link to instantly create a revision test with AI.
//                 </CardDescription>
//             </CardHeader>
//             <CardContent>
//                 <div className="flex flex-col md:flex-row gap-4">
//                     <Input
//                         placeholder="https://www.youtube.com/watch?v=..."
//                         value={url}
//                         onChange={(e) => setUrl(e.target.value)}
//                         disabled={loading}
//                         className="bg-background"
//                     />
//                     <Button
//                         onClick={handleGenerate}
//                         disabled={loading || !url}
//                         className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
//                     >
//                         {loading ? (
//                             <>
//                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                 {status === 'Fetching transcript...' ? 'Fetching...' : 'AI Magic...'}
//                             </>
//                         ) : (
//                             <>
//                                 <Sparkles className="mr-2 h-4 w-4" />
//                                 Generate
//                             </>
//                         )}
//                     </Button>
//                 </div>
//                 {loading && (
//                     <p className="text-xs text-muted-foreground mt-2 animate-pulse">
//                         {status}
//                     </p>
//                 )}
//             </CardContent>
//         </Card>
//     );
// }


import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Youtube, Sparkles } from 'lucide-react';
import { generateTestFromYouTube } from '@/lib/gemini';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function YouTubeGenerator({ onTestGenerated }: { onTestGenerated: () => void }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

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

        try {
            // Updated status messages to reflect video processing
            setStatus('this takes 3-5 minutes...');
            await generateTestFromYouTube(url, user.id);

            setStatus('Finalizing...');
            toast.success("Test generated successfully!");
            setUrl('');
            onTestGenerated();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to generate test.");
        } finally {
            setLoading(false);
            setStatus('');
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
                    <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loading}
                        className="bg-background"
                    />
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !url}
                        className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {status === 'Initializing AI...' ? 'Starting...' : 'Analyzing...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate
                            </>
                        )}
                    </Button>
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