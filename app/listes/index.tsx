import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { createList, deleteList, fetchLists, type UserList } from '@/lib/lists';
import { colors } from '@/lib/theme';

export default function ListesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLists(await fetchLists());
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharge à chaque fois que l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const create = async () => {
    const title = newTitle.trim();
    if (!title || !user) return;
    try {
      await createList(user.id, title);
      setNewTitle('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const confirmDelete = (list: UserList) => {
    Alert.alert('Supprimer la liste', `Supprimer « ${list.title} » et tous ses titres ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteList(list.id);
            load();
          } catch (e: any) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ color: colors.foreground, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
          Les listes personnelles demandent un compte. La connexion est facultative.
        </Text>
        <Pressable style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 }} onPress={() => router.push('/(auth)/login')}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="Nom de la nouvelle liste"
          placeholderTextColor={colors.mutedForeground}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={create}
        />
        <Pressable style={styles.addBtn} onPress={create}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={<Text style={styles.empty}>Aucune liste pour le moment. Créez-en une ci-dessus.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/listes/[id]', params: { id: item.id, title: item.title } })}
              onLongPress={() => confirmDelete(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  createRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  input: {
    flex: 1, backgroundColor: colors.card, color: colors.foreground, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, width: 46, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
  error: { color: colors.destructive, paddingHorizontal: 16, paddingTop: 8 },
});