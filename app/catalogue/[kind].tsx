import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from '@/components/PosterCard';
import { browseKind, type Detail } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import { usePrefs } from '@/lib/prefs';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

const TABS: { kind: Kind; label: string }[] = [
  { kind: 'film', label: 'Films' },
  { kind: 'manga', label: 'Animé Manga' },
  { kind: 'occidental', label: 'Animé Occidental' },
  { kind: 'serie', label: 'Séries' },
];
const NOTES = [0, 5, 6, 7, 8];
const GENRES: Record<Kind, string[]> = {
  film: ['Romance', 'Action', 'Horreur', 'Zombie', 'Comédie', 'Thriller', 'Science-fiction', 'Drame', 'Aventure', 'Fantastique', 'Documentaire', 'Animation', 'Guerre', 'Policier'],
  manga: ['Shonen', 'Shojo', 'Seinen', 'Isekai / Réincarnation', 'Mecha', 'Tranche de vie', 'Horreur', 'Sport', 'Fantastique', 'Comédie'],
  occidental: ['Action', 'Comédie', 'Aventure', 'Super-héros', 'Science-fiction', 'Famille'],
  serie: ['Action & Aventure', 'Comédie', 'Drame', 'Crime', 'Mystère', 'Science-fiction & Fantastique', 'Famille', 'Guerre & Politique', 'Western', 'Documentaire', 'Téléréalité'],
};

