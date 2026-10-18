import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sameItem, type Item } from './types';

const HISTORY_MAX = 50;

type Store = {
  ready: boolean;
  favorites: Item[];
  history: Item[];
  isFavorite: (i: Pick<Item, 'kind' | 'id'>) => boolean;
  toggleFavorite: (i: Item) => void;
  pushHistory: (i: Item) => void;
  clearHistory: () => void;
  mergeLists: (favs: Item[], hist: Item[]) => void;
  clearLocal: () => void;
};

const Ctx = createContext<Store | null>(null);

function unionItems(a: Item[], b: Item[]): Item[] {
  const out = [...a];
  for (const i of b) if (!out.some((x) => sameItem(x, i))) out.push(i);
  return out;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [history, setHistory] = useState<Item[]>([]);

  // Chargement depuis le stockage local du téléphone
  useEffect(() => {
    (async () => {
      const [f, h] = await Promise.all([
        AsyncStorage.getItem('mv:favorites'),
        AsyncStorage.getItem('mv:history'),
      ]);
      setFavorites(f ? JSON.parse(f) : []);
      setHistory(h ? JSON.parse(h) : []);
      setReady(true);
    })();
  }, []);

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (ready) AsyncStorage.setItem('mv:favorites', JSON.stringify(favorites));
  }, [favorites, ready]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem('mv:history', JSON.stringify(history));
  }, [history, ready]);

  const isFavorite = useCallback(
    (i: Pick<Item, 'kind' | 'id'>) => favorites.some((x) => sameItem(x, i)),
    [favorites],
  );

  const toggleFavorite = useCallback((i: Item) => {
    setFavorites((prev) =>
      prev.some((x) => sameItem(x, i)) ? prev.filter((x) => !sameItem(x, i)) : [i, ...prev],
    );
  }, []);

  const pushHistory = useCallback((i: Item) => {
    setHistory((prev) => [i, ...prev.filter((x) => !sameItem(x, i))].slice(0, HISTORY_MAX));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  // Fusion sans rien écraser (utilisé pour l'import)
  const mergeLists = useCallback((favs: Item[], hist: Item[]) => {
    setFavorites((prev) => unionItems(prev, favs));
    setHistory((prev) => unionItems(prev, hist).slice(0, HISTORY_MAX));
  }, []);

  const clearLocal = useCallback(() => {
    setFavorites([]);
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      ready, favorites, history, isFavorite, toggleFavorite, pushHistory, clearHistory, mergeLists, clearLocal,
    }),
    [ready, favorites, history, isFavorite, toggleFavorite, pushHistory, clearHistory, mergeLists, clearLocal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider');
  return ctx;
}