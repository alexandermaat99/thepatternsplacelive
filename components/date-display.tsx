'use client';

import { useEffect, useState } from 'react';

interface DateDisplayProps {
  date: string;
}

export function DateDisplay({ date }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    // Format date in user's timezone
    try {
      const dateObj = new Date(date);
      const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(dateObj);
      setFormattedDate(formatted);
    } catch (error) {
      // Fallback to ISO string if formatting fails
      setFormattedDate(new Date(date).toLocaleString());
    }
  }, [date]);

  if (!formattedDate) {
    return <span className="text-sm text-muted-foreground">Loading...</span>;
  }

  return <span className="text-sm text-muted-foreground">{formattedDate}</span>;
}

