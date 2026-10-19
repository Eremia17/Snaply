/**
 * Sources de lecture autorisées par l'application.
 *
 * TMDB fournit des métadonnées, pas les fichiers vidéo. Les URLs doivent venir
 * d'un fournisseur légal que l'utilisateur ou l'application est autorisé à utiliser.
 * Les pages d'intégration de lecteurs tiers ne sont pas des fichiers vidéo directs.
 */
export type MediaSource = {
  id: string;
  label: string;
  uri: string;
  contentType?: 'progressive' | 'hls' | 'dash';
};

export function isAllowedMediaUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'https:') return false;
    const path = parsed.pathname.toLowerCase();
    return /\.(mp4|m4v|mov|m3u8|mpd)$/.test(path);
  } catch {
    return false;
  }
}

/**
 * Conserve l'ordre de priorité configuré par le fournisseur et élimine les
 * URLs invalides ou dupliquées. N'invente jamais de source à partir d'un ID TMDB.
 */
export function normalizeMediaSources(sources: MediaSource[]): MediaSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.id || !source.label || !isAllowedMediaUri(source.uri)) return false;
    if (seen.has(source.uri)) return false;
    seen.add(source.uri);
    return true;
  });
}

export function inferContentType(uri: string): 'progressive' | 'hls' | 'dash' {
  const path = uri.split('?')[0].toLowerCase();
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.mpd')) return 'dash';
  return 'progressive';
}