export default function CatalogueScreen() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind: Kind }>();
  const [prefs] = usePrefs();
  const [items, setItems] = useState<Detail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [minNote, setMinNote] = useState(0);
  const [shortOnly, setShortOnly] = useState(false);
  const [sort, setSort] = useState<'popularity' | 'rating' | 'recent'>('popularity');
  const [yearOptionsOpen, setYearOptionsOpen] = useState(false);
  const [ratingOptionsOpen, setRatingOptionsOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const requestId = useRef(0);
  const surpriseScale = useRef(new Animated.Value(1)).current;

  const load = useCallback(async (p: number) => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const r = await browseKind(kind, p, { genre: genre ?? undefined, year: year ?? undefined, minRating: minNote || undefined, family: prefs.famille, short: shortOnly || undefined, sort });
      // Ignore une réponse arrivée après un changement de catégorie ou de filtre.
      if (request !== requestId.current) return;
      setItems((prev) => {
        if (p === 1) return r.items;
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...r.items.filter((x) => !ids.has(x.id))];
      });
      setPage(p);
      setHasMore(r.hasMore);
    } catch (e) {
      if (request === requestId.current) {
        setLoadError(e instanceof Error ? e.message : 'Impossible de charger le catalogue.');
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [kind, genre, year, minNote, prefs.famille, shortOnly, sort]);

  useEffect(() => {
    setGenre(null);
    setYear(null);
    setMinNote(0);
    setShortOnly(false);
    setSort('popularity');
    setYearOptionsOpen(false);
    setRatingOptionsOpen(false);
    setGenresOpen(false);
  }, [kind]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    load(1);
  }, [kind, genre, year, minNote, prefs.famille, shortOnly, sort, load]);

  const genres = GENRES[kind] ?? [];
  const years = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => String(new Date().getFullYear() - i));
  // Tous les filtres sont appliqués côté serveur pour parcourir le catalogue complet.
  const shown = items;
  const cols = prefs.taille === 'Grand' ? 1 : prefs.taille === 'Normal' ? 2 : 3;
  const cardW = (Dimensions.get('window').width - 32 - (cols - 1) * 12) / cols;
  const surprise = () => {
    if (!shown.length) return;
    const picked = shown[Math.floor(Math.random() * shown.length)];
    Animated.sequence([
      Animated.timing(surpriseScale, { toValue: 0.94, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(surpriseScale, { toValue: 1, speed: 18, bounciness: 12, useNativeDriver: true }),
    ]).start(() => openTitle(router, picked));
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

      <View style={styles.catalogTabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogTabs}>
          {TABS.map((t) => (
            <Pressable key={t.kind} onPress={() => router.replace(`/catalogue/${t.kind}`)}
              style={[styles.pill, t.kind === kind && styles.pillOn]}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.pillText, t.kind === kind && styles.pillTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.compactFilterPanel}>
        <View style={styles.compactFilterTop}>
          <Pressable
            style={[styles.filterToggle, (genresOpen || genre !== null) && styles.filterSelectOn]}
            onPress={() => setGenresOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Afficher ou masquer les genres"
          >
            <Ionicons name="options-outline" size={15} color={colors.foreground} />
            <Text numberOfLines={1} style={styles.filterSelectText}>{genre ?? 'Genres'}</Text>
            <Ionicons name={genresOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.sortInline}>
            <Chip label="Pop." on={sort === 'popularity'} onPress={() => setSort('popularity')} />
            <Chip label="Notes" on={sort === 'rating'} onPress={() => setSort('rating')} />
            <Chip label="Récents" on={sort === 'recent'} onPress={() => setSort('recent')} />
          </View>
        </View>
        {genresOpen ? (
          <View style={styles.genreWrap}>
            <Chip label="Tous les genres" on={genre === null} onPress={() => setGenre(null)} />
            {genres.map((g) => <Chip key={g} label={g} on={genre === g} onPress={() => setGenre(g)} />)}
          </View>
        ) : null}
      </View>
      <View style={styles.filtersBar}>
        <Pressable style={[styles.filterSelect, year !== null && styles.filterSelectOn]} onPress={() => { setYearOptionsOpen((v) => !v); setRatingOptionsOpen(false); }}>
          <Ionicons name="calendar-outline" size={15} color={colors.foreground} />
          <Text style={styles.filterSelectText}>{year ?? 'Toutes les années'}</Text>
          <Ionicons name={yearOptionsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={[styles.filterSelect, minNote > 0 && styles.filterSelectOn]} onPress={() => { setRatingOptionsOpen((v) => !v); setYearOptionsOpen(false); }}>
          <Ionicons name="star-outline" size={15} color={colors.foreground} />
          <Text style={styles.filterSelectText}>{minNote ? 'Note ' + minNote + '+ / 10' : 'Toutes les notes'}</Text>
          <Ionicons name={ratingOptionsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
        </Pressable>
        {kind === 'film' ? (
          <Pressable style={[styles.filterSelect, shortOnly && styles.filterSelectOn]} onPress={() => setShortOnly((v) => !v)}>
            <Ionicons name="time-outline" size={15} color={colors.foreground} />
            <Text style={styles.filterSelectText}>Moins de 105 min</Text>
            {shortOnly ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} /> : null}
          </Pressable>
        ) : null}
        {(year !== null || minNote > 0 || genre !== null || shortOnly || sort !== 'popularity') ? <Pressable style={styles.resetFilter} onPress={() => { setYear(null); setMinNote(0); setGenre(null); setShortOnly(false); setSort('popularity'); setYearOptionsOpen(false); setRatingOptionsOpen(false); }}><Ionicons name="refresh-outline" size={15} color={colors.mutedForeground} /><Text style={styles.resetFilterText}>Réinitialiser</Text></Pressable> : null}
      </View>
      {yearOptionsOpen ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}><Chip label="Toutes les années" on={year === null} onPress={() => { setYear(null); setYearOptionsOpen(false); }} />{years.map((y) => <Chip key={y} label={y} on={year === y} onPress={() => { setYear(y); setYearOptionsOpen(false); }} />)}</ScrollView> : null}
      {ratingOptionsOpen ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>{NOTES.map((n) => <Chip key={n} label={n === 0 ? 'Toutes les notes' : '★ ' + n + '+ / 10'} on={minNote === n} onPress={() => { setMinNote(n); setRatingOptionsOpen(false); }} />)}</ScrollView> : null}

      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale: surpriseScale }] }}><Pressable style={styles.surprise} onPress={surprise} disabled={!shown.length}>
          <Ionicons name="shuffle" size={18} color="#fff" />
          <Text style={styles.surpriseText}>Surprends-moi</Text>
        </Pressable></Animated.View>
      </View>

      <FlatList
        removeClippedSubviews={false}
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
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
          : loadError
            ? <View style={styles.errorBox}><Ionicons name="cloud-offline-outline" size={28} color={colors.primary} /><Text style={styles.empty}>{loadError}</Text><Pressable style={styles.retry} onPress={() => load(1)}><Text style={styles.retryText}>Réessayer</Text></Pressable></View>
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
  root: { flex: 1, backgroundColor: '#08090D', paddingTop: 4 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  brand: { color: '#F5F3EE', fontSize: 20, fontWeight: '900' },
  gear: { backgroundColor: colors.muted, borderRadius: 999, padding: 8 },
  eyebrow: { color: colors.primary, letterSpacing: 2.4, fontSize: 10, fontWeight: '800', paddingHorizontal: 16, marginTop: 8, marginBottom: 2 },
  hscroll: { flexGrow: 0 },
  catalogTabsWrap: { marginTop: 6, marginBottom: 4 },
  catalogTabs: { paddingHorizontal: 16, paddingVertical: 7, gap: 8, alignItems: 'center' },
  compactFilterPanel: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 3, gap: 8 },
  compactFilterTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, maxWidth: 124, borderRadius: 999, borderWidth: 1, borderColor: '#353741', backgroundColor: '#191A20', paddingHorizontal: 10, flexShrink: 0 },
  sortInline: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center', paddingTop: 3 },
  pill: { backgroundColor: '#191A20', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, minHeight: 38, justifyContent: 'center', alignItems: 'center', flexShrink: 0, maxWidth: 190 },
  pillOn: { backgroundColor: colors.primary },
  pillText: { color: '#E1E3E8', fontSize: 12, fontWeight: '800', includeFontPadding: false },
  pillTextOn: { color: '#FFFFFF' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#353741', paddingHorizontal: 8, paddingVertical: 6, minHeight: 29, justifyContent: 'center', alignSelf: 'flex-start' },
  chipOn: { borderColor: colors.primary, backgroundColor: '#211318' },
  chipText: { color: '#D2D4DB', fontSize: 10, fontWeight: '600', includeFontPadding: false },
  chipTextOn: { color: '#FFFFFF', fontWeight: '800' },
  filtersBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterSelect: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 11 },
  filterSelectOn: { borderColor: colors.primary, backgroundColor: '#211318' },
  filterSelectText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  resetFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 6 },
  resetFilterText: { color: colors.mutedForeground, fontSize: 12 },
  optionRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  actions: { alignItems: 'flex-start', paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  surprise: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  surpriseText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#D2D4DB', textAlign: 'center', marginTop: 12, lineHeight: 20 },
  errorBox: { alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 36 },
  retry: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  retryText: { color: '#fff', fontWeight: '800' },
});