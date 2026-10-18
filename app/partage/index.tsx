import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Wl = { id: string; name: string; join_code: string; owner_id: string };

export default function PartageScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [lists, setLists] = useState<Wl[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    if (!user) return setLists([]);
    const { data } = await supabase.from('shared_watchlists').select('id, name, join_code, owner_id').order('created_at', { ascending: false });
    setLists((data ?? []) as Wl[]);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from('shared_watchlists').insert({ owner_id: user.id, name: name.trim().slice(0, 60) });
    if (error) return Alert.alert('Création impossible', error.message);
    setName('');
    load();
  };

  const join = async () => {
    if (!code.trim()) return;
    const { error } = await supabase.rpc('join_watchlist', { _code: code.trim() });
    if (error) return Alert.alert('Code invalide', error.message);
    setCode('');
    load();
  };

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Listes partagées', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
        <View style={styles.center}>
          <Text style={styles.note}>Les listes partagées demandent un compte (facultatif).</Text>
          <Pressable style={styles.primary} onPress={() => router.push('/(auth)/login')}><Text style={styles.primaryText}>Se connecter</Text></Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Listes partagées', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nom d’une nouvelle liste" placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} />
          <Pressable style={styles.primary} onPress={create}><Text style={styles.primaryText}>Créer</Text></Pressable>
        </View>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Code pour rejoindre une liste" placeholderTextColor={colors.mutedForeground} value={code} onChangeText={setCode} autoCapitalize="none" />
          <Pressable style={styles.outline} onPress={join}><Text style={styles.outlineText}>Rejoindre</Text></Pressable>
        </View>
        {lists === null ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
          <FlatList
            data={lists}
            keyExtractor={(l) => l.id}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
            ListEmptyComponent={<Text style={styles.note}>Aucune liste partagée pour le moment.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => router.push({ pathname: '/partage/[id]', params: { id: item.id, name: item.name } })}>
                <Ionicons name="people-outline" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.owner_id === user.id ? <Text style={styles.meta}>Code : {item.join_code}</Text> : null}
                </View>
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
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  form: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  input: { flex: 1, backgroundColor: colors.card, color: colors.foreground, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  primary: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  outline: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  outlineText: { color: colors.foreground, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.foreground, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  note: { color: colors.mutedForeground, textAlign: 'center', marginTop: 30, lineHeight: 20 },
});