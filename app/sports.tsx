import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { fetchSports, type SportMatch } from '@/lib/catalog';
import { colors } from '@/lib/theme';

// L'heure de TheSportsDB est en UTC : on l'affiche dans l'heure du téléphone
function when(date: string, time: string) {
  const d = new Date(`${date}T${time || '00:00:00'}Z`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SportsScreen() {
  const [matches, setMatches] = useState<SportMatch[] | null>(null);

  useEffect(() => {
    fetchSports().then(setMatches);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Sports en direct', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.note}>Derniers résultats et prochains matchs. Les scores en direct dépendent de la source de données.</Text>

        {matches === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : matches.length === 0 ? (
          <Text style={styles.note}>Aucun match disponible pour le moment.</Text>
        ) : (
          matches.map((m, i) => (
            <View key={`${m.league}${i}`} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.league}>{m.league.toUpperCase()}</Text>
                <Text style={[styles.status, m.status === 'À venir' && styles.statusSoon]}>{m.status}</Text>
              </View>
              <View style={styles.teams}>
                <Text style={styles.team} numberOfLines={1}>{m.home}</Text>
                <Text style={styles.score}>
                  {m.homeScore != null && m.awayScore != null ? `${m.homeScore} - ${m.awayScore}` : '-'}
                </Text>
                <Text style={[styles.team, { textAlign: 'right' }]} numberOfLines={1}>{m.away}</Text>
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
  note: { color: colors.mutedForeground, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  league: { color: colors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  status: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  statusSoon: { color: colors.gold },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  team: { flex: 1, color: colors.foreground, fontWeight: '700', fontSize: 15 },
  score: { color: colors.foreground, fontWeight: '900', fontSize: 18 },
  when: { color: colors.mutedForeground, fontSize: 12 },
});