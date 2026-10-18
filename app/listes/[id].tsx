import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PosterCard } from '@/components/PosterCard';
import { fetchListItems, removeFromList, type ListItem } from '@/lib/lists';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

const COLS = 3;
const CARD_W = (Dimensions.get('window').width - 32) / COLS - 8;

export default function ListeDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await fetchListItems(String(id)));
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirmRemove = (it: ListItem) => {
    Alert.alert('Retirer de la liste', `Retirer « ${it.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromList(String(id), it.item_id, it.kind);
            load();
          } catch (e: any) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: title ? String(title) : 'Liste' }} />
      <View style={styles.root}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={items}
            numColumns={COLS}
            keyExtractor={(i) => `${i.kind}:${i.item_id}`}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                Cette liste est vide. Ouvrez une fiche de titre et utilisez « Ajouter à une liste ».
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <PosterCard
                  width={CARD_W}
                  item={{
                    kind: item.kind as Kind,
                    id: item.item_id,
                    title: item.title,
                    poster: item.poster,
                  }}
                />
                <Pressable onPress={() => confirmRemove(item)} style={styles.remove}>
                  <Text style={styles.removeText}>Retirer</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 60, paddingHorizontal: 24, lineHeight: 20 },
  remove: { alignItems: 'center', paddingVertical: 4 },
  removeText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },
});