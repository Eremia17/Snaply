import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Report = { id: string; reason: string; post_id: string | null; created_at: string; posts: { title: string; author: string; body: string; hidden: boolean } | null };

export default function ModerationScreen() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState({ members: 0, posts: 0, open: 0 });

  const load = async () => {
    const { data } = await supabase.from('reports').select('id, reason, post_id, created_at, posts(title, author, body, hidden)').eq('status', 'open').order('created_at', { ascending: false });
    setReports((data ?? []) as unknown as Report[]);
    const [m, p, o] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setCounts({ members: m.count ?? 0, posts: p.count ?? 0, open: o.count ?? 0 });
  };

  useEffect(() => {
    if (!user) return setAllowed(false);
    supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
      const ok = (data ?? []).some((r) => r.role === 'admin' || r.role === 'moderator');
      setAllowed(ok);
      if (ok) load();
    });
  }, [user]);

  const resolve = async (r: Report) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id);
    load();
  };
  const hide = async (r: Report) => {
    if (r.post_id) await supabase.from('posts').update({ hidden: true }).eq('id', r.post_id);
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id);
    load();
  };
  const remove = (r: Report) =>
    Alert.alert('Supprimer l’avis', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        if (r.post_id) await supabase.from('posts').delete().eq('id', r.post_id);
        await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id);
        load();
      } },
    ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Modération', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      {allowed === null ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : !allowed ? (
        <Text style={styles.note}>Cette page est réservée aux modérateurs et aux administrateurs.</Text>
      ) : (
        <FlatList
          style={styles.root}
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={styles.counts}>
              <Count label="Membres" value={counts.members} />
              <Count label="Avis" value={counts.posts} />
              <Count label="Signalements" value={counts.open} />
            </View>
          }
          ListEmptyComponent={<Text style={styles.note}>Aucun signalement en attente.</Text>}
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <Text style={styles.reason}>Motif : {r.reason}</Text>
              {r.posts ? (
                <>
                  <Text style={styles.author}>{r.posts.author} · {r.posts.title}</Text>
                  <Text style={styles.body} numberOfLines={4}>{r.posts.body}</Text>
                </>
              ) : <Text style={styles.body}>Avis déjà supprimé.</Text>}
              <View style={styles.actions}>
                <Pressable style={styles.btn} onPress={() => resolve(r)}><Text style={styles.btnText}>Ignorer</Text></Pressable>
                <Pressable style={styles.btn} onPress={() => hide(r)}><Text style={styles.btnText}>Masquer</Text></Pressable>
                <Pressable style={[styles.btn, { backgroundColor: colors.destructive }]} onPress={() => remove(r)}><Text style={[styles.btnText, { color: '#fff' }]}>Supprimer</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  counts: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  count: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  countValue: { color: colors.gold, fontSize: 20, fontWeight: '900' },
  countLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  reason: { color: colors.primary, fontWeight: '700' },
  author: { color: colors.mutedForeground, fontSize: 12 },
  body: { color: colors.foreground, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flex: 1, backgroundColor: colors.muted, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  note: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
});