import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { demoEvents } from '../../src/data/events';
import { colors } from '../../src/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useMemo(() => demoEvents.find((item) => item.id === id), [id]);
  if (!event) {
    return <SafeAreaView style={styles.safe}><Text style={styles.title}>Événement introuvable</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Retour</Text></Pressable></SafeAreaView>;
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
        <View style={styles.infoCard}><Text style={styles.label}>À PROPOS</Text><Text style={styles.body}>Cette fiche est une démonstration de l'expérience Ticket Mada. Les informations de cet événement sont fictives et ne permettent pas d'effectuer une réservation.</Text></View>
        <View style={styles.disabled}><Text style={styles.disabledTitle}>Billetterie bientôt disponible</Text><Text style={styles.body}>La réservation et le paiement seront activés lorsque les intégrations et contrôles nécessaires seront terminés.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
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
