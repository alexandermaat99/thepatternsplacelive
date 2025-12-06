'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Wait for GTM to initialize before redirecting
    // This ensures GTM can fire on the homepage
    const redirectTimer = setTimeout(() => {
      // Push page_view to dataLayer if GTM is loaded
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'page_view',
          page_path: '/',
          page_title: 'Home',
        });
      }

      // Small delay to ensure GTM event is processed
      setTimeout(() => {
        router.push('/marketplace');
      }, 100);
    }, 500); // Wait 500ms for GTM to initialize

    return () => clearTimeout(redirectTimer);
  }, [router]);

  // Show a brief loading state during redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
