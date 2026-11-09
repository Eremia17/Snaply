import { useEffect, useState } from 'react';
import { router, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { colors } from '../../src/theme';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';

export default function OrganizerLayout() {
  const segments = useSegments();
  const isAccessRequest = segments[1] === 'request';
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (isAccessRequest) {
        setAllowed(true);
        setChecking(false);
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        router.replace('/account?next=organizer');
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace('/account?next=organizer');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (!active) return;
      if (profile?.role !== 'organizer') {
        router.replace('/organizer/request');
        return;
      }
      setAllowed(true);
      setChecking(false);
    }
    void verify();
    return () => { active = false; };
  }, [isAccessRequest]);

  if (checking || !allowed) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
