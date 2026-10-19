import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PosterCard } from '@/components/PosterCard';
import { featured, trending, useCatalog } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import { useStore } from '@/lib/store';
import { fetchPosts, type Post } from '@/lib/community';
import { supabase } from '@/lib/supabase';
import type { Item, Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CARD_W = 140;

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
  const { favorites, history } = useStore();
  const hero = featured();
  const [posts, setPosts] = useState<Post[]>([]);
  const [visits, setVisits] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchPosts().then((p) => setPosts(p.slice(0, 5))).catch(() => setPosts([]));
    supabase.from('site_stats').select('visits').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setVisits(Number((data as { visits: number }).visits));
    });
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* En-tête : menu à gauche, profil et réglages à droite */}
      <View style={styles.topbar}>
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
        {(hero?.backdrop || hero?.poster) ? <Image source={{ uri: hero.backdrop || hero.poster || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={styles.heroShadeA} />
        <View style={styles.heroShadeB} />
        <View style={styles.heroContent}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={styles.eyebrow}>VOTRE UNIVERS CINÉMA & ANIMATION</Text>
          </View>
          <Text style={styles.heroTitle}>
            Erëmīa
          </Text>
          <Text style={styles.lead}>
            Découvrez films, séries, animés manga et créations occidentales dans un catalogue vivant, enrichi en temps réel.
          </Text>

          <Pressable style={styles.primaryBtn} onPress={() => router.push('/catalogue/film')}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.primaryText}>Explorer les catalogues</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push('/sports')}>
            <Ionicons name="trophy-outline" size={18} color={colors.foreground} />
            <Text style={styles.secondaryText}>Sports en direct</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => router.push('/info/aide')}>
            <Ionicons name="help-circle-outline" size={18} color={colors.foreground} />
            <Text style={styles.secondaryText}>Aide</Text>
          </Pressable>

          <View style={styles.live}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>Données actualisées en direct</Text>
          </View>
        </View>
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.kicker}>À PROPOS D’ERËMĪA</Text>
        <Text style={styles.h2Big}>Une seule destination pour trouver votre prochaine histoire.</Text>
        <Text style={styles.body}>
          Erëmīa rassemble les tendances, nouveautés, bandes-annonces, distributions et recommandations. Parcourez librement, gardez vos coups de cœur et reprenez vos découvertes quand vous le souhaitez.
        </Text>
      </View>

      {/* Catalogues */}
      <View style={styles.section}>
        <Text style={styles.kicker}>QUATRE UNIVERS</Text>
        <Text style={styles.h2Big}>Choisissez votre catalogue</Text>
        <Text style={styles.body}>Chaque univers possède ses propres genres, tendances et recommandations.</Text>
        <View style={{ gap: 12, marginTop: 16 }}>
          {UNIVERSES.map((u) => (
            <Pressable key={u.kind} style={styles.universe} onPress={() => router.push(`/catalogue/${u.kind}`)}>
              <Ionicons name={u.icon} size={30} color={colors.primary} />
              <Text style={styles.uniTitle}>{u.title}</Text>
              <Text style={styles.uniCopy}>{u.copy}</Text>
              <Text style={styles.uniEnter}>Entrer  →</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tendances et listes personnelles */}
      <View style={{ padding: 16, gap: 28 }}>
        <Section title="Tendances">
          <Row data={trending()} />
        </Section>
        <Section title="Vu récemment" empty="Les fiches que vous consultez apparaîtront ici.">
          {history.length ? <Row data={history} /> : null}
        </Section>
        <Section title="Mes favoris" empty="Ajoutez des titres avec le cœur pour les retrouver ici.">
          {favorites.length ? <Row data={favorites} /> : null}
        </Section>
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
  return (
    <View>
      <Text style={styles.h2}>{title}</Text>
      {children ?? <Text style={styles.empty}>{empty}</Text>}
    </View>
  );
}

function Row({ data }: { data: Item[] }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(i) => `${i.kind}:${i.id}`}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => <PosterCard item={item} width={CARD_W} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 },
  iconBtn: { backgroundColor: colors.muted, borderRadius: 999, padding: 9 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoTile: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.foreground, fontSize: 20, fontWeight: '900' },
  right: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.foreground, paddingVertical: 12, fontSize: 15 },
  hero: { height: 560, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.card },
  heroShadeA: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,19,0.6)' },
  heroShadeB: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,15,19,0.35)' },
  heroContent: { padding: 22, gap: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  heroTitle: { color: colors.foreground, fontSize: 56, fontWeight: '900', lineHeight: 58 },
  lead: { color: colors.foreground, fontSize: 16, lineHeight: 24, opacity: 0.9 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 15, marginTop: 6 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 999, paddingVertical: 14 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 14 },
  secondaryText: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  liveText: { color: colors.mutedForeground, fontSize: 13 },
  section: { paddingHorizontal: 18, paddingVertical: 28, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  kicker: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  h2Big: { color: colors.foreground, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  body: { color: colors.mutedForeground, fontSize: 15, lineHeight: 23 },
  universe: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 8 },
  uniTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginTop: 6 },
  uniCopy: { color: colors.mutedForeground, lineHeight: 21 },
  uniEnter: { color: colors.primary, fontWeight: '700', marginTop: 6 },
  h2: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  empty: { color: colors.mutedForeground },
  post: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 },
  postAuthor: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  postTitle: { color: colors.foreground, fontWeight: '800', fontSize: 15 },
  postBody: { color: colors.foreground, lineHeight: 20 },
  outlineBtn: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 13, marginTop: 8 },
  visits: { color: colors.mutedForeground, textAlign: 'center', marginTop: 18, fontSize: 13 },
  visitsNum: { color: colors.foreground, fontWeight: '800' },
});