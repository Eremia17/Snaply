import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Profile = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null; watched_count: number; trophies_count: number; points: number };
type PubList = { id: string; title: string; description: string | null };

export default function MembreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [lists, setLists] = useState<PubList[]>([]);

  useEffect(() => {
    supabase.from('public_profiles').select('*').eq('id', String(id)).maybeSingle().then(({ data }) => setProfile((data as Profile) ?? null));
    supabase.from('user_lists').select('id, title, description').eq('owner_id', String(id)).eq('is_public', true).then(({ data }) => setLists((data ?? []) as PubList[]));
  }, [id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Profil', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {profile === undefined ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null}
        {profile === null ? <Text style={styles.note}>Ce profil n’est pas public.</Text> : null}
        {profile ? (
          <>
            <View style={styles.head}>
              {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : (
                <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="person" size={36} color={colors.mutedForeground} /></View>
              )}
              <Text style={styles.name}>{profile.display_name ?? 'Membre'}</Text>
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            </View>
            <View style={styles.stats}>
              <Stat label="Vus" value={profile.watched_count} />
              <Stat label="Trophées" value={profile.trophies_count} />
              <Stat label="Points" value={profile.points} />
            </View>
            <Text style={styles.kicker}>LISTES PUBLIQUES</Text>
            {lists.length === 0 ? <Text style={styles.note}>Aucune liste publique.</Text> : lists.map((l) => (
              <View key={l.id} style={styles.list}>
                <Text style={styles.listTitle}>{l.title}</Text>
                {l.description ? <Text style={styles.listDesc}>{l.description}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { alignItems: 'center', gap: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.muted },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  bio: { color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  kicker: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, marginTop: 8 },
  list: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
  listTitle: { color: colors.foreground, fontWeight: '800' },
  listDesc: { color: colors.mutedForeground, lineHeight: 19 },
  note: { color: colors.mutedForeground, textAlign: 'center', marginTop: 20 },
});