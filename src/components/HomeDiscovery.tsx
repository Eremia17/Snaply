import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { browseKind, listByKind, useCatalog, type Detail } from '@/lib/catalog';
import type { Kind } from '@/lib/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePrefs } from '@/lib/prefs';
import { PosterCard } from '@/components/PosterCard';

type Feed = {
  key: string;
  title: string;
  kind: Kind;
  filters: Parameters<typeof browseKind>[2];
};

const FEEDS: Feed[] = [
  { key: 'film-popular', title: 'Films populaires dans le monde', kind: 'film', filters: { sort: 'popularity' } },
  { key: 'film-action', title: 'Action & adrénaline', kind: 'film', filters: { genre: 'Action', sort: 'popularity' } },
  { key: 'film-romance', title: 'Romances à découvrir', kind: 'film', filters: { genre: 'Romance', sort: 'rating' } },
  { key: 'film-comedy', title: 'Comédies pour se détendre', kind: 'film', filters: { genre: 'Comédie', sort: 'popularity' } },
  { key: 'film-scifi', title: 'Science-fiction & mondes futuristes', kind: 'film', filters: { genre: 'Science-fiction', sort: 'rating' } },
  { key: 'film-thriller', title: 'Thrillers & mystères', kind: 'film', filters: { genre: 'Thriller', sort: 'rating' } },
  { key: 'film-horror', title: 'Frissons & horreur', kind: 'film', filters: { genre: 'Horreur', sort: 'popularity' } },
  { key: 'film-docs', title: 'Documentaires à voir', kind: 'film', filters: { genre: 'Documentaire', sort: 'rating' } },
  { key: 'film-fr', title: 'Cinéma francophone', kind: 'film', filters: { originalLanguage: 'fr', sort: 'popularity' } },
  { key: 'film-mg', title: '🇲🇬 Cinéma malagasy', kind: 'film', filters: { originalLanguage: 'mg', sort: 'rating' } },
  { key: 'film-family', title: 'À regarder en famille', kind: 'film', filters: { family: true, sort: 'popularity' } },
  { key: 'film-animation', title: 'Films d’animation', kind: 'film', filters: { genre: 'Animation', sort: 'rating' } },
  { key: 'series-recent', title: 'Séries récentes', kind: 'serie', filters: { sort: 'recent' } },
  { key: 'series-popular', title: 'Séries qui font parler', kind: 'serie', filters: { sort: 'popularity' } },
  { key: 'series-action', title: 'Séries d’action & aventure', kind: 'serie', filters: { genre: 'Action & Aventure', sort: 'popularity' } },
  { key: 'series-scifi', title: 'Séries fantastiques & science-fiction', kind: 'serie', filters: { genre: 'Science-fiction & Fantastique', sort: 'rating' } },
  { key: 'anime-recent', title: 'Animés tout juste sortis', kind: 'manga', filters: { sort: 'recent' } },
  { key: 'anime-rated', title: 'Animés les mieux notés', kind: 'manga', filters: { sort: 'rating' } },
  { key: 'anime-shonen', title: 'Shōnen incontournables', kind: 'manga', filters: { genre: 'Shonen', sort: 'popularity' } },
  { key: 'anime-isekai', title: 'Isekai & réincarnation', kind: 'manga', filters: { genre: 'Isekai / Réincarnation', sort: 'popularity' } },
  { key: 'anime-slice', title: 'Tranche de vie & émotions', kind: 'manga', filters: { genre: 'Tranche de vie', sort: 'rating' } },
  { key: 'western-popular', title: 'Animation occidentale populaire', kind: 'occidental', filters: { sort: 'popularity' } },
  { key: 'western-hero', title: 'Super-héros animés', kind: 'occidental', filters: { genre: 'Super-héros', sort: 'popularity' } },
];

