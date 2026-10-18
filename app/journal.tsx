import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { KIND_LABEL } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function JournalScreen() {
  const { history, favorites } = useStore();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Journal & trophées', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <FlatList
        style={styles.root}
        data={history}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.trophy}>
            <Text style={styles.trophyNum}>{history.length}</Text>
            <Text style={styles.trophyText}>fiches consultées · {favorites.length} favoris</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Les fiches que vous consultez apparaîtront ici.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{KIND_LABEL[item.kind]}</Text>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  trophy: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 6 },
  trophyNum: { color: colors.gold, fontSize: 40, fontWeight: '900' },
  trophyText: { color: colors.mutedForeground },
  row: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.foreground, fontWeight: '700' },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
});