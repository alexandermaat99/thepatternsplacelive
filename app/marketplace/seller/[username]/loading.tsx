import { Card, CardContent } from '@/components/ui/card';

export default function SellerLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

