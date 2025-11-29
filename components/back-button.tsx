'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();

  return (
    <div className="mb-4 sm:mb-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center gap-2 -ml-2 sm:ml-0"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
    </div>
  );
}

