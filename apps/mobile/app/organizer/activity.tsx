import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchOrganizerActivity, type OrganizerActivity } from '../../src/data/organizer-activity';
import { formatAriary } from '../../src/utils/currency';
import { colors } from '../../src/theme';

const initial: OrganizerActivity = {
  events_total: 0,
  events_published: 0,
  tickets_issued: 0,
  tickets_checked_in: 0,
  gross_revenue_mga: 0,
  recent_scans: [],
};

function Metric({ value, label, hint }: { value: string; label: string; hint: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricHint}>{hint}</Text></View>;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Indian/Antananarivo',
  });
}

export default function OrganizerActivityScreen() {
  const [activity, setActivity] = useState<OrganizerActivity>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setActivity(await fetchOrganizerActivity(30));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(true); }, [load]));

  const rate = activity.tickets_issued > 0
    ? Math.round((activity.tickets_checked_in / activity.tickets_issued) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>ESPACE ORGANISATEUR</Text><Text style={styles.title}>Activité & rapports</Text></View>
          <Pressable onPress={() => load(true)} style={styles.refresh}><Text style={styles.refreshText}>{refreshing ? '…' : 'Actualiser'}</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>VUE GLOBALE</Text>
          <Text style={styles.heroTitle}>L’activité de tes événements.</Text>
          <Text style={styles.heroBody}>Les chiffres sont calculés depuis les commandes payées et les contrôles enregistrés sur le serveur.</Text>
        </View>

        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Chargement des statistiques…</Text></View> : error ? <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Données indisponibles</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable>
        </View> : <>
          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Indicateurs clés</Text><Text style={styles.sectionMeta}>DONNÉES SERVEUR</Text></View>
          <View style={styles.metrics}>
            <Metric value={String(activity.events_total)} label="Événements" hint={activity.events_published + ' publiés'} />
            <Metric value={String(activity.tickets_issued)} label="Billets émis" hint="Commandes payées" />
            <Metric value={String(activity.tickets_checked_in)} label="Entrées validées" hint={rate + ' % des billets émis'} />
            <Metric value={formatAriary(activity.gross_revenue_mga)} label="Montant encaissé" hint="Montant brut confirmé · MGA" />
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTop}><Text style={styles.progressTitle}>Taux de fréquentation</Text><Text style={styles.progressValue}>{rate}%</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: rate + '%' }]} /></View>
            <Text style={styles.progressHint}>{activity.tickets_checked_in} entrée(s) contrôlée(s) sur {activity.tickets_issued} billet(s) émis.</Text>
          </View>

          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Dernières entrées</Text><Text style={styles.sectionMeta}>{activity.recent_scans.length} / 30</Text></View>
          {activity.recent_scans.length ? activity.recent_scans.map(scan => <View key={scan.ticket_id} style={styles.scanRow}>
            <View style={styles.scanIcon}><Text style={styles.scanIconText}>✓</Text></View>
            <View style={styles.scanCopy}><Text style={styles.scanEvent} numberOfLines={1}>{scan.event_title}</Text><Text style={styles.scanType}>{scan.ticket_type_name} · #{scan.ticket_id.slice(0, 8).toUpperCase()}</Text><Text style={styles.scanDate}>{formatDate(scan.checked_in_at)}</Text></View>
            <View style={styles.validPill}><Text style={styles.validText}>VALIDÉ</Text></View>
          </View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Aucune entrée pour le moment</Text><Text style={styles.muted}>Les contrôles réussis apparaîtront ici automatiquement.</Text></View>}
        </>}

        <Pressable onPress={() => router.push('/organizer/scanner')} style={styles.scannerButton}><Text style={styles.scannerButtonText}>⌁  Ouvrir le scanner</Text></Pressable>
        <Text style={styles.footer}>TICKET MADA · RAPPORTS ORGANISATEUR</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  refresh: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  refreshText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  hero: { padding: 17, borderRadius: 15, backgroundColor: '#25202B', borderWidth: 1, borderColor: '#493342' },
  heroEyebrow: { color: '#DCA1AE', fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 9 },
  heroBody: { color: '#C0B5C1', fontSize: 10, lineHeight: 16, marginTop: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metric: { width: '48%', flexGrow: 1, minHeight: 100, padding: 13, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: colors.text, fontSize: 10, fontWeight: '800', marginTop: 7 },
  metricHint: { color: colors.muted, fontSize: 8, marginTop: 4 },
  progressCard: { padding: 15, marginTop: 12, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  progressValue: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  track: { height: 8, borderRadius: 5, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: 12 },
  fill: { height: 8, borderRadius: 5, backgroundColor: colors.primary },
  progressHint: { color: colors.muted, fontSize: 9, marginTop: 9 },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  scanIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#245541', alignItems: 'center', justifyContent: 'center' },
  scanIconText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  scanCopy: { flex: 1, gap: 3 },
  scanEvent: { color: colors.text, fontSize: 10, fontWeight: '900' },
  scanType: { color: colors.muted, fontSize: 8 },
  scanDate: { color: colors.muted, fontSize: 8 },
  validPill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5, backgroundColor: '#245541' },
  validText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 22, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  loading: { padding: 35, alignItems: 'center', gap: 10 },
  errorBox: { padding: 20, alignItems: 'center', borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  errorTitle: { color: colors.text, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  retry: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.primary },
  retryText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  scannerButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 11, padding: 14, marginTop: 22 },
  scannerButtonText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  footer: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, textAlign: 'center', marginTop: 23 },
});
