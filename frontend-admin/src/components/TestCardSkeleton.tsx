import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TestCardSkeleton() {
  return (
    <Card className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden border-slate-200 dark:border-slate-800">
      {/* Top Gradient Placeholder */}
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 animate-pulse" />

      <CardHeader className="p-4 pb-2 relative mt-1 block">
        <Skeleton className="h-6 w-3/4 mb-1" />
        <Skeleton className="h-6 w-1/2" />
        <div className="absolute top-2.5 right-2.5">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-0">
        <div className="flex flex-col justify-end mt-auto gap-1">
          <div className="flex items-center justify-between">
             <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
        
        <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-3" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-1">
             <Skeleton className="h-5 w-16 rounded-full" />
             <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-3 flex justify-between items-center gap-3 border-t bg-slate-50/50 dark:bg-slate-900/30">
        <Skeleton className="h-8 w-24 rounded-full" />
        <div className="flex gap-2 justify-end flex-1">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}
