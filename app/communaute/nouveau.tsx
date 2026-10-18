import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { createPost, getPseudo, setPseudo } from '@/lib/community';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function NouvelAvisScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{ kind: Kind; id: string; title: string; poster?: string }>();
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPseudo().then(setAuthor);
  }, []);

  const submit = async () => {
    if (!author.trim() || !body.trim()) {
      Alert.alert('Champs requis', 'Pseudo et avis sont obligatoires.');
      return;
    }
    setBusy(true);
    try {
      await createPost({
        kind: p.kind,
        item_id: String(p.id),
        title: String(p.title ?? ''),
        poster: p.poster || null,
        rating: null,
        user_rating: null,
        author: author.trim().slice(0, 40),
        body: body.trim().slice(0, 2000),
      });
      await setPseudo(author.trim());
      Alert.alert('Avis publié', 'Votre avis est visible dans la communauté.', [
        { text: 'OK', onPress: () => router.replace('/communaute') },
      ]);
    } catch (e: any) {
      Alert.alert('Publication impossible', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Publier un avis', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={styles.label}>Titre</Text>
        <Text style={styles.titleText}>{p.title}</Text>

        <Text style={styles.label}>Votre pseudo</Text>
        <TextInput
          style={styles.input}
          value={author}
          onChangeText={setAuthor}
          maxLength={40}
          placeholder="Pseudo"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Votre avis</Text>
        <TextInput
          style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          placeholder="Qu'avez-vous pensé de ce titre ?"
          placeholderTextColor={colors.mutedForeground}
        />

        <Pressable style={styles.send} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Publier</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  label: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  titleText: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  input: {
    backgroundColor: colors.card, color: colors.foreground, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
  },
  send: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});