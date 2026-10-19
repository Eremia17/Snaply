import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [filter, setFilter] = useState<'Tous' | 'Football' | 'Basket'>('Tous');
  const insets = useSafeAreaInsets();

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
      <ScrollView style={styles.root} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Math.max(insets.top, 8) + 8, gap: 14, paddingBottom: 44 }}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.sportIcon}><Ionicons name="trophy" size={25} color="#fff" /></View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>CENTRE SPORTIF</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualiser les matchs" onPress={load} disabled={refreshing} style={styles.refresh}><Ionicons name="refresh" size={19} color="#fff" /></Pressable>
          </View>
          <Text style={styles.title}>Le sport, au cœur de l’action.</Text>
          <Text style={styles.note}>Calendrier, scores et résultats dans un espace conçu pour suivre tes compétitions.</Text>
          <View style={styles.heroFooter}><Ionicons name="calendar-outline" size={15} color="#F3A6B8" /><Text style={styles.heroFooterText}>HORAIRES LOCAUX · MADAGASCAR</Text></View>
        </View>
        <View style={styles.filterRow}>
          {(['Tous', 'Football', 'Basket'] as const).map((value) => (
            <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value && styles.filterChipOn]}>
              <Ionicons name={value === 'Tous' ? 'apps-outline' : value === 'Football' ? 'football-outline' : 'basketball-outline'} size={15} color={filter === value ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.filterText, filter === value && styles.filterTextOn]}>{value}</Text>
            </Pressable>
          ))}
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
          matches.filter((m) => filter === 'Tous' || (filter === 'Basket' ? /nba|basket/i.test(m.league) : !/nba|basket/i.test(m.league))).map((m, i) => (
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
  hero: { padding: 19, paddingTop: 17, borderRadius: 25, backgroundColor: '#191A24', borderWidth: 1, borderColor: '#30313E', gap: 11, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sportIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#292632' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F3A6B8' },
  liveText: { color: '#F3A6B8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 27, lineHeight: 32, fontWeight: '900', fontFamily: 'sans-serif-black', includeFontPadding: false },
  note: { color: colors.mutedForeground, lineHeight: 19, fontSize: 12 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  heroFooterText: { color: '#F3A6B8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  refresh: { marginLeft: 'auto', backgroundColor: '#38303D', borderRadius: 13, padding: 11 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '800' },
  filterTextOn: { color: '#fff' },
  state: { alignItems: 'center', gap: 12, marginTop: 30 },
  stateCard: { alignItems: 'center', gap: 12, padding: 22, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  stateTitle: { color: colors.foreground, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  retryText: { color: '#fff', fontWeight: '900' },
  card: { backgroundColor: colors.card, borderRadius: 21, padding: 15, borderWidth: 1, borderColor: colors.border, gap: 15 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  league: { color: colors.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  status: { color: colors.mutedForeground, fontSize: 10, fontWeight: '800' },
  statusSoon: { color: colors.gold },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  team: { flex: 1, color: colors.foreground, fontWeight: '800', fontSize: 13, textAlign: 'center', lineHeight: 17 },
  score: { color: colors.foreground, fontWeight: '900', fontSize: 18, minWidth: 55, textAlign: 'center', fontFamily: 'sans-serif-black' },
  when: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
});
