import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchMyIssuedTickets, type IssuedTicket } from '../src/data/tickets';
import { colors } from '../src/theme';

function statusLabel(status: string): string {
  if (status === 'valid') return 'VALIDE';
  if (status === 'used') return 'UTILISÉ';
  if (status === 'refunded') return 'REMBOURSÉ';
  if (status === 'cancelled') return 'ANNULÉ';
  return status.toUpperCase();
}

export default function MyTicketsScreen() {
  const [items, setItems] = useState<IssuedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchMyIssuedTickets());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les billets.');
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
            <Text style={styles.title}>Mes billets</Text>
          </View>
          <Pressable onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>Actualiser</Text></Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Tes billets confirmés.</Text>
          <Text style={styles.introBody}>Seuls les billets issus d’une commande payée apparaissent ici. Une pré-réservation en attente reste dans « Mes réservations ».</Text>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Chargement…</Text></View> :
          error ? <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Connexion nécessaire</Text>
            <Text style={styles.muted}>{error}</Text>
            <Pressable onPress={() => router.push('/account?next=spectator')} style={styles.primary}><Text style={styles.primaryText}>Se connecter</Text></Pressable>
          </View> :
          items.length ? items.map(item => {
            const eventDate = item.eventStartsAt
              ? new Date(item.eventStartsAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Antananarivo' })
              : 'Date à confirmer';
            const label = statusLabel(item.status);
            return <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.ticketRef}>BILLET · {item.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.status, item.status === 'valid' && styles.statusValid, item.status === 'used' && styles.statusUsed]}><Text style={styles.statusText}>{label}</Text></View>
              </View>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>{item.eventCity}{item.eventCity ? ' · ' : ''}{eventDate}</Text>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{item.ticketName}</Text>
                <Text style={styles.ticketId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              {item.checkedInAt ? <Text style={styles.usedAt}>Contrôle effectué le {new Date(item.checkedInAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Indian/Antananarivo' })}.</Text> : null}
              <View style={styles.qrNotice}>
                <Text style={styles.qrTitle}>QR sécurisé en préparation</Text>
                <Text style={styles.qrText}>Le serveur conserve uniquement l’empreinte du jeton QR. L’affichage du code sera activé avec sa remise sécurisée au titulaire.</Text>
              </View>
            </View>;
          }) : <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun billet confirmé</Text>
            <Text style={styles.muted}>Tes billets apparaîtront ici après confirmation réelle d’un paiement.</Text>
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
  ticketRef: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  status: { backgroundColor: '#49303A', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  statusValid: { backgroundColor: '#245541' },
  statusUsed: { backgroundColor: '#4A402B' },
  statusText: { color: colors.text, fontSize: 8, fontWeight: '900' },
  eventTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 13 },
  eventMeta: { color: colors.muted, fontSize: 10, marginTop: 5 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 13 },
  lineLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  ticketId: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  usedAt: { color: colors.muted, fontSize: 9, marginTop: 9 },
  qrNotice: { padding: 12, borderRadius: 10, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#5A303D', marginTop: 13 },
  qrTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  qrText: { color: '#D7BFC5', fontSize: 9, lineHeight: 14, marginTop: 5 },
  empty: { padding: 22, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  primary: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, backgroundColor: colors.primary, marginTop: 5 },
  primaryText: { color: colors.white, fontSize: 10, fontWeight: '900' },
});
