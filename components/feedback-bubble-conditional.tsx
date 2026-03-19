'use client';

import { usePathname } from 'next/navigation';
import { FeedbackBubble } from '@/components/feedback-bubble';

export function FeedbackBubbleConditional() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <FeedbackBubble />;
}

