import * as FileSystem from 'expo-file-system/legacy';
import { isAllowedMediaUri } from './mediaSources';

export type OfflineDownloadProgress = {
  writtenBytes: number;
  totalBytes: number;
  percent: number;
};

export type OfflineVideo = {
  id: string;
  title: string;
  uri: string;
  savedAt: number;
};

const OFFLINE_DIR = `${FileSystem.documentDirectory ?? ''}offline-videos/`;
const INDEX_URI = `${OFFLINE_DIR}index.json`;

function safeFileName(value: string): string {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'video';
}

async function ensureDirectory(): Promise<void> {
  if (!FileSystem.documentDirectory) throw new Error('Le stockage local n’est pas disponible.');
  const info = await FileSystem.getInfoAsync(OFFLINE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
}

async function readIndex(): Promise<OfflineVideo[]> {
  await ensureDirectory();
  const info = await FileSystem.getInfoAsync(INDEX_URI);
  if (!info.exists) return [];
  try {
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(INDEX_URI));
    return Array.isArray(parsed) ? parsed as OfflineVideo[] : [];
  } catch {
    return [];
  }
}

async function writeIndex(items: OfflineVideo[]): Promise<void> {
  await FileSystem.writeAsStringAsync(INDEX_URI, JSON.stringify(items));
}

export async function listOfflineVideos(): Promise<OfflineVideo[]> {
  return (await readIndex()).filter((item) => item.uri.startsWith(OFFLINE_DIR));
}

/**
 * Télécharge uniquement un fichier vidéo direct autorisé (MP4/M4V/MOV).
 * Les playlists HLS/DASH ne sont pas des fichiers uniques : il faut un système
 * de téléchargement hors ligne officiellement pris en charge par le fournisseur.
 */
export async function downloadAuthorizedVideo(
  input: { id: string; title: string; url: string },
  onProgress?: (progress: OfflineDownloadProgress) => void,
): Promise<OfflineVideo> {
  if (!isAllowedMediaUri(input.url)) {
    throw new Error('URL invalide : utilise une URL HTTPS directe fournie avec autorisation.');
  }
  const pathname = new URL(input.url).pathname.toLowerCase();
  if (!/\.(mp4|m4v|mov)$/.test(pathname)) {
    throw new Error('Le téléchargement hors ligne direct accepte les fichiers MP4/M4V/MOV, pas les lecteurs intégrés ni les playlists.');
  }

  await ensureDirectory();
  const id = safeFileName(input.id);
  const destination = `${OFFLINE_DIR}${id}-${safeFileName(input.title)}.mp4`;
  const task = FileSystem.createDownloadResumable(
    input.url,
    destination,
    {},
    (event) => {
      const totalBytes = event.totalBytesExpectedToWrite;
      const writtenBytes = event.totalBytesWritten;
      onProgress?.({
        writtenBytes,
        totalBytes,
        percent: totalBytes > 0 ? Math.min(100, Math.round((writtenBytes / totalBytes) * 100)) : 0,
      });
    },
  );

  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error('Le téléchargement n’a pas produit de fichier.');
  const entry: OfflineVideo = {
    id: input.id,
    title: input.title,
    uri: result.uri,
    savedAt: Date.now(),
  };
  const existing = await readIndex();
  await writeIndex([entry, ...existing.filter((item) => item.id !== entry.id)]);
  onProgress?.({ writtenBytes: 1, totalBytes: 1, percent: 100 });
  return entry;
}

export async function deleteOfflineVideo(id: string): Promise<void> {
  const items = await readIndex();
  const matches = items.filter((item) => item.id === id);
  for (const item of matches) {
    const info = await FileSystem.getInfoAsync(item.uri);
    if (info.exists) await FileSystem.deleteAsync(item.uri, { idempotent: true });
  }
  await writeIndex(items.filter((item) => item.id !== id));
}
