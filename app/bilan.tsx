import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { KIND_LABEL } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function BilanScreen() {
  const { favorites, history } = useStore();
  const count = (list: { kind: Kind }[], k: Kind) => list.filter((x) => x.kind === k).length;
  const kinds = Object.keys(KIND_LABEL) as Kind[];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mon bilan', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={styles.summary}>
          <Stat label="Favoris" value={favorites.length} />
          <Stat label="Consultés" value={history.length} />
        </View>
        <Text style={styles.h2}>Par catégorie</Text>
        {kinds.map((k) => (
          <View key={k} style={styles.row}>
            <Text style={styles.rowLabel}>{KIND_LABEL[k]}</Text>
            <Text style={styles.rowValue}>
              {count(favorites, k)} favori{count(favorites, k) > 1 ? 's' : ''} · {count(history, k)} consulté{count(history, k) > 1 ? 's' : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  summary: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.gold, fontSize: 30, fontWeight: '900' },
  statLabel: { color: colors.mutedForeground, marginTop: 4 },
  h2: { color: colors.foreground, fontSize: 18, fontWeight: '800', marginTop: 8 },
  row: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
  rowLabel: { color: colors.foreground, fontWeight: '700' },
  rowValue: { color: colors.mutedForeground },
});