import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { fetchEventById, type EventItem } from '../../src/data/events';
import { colors } from '../../src/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchEventById(id).then(item => {
      if (active) setEvent(item);
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.link}>‹  Retour</Text></Pressable>
        <View style={[styles.poster, { backgroundColor: event.accent }]}><Text style={styles.symbol}>{event.symbol}</Text><Text style={styles.tag}>{event.category.toUpperCase()}</Text></View>
        <Text style={styles.kicker}>TICKET MADA · MADAGASCAR</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>⌖  {event.city} · {event.venue}</Text>
        <View style={styles.infoCard}><Text style={styles.label}>DATE</Text><Text style={styles.value}>{event.dateLabel}</Text><Text style={styles.label}>TARIF INDICATIF</Text><Text style={styles.price}>{event.priceLabel}</Text></View>
        <View style={styles.infoCard}><Text style={styles.label}>À PROPOS</Text><Text style={styles.body}>{event.description || 'Informations complémentaires à venir.'}</Text></View>
        {event.isDemo ? (
          <View style={styles.disabled}><Text style={styles.disabledTitle}>Événement de démonstration</Text><Text style={styles.body}>Cette fiche sert à présenter l'expérience Ticket Mada. Elle ne correspond pas à une vraie manifestation et ne permet pas de réserver.</Text></View>
        ) : (
          <View style={styles.disabled}><Text style={styles.disabledTitle}>Billetterie bientôt disponible</Text><Text style={styles.body}>Cet événement est publié dans le catalogue. La réservation et le paiement seront activés après mise en place des contrôles de stock et des intégrations de paiement.</Text></View>
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
  poster: { height: 210, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: '#fff', fontSize: 76 },
  tag: { position: 'absolute', bottom: 17, color: '#fff', fontSize: 11, letterSpacing: 2, fontWeight: '900' },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 25 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 9 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 9 },
  infoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18, gap: 8 },
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginTop: 5 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
  price: { color: colors.success, fontSize: 17, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  disabled: { backgroundColor: colors.primarySoft, borderColor: '#5A303D', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18, gap: 8 },
  disabledTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }
});
