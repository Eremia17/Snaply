import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { colors } from '../../src/theme';

type Filter = 'Tous' | 'Brouillons' | 'Publiés' | 'Archivés';
const filters: Filter[] = ['Tous', 'Brouillons', 'Publiés', 'Archivés'];

export default function OrganizerEventsScreen() {
  const [filter, setFilter] = useState<Filter>('Tous');
  const [search, setSearch] = useState('');
  const counts: Record<Filter, number> = { Tous: 0, Brouillons: 0, Publiés: 0, Archivés: 0 };
  const emptyCopy = useMemo(() => {
    if (search.trim()) return { title: 'Aucun résultat', body: 'Aucun événement ne correspond à cette recherche.' };
    if (filter === 'Brouillons') return { title: 'Aucun brouillon', body: 'Les événements que tu enregistres en brouillon apparaîtront ici.' };
    if (filter === 'Publiés') return { title: 'Aucun événement publié', body: 'Tes événements visibles par le public seront regroupés ici.' };
    if (filter === 'Archivés') return { title: 'Aucune archive', body: 'Les événements archivés resteront accessibles depuis cet espace.' };
    return { title: 'Ton espace événementiel est prêt', body: 'Crée ton premier événement pour commencer à organiser ta billetterie. Tu pourras ensuite retrouver ici tes brouillons, publications et archives.' };
  }, [filter, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.kicker}>ESPACE ORGANISATEUR</Text><Text style={styles.topTitle}>Mes événements</Text></View>
          <View style={styles.counter}><Text style={styles.counterValue}>00</Text><Text style={styles.counterLabel}>TOTAL</Text></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>VOTRE PORTFOLIO</Text></View>
          <Text style={styles.heroTitle}>Tout votre programme, au même endroit.</Text>
          <Text style={styles.heroBody}>Suivez chaque événement de sa préparation à son archivage.</Text>
          <Pressable onPress={() => router.push('/organizer/create')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋  Créer un événement</Text></Pressable>
        </View>

        <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un événement..." placeholderTextColor={colors.muted} style={styles.search} /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            <Text style={[styles.filterCount, filter === item && styles.filterCountActive]}>{counts[item]}</Text>
          </Pressable>)}
        </ScrollView>

        <View style={styles.listHeader}><Text style={styles.listTitle}>{filter === 'Tous' ? 'Tous les événements' : filter}</Text><Text style={styles.listMeta}>0 ÉVÉNEMENT</Text></View>
        <View style={styles.emptyCard}>
          <View style={styles.emptyArtwork}>
            <View style={styles.artBack} />
            <View style={styles.artFront}><View style={styles.artLine} /><View style={styles.artLineShort} /><View style={styles.artPill} /></View>
            <View style={styles.artPlus}>＋</View>
          </View>
          <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
          <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
          {!search.trim() && filter !== 'Publiés' && filter !== 'Archivés' ? <Pressable onPress={() => router.push('/organizer/create')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Préparer mon premier événement  →</Text></Pressable> : null}
        </View>

        <View style={styles.note}><Text style={styles.noteTitle}>À propos de cet espace</Text><Text style={styles.noteBody}>La gestion est encore en mode préparation : les événements ne sont pas encore enregistrés sur un serveur. La sauvegarde sécurisée, la modification et la publication seront activées avec la connexion organisateur.</Text></View>
        <Text style={styles.footer}>TICKET MADA  ·  GESTION DES ÉVÉNEMENTS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 38 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 20 },
  back: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  kicker: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.7 },
  topTitle: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 4 },
  counter: { alignItems: 'flex-end', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  counterValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  counterLabel: { color: colors.muted, fontSize: 7, letterSpacing: 1.2, marginTop: 1 },
  hero: { padding: 18, borderRadius: 17, backgroundColor: '#25202B', borderWidth: 1, borderColor: '#493342', marginTop: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D58A9B' },
  heroEyebrow: { color: '#DCA1AE', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: 13, maxWidth: 290 },
  heroBody: { color: '#C0B5C1', fontSize: 10, lineHeight: 16, marginTop: 7, maxWidth: 280 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginTop: 16 },
  primaryButtonText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  searchWrap: { height: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 20 },
  searchIcon: { color: colors.muted, fontSize: 23, marginRight: 8 },
  search: { flex: 1, color: colors.text, fontSize: 11, paddingVertical: 0 },
  filters: { gap: 7, paddingTop: 14, paddingBottom: 3 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  filterTextActive: { color: colors.text },
  filterCount: { color: colors.muted, fontSize: 8, fontWeight: '900' },
  filterCountActive: { color: colors.primary },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  listTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  listMeta: { color: colors.muted, fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  emptyCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 19, paddingVertical: 25, alignItems: 'center' },
  emptyArtwork: { width: 104, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  artBack: { position: 'absolute', width: 53, height: 64, borderRadius: 9, backgroundColor: '#343044', transform: [{ rotate: '10deg' }], marginLeft: 18, marginTop: -5 },
  artFront: { width: 55, height: 67, borderRadius: 9, backgroundColor: '#222938', borderWidth: 1, borderColor: '#51566B', padding: 9, justifyContent: 'center', gap: 6, marginLeft: -12 },
  artLine: { height: 4, width: 32, borderRadius: 3, backgroundColor: '#778096' },
  artLineShort: { height: 4, width: 22, borderRadius: 3, backgroundColor: '#596176' },
  artPill: { width: 25, height: 9, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
  artPlus: { position: 'absolute', right: 5, bottom: 7, width: 25, height: 25, borderRadius: 9, backgroundColor: colors.primary, color: colors.white, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', fontSize: 17, fontWeight: '700' },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  emptyBody: { color: colors.muted, fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 7, maxWidth: 275 },
  secondaryButton: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: colors.border, marginTop: 17 },
  secondaryButtonText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  note: { padding: 13, borderRadius: 11, backgroundColor: '#202A30', borderWidth: 1, borderColor: '#35464A', marginTop: 15, gap: 5 },
  noteTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  noteBody: { color: '#AEBFC0', fontSize: 9, lineHeight: 15 },
  footer: { color: colors.muted, fontSize: 7, letterSpacing: 1.3, textAlign: 'center', marginTop: 24 }
});
