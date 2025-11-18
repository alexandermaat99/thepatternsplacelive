'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load user's favorites
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading favorites:', error);
        setFavorites(new Set());
      } else {
        const favoriteIds = new Set(data?.map(item => item.product_id) || []);
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    const isFavorite = favorites.has(productId);
    const supabase = createClient();

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;
        
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        return false;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          });

        if (error) throw error;
        
        setFavorites(prev => new Set(prev).add(productId));
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return isFavorite; // Return current state on error
    }
  }, [user, favorites]);

  // Check if product is favorited
  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.has(productId);
  }, [favorites]);

  // Load favorites on mount and when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    loading
  };
}

