import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function TestLinkPaster() {
    const [link, setLink] = useState('');
    const [testId, setTestId] = useState('');
    const navigate = useNavigate();

    const handleNavigate = () => {
        const trimmedLink = link.trim();
        let trimmedId = testId.trim();

        // Priority 1: ID Input
        if (trimmedId) {
            // Remove '#' if present
            trimmedId = trimmedId.replace(/^#/, '');
            navigate(`/test-intro/${trimmedId}`);
            return;
        }

        // Priority 2: Link Input
        if (trimmedLink) {
            try {
                // Check if it's a full URL
                const url = new URL(trimmedLink);

                // Allow /test, /live, /test-intro routes
                if (url.pathname.match(/^\/(test|live|test-intro)\//)) {
                    navigate(url.pathname + url.search);
                    return;
                }

                // If URL but not a recognized route, try to grab the last segment
                const pathSegments = url.pathname.split('/').filter(Boolean);
                if (pathSegments.length > 0) {
                    const potentialId = pathSegments[pathSegments.length - 1];
                    navigate(`/test-intro/${potentialId}`);
                    return;
                }

            } catch (e) {
                // Not a URL. If the user put an ID in the Link box by mistake, handle it.
                // Remove '#' if present
                const cleanInput = trimmedLink.replace(/^#/, '');
                // Basic check to see if it looks like an ID (no spaces)
                if (!cleanInput.includes(' ')) {
                    navigate(`/test-intro/${cleanInput}`);
                    return;
                }
            }
            // Fallback if parsing failed but we have input
            navigate(`/test-intro/${trimmedLink.replace(/^#/, '')}`);
            return;
        }

        toast.error("Please enter a link or ID");
    };

    return (
        <Card className="border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/10 dark:border-indigo-900/50 mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Link2 className="h-5 w-5" />
                    Enter Test Link
                </CardTitle>
                <CardDescription>
                    Have a test link or ID? Paste it here to jump directly to the test.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <Input
                            placeholder="Paste full test link (e.g. https://...)"
                            value={link}
                            onChange={(e) => {
                                setLink(e.target.value);
                                if (e.target.value) setTestId(''); // Clear ID if link is typed
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                            className="bg-background"
                            disabled={!!testId}
                        />
                    </div>

                    <div className="font-semibold text-muted-foreground text-sm uppercase">Or</div>

                    <div className="w-full md:w-[150px]">
                        <Input
                            placeholder="Test ID (M-151)"
                            value={testId}
                            onChange={(e) => {
                                setTestId(e.target.value);
                                if (e.target.value) setLink(''); // Clear link if ID is typed
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                            className="bg-background text-center font-mono"
                            disabled={!!link}
                        />
                    </div>

                    <Button
                        onClick={handleNavigate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                    >
                        Go to Test
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
