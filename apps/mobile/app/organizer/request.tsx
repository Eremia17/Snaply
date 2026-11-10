import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../src/theme';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';

export default function OrganizerRequestScreen() {
  const [organization, setOrganization] = useState('');
  const [activity, setActivity] = useState('Événementiel');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function loadApplication() {
    if (!isSupabaseConfigured || !supabase) {
      router.replace('/account?next=organizer');
      return;
    }

    setChecking(true);
    setLoadError('');
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!data.user) {
        router.replace('/account?next=organizer');
        return;
      }

      const { data: application, error } = await supabase
        .from('organizer_applications')
        .select('status')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      setPending(application?.status === 'pending');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de vérifier ta demande.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, []);

  async function submit() {
    if (!supabase) return;
    if (organization.trim().length < 2 || activity.trim().length < 2 || city.trim().length < 2 || phone.trim().length < 6) {
      setMessage('Complète les quatre champs avec des informations valides.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Connecte-toi avant d’envoyer ta demande.');
      const { error } = await supabase.from('organizer_applications').insert({
        user_id: userData.user.id,
        organization_name: organization.trim(),
        activity_type: activity.trim(),
        city: city.trim(),
        contact_phone: phone.trim(),
      });
      if (error) throw error;
      setPending(true);
      setMessage('Demande envoyée. Ton compte reste en mode spectateur jusqu’à validation.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’envoyer la demande.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorState}>
          <Text style={styles.title}>Vérification impossible</Text>
          <Text style={styles.subtitle}>{loadError}</Text>
          <Pressable onPress={() => void loadApplication()} style={styles.button}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} style={styles.backAction}>
            <Text style={styles.back}>Retour à l’accueil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.replace('/')}><Text style={styles.back}>←  Retour à l’accueil</Text></Pressable>
        <Text style={styles.brand}>TICKET <Text style={styles.accent}>MADA</Text></Text>
        <Text style={styles.eyebrow}>ACCÈS ORGANISATEUR</Text>
        <Text style={styles.title}>{pending ? 'Demande en cours.' : 'Présente ton activité.'}</Text>
        <Text style={styles.subtitle}>Pour protéger les événements et les acheteurs, l’espace organisateur est réservé aux comptes approuvés.</Text>
        {pending ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Demande reçue</Text>
            <Text style={styles.statusBody}>Ton compte reste spectateur pendant l’examen. Les outils de création et de gestion s’ouvriront uniquement après approbation.</Text>
          </View>
        ) : (
          <>
            <TextInput value={organization} onChangeText={setOrganization} placeholder="Nom de l’organisation ou de l’activité" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={activity} onChangeText={setActivity} placeholder="Type d’activité (association, salle, producteur…)" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={city} onChangeText={setCity} placeholder="Ville" placeholderTextColor={colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Téléphone de contact" placeholderTextColor={colors.muted} style={styles.input} keyboardType="phone-pad" />
            {!!message && <Text style={styles.message}>{message}</Text>}
            <Pressable disabled={busy} onPress={submit} style={[styles.button, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Envoyer ma demande</Text>}
            </Pressable>
          </>
        )}
        {!!message && pending && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.footnote}>La demande ne donne pas automatiquement les droits organisateur. L’approbation est effectuée côté serveur.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  errorState: { flex: 1, justifyContent: 'center', padding: 23 },
  backAction: { alignItems: 'center', padding: 15 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 23 },
  back: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 32 },
  brand: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 1.6 },
  accent: { color: colors.primary },
  eyebrow: { color: colors.primary, fontSize: 9, letterSpacing: 2, fontWeight: '900', marginTop: 20 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 22 },
  input: { minHeight: 51, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, paddingHorizontal: 14, marginBottom: 11, fontSize: 12 },
  button: { minHeight: 51, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  message: { color: '#F3A6AE', fontSize: 11, lineHeight: 17, marginBottom: 10 },
  statusCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#3A6958', borderRadius: 15, padding: 17 },
  statusTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  statusBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  footnote: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 20, textAlign: 'center' },
});
