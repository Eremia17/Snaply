import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { demoEvents } from '../src/data/events';
import type { EventItem } from '../src/data/events';
import { colors } from '../src/theme';

type Language = 'fr' | 'mg';
const copy = {
  fr: { location: 'MADAGASCAR', title: 'Tes sorties,\ntout simplement.', subtitle: 'Découvre les événements près de chez toi.', search: 'Rechercher un événement ou une ville', featured: 'À découvrir', all: 'Tout voir', categories: ['Tout', 'Musique', 'Culture', 'Conférence'], empty: 'Aucun événement dans cette catégorie.' },
  mg: { location: 'MADAGASIKARA', title: 'Ny hetsika,\nakaiky anao.', subtitle: 'Fantaro ireo hetsika manodidina anao.', search: 'Mitadiava hetsika na tanàna', featured: 'Hojerena', all: 'Jereo daholo', categories: ['Rehetra', 'Mozika', 'Kolontsaina', 'Fihaonambe'], empty: 'Tsy mbola misy hetsika eto.' }
};

function EventCard({ item }: { item: EventItem }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${item.title}`} style={styles.eventCard} onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}>
      <View style={[styles.eventArtwork, { backgroundColor: item.accent }]}>
        <Text style={styles.artworkSymbol}>{item.symbol}</Text>
        <Text style={styles.artworkTag}>{item.category.toUpperCase()}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventMeta}>⌖  {item.city} · {item.venue}</Text>
        <View style={styles.eventBottom}>
          <Text style={styles.eventDate}>{item.dateLabel}</Text>
          <Text style={styles.eventPrice}>{item.priceLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [language, setLanguage] = useState<Language>('fr');
  const [category, setCategory] = useState('Tout');
  const [query, setQuery] = useState('');
  const t = copy[language];
  const filtered = useMemo(() => demoEvents.filter((event) => {
    const matchesQuery = `${event.title} ${event.city} ${event.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'Tout' || event.category === category;
    return matchesQuery && matchesCategory;
  }), [category, query]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View>
            <Text style={styles.brand}>TICKET <Text style={styles.brandAccent}>MADA</Text></Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => router.replace('/account?next=organizer')} style={styles.organizerLink}><Text style={styles.organizerLinkText}>Organisateur</Text></Pressable>
            <Pressable onPress={() => router.push('/profile')} style={styles.organizerLink}><Text style={styles.organizerLinkText}>Compte</Text></Pressable>
            <View style={styles.languageSwitch}>
              <Pressable onPress={() => setLanguage('fr')} style={[styles.languageButton, language === 'fr' && styles.languageActive]}><Text style={[styles.languageText, language === 'fr' && styles.languageTextActive]}>FR</Text></Pressable>
              <Pressable onPress={() => setLanguage('mg')} style={[styles.languageButton, language === 'mg' && styles.languageActive]}><Text style={[styles.languageText, language === 'mg' && styles.languageTextActive]}>MG</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t.location}  ·  01</Text>
          <Text style={styles.heroTitle}>{t.title}</Text>
          <Text style={styles.heroSubtitle}>{t.subtitle}</Text>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder={t.search} placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionEyebrow}>TICKET MADA</Text><Text style={styles.sectionTitle}>{t.featured}</Text></View>
          <Text style={styles.allLink}>{t.all}  ↗</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {t.categories.map((label, index) => {
            const key = index === 0 ? 'Tout' : language === 'fr' ? label : ['Tout', 'Musique', 'Culture', 'Conférence'][index];
            return <Pressable key={label} onPress={() => setCategory(key)} style={[styles.categoryChip, category === key && styles.categoryChipActive]}><Text style={[styles.categoryText, category === key && styles.categoryTextActive]}>{label}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.eventList}>
          {filtered.length ? filtered.map((event) => <EventCard key={event.id} item={event} />) : <Text style={styles.empty}>{t.empty}</Text>}
        </View>
        <View style={styles.notice}><Text style={styles.noticeTitle}>Bientôt sur Ticket Mada</Text><Text style={styles.noticeText}>Ces événements sont des exemples. Les réservations, paiements et billets QR seront activés après intégration et tests.</Text></View>
        <Text style={styles.footer}>FAIT AVEC ♥ À MADAGASCAR</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  organizerLink: { paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surface },
  organizerLinkText: { color: colors.text, fontSize: 10, fontWeight: '700' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.white, fontWeight: '900', fontSize: 20 },
  brand: { color: colors.text, fontWeight: '900', letterSpacing: 1.4, fontSize: 14 },
  brandAccent: { color: colors.primary },
  languageSwitch: { flexDirection: 'row', backgroundColor: colors.surface, padding: 3, borderRadius: 10 },
  languageButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  languageActive: { backgroundColor: colors.surfaceRaised },
  languageText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  languageTextActive: { color: colors.text },
  hero: { paddingTop: 42, paddingBottom: 26 },
  eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 2.2, fontWeight: '900' },
  heroTitle: { color: colors.text, fontSize: 36, lineHeight: 42, fontWeight: '900', marginTop: 12, letterSpacing: -1 },
  heroSubtitle: { color: colors.muted, fontSize: 14, marginTop: 10, lineHeight: 21 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, marginTop: 23, height: 52 },
  searchIcon: { color: colors.muted, fontSize: 25, marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, marginBottom: 17 },
  sectionEyebrow: { color: colors.muted, fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 4 },
  allLink: { color: colors.primary, fontSize: 12, fontWeight: '800', paddingBottom: 4 },
  categories: { gap: 8, paddingBottom: 18 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  categoryTextActive: { color: colors.white },
  eventList: { gap: 13 },
  eventCard: { flexDirection: 'row', padding: 10, backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, gap: 13 },
  eventArtwork: { width: 102, height: 112, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artworkSymbol: { color: '#FFFFFF', fontSize: 42, fontWeight: '300' },
  artworkTag: { position: 'absolute', bottom: 9, color: '#FFFFFF', fontSize: 8, letterSpacing: 1.1, fontWeight: '900' },
  eventInfo: { flex: 1, justifyContent: 'center', gap: 7 },
  eventTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  eventMeta: { color: colors.muted, fontSize: 10 },
  eventBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  eventDate: { color: colors.muted, fontSize: 10 },
  eventPrice: { color: colors.success, fontSize: 10, fontWeight: '800' },
  empty: { color: colors.muted, textAlign: 'center', padding: 28 },
  notice: { marginTop: 25, padding: 16, borderRadius: 15, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#5A303D' },
  noticeTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  noticeText: { color: '#D7BFC5', fontSize: 11, lineHeight: 17, marginTop: 6 },
  footer: { color: colors.muted, fontSize: 9, textAlign: 'center', letterSpacing: 2, marginTop: 28 }
});
