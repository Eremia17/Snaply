import { useEffect, useState } from 'react';
import { router, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';

export default function OrganizerLayout() {
  const pathname = usePathname();
  const isAccessRequest = pathname.endsWith('/organizer/request');
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function verify() {
      setChecking(true);
      setLoadError('');
      if (isAccessRequest) {
        setAllowed(true);
        setChecking(false);
        return;
      }
      try {
        if (!isSupabaseConfigured || !supabase) {
          router.replace('/account?next=organizer');
          return;
        }
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          router.replace('/account?next=organizer');
          return;
        }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (profile?.role !== 'organizer') {
          router.replace('/organizer/request');
          return;
        }
        setAllowed(true);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Impossible de vérifier les autorisations.');
      } finally {
        if (active) setChecking(false);
      }
    }
    void verify();
    return () => { active = false; };
  }, [isAccessRequest, retryKey]);

  if (checking) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;
  }
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorState}>
          <Text style={styles.title}>Accès à vérifier</Text>
          <Text style={styles.message}>{loadError}</Text>
          <Pressable onPress={() => setRetryKey(value => value + 1)} style={styles.button}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/account?next=organizer')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Retour à la connexion</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  if (!allowed) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  errorState: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  message: { color: '#AAB2C0', fontSize: 12, lineHeight: 19, marginTop: 10 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  secondary: { alignItems: 'center', padding: 15 },
  secondaryText: { color: '#AAB2C0', fontSize: 11, fontWeight: '700' },
});
