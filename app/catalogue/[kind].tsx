import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from '@/components/PosterCard';
import { browseKind, type Detail } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import { isFamilySafe, usePrefs } from '@/lib/prefs';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

const TABS: { kind: Kind; label: string }[] = [
  { kind: 'film', label: 'Films' },
  { kind: 'manga', label: 'Animé Manga' },
  { kind: 'occidental', label: 'Animé Occidental' },
  { kind: 'serie', label: 'Séries' },
];
const NOTES = [0, 6, 7, 8];

export default function CatalogueScreen() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind: Kind }>();
  const [prefs] = usePrefs();
  const [items, setItems] = useState<Detail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [minNote, setMinNote] = useState(0);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await browseKind(kind, p);
      setItems((prev) => {
        if (p === 1) return r.items;
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...r.items.filter((x) => !ids.has(x.id))];
      });
      setPage(p);
      setHasMore(r.hasMore);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    setItems([]);
    setGenre(null);
    setYear(null);
    setMinNote(0);
    load(1);
  }, [kind, load]);

  const genres = Array.from(new Set(items.flatMap((i) => i.genres))).slice(0, 10);
  const years = Array.from(new Set(items.map((i) => i.year).filter(Boolean) as string[]))
    .sort().reverse().slice(0, 8);
  const shown = items.filter((i) =>
    (!genre || i.genres.includes(genre)) &&
    (!year || i.year === year) &&
    i.rating >= minNote &&
    (!prefs.famille || isFamilySafe(i)),
  );
  const cols = prefs.taille === 'Grand' ? 1 : prefs.taille === 'Normal' ? 2 : 3;
  const cardW = (Dimensions.get('window').width - 32 - (cols - 1) * 12) / cols;
  const surprise = () => {
    if (shown.length) openTitle(router, shown[Math.floor(Math.random() * shown.length)]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={styles.brand}>Erëmīa</Text>
        <Pressable onPress={() => router.push('/parametres')} style={styles.gear} accessibilityRole="button" accessibilityLabel="Paramètres">
          <Ionicons name="settings-outline" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <Text style={styles.eyebrow}>LE CINÉMA DU MONDE ENTIER</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll} contentContainerStyle={styles.row}>
        {TABS.map((t) => (
          <Pressable key={t.kind} onPress={() => router.replace(`/catalogue/${t.kind}`)}
            style={[styles.pill, t.kind === kind && styles.pillOn]}>
            <Text style={[styles.pillText, t.kind === kind && styles.pillTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll} contentContainerStyle={styles.row}>
        <Chip label="Tous les genres" on={genre === null} onPress={() => setGenre(null)} />
        {genres.map((g) => <Chip key={g} label={g} on={genre === g} onPress={() => setGenre(g)} />)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll} contentContainerStyle={styles.row}>
        <Chip label="Toutes les années" on={year === null} onPress={() => setYear(null)} />
        {years.map((y) => <Chip key={y} label={y} on={year === y} onPress={() => setYear(y)} />)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll} contentContainerStyle={styles.row}>
        {NOTES.map((n) => <Chip key={n} label={n === 0 ? 'Toutes les notes' : `★ ${n}+`} on={minNote === n} onPress={() => setMinNote(n)} />)}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.surprise} onPress={surprise}>
          <Ionicons name="shuffle" size={18} color="#fff" />
          <Text style={styles.surpriseText}>Surprends-moi</Text>
        </Pressable>
      </View>

      <FlatList
        key={cols}
        data={shown}
        numColumns={cols}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        renderItem={({ item }) => <PosterCard item={item} width={cardW} />}
        onEndReachedThreshold={1.5}
        onEndReached={() => { if (!loading && hasMore) load(page + 1); }}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> : null}
        ListEmptyComponent={loading
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : <Text style={styles.empty}>Aucun titre ne correspond à ces filtres.</Text>}
      />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  brand: { color: '#F5F3EE', fontSize: 20, fontWeight: '900' },
  gear: { backgroundColor: colors.muted, borderRadius: 999, padding: 8 },
  eyebrow: { color: colors.primary, letterSpacing: 3, fontSize: 11, fontWeight: '700', paddingHorizontal: 16, marginTop: 14, marginBottom: 4 },
  hscroll: { flexGrow: 0 },
  row: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  pill: { backgroundColor: '#22242C', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, minHeight: 38, justifyContent: 'center', alignItems: 'center' },
  pillOn: { backgroundColor: colors.primary },
  pillText: { color: '#E1E3E8', fontSize: 14, fontWeight: '700' },
  pillTextOn: { color: '#FFFFFF' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#353741', paddingHorizontal: 12, paddingVertical: 7, minHeight: 32, justifyContent: 'center' },
  chipOn: { borderColor: colors.primary, backgroundColor: '#211318' },
  chipText: { color: '#D2D4DB', fontSize: 13, fontWeight: '500' },
  chipTextOn: { color: '#FFFFFF', fontWeight: '800' },
  actions: { alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 4 },
  surprise: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  surpriseText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#D2D4DB', textAlign: 'center', marginTop: 40 },
});