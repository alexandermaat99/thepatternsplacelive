'use client';

import { ThemeSwitcher } from '@/components/theme-switcher';

export function Footer() {
  return (
    <footer className="w-full border-t border-t-foreground/10 mt-auto">
      <div className="container mx-auto max-w-5xl px-4 py-3 sm:py-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Theme:</span>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}

