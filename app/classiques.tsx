import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors } from '@/lib/theme';

type ArchiveItem = { identifier: string; title: string; year?: string | number };
type ArchivePage = { docs: ArchiveItem[]; next: number | null };
const PAGE_SIZE = 24;
const thumbnail = (id: string) => `https://archive.org/services/img/${encodeURIComponent(id)}`;

async function searchArchive(query: string, page: number): Promise<ArchivePage> {
  const clean = query.trim().replace(/[()":\\\\]/g, ' ').replace(/\s+/g, ' ');
  const clauses = ['collection:feature_films', 'mediatype:movies'];
  if (clean) clauses.push(`title:(${clean})`);
  const url = new URL('https://archive.org/advancedsearch.php');
  url.searchParams.set('q', clauses.join(' AND '));
  ['identifier', 'title', 'year'].forEach((field) => url.searchParams.append('fl[]', field));
  url.searchParams.append('sort[]', 'downloads desc');
  url.searchParams.set('rows', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('output', 'json');
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Internet Archive ne répond pas pour le moment.');
  const json = await response.json();
  const docs = (json.response?.docs ?? []) as ArchiveItem[];
  const total = Number(json.response?.numFound ?? 0);
  return { docs, next: page * PAGE_SIZE < total ? page + 1 : null };
}

export default function ClassiquesScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArchiveItem | null>(null);

  const load = useCallback(async (requestedPage: number, search: string) => {
    if (requestedPage === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result = await searchArchive(search, requestedPage);
      setItems((previous) => {
        if (requestedPage === 1) return result.docs;
        const known = new Set(previous.map((item) => item.identifier));
        return [...previous, ...result.docs.filter((item) => !known.has(item.identifier))];
      });
      setPage(requestedPage);
      setNextPage(result.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les classiques.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1, query); }, [load, query]);

  const search = () => {
    setItems([]);
    setPage(1);
    setNextPage(1);
    setQuery(input.trim());
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Classiques du domaine public', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <View style={styles.root}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.identifier}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.eyebrow}>100 % gratuit · Internet Archive</Text>
              <Text style={styles.title}>Les classiques du cinéma</Text>
              <Text style={styles.description}>Retrouve des films proposés par Internet Archive. Ouvre une fiche pour lancer le lecteur intégré ou consulter la source originale.</Text>
              <View style={styles.searchRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={search}
                  placeholder="Chercher un classique…"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                <Pressable onPress={search} style={styles.searchButton} accessibilityRole="button" accessibilityLabel="Rechercher">
                  <Ionicons name="search" size={20} color="#fff" />
                </Pressable>
              </View>
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="cloud-offline-outline" size={22} color={colors.primary} />
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable onPress={() => load(1, query)}><Text style={styles.retry}>Réessayer</Text></Pressable>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.posterWrap}>
                <Image source={{ uri: thumbnail(item.identifier) }} style={styles.poster} resizeMode="cover" />
                <View style={styles.playBadge}><Ionicons name="play" size={22} color="#fff" /></View>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Film sans titre'}</Text>
              <Text style={styles.year}>{item.year ? String(item.year) : 'Classique'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} /> :
            !error ? <Text style={styles.empty}>Aucun film trouvé. Essaie un autre titre.</Text> : null
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> :
            nextPage && items.length > 0 ? (
              <Pressable style={styles.moreButton} onPress={() => load(nextPage, query)}>
                <Text style={styles.moreText}>Charger plus de films</Text>
              </Pressable>
            ) : items.length > 0 ? <Text style={styles.end}>Fin des résultats</Text> : null
          }
          onEndReached={() => { if (!loading && !loadingMore && nextPage && nextPage > page) load(nextPage, query); }}
          onEndReachedThreshold={0.7}
        />
      </View>

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.playerRoot}>
          <View style={styles.playerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerTitle} numberOfLines={2}>{selected?.title}</Text>
              <Text style={styles.playerSubtitle}>Internet Archive · {selected?.year ?? 'Classique'}</Text>
            </View>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Fermer le lecteur">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          {selected ? (
            <WebView
              key={selected.identifier}
              source={{ uri: `https://archive.org/embed/${encodeURIComponent(selected.identifier)}?autoplay=1` }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              startInLoadingState
              renderLoading={() => <View style={styles.webLoading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.playerSubtitle}>Chargement du lecteur…</Text></View>}
            />
          ) : null}
          <View style={styles.playerFooter}>
            <Text style={styles.playerSubtitle}>La disponibilité et les droits peuvent varier selon le film. Vérifie les informations de la source originale.</Text>
            <Pressable style={styles.archiveButton} onPress={() => selected && Linking.openURL(`https://archive.org/details/${encodeURIComponent(selected.identifier)}`)}>
              <Ionicons name="open-outline" size={17} color="#fff" />
              <Text style={styles.archiveButtonText}>Ouvrir sur Internet Archive</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 14, paddingBottom: 36 },
  header: { paddingTop: 20, paddingBottom: 18, gap: 10 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 27, lineHeight: 33, fontWeight: '900' },
  description: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  searchInput: { flex: 1, color: colors.foreground, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
  searchButton: { width: 46, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  columns: { gap: 12 },
  card: { flex: 1, marginBottom: 18, minWidth: 0 },
  posterWrap: { aspectRatio: 2 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  poster: { width: '100%', height: '100%' },
  playBadge: { position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.foreground, fontWeight: '700', fontSize: 14, lineHeight: 19, marginTop: 8 },
  year: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },
  spinner: { marginTop: 42 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 30, paddingHorizontal: 20 },
  errorBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, gap: 8 },
  errorText: { color: colors.foreground, fontSize: 13 },
  retry: { color: colors.primary, fontWeight: '800' },
  moreButton: { alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 12, marginVertical: 12 },
  moreText: { color: colors.foreground, fontWeight: '700' },
  end: { color: colors.mutedForeground, textAlign: 'center', paddingVertical: 16, fontSize: 12 },
  playerRoot: { flex: 1, backgroundColor: colors.background, paddingTop: 42 },
  playerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  playerTitle: { color: colors.foreground, fontSize: 17, fontWeight: '800' },
  playerSubtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  closeButton: { padding: 8, borderRadius: 999, backgroundColor: colors.card },
  webview: { flex: 1, backgroundColor: '#000' },
  webLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  playerFooter: { padding: 14, gap: 10 },
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 999, backgroundColor: colors.primary },
  archiveButtonText: { color: '#fff', fontWeight: '800' },
});
