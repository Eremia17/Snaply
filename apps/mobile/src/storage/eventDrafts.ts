import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export type DraftTicketTier = { id: number; name: string; price: string; quantity: string };
export type EventDraft = {
  id: string;
  title: string;
  category: string;
  description: string;
  city: string;
  venue: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  tiers: DraftTicketTier[];
  posterUri: string | null;
  status: 'draft' | 'archived';
  cloudEventId?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = '@ticket-mada/event-drafts/v1';

async function readAll(): Promise<EventDraft[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is EventDraft =>
      Boolean(item && typeof item === 'object' && typeof (item as EventDraft).id === 'string')
    );
  } catch {
    return [];
  }
}

export async function listEventDrafts(): Promise<EventDraft[]> {
  const items = await readAll();
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEventDraft(id: string): Promise<EventDraft | null> {
  const items = await readAll();
  return items.find(item => item.id === id) ?? null;
}

export async function saveEventDraft(draft: EventDraft): Promise<void> {
  const items = await readAll();
  const index = items.findIndex(item => item.id === draft.id);
  if (index >= 0) items[index] = draft;
  else items.unshift(draft);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function deleteEventDraft(id: string): Promise<void> {
  const items = await readAll();
  const target = items.find(item => item.id === id);
  const remaining = items.filter(item => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  if (target?.posterUri) {
    try {
      const info = await FileSystem.getInfoAsync(target.posterUri);
      if (info.exists) await FileSystem.deleteAsync(target.posterUri, { idempotent: true });
    } catch {
      // Draft deletion must still succeed if its local poster is already missing.
    }
  }
}

export async function updateEventDraftStatus(id: string, status: EventDraft['status']): Promise<void> {
  const items = await readAll();
  const next = items.map(item => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function persistEventPoster(sourceUri: string): Promise<string> {
  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error('Le stockage local des affiches est indisponible.');
  const folder = directory + 'event-posters/';
  const existing = await FileSystem.getInfoAsync(folder);
  if (!existing.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  if (sourceUri.startsWith(folder)) return sourceUri;
  const extension = sourceUri.split('?')[0].split('.').pop()?.toLowerCase();
  const safeExtension = extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg';
  const destination = folder + 'poster-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + safeExtension;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function setEventDraftCloudId(id: string, cloudEventId: string): Promise<void> {
  const items = await readAll();
  const next = items.map(item => item.id === id
    ? { ...item, cloudEventId, updatedAt: new Date().toISOString() }
    : item);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
