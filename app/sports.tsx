import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchSports, type SportMatch } from '@/lib/catalog';
import { colors } from '@/lib/theme';

// TheSportsDB fournit les horaires en UTC ; on les convertit dans le fuseau du téléphone.
function when(date: string, time: string) {
  const d = new Date(`${date}T${time || '00:00:00'}Z`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SportsScreen() {
  const [matches, setMatches] = useState<SportMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchSports();
      const now = Date.now();
      result.sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time || '00:00:00'}Z`).getTime();
        const bTime = new Date(`${b.date}T${b.time || '00:00:00'}Z`).getTime();
        const aUpcoming = a.status === 'À venir' || aTime >= now;
        const bUpcoming = b.status === 'À venir' || bTime >= now;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? aTime - bTime : bTime - aTime;
      });
      setMatches(result);
    } catch (e) {
      setMatches([]);
      setError(e instanceof Error ? e.message : 'Le service sportif est momentanément indisponible.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Sports', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <View style={styles.intro}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.title}>Sports</Text>
            <Text style={styles.note}>Prochains matchs et derniers résultats. Les scores en direct ne sont pas garantis par cette source.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Actualiser les matchs" onPress={load} disabled={refreshing} style={styles.refresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </Pressable>
        </View>

        {matches === null || refreshing ? (
          <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.note}>Chargement des matchs…</Text></View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            <Text style={styles.stateTitle}>Les matchs ne sont pas disponibles</Text>
            <Text style={styles.note}>{error}</Text>
            <Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>Réessayer</Text></Pressable>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
            <Text style={styles.stateTitle}>Aucun match reçu</Text>
            <Text style={styles.note}>La source sportive n’a renvoyé aucun événement. Réessaie plus tard.</Text>
            <Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>Actualiser</Text></Pressable>
          </View>
        ) : (
          matches.map((m, i) => (
            <View key={`${m.league}:${m.date}:${m.home}:${i}`} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.league}>{m.league.toUpperCase()}</Text>
                <Text style={[styles.status, m.status === 'À venir' && styles.statusSoon]}>{m.status}</Text>
              </View>
              <View style={styles.teams}>
                <Text style={styles.team} numberOfLines={2}>{m.home}</Text>
                <Text style={styles.score}>{m.homeScore != null && m.awayScore != null ? `${m.homeScore} - ${m.awayScore}` : 'VS'}</Text>
                <Text style={[styles.team, { textAlign: 'right' }]} numberOfLines={2}>{m.away}</Text>
              </View>
              <Text style={styles.when}>{when(m.date, m.time)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '900' },
  note: { color: colors.mutedForeground, lineHeight: 20 },
  refresh: { backgroundColor: colors.primary, borderRadius: 999, padding: 12 },
  state: { alignItems: 'center', gap: 12, marginTop: 30 },
  stateCard: { alignItems: 'center', gap: 12, padding: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  stateTitle: { color: colors.foreground, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  retryText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  league: { color: colors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  status: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  statusSoon: { color: colors.gold },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  team: { flex: 1, color: colors.foreground, fontWeight: '700', fontSize: 15 },
  score: { color: colors.foreground, fontWeight: '900', fontSize: 17, minWidth: 44, textAlign: 'center' },
  when: { color: colors.mutedForeground, fontSize: 12 },
});