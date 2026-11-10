import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchMyReservations, type ReservationHistoryItem } from '../src/data/reservations';
import { formatAriary } from '../src/utils/currency';
import { colors } from '../src/theme';

function getStatus(item: ReservationHistoryItem): string {
  if (item.status === 'pending' && item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) return 'EXPIRÉE';
  if (item.status === 'pending') return 'EN ATTENTE';
  if (item.status === 'paid') return 'PAYÉE';
  if (item.status === 'refunded') return 'REMBOURSÉE';
  return 'ANNULÉE';
}

export default function MyReservationsScreen() {
  const [items, setItems] = useState<ReservationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchMyReservations());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les réservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ESPACE SPECTATEUR</Text>
            <Text style={styles.title}>Mes réservations</Text>
          </View>
          <Pressable onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>Actualiser</Text></Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Ton historique, en un seul endroit.</Text>
          <Text style={styles.introBody}>Retrouve tes pré-réservations et leur état. Une réservation temporaire ne constitue pas encore un billet.</Text>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Chargement…</Text></View> :
          error ? <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error.toLowerCase().includes('connecte-toi') ? 'Connexion nécessaire' : 'Chargement impossible'}</Text>
            <Text style={styles.muted}>{error}</Text>
            {error.toLowerCase().includes('connecte-toi') ? (
              <Pressable onPress={() => router.push('/account?next=spectator')} style={styles.primary}><Text style={styles.primaryText}>Se connecter</Text></Pressable>
            ) : (
              <Pressable onPress={refresh} style={styles.primary}><Text style={styles.primaryText}>Réessayer</Text></Pressable>
            )}
          </View> :
          items.length ? items.map(item => {
            const status = getStatus(item);
            const expiry = item.expiresAt ? new Date(item.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Antananarivo' }) : '';
            const eventDate = item.eventStartsAt ? new Date(item.eventStartsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Indian/Antananarivo' }) : 'Date à confirmer';
            return <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderRef}>COMMANDE · {item.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.status, status === 'PAYÉE' && styles.statusPaid, status === 'EXPIRÉE' && styles.statusExpired]}><Text style={styles.statusText}>{status}</Text></View>
              </View>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>{item.eventCity}{item.eventCity ? ' · ' : ''}{eventDate}</Text>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{item.quantity} × {item.ticketName}</Text>
                <Text style={styles.amount}>{formatAriary(item.subtotalMGA)}</Text>
              </View>
              {item.status === 'pending' && status !== 'EXPIRÉE' ? <Text style={styles.expiry}>À finaliser avant {expiry} (heure de Madagascar)</Text> : null}
              {status === 'EXPIRÉE' ? <Text style={styles.expiry}>Cette pré-réservation a dépassé sa limite de 15 minutes.</Text> : null}
              <Text style={styles.disclaimer}>Aucun billet ni QR code n’est émis par une pré-réservation.</Text>
            </View>;
          }) : <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune réservation pour le moment</Text>
            <Text style={styles.muted}>Quand tu pré-réserveras des places, elles apparaîtront ici.</Text>
            <Pressable onPress={() => router.replace('/spectator')} style={styles.primary}><Text style={styles.primaryText}>Découvrir les événements</Text></Pressable>
          </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 19, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  refresh: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  refreshText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  intro: { padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  introTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  introBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  center: { padding: 30, alignItems: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  card: { padding: 15, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 11 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderRef: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  status: { backgroundColor: '#4A402B', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  statusPaid: { backgroundColor: '#245541' },
  statusExpired: { backgroundColor: '#49303A' },
  statusText: { color: colors.text, fontSize: 8, fontWeight: '900' },
  eventTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 13 },
  eventMeta: { color: colors.muted, fontSize: 10, marginTop: 5 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 13 },
  lineLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  amount: { color: colors.success, fontSize: 13, fontWeight: '900' },
  expiry: { color: '#E7B77C', fontSize: 9, marginTop: 10 },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 9 },
  empty: { padding: 22, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  primary: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, backgroundColor: colors.primary, marginTop: 5 },
  primaryText: { color: colors.white, fontSize: 10, fontWeight: '900' },
});
