import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PageLoading() {
  return (
    <div className="min-h-[60vh] bg-background flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" text="" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

