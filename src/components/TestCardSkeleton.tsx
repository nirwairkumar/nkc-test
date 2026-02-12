import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TestCardSkeleton() {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex flex-wrap justify-between gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
        <Skeleton className="h-4 w-8" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardFooter>
    </Card>
  );
}
