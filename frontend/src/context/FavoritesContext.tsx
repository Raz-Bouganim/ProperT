'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface FavoritesContextType {
  favorites: Set<string>;
  initialized: boolean;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined,
);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const pendingToggles = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites(new Set());
      setInitialized(true);
      return;
    }
    setInitialized(false);
    api
      .get<Array<{ id: string }>>('/favorites')
      .then(({ data }) => setFavorites(new Set(data.map((p) => p.id))))
      .catch((err) => console.error('Failed to load favorites:', err))
      .finally(() => setInitialized(true));
  }, [isAuthenticated]);

  const isFavorited = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (pendingToggles.current.has(id)) return;
      pendingToggles.current.add(id);
      const wasFavorited = favorites.has(id);
      setFavorites((prev) => {
        const next = new Set(prev);
        wasFavorited ? next.delete(id) : next.add(id);
        return next;
      });
      try {
        const { data } = await api.post<{ isFavorited: boolean }>(`/favorites/${id}`);
        setFavorites((prev) => {
          const next = new Set(prev);
          data.isFavorited ? next.add(id) : next.delete(id);
          return next;
        });
      } catch (err) {
        setFavorites((prev) => {
          const next = new Set(prev);
          wasFavorited ? next.add(id) : next.delete(id);
          return next;
        });
        const status =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status;
        const message =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message;
        if (status === 403) {
          toast.error(typeof message === 'string' ? message : 'You cannot favorite your own property');
        } else {
          toast.error('Could not update favorites. Please try again.');
        }
      } finally {
        pendingToggles.current.delete(id);
      }
    },
    [favorites],
  );

  const value = useMemo(
    () => ({ favorites, initialized, isFavorited, toggleFavorite }),
    [favorites, initialized, isFavorited, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
