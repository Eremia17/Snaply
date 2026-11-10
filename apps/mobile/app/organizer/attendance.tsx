import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { fetchOrganizerAttendanceStats, fetchOrganizerCheckInHistory, type AttendanceStat, type CheckInHistoryItem } from '../../src/data/organizerAttendance';

function formatDate(value: string | null): string {
  if (!value) return 'Aucune entrée';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Indian/Antananarivo',
  });
}

export default function OrganizerAttendanceScreen() {
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [history, setHistory] = useState<CheckInHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextStats, nextHistory] = await Promise.all([
        fetchOrganizerAttendanceStats(),
        fetchOrganizerCheckInHistory(),
      ]);
      setStats(nextStats);
      setHistory(nextHistory);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const totals = useMemo(() => stats.reduce((acc, item) => ({
    events: acc.events + 1,
    issued: acc.issued + item.ticketsIssued,
    checked: acc.checked + item.ticketsCheckedIn,
    remaining: acc.remaining + item.ticketsValid,
  }), { events: 0, issued: 0, checked: 0, remaining: 0 }), [stats]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>ESPACE ORGANISATEUR</Text><Text style={styles.title}>Présence & entrées</Text></View>
          <Pressable onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>Actualiser</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>VUE GLOBALE</Text>
          <Text style={styles.heroTitle}>Le suivi de tes événements.</Text>
          <Text style={styles.heroBody}>Les chiffres proviennent des billets payés et des contrôles enregistrés par le serveur.</Text>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Chargement des données…</Text></View> :
          error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Données indisponibles</Text><Text style={styles.muted}>{error}</Text><Text style={styles.note}>Vérifie que la migration de reporting est appliquée dans Supabase.</Text></View> :
          <>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.events}</Text><Text style={styles.metricLabel}>Événements</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.issued}</Text><Text style={styles.metricLabel}>Billets émis</Text></View>
              <View style={styles.metric}><Text style={[styles.metricValue, styles.green]}>{totals.checked}</Text><Text style={styles.metricLabel}>Entrées validées</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.remaining}</Text><Text style={styles.metricLabel}>Billets encore valides</Text></View>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Par événement</Text><Text style={styles.sectionMeta}>{stats.length} TOTAL</Text></View>
            {stats.length ? stats.map(item => {
              const ratio = item.ticketsIssued > 0 ? Math.min(1, item.ticketsCheckedIn / item.ticketsIssued) : 0;
              return <View key={item.eventId} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                <Text style={styles.eventMeta}>{item.eventCity} · {formatDate(item.eventStartsAt)}</Text>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${ratio * 100}%` as `${number}%` }]} /></View>
                <View style={styles.eventNumbers}>
                  <Text style={styles.eventNumber}><Text style={styles.green}>{item.ticketsCheckedIn}</Text> entrées</Text>
                  <Text style={styles.eventNumber}>{item.ticketsIssued} billets émis</Text>
                </View>
                <Text style={styles.lastEntry}>Dernière entrée : {formatDate(item.lastCheckInAt)}</Text>
              </View>;
            }) : <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun événement dans les statistiques</Text><Text style={styles.muted}>Les événements et billets apparaîtront ici après leur synchronisation et les ventes confirmées.</Text></View>}

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Dernières entrées</Text><Text style={styles.sectionMeta}>100 MAX.</Text></View>
            {history.length ? history.map(item => <View key={item.ticketId} style={styles.historyRow}>
              <View style={styles.checkIcon}><Text style={styles.checkIconText}>✓</Text></View>
              <View style={styles.historyCopy}><Text style={styles.historyEvent} numberOfLines={1}>{item.eventTitle}</Text><Text style={styles.historyMeta}>{item.ticketTypeName} · #{item.ticketId.slice(0, 8).toUpperCase()}</Text></View>
              <Text style={styles.historyTime}>{formatDate(item.checkedInAt)}</Text>
            </View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Aucune entrée contrôlée</Text><Text style={styles.muted}>Les prochains billets validés par le scanner apparaîtront ici.</Text></View>}
          </>}
        <Text style={styles.footer}>TICKET MADA · CONTRÔLE & FRÉQUENTATION</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  refresh: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  refreshText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  hero: { padding: 17, borderRadius: 15, backgroundColor: '#25202B', borderWidth: 1, borderColor: '#493342', marginBottom: 16 },
  heroEyebrow: { color: '#DCA1AE', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 9 },
  heroBody: { color: '#C0B5C1', fontSize: 10, lineHeight: 16, marginTop: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metric: { width: '48%', flexGrow: 1, padding: 13, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 86 },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', marginTop: 6 },
  green: { color: '#70D9A0' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  eventCard: { padding: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 9 },
  eventTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  eventMeta: { color: colors.muted, fontSize: 9, marginTop: 4 },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: 7, borderRadius: 5, backgroundColor: '#42C78A' },
  eventNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  eventNumber: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  lastEntry: { color: colors.muted, fontSize: 8, marginTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 7 },
  checkIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#245541', alignItems: 'center', justifyContent: 'center' },
  checkIconText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  historyCopy: { flex: 1, gap: 4 },
  historyEvent: { color: colors.text, fontSize: 10, fontWeight: '800' },
  historyMeta: { color: colors.muted, fontSize: 8 },
  historyTime: { color: colors.muted, fontSize: 8, maxWidth: 94, textAlign: 'right' },
  center: { padding: 35, alignItems: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  empty: { padding: 19, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8, marginBottom: 10 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  note: { color: '#E6B96A', fontSize: 9, textAlign: 'center', lineHeight: 14 },
  footer: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, textAlign: 'center', marginTop: 26 },
});
