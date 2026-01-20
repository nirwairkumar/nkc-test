import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface HomeHeroProps {
    onRefresh: () => void;
    isLoading: boolean;
}

export default function HomeHero({ onRefresh, isLoading }: HomeHeroProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Available Tests</h1>
                <p className="text-muted-foreground mt-2">Select a test to begin your practice</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>
    );
}
