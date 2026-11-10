import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { formatAriary } from '../../src/utils/currency';
import { fetchOrganizerOrders, organizerOrderStatusLabel, type OrganizerOrder } from '../../src/data/organizerOrders';

function dateLabel(value: string | null): string {
  if (!value) return 'Date non précisée';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Indian/Antananarivo',
  });
}

export default function OrganizerOrdersScreen() {
  const [orders, setOrders] = useState<OrganizerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchOrganizerOrders());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const totals = useMemo(() => ({
    pending: orders.filter(order => order.status === 'pending').length,
    paid: orders.filter(order => order.status === 'paid').length,
    seats: orders.reduce((sum, order) => sum + order.quantity, 0),
  }), [orders]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>ESPACE ORGANISATEUR</Text><Text style={styles.title}>Réservations</Text></View>
          <Pressable onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>Actualiser</Text></Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>SUIVI DES COMMANDES</Text>
          <Text style={styles.heroTitle}>Qui a réservé ?</Text>
          <Text style={styles.heroBody}>Les commandes affichées concernent uniquement tes événements. Les coordonnées privées des spectateurs ne sont pas exposées ici.</Text>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Chargement des réservations…</Text></View> :
          error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Données indisponibles</Text><Text style={styles.muted}>{error}</Text><Pressable onPress={refresh} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable></View> :
          <>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.metricValue}>{orders.length}</Text><Text style={styles.metricLabel}>Commandes</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.pending}</Text><Text style={styles.metricLabel}>En attente</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.paid}</Text><Text style={styles.metricLabel}>Payées</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{totals.seats}</Text><Text style={styles.metricLabel}>Places réservées</Text></View>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Dernières commandes</Text><Text style={styles.sectionMeta}>200 MAX.</Text></View>
            {orders.length ? orders.map(order => (
              <View key={order.orderId} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.orderRef}>#{order.orderId.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.status, order.status === 'paid' && styles.statusPaid, order.status === 'cancelled' && styles.statusCancelled, order.status === 'refunded' && styles.statusCancelled]}>
                    <Text style={styles.statusText}>{organizerOrderStatusLabel(order.status)}</Text>
                  </View>
                </View>
                <Text style={styles.eventTitle}>{order.eventTitle}</Text>
                <Text style={styles.eventMeta}>{order.eventCity} · {dateLabel(order.eventStartsAt)}</Text>
                <View style={styles.buyerRow}><Text style={styles.label}>SPECTATEUR</Text><Text style={styles.buyerName}>{order.buyerName}</Text></View>
                <Text style={styles.ticketSummary}>{order.ticketSummary} · {order.quantity} place(s)</Text>
                <View style={styles.line}><Text style={styles.lineLabel}>Montant prévu</Text><Text style={styles.amount}>{formatAriary(order.subtotalMGA)}</Text></View>
                <Text style={styles.created}>Réservée le {dateLabel(order.createdAt)}</Text>
                {order.status === 'pending' && order.expiresAt ? <Text style={styles.expiry}>Expiration actuelle : {dateLabel(order.expiresAt)}</Text> : null}
              </View>
            )) : <View style={styles.empty}><Text style={styles.emptyTitle}>Aucune réservation pour le moment</Text><Text style={styles.muted}>Les commandes des spectateurs apparaîtront ici après leur réservation.</Text></View>}
          </>}
        <Text style={styles.footer}>TICKET MADA · SUIVI DES RÉSERVATIONS</Text>
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
  metric: { width: '48%', flexGrow: 1, padding: 13, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 82 },
  metricValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', marginTop: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  card: { padding: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 9 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderRef: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  status: { backgroundColor: '#4A402B', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  statusPaid: { backgroundColor: '#245541' },
  statusCancelled: { backgroundColor: '#49303A' },
  statusText: { color: colors.text, fontSize: 8, fontWeight: '900' },
  eventTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 12 },
  eventMeta: { color: colors.muted, fontSize: 9, marginTop: 4 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11, marginTop: 12 },
  label: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  buyerName: { color: colors.text, fontSize: 10, fontWeight: '800', flex: 1, textAlign: 'right' },
  ticketSummary: { color: colors.muted, fontSize: 9, marginTop: 9 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11, marginTop: 11 },
  lineLabel: { color: colors.text, fontSize: 10, fontWeight: '700' },
  amount: { color: colors.success, fontSize: 12, fontWeight: '900' },
  created: { color: colors.muted, fontSize: 8, marginTop: 9 },
  expiry: { color: '#E7B77C', fontSize: 8, marginTop: 5 },
  center: { padding: 35, alignItems: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  empty: { padding: 19, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8, marginBottom: 10 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  retry: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.primary, marginTop: 5 },
  retryText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  footer: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, textAlign: 'center', marginTop: 26 },
});
