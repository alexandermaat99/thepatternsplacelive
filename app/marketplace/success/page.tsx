import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-8 pb-8">
      <div className="container mx-auto px-4 max-w-md mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order has been confirmed and you will receive a
              confirmation email shortly.
            </p>

            {searchParams.session_id && (
              <p className="text-sm text-muted-foreground">Session ID: {searchParams.session_id}</p>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Link href="/marketplace">
                <Button className="w-full">Continue Shopping</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
