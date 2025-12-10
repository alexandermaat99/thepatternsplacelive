import { redirect } from 'next/navigation';

/**
 * Homepage redirects to marketplace.
 * Using server-side redirect (301) for SEO compliance.
 * Google Search Console prefers server-side redirects over client-side.
 */
export default function Home() {
  // Server-side redirect - creates proper HTTP 301 redirect
  // This is SEO-friendly and Google Search Console will understand it correctly
  redirect('/marketplace');
}
