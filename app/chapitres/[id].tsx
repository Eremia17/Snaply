import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchChapters, type Chapter } from '@/lib/catalog';
import { colors } from '@/lib/theme';

export default function ChapitresScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [items, setItems] = useState<Chapter[] | null>(null);

  useEffect(() => {
    fetchChapters(String(id)).then(setItems);
  }, [id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: title ? String(title) : 'Chapitres', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        {items === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.empty}>Aucun chapitre disponible pour le moment.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/lecture/[chapterId]', params: { chapterId: item.id, title: `Chapitre ${item.chapter}` } })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chapter}>Chapitre {item.chapter}</Text>
                  {item.title ? <Text style={styles.sub} numberOfLines={1}>{item.title}</Text> : null}
                </View>
                <Text style={styles.lang}>{item.lang === 'fr' ? 'FR' : 'EN'}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  chapter: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  lang: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
});