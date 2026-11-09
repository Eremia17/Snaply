import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { colors } from '../../src/theme';
import { deleteEventDraft, listEventDrafts, setEventDraftCloudId, updateEventDraftStatus, type EventDraft } from '../../src/storage/eventDrafts';
import { refreshOrganizerCloudDrafts, setOrganizerEventPublication, syncEventDraft } from '../../src/data/organizerEvents';
import { formatAriary } from '../../src/utils/currency';

type Filter = 'Tous' | 'Brouillons' | 'Publiés' | 'Archivés';
const filters: Filter[] = ['Tous', 'Brouillons', 'Publiés', 'Archivés'];

export default function OrganizerEventsScreen() {
  const [filter, setFilter] = useState<Filter>('Tous');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      await refreshOrganizerCloudDrafts().catch(() => 0);
      setEvents(await listEventDrafts());
    } catch { Alert.alert('Erreur', 'Impossible de lire les brouillons enregistrés sur cet appareil.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const counts: Record<Filter, number> = {
    Tous: events.length,
    Brouillons: events.filter(item => item.status === 'draft').length,
    Publiés: events.filter(item => item.status === 'published').length,
    Archivés: events.filter(item => item.status === 'archived').length,
  };
  const visibleEvents = useMemo(() => events.filter(item => {
    const matchesFilter = filter === 'Tous' || (filter === 'Brouillons' && item.status === 'draft') || (filter === 'Publiés' && item.status === 'published') || (filter === 'Archivés' && item.status === 'archived');
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch = !term || [item.title, item.category, item.city, item.venue].some(value => value.toLocaleLowerCase().includes(term));
    return matchesFilter && matchesSearch;
  }), [events, filter, search]);

  async function synchronizeDraft(item: EventDraft) {
    try {
      const result = await syncEventDraft(item);
      await setEventDraftCloudId(item.id, result.eventId, result.cloudPosterPath);
      await refresh();
      Alert.alert(result.created ? 'Synchronisation terminée' : 'Mise à jour cloud terminée', 'Le brouillon est enregistré dans ton espace Supabase. Il reste privé et n’est pas publié.');
    } catch (error) {
      Alert.alert('Synchronisation impossible', error instanceof Error ? error.message : 'Une erreur inattendue est survenue.');
    }
  }

  async function togglePublication(item: EventDraft) {
    if (!item.cloudEventId) return;
    const publish = item.status !== 'published';
    try {
      await setOrganizerEventPublication(item.cloudEventId, publish);
      await refresh();
      Alert.alert(publish ? 'Événement publié' : 'Publication retirée', publish ? 'Ton événement est maintenant visible dans le catalogue public.' : 'Ton événement est de nouveau privé.');
    } catch (error) {
      Alert.alert(publish ? 'Publication impossible' : 'Retrait impossible', error instanceof Error ? error.message : 'Une erreur inattendue est survenue.');
    }
  }

  async function archiveDraft(item: EventDraft) {
    if (item.status === 'published') return;
    const nextStatus = item.status === 'archived' ? 'draft' : 'archived';
    try {
      await updateEventDraftStatus(item.id, nextStatus);
      await refresh();
    } catch { Alert.alert('Erreur', 'Impossible de modifier le statut de ce brouillon.'); }
  }

  function confirmDelete(item: EventDraft) {
    Alert.alert('Supprimer ce brouillon ?', 'Cette action supprimera le brouillon local et son affiche. La copie cloud éventuelle restera dans ton compte.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await deleteEventDraft(item.id); await refresh(); }
        catch { Alert.alert('Erreur', 'La suppression a échoué.'); }
      } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.kicker}>ESPACE ORGANISATEUR</Text><Text style={styles.topTitle}>Mes événements</Text></View>
          <View style={styles.counter}><Text style={styles.counterValue}>{String(events.length).padStart(2, '0')}</Text><Text style={styles.counterLabel}>TOTAL</Text></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>VOTRE PORTFOLIO</Text></View>
          <Text style={styles.heroTitle}>Tout votre programme, au même endroit.</Text>
          <Text style={styles.heroBody}>Retrouve tes brouillons, synchronise-les dans ton espace cloud et garde tes archives à portée de main.</Text>
          <Pressable onPress={() => router.push('/organizer/create')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋  Créer un événement</Text></Pressable>
        </View>

        <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Rechercher un événement..." placeholderTextColor={colors.muted} style={styles.search} /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            <Text style={[styles.filterCount, filter === item && styles.filterCountActive]}>{counts[item]}</Text>
          </Pressable>)}
        </ScrollView>

        <View style={styles.listHeader}><Text style={styles.listTitle}>{filter === 'Tous' ? 'Tous les événements' : filter}</Text><Text style={styles.listMeta}>{visibleEvents.length} ÉVÉNEMENT{visibleEvents.length > 1 ? 'S' : ''}</Text></View>

        {loading ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Chargement des événements…</Text></View> : visibleEvents.length ? visibleEvents.map(item => {
          const cheapest = item.tiers.reduce((min, tier) => Math.min(min, Number(tier.price) || Infinity), Infinity);
          const dateLabel = item.date ? item.date.split('-').reverse().join('/') : 'Date à définir';
          return <View key={item.id} style={styles.eventCard}>
            <View style={styles.eventTop}>
              {item.posterUri ? <Image source={{ uri: item.posterUri }} style={styles.poster} /> : <View style={styles.posterFallback}><Text style={styles.posterFallbackText}>TM</Text></View>}
              <View style={styles.eventCopy}>
                <View style={styles.eventMetaRow}><Text style={styles.category}>{item.category.toUpperCase()}</Text><View style={[styles.statusPill, item.status === 'archived' && styles.archivedPill, item.status === 'published' && styles.publishedPill]}><Text style={styles.statusText}>{item.status === 'published' ? 'PUBLIÉ' : item.status === 'archived' ? 'ARCHIVÉ' : item.cloudEventId ? 'CLOUD' : 'BROUILLON'}</Text></View></View>
                <Text style={styles.eventTitle} numberOfLines={2}>{item.title || 'Événement sans titre'}</Text>
                <Text style={styles.eventDetails}>{item.city || 'Ville à préciser'} · {dateLabel}</Text>
                <Text style={styles.eventPrice}>{Number.isFinite(cheapest) ? 'Dès ' + formatAriary(cheapest) : 'Tarif à définir'}</Text>
              </View>
            </View>
            <View style={styles.eventActions}>
              {item.status !== 'published' ? <Pressable onPress={() => router.push({ pathname: '/organizer/create', params: { draftId: item.id } })} style={styles.editButton}><Text style={styles.editButtonText}>Modifier  →</Text></Pressable> : null}
              {item.status !== 'published' ? <Pressable onPress={() => synchronizeDraft(item)} style={styles.actionButton}><Text style={styles.actionText}>{item.cloudEventId ? 'Mettre à jour cloud' : 'Synchroniser'}</Text></Pressable> : null}
              {item.cloudEventId && item.status !== 'archived' ? <Pressable onPress={() => togglePublication(item)} style={styles.actionButton}><Text style={styles.actionText}>{item.status === 'published' ? 'Dépublier' : 'Publier'}</Text></Pressable> : null}
              {item.status !== 'published' ? <Pressable onPress={() => archiveDraft(item)} style={styles.actionButton}><Text style={styles.actionText}>{item.status === 'archived' ? 'Restaurer' : 'Archiver'}</Text></Pressable> : null}
              <Pressable onPress={() => confirmDelete(item)} style={styles.deleteButton}><Text style={styles.deleteText}>Supprimer</Text></Pressable>
            </View>
          </View>;
        }) : <View style={styles.emptyCard}>
          <View style={styles.emptyArtwork}><View style={styles.artBack} /><View style={styles.artFront}><View style={styles.artLine} /><View style={styles.artLineShort} /><View style={styles.artPill} /></View><View style={styles.artPlus}>＋</View></View>
          <Text style={styles.emptyTitle}>{search.trim() ? 'Aucun résultat' : filter === 'Brouillons' ? 'Aucun brouillon pour le moment' : filter === 'Archivés' ? 'Aucune archive' : filter === 'Publiés' ? 'Aucun événement publié' : 'Ton espace événementiel est prêt'}</Text>
          <Text style={styles.emptyBody}>{search.trim() ? 'Aucun événement ne correspond à cette recherche.' : filter === 'Publiés' ? 'La publication sera activée après la connexion du compte organisateur et des services serveur.' : filter === 'Archivés' ? 'Les événements archivés resteront accessibles ici.' : 'Crée ton premier événement. Tu pourras l’enregistrer en brouillon, le modifier et le retrouver ici.'}</Text>
          {!search.trim() && filter !== 'Publiés' && filter !== 'Archivés' ? <Pressable onPress={() => router.push('/organizer/create')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Préparer mon premier événement  →</Text></Pressable> : null}
        </View>}

        <View style={styles.note}><Text style={styles.noteTitle}>Sauvegarde sur cet appareil</Text><Text style={styles.noteBody}>Les brouillons locaux restent disponibles hors connexion. À l’ouverture, Ticket Mada récupère aussi les brouillons privés du compte connecté. « Synchroniser » envoie les changements vers Supabase. Les affiches sont envoyées dans un espace privé. Une fois le brouillon synchronisé, tu peux le publier depuis cette liste. Les événements publiés deviennent visibles dans le catalogue.</Text></View>
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
  eventCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, marginBottom: 11 },
  eventTop: { flexDirection: 'row', gap: 11 },
  poster: { width: 88, height: 88, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  posterFallback: { width: 88, height: 88, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  posterFallbackText: { color: colors.primary, fontSize: 19, fontWeight: '900', letterSpacing: 2 },
  eventCopy: { flex: 1, justifyContent: 'center', gap: 5 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  category: { color: colors.primary, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  statusPill: { backgroundColor: colors.primarySoft, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  archivedPill: { backgroundColor: '#303849' },
  publishedPill: { backgroundColor: '#245541' },
  statusText: { color: colors.text, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  eventTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  eventDetails: { color: colors.muted, fontSize: 9 },
  eventPrice: { color: colors.success, fontSize: 10, fontWeight: '900' },
  eventActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  editButton: { backgroundColor: colors.primary, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 8 },
  editButtonText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  actionButton: { paddingHorizontal: 9, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  deleteButton: { marginLeft: 'auto', paddingHorizontal: 7, paddingVertical: 9 },
  deleteText: { color: '#F08B92', fontSize: 9, fontWeight: '800' },
  footer: { color: colors.muted, fontSize: 7, letterSpacing: 1.3, textAlign: 'center', marginTop: 24 }
});
