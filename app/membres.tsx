import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Member = { id: string; display_name: string | null; avatar_url: string | null; watched_count: number; trophies_count: number; points: number };

export default function MembresScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('public_profiles').select('*').order('points', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error) setError('Connectez-vous (facultatif) pour voir le classement.');
      setMembers((data ?? []) as Member[]);
    });
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Classement', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      {members === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={styles.root}
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          ListHeaderComponent={error ? <Text style={styles.note}>{error}</Text> : null}
          ListEmptyComponent={<Text style={styles.note}>Aucun profil public pour le moment.</Text>}
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => router.push({ pathname: '/membre/[id]', params: { id: item.id } })}>
              <Text style={styles.rank}>{index + 1}</Text>
              {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={styles.avatar} /> : (
                <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="person" size={18} color={colors.mutedForeground} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name ?? 'Membre'}</Text>
                <Text style={styles.meta}>{item.watched_count} vus · {item.trophies_count} trophées · {item.points} pts</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  rank: { color: colors.gold, fontWeight: '900', width: 24, textAlign: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.muted },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  note: { color: colors.mutedForeground, textAlign: 'center', marginTop: 30 },
});