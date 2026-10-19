import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openTitle } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from '@/components/PosterCard';
import { classics, featured, fetchSports, trending, upcomingList, useCatalog, type SportMatch } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import { fetchPosts, type Post } from '@/lib/community';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Item, Kind } from '@/lib/types';
import { colors } from '@/lib/theme';
import { usePrefs } from '@/lib/prefs';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CARD_W = 112;

// Les quatre univers, comme sur le site
const UNIVERSES: { kind: Kind; title: string; copy: string; icon: IconName }[] = [
  { kind: 'film', title: 'Films', copy: 'Du grand spectacle aux histoires intimes, explorez le cinéma par genre.', icon: 'film-outline' },
  { kind: 'manga', title: 'Animé Manga', copy: 'Shonen, seinen, isekai et bien plus, directement depuis le Japon.', icon: 'videocam-outline' },
  { kind: 'occidental', title: 'Animé Occidental', copy: 'Cartoons, super-héros et séries animées pour tous les univers.', icon: 'tv-outline' },
  { kind: 'serie', title: 'Séries', copy: 'Drames, comédies, thrillers et science-fiction : les séries du moment.', icon: 'play-circle-outline' },
];

export default function HomeScreen() {
  useCatalog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites, history } = useStore();
  const [prefs] = usePrefs();
  const heroItems = trending().filter((item) => item.backdrop || item.poster);
  const [heroIndex, setHeroIndex] = useState(0);
  const hero = heroItems.length ? heroItems[heroIndex % heroItems.length] : featured();
  const cardWidth = prefs.taille === 'Compact' ? 96 : prefs.taille === 'Grand' ? 132 : CARD_W;
  const [posts, setPosts] = useState<Post[]>([]);
  const [sports, setSports] = useState<SportMatch[]>([]);
  const [visits, setVisits] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [surpriseVisible, setSurpriseVisible] = useState(false);
  const [surpriseItem, setSurpriseItem] = useState<ReturnType<typeof trending>[number] | null>(null);
  const diceRotation = useRef(new Animated.Value(0)).current;
  const dicePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (prefs.animations || heroItems.length < 2) return;
    const timer = setInterval(() => setHeroIndex((index) => (index + 1) % heroItems.length), 8000);
    return () => clearInterval(timer);
  }, [prefs.animations, heroItems.length]);

  useEffect(() => {
    if (prefs.animations) { dicePulse.setValue(1); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(dicePulse, { toValue: 1.06, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(dicePulse, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [dicePulse, prefs.animations]);

  const launchSurprise = () => {
    const pool = [...trending(), ...classics(), ...upcomingList()].filter((item, index, all) => all.findIndex((x) => x.kind === item.kind && x.id === item.id) === index);
    if (!pool.length) { router.push('/catalogue/film'); return; }
    setSurpriseItem(pool[Math.floor(Math.random() * pool.length)]);
    if (prefs.animations) { setSurpriseVisible(true); return; }
    diceRotation.setValue(0);
    Animated.sequence([
      Animated.timing(diceRotation, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(diceRotation, { toValue: -1, duration: 180, useNativeDriver: true }),
      Animated.timing(diceRotation, { toValue: 0.7, duration: 150, useNativeDriver: true }),
      Animated.timing(diceRotation, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setSurpriseVisible(true));
  };

  useEffect(() => {
    if (!isSupabaseConfigured || prefs.economiseur) {
      setPosts([]);
      setSports([]);
      setVisits(null);
      return;
    }
    fetchPosts().then((p) => setPosts(p.slice(0, 5))).catch(() => setPosts([]));
    fetchSports().then((items) => setSports(items.slice(0, 4))).catch(() => setSports([]));
    supabase.from('site_stats').select('visits').eq('id', 1).maybeSingle().then(
      ({ data }) => {
        if (data) setVisits(Number((data as { visits: number }).visits));
      },
      () => setVisits(null),
    );
  }, []);

  return (
    <ScrollView removeClippedSubviews={false} style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* En-tête : menu à gauche, profil et réglages à droite */}
      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.navigate('/menu')}>
          <Ionicons name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.brandRow}>
          <View style={styles.logoTile}><Ionicons name="film-outline" size={16} color="#fff" /></View>
          <Text style={styles.brand}>Erëmīa</Text>
        </View>
        <View style={styles.right}>
          <Pressable style={styles.iconBtn} onPress={() => router.navigate('/profil')}>
            <Ionicons name="person-outline" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/parametres')}>
            <Ionicons name="settings-outline" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, acteur, réalisateur…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => router.push({ pathname: '/recherche', params: { q: query } })}
          returnKeyType="search"
        />
      </View>

      {/* Héros */}
      <View style={styles.hero}>
        {(hero?.backdrop || hero?.poster) ? <Image key={hero.id} source={{ uri: hero.backdrop || hero.poster || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={styles.heroShadeA} />
        <View style={styles.heroShadeB} />
        <View style={styles.heroContent}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={styles.eyebrow}>VOTRE UNIVERS CINÉMA & ANIMATION</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>Erëmīa</Text>
          <Text style={styles.lead} numberOfLines={4}>
            Découvrez films, séries, animés manga et créations occidentales dans un catalogue vivant, enrichi en temps réel.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/catalogue/film')}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.primaryText}>Explorer les catalogues</Text>
          </Pressable>
          <View style={styles.live}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>Données actualisées en direct</Text>
          </View>
        </View>
      </View>

      {/* Cartes cinéma : surprise et sélection du soir */}
      <View style={styles.featureStack}>
        <Pressable accessibilityRole="button" style={styles.surpriseCard} onPress={launchSurprise}>
          <View style={styles.surpriseGlow} />
          <View style={styles.featureCopy}>
            <Text style={styles.featureEyebrow}>LA SÉLECTION ERËMĪA</Text>
            <Text style={styles.featureTitle}>Surprends-moi ✨</Text>
            <Text style={styles.featureBody}>Laisse le hasard choisir ta prochaine histoire.</Text>
            <View style={styles.featureButton}><Text style={styles.featureButtonText}>LANCER LA SURPRISE</Text><Ionicons name="shuffle" size={17} color="#fff" /></View>
          </View>
          <Animated.View style={[styles.dice, { transform: [{ rotate: diceRotation.interpolate({ inputRange: [-1, 1], outputRange: ['-28deg', '28deg'] }) }, { scale: dicePulse }] }]}><Ionicons name="shuffle" size={42} color="#fff" /></Animated.View>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.tonightCard} onPress={() => router.push('/ce-soir')}>
          <View style={styles.tonightArt}><Ionicons name="film" size={46} color="#F7C66A" /><Ionicons name="sparkles" size={19} color="#fff" /></View>
          <View style={styles.tonightCopy}>
            <Text style={styles.featureEyebrow}>TA PROCHAINE SOIRÉE</Text>
            <Text style={styles.tonightTitle}>Que regarder ce soir ?</Text>
            <Text style={styles.featureBody}>Des idées selon ton humeur et ton univers.</Text>
            <Text style={styles.tonightLink}>DÉCOUVRIR  →</Text>
          </View>
        </Pressable>
      </View>

      <Modal visible={surpriseVisible} transparent animationType="fade" onRequestClose={() => setSurpriseVisible(false)}>
        <View style={styles.surpriseBackdrop}>
          <View style={styles.surpriseReveal}>
            <Pressable style={styles.modalClose} onPress={() => setSurpriseVisible(false)}><Ionicons name="close" size={22} color="#fff" /></Pressable>
            <Ionicons name="sparkles" size={24} color="#FF5368" />
            <Text style={styles.revealKicker}>LE HASARD A CHOISI</Text>
            {surpriseItem?.poster ? <Image source={{ uri: surpriseItem.poster }} style={styles.revealPoster} resizeMode="cover" /> : null}
            <Text style={styles.revealTitle} numberOfLines={2}>{surpriseItem?.title ?? 'Une surprise vous attend'}</Text>
            <Text style={styles.revealMeta}>{surpriseItem?.year ?? 'À découvrir'}  ·  ★ {surpriseItem?.rating?.toFixed?.(1) ?? '—'}</Text>
            <Pressable style={styles.revealButton} onPress={() => { if (surpriseItem) openTitle(router, surpriseItem); setSurpriseVisible(false); }}><Text style={styles.revealButtonText}>DÉCOUVRIR LE TITRE</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></Pressable>
            <Pressable onPress={launchSurprise} style={styles.revealAgain}><Text style={styles.revealAgainText}>Une autre surprise</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Tendances et listes personnelles */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 18 }}>
        <Section title="Tendances">
          <Row data={trending()} cardWidth={cardWidth} />
        </Section>
        <Section title="Classiques à redécouvrir" empty="Les classiques du catalogue apparaîtront ici lorsqu’ils seront identifiés.">
          {classics().length ? <Row data={classics()} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Prochainement" empty="Les prochaines sorties apparaîtront ici lorsqu’une date sera disponible.">
          {upcomingList().length ? <Row data={upcomingList()} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Vu récemment" empty="Les fiches que vous consultez apparaîtront ici.">
          {history.length ? <Row data={history} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Mes favoris" empty="Ajoutez des titres avec le cœur pour les retrouver ici.">
          {favorites.length ? <Row data={favorites} cardWidth={cardWidth} /> : null}
        </Section>
      </View>

      <View style={styles.universeStrip}>
        <View style={styles.universeHeading}><Text style={styles.featureEyebrow}>EXPLORE PAR UNIVERS</Text><Text style={styles.universeTitle}>Quel monde tu explores ?</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.universeRow}>
          {UNIVERSES.map((u) => <Pressable key={u.kind} style={styles.universeChip} onPress={() => router.push(`/catalogue/${u.kind}`)}><Ionicons name={u.icon} size={20} color={colors.primary} /><Text style={styles.universeChipText}>{u.title}</Text><Ionicons name="chevron-forward" size={14} color="#F06A7B" /></Pressable>)}
        </ScrollView>
      </View>

      {/* Sports en direct — aperçu de la section LiveNow du site */}
      <View style={styles.section}>
        <View style={styles.sportsHeading}>
          <View style={styles.sportsTitleRow}>
            <Ionicons name="trophy-outline" size={24} color={colors.primary} />
            <Text style={styles.h2Big}>Sports en direct</Text>
          </View>
          <Text style={styles.body}>Retrouvez les rencontres et les prochains matchs.</Text>
        </View>
        {sports.length ? sports.map((match, index) => (
          <View key={`${match.league}-${match.home}-${match.away}-${index}`} style={styles.matchCard}>
            <Text style={styles.matchLeague}>{match.league}</Text>
            <View style={styles.matchTeams}>
              <Text style={styles.matchTeam} numberOfLines={1}>{match.home}</Text>
              <Text style={styles.matchScore}>{match.homeScore != null && match.awayScore != null ? `${match.homeScore} – ${match.awayScore}` : 'VS'}</Text>
              <Text style={styles.matchTeam} numberOfLines={1}>{match.away}</Text>
            </View>
            <Text style={styles.matchMeta}>{match.status} · {match.date} {match.time}</Text>
          </View>
        )) : (
          <Text style={styles.empty}>Les rencontres seront affichées ici lorsqu’elles seront disponibles.</Text>
        )}
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/sports')}>
          <Text style={styles.secondaryText}>Voir tous les matchs  →</Text>
        </Pressable>
      </View>

      {/* Avis et discussions */}
      <View style={styles.section}>
        <Ionicons name="chatbubbles-outline" size={30} color={colors.primary} />
        <Text style={styles.h2Big}>Avis & discussions</Text>
        <Text style={styles.body}>Les derniers avis de la communauté. Pour publier le vôtre, ouvrez la fiche d’un titre.</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {posts.length === 0 ? (
            <Text style={styles.empty}>Aucun avis pour le moment.</Text>
          ) : (
            posts.map((p) => (
              <Pressable key={p.id} style={styles.post} onPress={() => router.push({ pathname: '/communaute/[id]', params: { id: p.id } })}>
                <Text style={styles.postAuthor}>{p.author}</Text>
                <Text style={styles.postTitle} numberOfLines={1}>{p.title}</Text>
                <Text style={styles.postBody} numberOfLines={2}>{p.body}</Text>
              </Pressable>
            ))
          )}
        </View>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/communaute')}>
          <Text style={styles.secondaryText}>Voir tous les avis  →</Text>
        </Pressable>
      </View>

      <Text style={styles.visits}>
        <Ionicons name="eye-outline" size={14} color={colors.mutedForeground} />{' '}
        <Text style={styles.visitsNum}>{visits != null ? visits.toLocaleString('fr-FR') : '…'}</Text> visites au total
      </Text>
    </ScrollView>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children?: React.ReactNode }) {
  // Ne pas réserver de hauteur aux rubriques sans contenu.
  if (children == null || children === false) return null;
  return (
    <View>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ data, cardWidth }: { data: Item[]; cardWidth: number }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(i) => `${i.kind}:${i.id}`}
      showsHorizontalScrollIndicator={false}
      removeClippedSubviews={false}
      contentContainerStyle={{ paddingRight: 4 }}
      renderItem={({ item }) => <PosterCard item={item} width={CARD_W} />
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090D' },
  featureStack: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 12 },
  surpriseBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  surpriseReveal: { width: '100%', maxWidth: 360, alignItems: 'center', backgroundColor: '#100D14', borderRadius: 26, borderWidth: 1, borderColor: '#8C2035', padding: 22, gap: 9, overflow: 'hidden' },
  modalClose: { alignSelf: 'flex-end', padding: 4 },
  revealKicker: { color: '#FF5368', fontSize: 10, letterSpacing: 2, fontWeight: '900' },
  revealPoster: { width: 148, height: 210, borderRadius: 14, marginVertical: 8, borderWidth: 1, borderColor: '#5E2937' },
  revealTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  revealMeta: { color: '#B9B4BE', fontSize: 13 },
  revealButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C71935', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 13, marginTop: 8, width: '100%' },
  revealButtonText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  revealAgain: { padding: 8 },
  revealAgainText: { color: '#F36A7B', fontWeight: '700' },
  surpriseCard: { minHeight: 158, borderRadius: 22, borderWidth: 1, borderColor: '#57212D', backgroundColor: '#170D15', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 8 },
  surpriseGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: 5, top: -10, backgroundColor: '#49101D', opacity: 0.6 },
  featureCopy: { flex: 1, gap: 7, zIndex: 1 },
  featureEyebrow: { color: '#FF5969', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  featureTitle: { color: '#FFF8F8', fontSize: 21, lineHeight: 25, fontWeight: '900' },
  featureBody: { color: '#D6CDD2', fontSize: 13, lineHeight: 19 },
  featureButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: '#F04455', backgroundColor: '#A9162B', paddingHorizontal: 13, paddingVertical: 9, marginTop: 5 },
  featureButtonText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dice: { width: 72, height: 72, borderRadius: 18, borderWidth: 1, borderColor: '#FF6674', backgroundColor: '#8D142A', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], shadowColor: '#FF263F', shadowOpacity: 0.6, shadowRadius: 18, elevation: 10 },
  tonightCard: { minHeight: 126, borderRadius: 20, borderWidth: 1, borderColor: '#34303B', backgroundColor: '#15141C', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  tonightArt: { width: 72, height: 88, borderRadius: 16, backgroundColor: '#29202A', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tonightCopy: { flex: 1, gap: 6 },
  tonightTitle: { color: '#FFF', fontSize: 20, lineHeight: 24, fontWeight: '900' },
  tonightLink: { alignSelf: 'flex-start', color: '#FFF', fontSize: 11, fontWeight: '900', backgroundColor: '#B9192F', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, marginTop: 4 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { backgroundColor: colors.muted, borderRadius: 999, padding: 9 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoTile: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.foreground, fontSize: 21, fontWeight: '900', fontFamily: 'sans-serif-black', includeFontPadding: false },
  right: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.foreground, paddingVertical: 12, fontSize: 15 },
  hero: { height: 270, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.card, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  heroShadeA: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,19,0.6)' },
  heroShadeB: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,19,0.35)' },
  heroContent: { padding: 18, gap: 9 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  heroTitle: { color: colors.foreground, fontSize: 42, fontWeight: '900', lineHeight: 46 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 2 },
  heroMetaText: { color: '#F5F3EE', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.42)', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  lead: { color: colors.foreground, fontSize: 16, lineHeight: 24, opacity: 0.9 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 15, marginTop: 6 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 999, paddingVertical: 14 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 14 },
  secondaryText: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  liveText: { color: colors.mutedForeground, fontSize: 13 },
  section: { paddingHorizontal: 16, paddingVertical: 18, gap: 10, borderTopWidth: 1, borderTopColor: '#211820' },
  kicker: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  h2Big: { color: colors.foreground, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  body: { color: colors.mutedForeground, fontSize: 15, lineHeight: 23 },
  universe: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 8 },
  universeStrip: { paddingVertical: 18, gap: 12, borderTopWidth: 1, borderTopColor: '#211820' },
  universeHeading: { paddingHorizontal: 16, gap: 5 },
  universeTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  universeRow: { paddingHorizontal: 16, gap: 10 },
  universeChip: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, borderColor: '#38202B', backgroundColor: '#131118' },
  universeChipText: { color: '#F3F0F4', fontSize: 12, fontWeight: '800' },
  uniTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginTop: 6 },
  uniCopy: { color: colors.mutedForeground, lineHeight: 21 },
  uniEnter: { color: colors.primary, fontWeight: '700', marginTop: 6 },
  h2: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  empty: { color: colors.mutedForeground },
  post: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
  postAuthor: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  postTitle: { color: colors.foreground, fontWeight: '800', fontSize: 15 },
  postBody: { color: colors.foreground, lineHeight: 20 },
  sportsHeading: { gap: 8, marginBottom: 4 },
  sportsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  matchLeague: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  matchTeams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchTeam: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '700' },
  matchScore: { color: colors.foreground, fontSize: 15, fontWeight: '900' },
  matchMeta: { color: colors.mutedForeground, fontSize: 12 },
  outlineBtn: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 13, marginTop: 8 },
  visits: { color: colors.mutedForeground, textAlign: 'center', marginTop: 18, fontSize: 13 },
  visitsNum: { color: colors.foreground, fontWeight: '800' },
});