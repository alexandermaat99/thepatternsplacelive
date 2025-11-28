import { SignUpForm } from '@/components/sign-up-form';
import { Suspense } from 'react';

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-6">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          }
        >
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}
