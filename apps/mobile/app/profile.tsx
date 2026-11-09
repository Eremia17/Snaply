import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Alert } from 'react-native';
import { colors } from '../src/theme';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('customer');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      router.replace('/account');
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.replace('/account');
      return;
    }
    setEmail(authData.user.email ?? '');
    const { data } = await supabase.from('profiles').select('display_name,role').eq('id', authData.user.id).maybeSingle();
    setDisplayName(data?.display_name ?? '');
    setRole(data?.role ?? 'customer');
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function signOut() {
    if (!supabase) return;
    Alert.alert('Se déconnecter ?', 'Tu pourras te reconnecter à tout moment avec ton adresse e-mail.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          Alert.alert('Déconnexion impossible', error.message);
          return;
        }
        router.replace('/');
      } },
    ]);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.replace('/spectator')}><Text style={styles.back}>←  Retour aux événements</Text></Pressable>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(displayName || email || 'T').slice(0, 1).toUpperCase()}</Text></View>
        <Text style={styles.eyebrow}>MON ESPACE PERSONNEL</Text>
        <Text style={styles.title}>{displayName || 'Mon compte'}</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>TYPE DE COMPTE</Text>
          <Text style={styles.value}>{role === 'admin' ? 'Administrateur' : role === 'organizer' ? 'Organisateur approuvé' : 'Spectateur'}</Text>
          <Text style={styles.helper}>{role === 'customer' ? 'Tu peux découvrir les événements et demander l’accès organisateur.' : role === 'organizer' ? 'Ton espace organisateur est activé.' : 'Tu disposes des accès de gestion de la plateforme.'}</Text>
        </View>

        {role === 'customer' ? (
          <Pressable onPress={() => router.push('/account?next=organizer')} style={styles.primary}><Text style={styles.primaryText}>Demander l’accès organisateur  →</Text></Pressable>
        ) : role === 'organizer' ? (
          <Pressable onPress={() => router.push('/organizer')} style={styles.primary}><Text style={styles.primaryText}>Ouvrir mon espace organisateur  →</Text></Pressable>
        ) : (
          <Pressable onPress={() => router.push('/admin')} style={styles.primary}><Text style={styles.primaryText}>Ouvrir l’administration  →</Text></Pressable>
        )}

        <Pressable onPress={signOut} style={styles.logout}><Text style={styles.logoutText}>Se déconnecter</Text></Pressable>
        <Text style={styles.footnote}>Tes identifiants sont gérés par Supabase Auth. Ne partage jamais ton mot de passe.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  back: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 38 },
  avatar: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  avatarText: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 9, letterSpacing: 1.8, fontWeight: '900' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 7 },
  email: { color: colors.muted, fontSize: 12, marginTop: 6 },
  infoCard: { padding: 17, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 25 },
  label: { color: colors.muted, fontSize: 8, letterSpacing: 1.3, fontWeight: '900' },
  value: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 },
  helper: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  primary: { minHeight: 51, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingHorizontal: 12 },
  primaryText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  logout: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 11 },
  logoutText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  footnote: { color: colors.muted, fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 23 },
});
