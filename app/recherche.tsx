import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PosterCard } from '@/components/PosterCard';
import { KIND_LABEL, searchCatalog, searchRemote, useCatalog, type Detail } from '@/lib/catalog';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

const CARD_W = (Dimensions.get('window').width - 48) / 2;
const KINDS = Object.keys(KIND_LABEL) as Kind[];
type Sort = 'pertinence' | 'note' | 'annee' | 'titre';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'pertinence', label: 'Pertinence' },
  { key: 'note', label: 'Meilleure note' },
  { key: 'annee', label: 'Plus récent' },
  { key: 'titre', label: 'Titre A → Z' },
];
const NOTES = [0, 6, 7, 8];

export default function RechercheScreen() {
  useCatalog();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [remote, setRemote] = useState<Detail[]>([]);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<Sort>('pertinence');
  const [minNote, setMinNote] = useState(0);
  const [year, setYear] = useState<string | null>(null);

  const searchRequest = useRef(0);

  useEffect(() => {
    const request = ++searchRequest.current;
    const term = q.trim();
    if (term.length < 2) {
      setRemote([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchRemote(term, kinds);
        if (request === searchRequest.current) setRemote(found);
      } catch {
        if (request === searchRequest.current) setRemote([]);
      } finally {
        if (request === searchRequest.current) setBusy(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q, kinds]);

  const base = remote.length ? remote : searchCatalog(q, kinds);
  const years = useMemo(
    () => Array.from(new Set(base.map((i) => i.year).filter(Boolean) as string[])).sort().reverse().slice(0, 8),
    [base],
  );
  const results = useMemo(() => {
    const f = base.filter((i) => i.rating >= minNote && (!year || i.year === year));
    if (sort === 'note') return [...f].sort((a, b) => b.rating - a.rating);
    if (sort === 'annee') return [...f].sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));
    if (sort === 'titre') return [...f].sort((a, b) => a.title.localeCompare(b.title));
    return f;
  }, [base, minNote, year, sort]);

  const toggleKind = (k: Kind) => setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Recherche avancée', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        <TextInput style={styles.input} placeholder="Titre, genre…" placeholderTextColor={colors.mutedForeground} value={q} onChangeText={setQ} />

        <Row>
          {KINDS.map((k) => <Chip key={k} label={KIND_LABEL[k]} on={kinds.includes(k)} onPress={() => toggleKind(k)} />)}
        </Row>
        <Row>
          {SORTS.map((s) => <Chip key={s.key} label={s.label} on={sort === s.key} onPress={() => setSort(s.key)} />)}
        </Row>
        <Row>
          {NOTES.map((n) => <Chip key={n} label={n === 0 ? 'Toutes les notes' : `★ ${n}+`} on={minNote === n} onPress={() => setMinNote(n)} />)}
        </Row>
        <Row>
          <Chip label="Toutes les années" on={year === null} onPress={() => setYear(null)} />
          {years.map((y) => <Chip key={y} label={y} on={year === y} onPress={() => setYear(y)} />)}
        </Row>

        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(i) => `${i.kind}:${i.id}`}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          renderItem={({ item }) => <PosterCard item={item} width={CARD_W} />}
          ListEmptyComponent={<Text style={styles.empty}>{busy ? 'Recherche en cours…' : 'Aucun résultat pour ces critères.'}</Text>}
        />
      </View>
    </>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.row}>
      {children}
    </ScrollView>
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
  root: { flex: 1, backgroundColor: colors.background },
  input: { margin: 16, marginBottom: 8, backgroundColor: colors.card, color: colors.foreground, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  row: { paddingHorizontal: 16, paddingVertical: 4, gap: 8, alignItems: 'center' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.muted },
  chipText: { color: colors.mutedForeground, fontSize: 13 },
  chipTextOn: { color: colors.primary, fontWeight: '700' },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
});