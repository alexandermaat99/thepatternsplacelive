'use client';

import * as React from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastData;
}

export function Toast({ toast }: ToastProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[toast.type];

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4 shadow-lg min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in-0',
        colors[toast.type]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
    </div>
  );
}

