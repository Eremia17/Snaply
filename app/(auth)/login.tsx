import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Renseignez l’email et le mot de passe.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setBusy(true);
    const err = mode === 'login' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, pseudo.trim());
    setBusy(false);
    if (err) setError(err);
    else if (mode === 'signup') setInfo('Compte créé. Si la confirmation par email est activée, vérifiez votre boîte mail.');
    else leave();
  };

  const isSignup = mode === 'signup';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="film-outline" size={22} color="#fff" />
          </View>
          <Text style={styles.brand}>Erëmīa</Text>
        </View>

        <Text style={styles.eyebrow}>BIENVENUE DANS ERËMĪA</Text>
        <Text style={styles.heading}>{isSignup ? 'Créez votre espace cinéma' : 'Content de vous revoir'}</Text>
        <Text style={styles.sub}>
          {isSignup
            ? 'Retrouvez vos favoris, vos listes et toutes vos découvertes sur chaque appareil.'
            : 'Connectez-vous pour retrouver vos listes et vos avis.'}
        </Text>

        {isSignup ? <Field label="Pseudo" value={pseudo} onChangeText={setPseudo} placeholder="Votre nom dans Erëmīa" /> : null}
        <Field label="Adresse email" value={email} onChangeText={setEmail} placeholder="vous@exemple.fr" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Mot de passe" value={password} onChangeText={setPassword} placeholder="8 caractères minimum" secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignup ? 'Créer mon compte gratuit  →' : 'Se connecter'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(isSignup ? 'login' : 'signup')} style={{ marginTop: 18 }}>
          <Text style={styles.switch}>
            {isSignup ? 'Vous avez déjà un compte ? ' : 'Pas encore de compte ? '}
            <Text style={styles.switchStrong}>{isSignup ? 'Se connecter' : 'Créer un compte'}</Text>
          </Text>
        </Pressable>

        <Pressable onPress={leave} style={{ marginTop: 22 }}>
          <Text style={styles.skip}>Continuer sans compte</Text>
        </Pressable>

        <Text style={styles.footer}>Inscription gratuite. Votre compte est facultatif.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 8, marginTop: 16 }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput {...rest} placeholderTextColor={colors.mutedForeground} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  eyebrow: { color: colors.primary, letterSpacing: 3, fontSize: 12, fontWeight: '700', marginTop: 40 },
  heading: { color: colors.foreground, fontSize: 34, fontWeight: '900', marginTop: 10, lineHeight: 40 },
  sub: { color: colors.mutedForeground, marginTop: 12, lineHeight: 21 },
  label: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: colors.card, color: colors.foreground, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, fontSize: 15,
  },
  error: { color: colors.destructive, marginTop: 14 },
  info: { color: colors.gold, marginTop: 14, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 22 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  switch: { color: colors.mutedForeground, textAlign: 'center' },
  switchStrong: { color: colors.primary, fontWeight: '700' },
  skip: { color: colors.mutedForeground, textAlign: 'center', textDecorationLine: 'underline' },
  footer: { color: colors.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 28 },
});