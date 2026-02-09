'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

const BANNER = `
░▒▓████████▓▒░▒▓███████▓▒░░▒▓███████▓▒░  
   ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
   ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
   ░▒▓█▓▒░   ░▒▓███████▓▒░░▒▓███████▓▒░  
   ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░        
   ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░        
   ░▒▓█▓▒░   ░▒▓█▓▒░      ░▒▓█▓▒░`;

export function ConsoleWelcome() {
  const { user, profile, loading } = useAuth();
  const hasLogged = useRef(false);

  useEffect(() => {
    if (hasLogged.current) return;

    // Wait for auth to settle so we can personalize the greeting
    if (!loading) {
      hasLogged.current = true;
      const name = profile?.full_name?.trim() || (user?.email ? user.email.split('@')[0] : null);
      const greeting = name ? `Hello, ${name}! ✂️` : 'Happy Sewing! ✂️';

      console.log(
        `%c${BANNER}%c\n   ${greeting}\n`,
        'color: #c2410c; font-weight: bold; font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.3;',
        'color: #ea580c; font-size: 13px; font-weight: bold;'
      );
    }
  }, [loading, user, profile]);

  return null;
}
