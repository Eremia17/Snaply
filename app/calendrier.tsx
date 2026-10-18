import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { KIND_LABEL, upcomingList, useCatalog } from '@/lib/catalog';
import { colors } from '@/lib/theme';

export default function CalendrierScreen() {
  useCatalog();
  const items = upcomingList();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Calendrier des sorties', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <FlatList
        style={styles.root}
        data={items}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune sortie prévue.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{new Date(item.upcoming!).getDate()}</Text>
              <Text style={styles.dateMonth}>{new Date(item.upcoming!).toLocaleDateString('fr-FR', { month: 'short' })}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{KIND_LABEL[item.kind]}</Text>
            </View>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  dateBox: { width: 56, alignItems: 'center', backgroundColor: colors.muted, borderRadius: 10, paddingVertical: 8 },
  dateDay: { color: colors.foreground, fontSize: 20, fontWeight: '900' },
  dateMonth: { color: colors.mutedForeground, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
});