import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchPosts, type Post } from '@/lib/community';
import { colors } from '@/lib/theme';

export default function CommunauteScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPosts(await fetchPosts());
    } catch (e: any) {
      setError(e.message ?? 'Chargement impossible');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={styles.root}
      data={posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => { setRefreshing(true); load(); }} />
      }
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>Aucun avis pour le moment. Ouvrez une fiche de titre pour publier le premier.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push({ pathname: '/communaute/[id]', params: { id: item.id } })}>
          <View style={styles.head}>
            <Text style={styles.author}>{item.author}</Text>
            {item.user_rating ? <Text style={styles.rating}>★ {item.user_rating}/10</Text> : null}
          </View>
          <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
          <View style={styles.footer}>
            <Ionicons name="heart-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.meta}>{item.likes_count}</Text>
            <Ionicons name="chatbubble-outline" size={14} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
            <Text style={styles.meta}>{item.comments_count}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  author: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  rating: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  postTitle: { color: colors.foreground, fontSize: 16, fontWeight: '800', marginTop: 6 },
  body: { color: colors.foreground, marginTop: 4, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  meta: { color: colors.mutedForeground, fontSize: 12 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 60, paddingHorizontal: 24, lineHeight: 20 },
  error: { color: colors.destructive, marginBottom: 8 },
});