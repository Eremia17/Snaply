import { useSyncExternalStore } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Item, Kind } from './types';

export type Detail = Item & {
  genres: string[];
  rating: number;
  runtime?: string;
  synopsis: string;
  upcoming?: string;
  classic?: boolean;
};

export const KIND_LABEL: Record<Kind, string> = {
  film: 'Films',
  manga: 'Animés manga',
  occidental: 'Animés occidentaux',
  serie: 'Séries',
};

let DATA: Detail[] = [];
let version = 0;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
const getVersion = () => version;

// Les écrans appellent ce hook pour se mettre à jour quand le catalogue arrive
export function useCatalog(): number {
  return useSyncExternalStore(subscribe, getVersion);
}

function emit() {
  version++;
  listeners.forEach((l) => l());
}

// Charge la liste principale depuis la fonction serveur. Renvoie un message d'erreur, ou null.
export async function loadCatalog(): Promise<string | null> {
  if (!isSupabaseConfigured) { DATA = []; emit(); return null; }
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'list' } });
  if (error) return error.message;
  DATA = (data?.items ?? []) as Detail[];
  emit();
  return null;
}

export async function fetchDetail(kind: Kind, id: string): Promise<Detail | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'detail', kind, id } });
  if (error || !data) return null;
  return data as Detail;
}

export async function searchRemote(q: string, kinds: Kind[] = []): Promise<Detail[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.functions.invoke('catalog', { body: { action: 'search', q, kinds } });
  if (error || !data) return [];
  return (data.items ?? []) as Detail[];
}

export function listByKind(kind: Kind): Detail[] {
  return DATA.filter((x) => x.kind === kind);
}

export function searchCatalog(q: string, kinds: Kind[] = []): Detail[] {
  const s = q.trim().toLowerCase();
  return DATA.filter(
    (x) =>
      (kinds.length === 0 || kinds.includes(x.kind)) &&
      (!s || x.title.toLowerCase().includes(s) || x.genres.some((g) => g.toLowerCase().includes(s))),
  );
}

export function getDetail(kind: string, id: string): Detail | undefined {
  return DATA.find((x) => x.kind === kind && x.id === id);
}

export function trending(): Detail[] {
  const rated = DATA.filter((x) => x.rating > 0);
  return (rated.length ? rated : DATA).slice().sort((a, b) => b.rating - a.rating).slice(0, 8);
}

export function featured(): Detail | undefined {
  return trending()[0];
}

export function upcomingList(): Detail[] {
  return DATA.filter((x) => x.upcoming).sort((a, b) => (a.upcoming ?? '').localeCompare(b.upcoming ?? ''));
}

export function classics(): Detail[] {
  return DATA.filter((x) => x.classic);
}

// Une page de titres pour une catégorie (défilement infini)
export async function browseKind(
  kind: Kind,
  page: number,
  filters: { genre?: string; year?: string; minRating?: number } = {},
): Promise<{ items: Detail[]; hasMore: boolean }> {
  if (!isSupabaseConfigured) return { items: [], hasMore: false };
  const { data, error } = await supabase.functions.invoke('browse', { body: { kind, page, ...filters } });
  if (error || !data) return { items: [], hasMore: false };
  return { items: (data.items ?? []) as Detail[], hasMore: !!data.hasMore };
}

export type Extras = {
  trailer: string | null;
  cast: { name: string; character: string; photo: string | null }[];
  providers: { name: string; logo: string | null }[];
  constellation: { name: string; items: Detail[] };
  reviews: { author: string; rating: number | null; date: string; content: string }[];
};

export async function fetchExtras(kind: Kind, id: string): Promise<Extras | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke('browse', { body: { action: 'extras', kind, id } });
  if (error || !data || data.error) return null;
  return data as Extras;
}

export type SportMatch = {
  league: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string;
  status: 'Terminé' | 'À venir';
};

export async function fetchSports(): Promise<SportMatch[]> {
  if (!isSupabaseConfigured) throw new Error('Supabase n’est pas configuré.');
  const { data, error } = await supabase.functions.invoke('browse', { body: { action: 'sports' } });
  if (error) throw new Error(error.message || 'Impossible de joindre le service sportif.');
  if (!data || data.error) throw new Error(data?.error || 'Le service sportif n’a renvoyé aucune réponse.');
  return (data.items ?? []) as SportMatch[];
}

export type Chapter = { id: string; chapter: string; title: string; lang: string };

export async function fetchChapters(mangaId: string, title = ''): Promise<Chapter[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.functions.invoke('browse', { body: { action: 'chapters', id: mangaId, title } });
  if (error || !data) return [];
  return (data.items ?? []) as Chapter[];
}

export async function fetchPages(chapterId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.functions.invoke('browse', { body: { action: 'pages', chapterId } });
  if (error || !data) return [];
  return (data.pages ?? []) as string[];
}