import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';

type Application = {
  id: string;
  user_id: string;
  organization_name: string;
  activity_type: string;
  city: string;
  contact_phone: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function AdminScreen() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      router.replace('/account');
      return;
    }
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace('/account');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('role').eq('id', authData.user.id).single();
      if (profileError || profile?.role !== 'admin') {
        router.replace('/spectator');
        return;
      }
      const { data, error: listError } = await supabase
        .from('organizer_applications')
        .select('id,user_id,organization_name,activity_type,city,contact_phone,created_at,status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (listError) throw listError;
      setItems((data ?? []) as Application[]);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function review(item: Application, decision: 'approved' | 'rejected') {
    if (!supabase) return;
    const client = supabase;
    Alert.alert(
      decision === 'approved' ? 'Approuver cet organisateur ?' : 'Refuser cette demande ?',
      decision === 'approved'
        ? 'Le compte recevra les droits organisateur et pourra accéder à son tableau de bord.'
        : 'La demande sera refusée. Le compte conservera son rôle spectateur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: decision === 'approved' ? 'Approuver' : 'Refuser', style: decision === 'approved' ? 'default' : 'destructive', onPress: async () => {
          setBusyId(item.id);
          try {
            const { error: rpcError } = await client.rpc('review_organizer_application', {
              p_application_id: item.id,
              p_decision: decision,
            });
            if (rpcError) throw rpcError;
            await load();
          } catch (e) {
            Alert.alert('Action impossible', e instanceof Error ? e.message : 'La demande n’a pas pu être traitée.');
          } finally {
            setBusyId(null);
          }
        } },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.replace('/')} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>TICKET MADA · ADMINISTRATION</Text>
            <Text style={styles.title}>Demandes organisateur</Text>
          </View>
          <View style={styles.count}><Text style={styles.countText}>{items.length}</Text></View>
        </View>
        <Text style={styles.subtitle}>Vérifie les informations avant d'accorder les droits de gestion des événements.</Text>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} /> : error ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Chargement impossible</Text><Text style={styles.body}>{error}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={styles.refresh}><Text style={styles.refreshText}>Réessayer</Text></Pressable></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Aucune demande en attente</Text><Text style={styles.body}>Les nouvelles demandes d'accès organisateur apparaîtront ici.</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={styles.refresh}><Text style={styles.refreshText}>Actualiser</Text></Pressable></View>
        ) : items.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.organization_name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orgName}>{item.organization_name}</Text>
                <Text style={styles.meta}>{item.activity_type} · {item.city}</Text>
              </View>
              <View style={styles.pending}><Text style={styles.pendingText}>EN ATTENTE</Text></View>
            </View>
            <View style={styles.detail}><Text style={styles.detailLabel}>TÉLÉPHONE DE CONTACT</Text><Text style={styles.detailValue}>{item.contact_phone}</Text></View>
            <Text style={styles.date}>Demande reçue le {new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
            <View style={styles.actions}>
              <Pressable disabled={busyId === item.id} onPress={() => review(item, 'rejected')} style={[styles.reject, busyId === item.id && styles.disabled]}><Text style={styles.rejectText}>Refuser</Text></Pressable>
              <Pressable disabled={busyId === item.id} onPress={() => review(item, 'approved')} style={[styles.approve, busyId === item.id && styles.disabled]}>{busyId === item.id ? <ActivityIndicator color={colors.white} /> : <Text style={styles.approveText}>Approuver</Text>}</Pressable>
            </View>
          </View>
        ))}
        <Text style={styles.footer}>LES APPROBATIONS SONT VALIDÉES PAR LA BASE DE DONNÉES</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 26 },
  eyebrow: { color: colors.primary, fontSize: 8, letterSpacing: 1.5, fontWeight: '900' },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 4 },
  count: { minWidth: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { color: colors.primary, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 15, marginBottom: 18 },
  card: { padding: 16, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  orgName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  pending: { backgroundColor: '#45351F', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  pendingText: { color: '#E8B968', fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  detail: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 15, paddingTop: 12 },
  detailLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  detailValue: { color: colors.text, fontSize: 12, marginTop: 5 },
  date: { color: colors.muted, fontSize: 9, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  reject: { flex: 1, height: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  approve: { flex: 1.4, height: 44, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  empty: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, marginTop: 16 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  refresh: { alignSelf: 'flex-start', marginTop: 15, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10 },
  refreshText: { color: colors.white, fontWeight: '900', fontSize: 10 },
  footer: { color: colors.muted, fontSize: 8, textAlign: 'center', letterSpacing: 1.1, marginTop: 25 },
});
