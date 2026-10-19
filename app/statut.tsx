import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { fetchExtras } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

type Check = { label: string; ok: boolean | null };

export default function StatutScreen() {
  const [checks, setChecks] = useState<Check[]>([
    { label: 'Base de données', ok: null },
    { label: 'Catalogue (TMDB, AniList)', ok: null },
  ]);

  useEffect(() => {
    supabase.from('site_stats').select('id').eq('id', 1).maybeSingle().then(({ error }) => {
      setChecks((c) => [{ ...c[0], ok: !error }, c[1]]);
    });
    fetchExtras('film', '603').then((d) => {
      const available = !!d && (
        d.cast.length > 0 || d.reviews.length > 0 ||
        d.providers.length > 0 || d.constellation.items.length > 0
      );
      setChecks((c) => [c[0], { ...c[1], ok: available }]);
    }).catch(() => {
      setChecks((c) => [c[0], { ...c[1], ok: false }]);
    });
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'État du système', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {checks.map((c) => (
          <View key={c.label} style={styles.row}>
            <Text style={styles.label}>{c.label}</Text>
            {c.ok === null ? (
              <ActivityIndicator color={colors.mutedForeground} />
            ) : (
              <Text style={[styles.status, { color: c.ok ? '#22C55E' : colors.destructive }]}>{c.ok ? 'Opérationnel' : 'Indisponible'}</Text>
            )}
          </View>
        ))}
        <Text style={styles.note}>Vérification faite depuis votre appareil à l’instant.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  status: { fontWeight: '800' },
  note: { color: colors.mutedForeground, fontSize: 12, marginTop: 8 },
});