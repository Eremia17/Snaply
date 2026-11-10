import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, Share, StyleSheet, Text, Pressable, View } from 'react-native';
import { fetchEventById, type EventItem } from '../../src/data/events';
import { colors } from '../../src/theme';
import { formatAriary } from '../../src/utils/currency';
import { createReservationKey, reserveEventTickets } from '../../src/data/reservations';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);
  const reservationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchEventById(id).then(item => {
      if (active) {
        setEvent(item);
        setSelectedTierId(item?.ticketTiers?.find(tier => tier.available > 0)?.id ?? '');
        setQuantity(1);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;
  }
  if (!event) {
    return <SafeAreaView style={styles.safe}><View style={styles.notFound}><Text style={styles.title}>Événement introuvable</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Retour</Text></Pressable></View></SafeAreaView>;
  }

  const selectedTier = event.ticketTiers?.find(tier => tier.id === selectedTierId);

  async function handleShare() {
    const message = [
      '🎟️ ' + event.title,
      event.category + ' · ' + event.city,
      event.venue,
      event.dateLabel,
      'Tarifs : ' + event.priceLabel,
      '',
      event.description,
      '',
      'Annonce partagée avec Ticket Mada.',
    ].filter(Boolean).join('\\n');
    try {
      await Share.share({ title: event.title, message });
    } catch {
      Alert.alert('Partage indisponible', 'Impossible de partager cette annonce pour le moment.');
    }
  }

  async function handleReservation() {
    if (!selectedTier || selectedTier.available < 1 || reserving) return;
    setReserving(true);
    try {
      const reservationKey = reservationKeyRef.current ?? createReservationKey();
      reservationKeyRef.current = reservationKey;
      const reservation = await reserveEventTickets(selectedTier.id, quantity, reservationKey);
      reservationKeyRef.current = null;
      try {
        const refreshedEvent = await fetchEventById(id);
        if (refreshedEvent) setEvent(refreshedEvent);
      } catch {
        // The reservation is already confirmed; a refresh failure must not report it as failed.
      }
      const expiry = new Date(reservation.expiresAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Indian/Antananarivo',
      });
      Alert.alert(
        'Pré-réservation créée',
        quantity + ' billet(s) · ' + formatAriary(reservation.subtotalMGA) +
          '\nRéservation valable jusqu’à ' + expiry + ' (heure de Madagascar).' +
          '\n\nAucun paiement n’a été effectué et aucun billet n’a encore été émis.',
      );
    } catch (error) {
      Alert.alert('Réservation impossible', error instanceof Error ? error.message : 'Une erreur inattendue est survenue.');
    } finally {
      setReserving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.link}>‹  Retour</Text></Pressable>
        <View style={[styles.poster, { backgroundColor: event.accent }]}>{event.coverUrl ? <Image source={{ uri: event.coverUrl }} style={styles.posterImage} /> : null}{event.coverUrl ? <View style={styles.posterShade} /> : null}<Text style={styles.symbol}>{event.symbol}</Text><Text style={styles.tag}>{event.category.toUpperCase()}</Text></View>
        <Text style={styles.kicker}>TICKET MADA · MADAGASCAR</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>⌖  {event.city} · {event.venue}</Text>
        <Pressable onPress={handleShare} style={styles.shareButton}><Text style={styles.shareButtonText}>↗  Partager l’annonce</Text></Pressable>
        <View style={styles.infoCard}><Text style={styles.label}>DATE</Text><Text style={styles.value}>{event.dateLabel}</Text><Text style={styles.label}>TARIF INDICATIF</Text><Text style={styles.price}>{event.priceLabel}</Text></View>
        {event.ticketTiers?.length ? <View style={styles.infoCard}><Text style={styles.label}>CATÉGORIES DE BILLETS</Text>{event.ticketTiers.map((tier, index) => <Pressable key={tier.id || tier.name + index} disabled={tier.available < 1 || event.isDemo} onPress={() => { reservationKeyRef.current = null; setSelectedTierId(tier.id); setQuantity(1); }} style={[styles.ticketRow, selectedTierId === tier.id && styles.ticketRowSelected]}><View style={{ flex: 1, gap: 4 }}><Text style={styles.ticketName}>{tier.name}</Text><Text style={styles.ticketAvailability}>{tier.available > 0 ? tier.available + ' place(s) disponible(s)' : 'Complet'}</Text></View><Text style={styles.ticketPrice}>{formatAriary(tier.priceMGA)}</Text>{selectedTierId === tier.id ? <Text style={styles.selectedMark}>✓</Text> : null}</Pressable>)}{!event.isDemo && selectedTier ? <><View style={styles.quantityRow}><Text style={styles.quantityLabel}>Quantité</Text><View style={styles.quantityControls}><Pressable disabled={quantity <= 1} onPress={() => { reservationKeyRef.current = null; setQuantity(value => Math.max(1, value - 1)); }} style={styles.quantityButton}><Text style={styles.quantityButtonText}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable disabled={quantity >= Math.min(10, selectedTier.available)} onPress={() => { reservationKeyRef.current = null; setQuantity(value => Math.min(10, selectedTier.available, value + 1)); }} style={styles.quantityButton}><Text style={styles.quantityButtonText}>＋</Text></Pressable></View></View><Text style={styles.reservationTotal}>Total provisoire · {formatAriary(selectedTier.priceMGA * quantity)}</Text><Pressable disabled={reserving || selectedTier.available < 1} onPress={handleReservation} style={[styles.reserveButton, (reserving || selectedTier.available < 1) && styles.reserveButtonDisabled]}><Text style={styles.reserveButtonText}>{reserving ? 'Réservation…' : 'Pré-réserver pendant 15 min'}</Text></Pressable><Text style={styles.reservationHint}>Le stock est bloqué temporairement. Aucun paiement ni billet n’est émis à cette étape.</Text></> : null}</View> : null}
        <View style={styles.infoCard}><Text style={styles.label}>À PROPOS</Text><Text style={styles.body}>{event.description || 'Informations complémentaires à venir.'}</Text></View>
        {event.isDemo ? (
          <View style={styles.disabled}><Text style={styles.disabledTitle}>Événement de démonstration</Text><Text style={styles.body}>Cette fiche sert à présenter l'expérience Ticket Mada. Elle ne correspond pas à une vraie manifestation et ne permet pas de réserver.</Text></View>
        ) : (
          <View style={styles.disabled}><Text style={styles.disabledTitle}>Pré-réservation disponible</Text><Text style={styles.body}>Tu peux bloquer temporairement des places pendant 15 minutes. Le paiement n’est pas encore disponible et aucun billet définitif n’est émis.</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  notFound: { flex: 1, justifyContent: 'center', padding: 22 },
  back: { paddingVertical: 12, marginBottom: 12 },
  link: { color: colors.primary, fontWeight: '800' },
  poster: { height: 210, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  posterImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', resizeMode: 'cover' },
  posterShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  symbol: { color: '#fff', fontSize: 76 },
  tag: { position: 'absolute', bottom: 17, color: '#fff', fontSize: 11, letterSpacing: 2, fontWeight: '900' },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 25 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 9 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 9 },
  shareButton: { alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  shareButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  infoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18, gap: 8 },
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 5 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
  price: { color: colors.success, fontSize: 17, fontWeight: '900' },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: 9 },
  ticketRowSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  ticketName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  ticketAvailability: { color: colors.muted, fontSize: 10 },
  ticketPrice: { color: colors.success, fontSize: 13, fontWeight: '900' },
  selectedMark: { color: colors.primary, fontWeight: '900' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15 },
  quantityLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  quantityButton: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  quantityButtonText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  quantityValue: { color: colors.text, minWidth: 16, textAlign: 'center', fontWeight: '900' },
  reservationTotal: { color: colors.success, fontSize: 13, fontWeight: '900', marginTop: 14 },
  reserveButton: { backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  reserveButtonDisabled: { opacity: 0.5 },
  reserveButtonText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  reservationHint: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 8 },
  body: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  disabled: { backgroundColor: colors.primarySoft, borderColor: '#5A303D', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18, gap: 8 },
  disabledTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }
});