export function HomeDiscovery({ cardWidth, economyMode }: { cardWidth: number; economyMode: boolean }) {
  const catalogVersion = useCatalog();
  const [prefs] = usePrefs();
  const [rows, setRows] = useState<Record<string, Detail[]>>({});

  useEffect(() => {
    let active = true;
    if (economyMode || prefs.economiseur || !isSupabaseConfigured) {
      const cached: Record<string, Detail[]> = {};
      for (const feed of FEEDS) {
        const all = (feed.kind === 'manga' ? [] : listByKind(feed.kind)).slice().sort((a, b) => String(b.year ?? '').localeCompare(String(a.year ?? '')) || b.rating - a.rating);
        const genre = feed.filters?.genre;
        cached[feed.key] = all.filter((item) => {
          if (!item.poster) return false;
          if (genre) {
            const normalized = String(genre).toLowerCase();
            const aliases: Record<string, string[]> = {
              'horreur': ['horror', 'horreur'], 'science-fiction': ['science-fiction', 'sci-fi', 'fantastique'],
              'romance': ['romance', 'romantique'], 'action & aventure': ['action', 'aventure'],
              'shonen': ['shonen', 'shounen'], 'isekai / réincarnation': ['isekai', 'réincarnation'],
              'tranche de vie': ['tranche de vie', 'slice of life'], 'super-héros': ['super-héros', 'superhero'],
              'documentaire': ['documentaire', 'documentary'], 'comédie': ['comédie', 'comedy'],
            };
            const terms = aliases[normalized] ?? [normalized.split(' ')[0]];
            if (!item.genres?.some((g) => terms.some((term) => g.toLowerCase().includes(term)))) return false;
          }
          if (feed.filters?.originalLanguage === 'mg') return /malagasy|malgache/i.test(item.title + ' ' + (item.synopsis ?? ''));
          if (feed.filters?.originalLanguage === 'fr') return true;
          if (feed.filters?.family) return !item.genres?.some((g) => /horror|horreur|crime|thriller/i.test(g));
          return true;
        }).slice(0, 12);
      }
      setRows(cached);
      return () => { active = false; };
    }

    const load = async () => {
      // Requêtes par petits lots pour éviter de saturer le réseau mobile et la fonction Supabase.
      for (let start = 0; start < FEEDS.length; start += 4) {
        const batch = FEEDS.slice(start, start + 4);
        const result = await Promise.all(batch.map(async (feed) => {
          try {
            const response = await browseKind(feed.kind, 1, feed.filters);
            const unique = new Map<string, Detail>();
            for (const item of response.items) {
              if (item.poster && !unique.has(`${item.kind}:${item.id}`)) unique.set(`${item.kind}:${item.id}`, item);
            }
            const items = [...unique.values()].sort((a, b) => String(b.year ?? '').localeCompare(String(a.year ?? '')) || b.rating - a.rating);
            return [feed.key, items.slice(0, 12)] as const;
          } catch {
            return [feed.key, [] as Detail[]] as const;
          }
        }));
        if (!active) return;
        setRows((current) => {
          const next = { ...current };
          for (const [key, items] of result) {
            // Une panne sur une source n’efface pas le contenu déjà en cache.
            if (items.length) next[key] = items;
            else if (!next[key]) {
              const feed = FEEDS.find((entry) => entry.key === key)!;
              const local = feed.kind === 'manga' ? [] : listByKind(feed.kind).filter((item) => !!item.poster);
              next[key] = local.slice().sort((a, b) => String(b.year ?? '').localeCompare(String(a.year ?? '')) || b.rating - a.rating).slice(0, 12);
            }
          }
          return next;
        });
      }
    };
    void load();
    return () => { active = false; };
  }, [economyMode, prefs.economiseur, catalogVersion]);

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>TON CATALOGUE, EN GRAND</Text>
        <Text style={styles.heading}>À explorer maintenant</Text>
        <Text style={styles.description}>Des sélections renouvelées pour trouver ton prochain film, ta prochaine série ou ton prochain animé.</Text>
      </View>
      {FEEDS.map((feed) => {
        const data = rows[feed.key] ?? [];
        if (!data.length) return null;
        return (
          <View key={feed.key} style={styles.section}>
            <Text style={styles.title}>{feed.title}</Text>
            <FlatList
              horizontal
              data={data}
              keyExtractor={(item) => item.kind + ':' + item.id}
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={false}
              contentContainerStyle={styles.row}
              renderItem={({ item }) => <PosterCard item={item} width={cardWidth} />}
            />
          </View>
        );
      })}
      <Text style={styles.note}>Les sélections qui n’ont pas encore de résultats restent masquées, plutôt que d’afficher des rangées vides.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 14, paddingBottom: 4, gap: 17 },
  intro: { paddingHorizontal: 16, gap: 5, marginBottom: 2 },
  eyebrow: { color: '#70F0C0', fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  description: { color: '#A9ADBA', fontSize: 12, lineHeight: 18, maxWidth: 340 },
  section: { gap: 8 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', paddingHorizontal: 16 },
  row: { paddingRight: 8 },
  note: { color: '#767B89', fontSize: 10, lineHeight: 15, paddingHorizontal: 16, paddingTop: 2 },
});
