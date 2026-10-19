import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openTitle } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from '@/components/PosterCard';
import { browseKind, classics, featured, fetchSports, listByKind, trending, upcomingList, useCatalog, type Detail, type SportMatch } from '@/lib/catalog';
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
  const [malagasyFilms, setMalagasyFilms] = useState<Detail[]>([]);
  const [spotlights, setSpotlights] = useState<Detail[]>([]);
  const [freshPicks, setFreshPicks] = useState<Detail[]>([]);
  const [ratedPicks, setRatedPicks] = useState<Detail[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightImageFailed, setSpotlightImageFailed] = useState(false);
  const [visits, setVisits] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (prefs.animations || heroItems.length < 2) return;
    const timer = setInterval(() => setHeroIndex((index) => (index + 1) % heroItems.length), 8000);
    return () => clearInterval(timer);
  }, [prefs.animations, heroItems.length]);

  // Carrousel d'accueil : titres récents et bien notés, répartis entre films, séries et animés.
  useEffect(() => {
    let active = true;
    // Afficher immédiatement ce qui est déjà en cache; le carrousel ne doit pas disparaître si une API échoue.
    const cached = trending().filter((item) => !!(item.backdrop || item.poster));
    if (cached.length) setSpotlights(cached as Detail[]);
    if (!isSupabaseConfigured || prefs.economiseur) {
      setFreshPicks(cached as Detail[]);
      setRatedPicks(cached.slice().sort((a, b) => Number((b as Detail).rating ?? 0) - Number((a as Detail).rating ?? 0)) as Detail[]);
      return () => { active = false; };
    }
    const safeBrowse = (kind: Kind, sort: 'recent' | 'rating') =>
      browseKind(kind, 1, { sort }).catch(() => ({ items: [] as Detail[], hasMore: false }));
    Promise.all([
      safeBrowse('film', 'recent'), safeBrowse('film', 'rating'),
      safeBrowse('serie', 'recent'), safeBrowse('serie', 'rating'),
      safeBrowse('manga', 'recent'), safeBrowse('manga', 'rating'),
      safeBrowse('occidental', 'recent'), safeBrowse('occidental', 'rating'),
    ]).then((results) => {
      if (!active) return;
      const [filmRecent, filmRated, serieRecent, serieRated, mangaRecent, mangaRated, westRecent, westRated] = results;
      const fresh = [filmRecent, serieRecent, mangaRecent, westRecent].flatMap((result) => result.items);
      const rated = [filmRated, serieRated, mangaRated, westRated].flatMap((result) => result.items);
      const uniqueFresh = Array.from(new Map(fresh.filter((item) => !!(item.backdrop || item.poster)).map((item) => [item.kind + ':' + item.id, item])).values());
      const uniqueRated = Array.from(new Map(rated.filter((item) => !!(item.backdrop || item.poster)).map((item) => [item.kind + ':' + item.id, item])).values()).sort((a, b) => b.rating - a.rating);
      if (uniqueFresh.length) setFreshPicks(uniqueFresh.slice(0, 20));
      if (uniqueRated.length) setRatedPicks(uniqueRated.slice(0, 20));
      const candidates = [
        ...filmRecent.items.slice(0, 3), ...filmRated.items.slice(0, 3),
        ...mangaRecent.items.slice(0, 3), ...mangaRated.items.slice(0, 3),
        ...serieRecent.items.slice(0, 3), ...serieRated.items.slice(0, 3),
        ...westRecent.items.slice(0, 3), ...westRated.items.slice(0, 3),
      ].filter((item) => !!(item.backdrop || item.poster));
      const unique = Array.from(new Map(candidates.map((item) => [item.kind + ':' + item.id, item])).values());
      const balanced: Detail[] = [];
      const kinds: Kind[] = ['film', 'manga', 'serie', 'occidental'];
      for (let round = 0; round < 6; round++) {
        for (const kind of kinds) {
          const matching = unique.filter((item) => item.kind === kind);
          if (matching[round]) balanced.push(matching[round]);
        }
      }
      if (balanced.length) setSpotlights(balanced);
      else if (cached.length) setSpotlights(cached as Detail[]);
    }).catch(() => { if (active && cached.length) setSpotlights(cached as Detail[]); });
    return () => { active = false; };
  }, [prefs.economiseur]);

  useEffect(() => {
    setSpotlightImageFailed(false);
  }, [spotlightIndex]);

  useEffect(() => {
    if (spotlights.length < 2) return;
    const timer = setInterval(() => setSpotlightIndex((index) => (index + 1) % spotlights.length), 3000);
    return () => clearInterval(timer);
  }, [spotlights.length]);

  useEffect(() => {
    if (!isSupabaseConfigured || prefs.economiseur) { setMalagasyFilms([]); return; }
    let active = true;
    browseKind('film', 1, { originalLanguage: 'mg', sort: 'rating' })
      .then((result) => { if (active) setMalagasyFilms(result.items.filter((item) => !!item.poster)); })
      .catch(() => { if (active) setMalagasyFilms([]); });
    return () => { active = false; };
  }, [prefs.economiseur]);

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

      {/* Navigation rapide compacte : catégories visibles sans prendre la moitié de l’écran */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCategories}>
        {UNIVERSES.map((u) => (
          <Pressable key={u.kind} style={styles.quickCategory} onPress={() => router.push(`/catalogue/${u.kind}`)}>
            <Ionicons name={u.icon} size={14} color={colors.primary} />
            <Text style={styles.quickCategoryText} numberOfLines={1}>{u.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Bande de nouveautés et de titres très bien notés — uniquement sur l'accueil */}
      {spotlights.length > 0 ? (() => {
        const item = spotlights[spotlightIndex % spotlights.length];
        const artwork = item.backdrop || item.poster;
        return (
          <Pressable accessibilityRole="button" style={styles.spotlightBanner} onPress={() => openTitle(router, item)}>
            {artwork && !spotlightImageFailed ? <Image key={item.id + ':' + artwork} source={{ uri: artwork }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setSpotlightImageFailed(true)} /> : null}
            <View style={styles.spotlightShade} />
            <View style={styles.spotlightTopline}>
              <View style={styles.spotlightBadge}><Ionicons name="sparkles" size={12} color="#0B0B10" /><Text style={styles.spotlightBadgeText}>{Number(item.rating) >= 8 ? 'TRÈS BIEN NOTÉ' : 'À DÉCOUVRIR'}</Text></View>
              <Text style={styles.spotlightCount}>{spotlightIndex + 1} / {spotlights.length}</Text>
            </View>
            <View style={styles.spotlightCopy}>
              <Text style={styles.spotlightKind}>{item.kind === 'film' ? 'FILM' : item.kind === 'serie' ? 'SÉRIE' : item.kind === 'manga' ? 'ANIMÉ MANGA' : 'ANIMATION' } · {item.year || 'NOUVEAUTÉ'}</Text>
              <Text style={styles.spotlightTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.spotlightBottom}><Text style={styles.spotlightHint}>{Number(item.rating) > 0 ? '★ ' + Number(item.rating).toFixed(1) + '  ·  ' : ''}Touchez pour découvrir</Text><View style={styles.spotlightPlay}><Ionicons name="play" size={17} color="#fff" /></View></View>
            </View>
            <View style={styles.spotlightDots}>{spotlights.slice(0, 12).map((entry, i) => <View key={entry.kind + ':' + entry.id} style={[styles.spotlightDot, i === spotlightIndex % 12 && styles.spotlightDotActive]} />)}</View>
          </Pressable>
        );
      })() : null}

      {freshPicks.length > 0 ? <View style={styles.catalogRows}><Section title="Tout juste sorti"><Row data={freshPicks} cardWidth={cardWidth} /></Section></View> : null}
      {ratedPicks.length > 0 ? <View style={styles.catalogRows}><Section title="Les mieux notés"><Row data={ratedPicks} cardWidth={cardWidth} /></Section></View> : null}

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

      {/* Accès compact aux idées de soirée : le grand bloc Surprends-moi est supprimé */}
      <View style={styles.featureStack}>
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

      {/* Rangées issues du catalogue complet, pas seulement des huit tendances */}
      <View style={styles.catalogRows}>
        <Section title="Animés récents" empty="Les animés datés apparaîtront ici quand le catalogue sera chargé.">
          {listByKind('manga').concat(listByKind('occidental')).filter((item) => !!item.year).sort((a, b) => Number(b.year) - Number(a.year)).length ? <Row data={listByKind('manga').concat(listByKind('occidental')).filter((item) => !!item.year).sort((a, b) => Number(b.year) - Number(a.year))} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Animés manga" empty="Aucun animé manga disponible pour le moment.">
          {listByKind('manga').length ? <Row data={listByKind('manga')} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Animation occidentale" empty="Aucune animation occidentale disponible pour le moment.">
          {listByKind('occidental').length ? <Row data={listByKind('occidental')} cardWidth={cardWidth} /> : null}
        </Section>
        <View style={styles.malagasySection}>
          <View style={styles.malagasyHeading}><Text style={styles.h2}>🇲🇬 Films malagasy</Text><Text style={styles.malagasySub}>Cinéma de Madagascar</Text></View>
          {malagasyFilms.length ? <Row data={malagasyFilms} cardWidth={cardWidth} /> : <View style={styles.malagasyEmpty}><Ionicons name="film-outline" size={22} color="#70F0C0" /><Text style={styles.malagasyEmptyText}>On cherche les films répertoriés en langue malgache. La source actuelle n’en a pas encore renvoyé.</Text></View>}
        </View>
        <Section title="Films à découvrir" empty="Les films du catalogue apparaîtront ici.">
          {listByKind('film').length ? <Row data={listByKind('film')} cardWidth={cardWidth} /> : null}
        </Section>
        <Section title="Séries à suivre" empty="Les séries du catalogue apparaîtront ici.">
          {listByKind('serie').length ? <Row data={listByKind('serie')} cardWidth={cardWidth} /> : null}
        </Section>
      </View>

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
      renderItem={({ item }) => <PosterCard item={item} width={cardWidth} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090D' },
  malagasySection: { gap: 4 },
  malagasyHeading: { gap: 0 },
  malagasySub: { color: '#70F0C0', fontSize: 11, marginTop: -8, marginBottom: 8 },
  malagasyEmpty: { minHeight: 84, borderRadius: 14, borderWidth: 1, borderColor: '#24493F', backgroundColor: '#101A19', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  malagasyEmptyText: { color: '#D1D8D5', flex: 1, fontSize: 12, lineHeight: 18 },
  spotlightBanner: { height: 258, marginHorizontal: 12, marginTop: 10, marginBottom: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#19151F', justifyContent: 'space-between' },
  spotlightShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,5,10,0.40)' },
  spotlightTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  spotlightBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#65F0BD', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  spotlightBadgeText: { color: '#0B0B10', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  spotlightCount: { color: '#FFF', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  spotlightCopy: { paddingHorizontal: 17, paddingBottom: 10, gap: 6 },
  spotlightKind: { color: '#70F0C0', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  spotlightTitle: { color: '#FFF', fontSize: 27, lineHeight: 31, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 8 },
  spotlightBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  spotlightHint: { color: '#FFF', fontSize: 12, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 5 },
  spotlightPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E72E63', alignItems: 'center', justifyContent: 'center' },
  spotlightDots: { flexDirection: 'row', gap: 4, alignSelf: 'center', paddingBottom: 10 },
  spotlightDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  spotlightDotActive: { width: 17, backgroundColor: '#70F0C0' },
  quickCategories: { paddingHorizontal: 12, paddingTop: 5, paddingBottom: 3, gap: 6 },
  quickCategory: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: '#2A2B35', backgroundColor: '#111219' },
  quickCategoryText: { color: '#F1F1F5', fontSize: 10, fontWeight: '700', maxWidth: 104 },
  catalogRows: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 14 },
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