import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  addComment, fetchComments, fetchPost, getPseudo, likedPosts, setPseudo, toggleLike,
  type Comment, type Post,
} from '@/lib/community';
import { colors } from '@/lib/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pseudo, setPseudoState] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, l, ps] = await Promise.all([fetchPost(String(id)), fetchComments(String(id)), likedPosts(), getPseudo()]);
      setPost(p);
      setComments(c);
      setLiked(l.includes(String(id)));
      setPseudoState(ps);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const like = async () => {
    if (!post) return;
    try {
      const count = await toggleLike(post.id);
      setPost({ ...post, likes_count: count });
      setLiked(!liked);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const send = async () => {
    const author = pseudo.trim();
    const body = text.trim();
    if (!author || !body || !post) {
      Alert.alert('Champs requis', 'Pseudo et commentaire sont obligatoires.');
      return;
    }
    setSending(true);
    try {
      await addComment(post.id, author.slice(0, 40), body.slice(0, 1000));
      await setPseudo(author);
      setText('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading || !post) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Avis', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <FlatList
        style={styles.root}
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 12 }}>
            <View style={styles.card}>
              <Text style={styles.author}>{post.author}</Text>
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.user_rating ? <Text style={styles.rating}>★ {post.user_rating}/10</Text> : null}
              <Text style={styles.body}>{post.body}</Text>
              <Pressable style={styles.likeBtn} onPress={like}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.primary : colors.foreground} />
                <Text style={styles.likeText}>{post.likes_count}</Text>
              </Pressable>
            </View>
            <Text style={styles.h2}>Commentaires ({comments.length})</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucun commentaire. Soyez le premier.</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Votre pseudo"
              placeholderTextColor={colors.mutedForeground}
              value={pseudo}
              onChangeText={setPseudoState}
              maxLength={40}
            />
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Votre commentaire"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <Pressable style={styles.send} onPress={send} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Publier le commentaire</Text>}
            </Pressable>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  comment: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 4 },
  author: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  postTitle: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  rating: { color: colors.gold, fontWeight: '700' },
  body: { color: colors.foreground, lineHeight: 21 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
  likeText: { color: colors.foreground, fontWeight: '600' },
  h2: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginVertical: 16 },
  form: { gap: 10, marginTop: 12 },
  input: {
    backgroundColor: colors.card, color: colors.foreground, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  send: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});