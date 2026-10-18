import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Item = { id: string; kind: string; item_id: string; title: string; poster: string | null; watched: boolean };

export default function PartageDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { favorites } = useStore();
  const [items, setItems] = useState<Item[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('shared_watchlist_items').select('id, kind, item_id, title, poster, watched').eq('watchlist_id', String(id)).order('created_at', { ascending: false });
    setItems((data ?? []) as Item[]);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addFavorites = async () => {
    if (favorites.length === 0) return Alert.alert('Aucun favori', 'Ajoutez d’abord des titres à Ma liste.');
    const rows = favorites.map((f) => ({ watchlist_id: String(id), kind: f.kind, item_id: f.id, title: f.title, poster: f.poster ?? null }));
    const { error } = await supabase.from('shared_watchlist_items').upsert(rows, { onConflict: 'watchlist_id,kind,item_id', ignoreDuplicates: true });
    if (error) return Alert.alert('Ajout impossible', error.message);
    load();
  };

  const toggleWatched = async (it: Item) => {
    await supabase.from('shared_watchlist_items').update({ watched: !it.watched }).eq('id', it.id);
    load();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: name ? String(name) : 'Liste partagée', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        <Pressable style={styles.primary} onPress={addFavorites}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryText}>Ajouter mes favoris à cette liste</Text>
        </Pressable>
        {items === null ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.note}>Liste vide pour le moment.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => toggleWatched(item)}>
                <Ionicons name={item.watched ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.watched ? '#22C55E' : colors.mutedForeground} />
                <Text style={[styles.title, item.watched && styles.watched]} numberOfLines={1}>{item.title}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13 },
  primaryText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.foreground, flex: 1, fontWeight: '600' },
  watched: { color: colors.mutedForeground, textDecorationLine: 'line-through' },
  note: { color: colors.mutedForeground, textAlign: 'center', marginTop: 30 },
});