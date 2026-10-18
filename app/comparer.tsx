import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { KIND_LABEL, getDetail, useCatalog } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import type { Item } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function ComparerScreen() {
  useCatalog();
  const { favorites } = useStore();
  const [picked, setPicked] = useState<Item[]>([]);

  const toggle = (i: Item) => {
    const key = (x: Item) => `${x.kind}:${x.id}`;
    setPicked((prev) => {
      if (prev.some((x) => key(x) === key(i))) return prev.filter((x) => key(x) !== key(i));
      if (prev.length >= 2) return [prev[1], i];
      return [...prev, i];
    });
  };

  const rows = picked.map((i) => {
    const d = getDetail(i.kind, i.id);
    return {
      title: i.title,
      kind: KIND_LABEL[i.kind],
      year: d?.year ?? i.year ?? '—',
      genres: d?.genres.join(', ') ?? '—',
      rating: d ? `★ ${d.rating.toFixed(1)}` : '—',
    };
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Comparer deux titres', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.label}>Choisissez deux titres dans vos favoris</Text>
        {favorites.length === 0 ? (
          <Text style={styles.empty}>Ajoutez d’abord des titres à vos favoris pour les comparer.</Text>
        ) : (
          <View style={styles.chips}>
            {favorites.map((f) => {
              const on = picked.some((x) => x.kind === f.kind && x.id === f.id);
              return (
                <Pressable key={`${f.kind}:${f.id}`} onPress={() => toggle(f)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.title}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {rows.length === 2 ? (
          <View style={styles.table}>
            {[
              ['Type', 'kind'],
              ['Année', 'year'],
              ['Genres', 'genres'],
              ['Note', 'rating'],
            ].map(([label, key]) => (
              <View key={key} style={styles.tr}>
                <Text style={styles.th}>{label}</Text>
                <Text style={styles.td}>{rows[0][key as keyof (typeof rows)[0]]}</Text>
                <Text style={styles.td}>{rows[1][key as keyof (typeof rows)[1]]}</Text>
              </View>
            ))}
            <View style={styles.tr}>
              <Text style={styles.th}>Titre</Text>
              <Text style={[styles.td, styles.bold]}>{rows[0].title}</Text>
              <Text style={[styles.td, styles.bold]}>{rows[1].title}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  label: { color: colors.mutedForeground, fontWeight: '600' },
  empty: { color: colors.mutedForeground, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.muted },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  table: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, padding: 12, gap: 8 },
  th: { flex: 1, color: colors.mutedForeground, fontWeight: '700' },
  td: { flex: 1.5, color: colors.foreground },
  bold: { fontWeight: '700' },
});