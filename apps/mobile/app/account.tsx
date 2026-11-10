import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StatusBar, StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme';
import { isSupabaseConfigured, supabase } from '../src/lib/supabase';

type Mode = 'signin' | 'signup';

export default function AccountScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const next = params.next === 'organizer' ? 'organizer' : 'spectator';
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    if (!supabase) return;
    setMessage('');
    if (!email.trim() || password.length < 6 || (mode === 'signup' && !name.trim())) {
      setMessage('Vérifie ton nom, ton adresse e-mail et ton mot de passe (6 caractères minimum).');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse, puis connecte-toi.');
          setMode('signin');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        throw new Error('La session n’a pas pu être ouverte. Connecte-toi à nouveau.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      if (profileError) {
        throw new Error('Compte authentifié, mais profil introuvable. Réessaie dans un instant.');
      }

      if (profile.role === 'admin') {
        router.replace('/admin');
      } else if (next === 'organizer') {
        router.replace(profile.role === 'organizer' ? '/organizer' : '/organizer/request');
      } else {
        router.replace('/spectator');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Pressable onPress={() => router.replace('/')} style={styles.back}><Text style={styles.backText}>←  Retour</Text></Pressable>
        <Text style={styles.brand}>TICKET <Text style={styles.accent}>MADA</Text></Text>
        <Text style={styles.eyebrow}>{next === 'organizer' ? 'ESPACE ORGANISATEUR' : 'ESPACE SPECTATEUR'}</Text>
        <Text style={styles.title}>{mode === 'signin' ? 'Heureux de te revoir.' : 'Créer mon compte.'}</Text>
        <Text style={styles.subtitle}>Un compte pour retrouver tes informations et sécuriser tes accès.</Text>

        {!isSupabaseConfigured ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Connexion à configurer</Text>
            <Text style={styles.noticeText}>Les variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY doivent être définies dans l’environnement Expo. Aucun mot de passe ne sera stocké localement.</Text>
          </View>
        ) : (
          <>
            {mode === 'signup' && <TextInput value={name} onChangeText={setName} placeholder="Nom affiché" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />}
            <TextInput value={email} onChangeText={setEmail} placeholder="Adresse e-mail" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <TextInput value={password} onChangeText={setPassword} placeholder="Mot de passe" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry autoCapitalize="none" />
            {!!message && <Text style={styles.message}>{message}</Text>}
            <Pressable disabled={busy} onPress={submit} style={[styles.primaryButton, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }} style={styles.switch}>
              <Text style={styles.switchText}>{mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà inscrit ? Se connecter'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  back: { position: 'absolute', top: 20, left: 24, paddingVertical: 10 },
  backText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  brand: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1.8 },
  accent: { color: colors.primary },
  eyebrow: { color: colors.primary, fontSize: 9, letterSpacing: 2, fontWeight: '900', marginTop: 18 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 9 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 25 },
  input: { height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 13, color: colors.text, paddingHorizontal: 15, marginBottom: 12, fontSize: 13 },
  primaryButton: { height: 52, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  switch: { padding: 16, alignItems: 'center' },
  switchText: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  message: { color: '#F3A6AE', fontSize: 11, lineHeight: 17, marginBottom: 8 },
  notice: { padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 18 },
  noticeTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  noticeText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 7 },
});
