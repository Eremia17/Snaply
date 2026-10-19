import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchExtras, type Extras, type Detail } from '@/lib/catalog';
import { PosterCard } from '@/components/PosterCard';
import { openTitle } from '@/lib/navigation';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const W = Math.min(Dimensions.get('window').width - 64, 340);
const H = W;
const R = W * 0.36;
const SAT = 48;
const C_DIRECTOR = '#F59E0B';
const C_SAGA = '#A78BFA';
const C_SIMILAR = '#F472B6';

function relationColor(name: string) {
  if (name.startsWith('Même réalisateur')) return C_DIRECTOR;
  if (name === 'Titres liés') return C_SIMILAR;
  return C_SAGA;
}

function Constellation({ name, items, poster, onPick }: { name: string; items: Detail[]; poster: string | null; onPick: (i: Detail) => void }) {
  const cx = W / 2;
  const cy = H / 2;
  const color = relationColor(name);
  const shown = items.slice(0, 10);
  const corePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(corePulse, { toValue: 1.12, duration: 1050, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(corePulse, { toValue: 1, duration: 1050, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [corePulse]);
  const pts = shown.map((_, i) => {
    const a = (i * 2 * Math.PI) / shown.length - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  return (
    <View style={styles.cosmos}>
      <View style={{ width: W, height: H }}>
        {pts.map((p, i) => {
          const mx = (cx + p.x) / 2;
          const my = (cy + p.y) / 2;
          const len = Math.hypot(p.x - cx, p.y - cy);
          const ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI;
          return <View key={`l${i}`} style={{ position: 'absolute', left: mx - len / 2, top: my - 0.75, width: len, height: 1.5, backgroundColor: color, opacity: 0.55, transform: [{ rotate: `${ang}deg` }] }} />;
        })}
        <Animated.View style={[styles.center, { left: cx - 46, top: cy - 46, transform: [{ scale: corePulse }] }]}>
          {poster ? <Image source={{ uri: poster }} style={styles.centerImg} /> : <View style={[styles.centerImg, { backgroundColor: colors.muted }]} />}
        </Animated.View>
        {shown.map((it, i) => (
          <Pressable key={`${it.kind}:${it.id}`} onPress={() => onPick(it)}
            style={[styles.sat, { left: pts[i].x - SAT / 2, top: pts[i].y - SAT / 2, borderColor: color }]}>
            {it.poster ? <Image source={{ uri: it.poster }} style={styles.satImg} /> : <View style={[styles.satImg, { backgroundColor: colors.muted }]} />}
          </Pressable>
        ))}
      </View>
      <Text style={styles.cosmosHint}>Touchez un titre pour l’ouvrir.</Text>
    </View>
  );
}

export function FicheExtras({ kind, id, poster, title }: { kind: Kind; id: string; poster?: string | null; title?: string }) {
  const router = useRouter();
  const [data, setData] = useState<Extras | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reviewSummary, setReviewSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setShowTrailer(false);
    fetchExtras(kind, id).then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setData(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [kind, id, retry]);

  useEffect(() => {
    let active = true;
    setReviewSummary('');
    if (!data?.reviews?.length || !isSupabaseConfigured) {
      setSummaryLoading(false);
      return () => { active = false; };
    }
    setSummaryLoading(true);
    supabase.functions.invoke('gemini', {
      body: {
        action: 'summarize_reviews',
        title: title ?? '',
        reviews: data.reviews.slice(0, 8).map((review) => ({
          rating: review.rating,
          content: review.content.slice(0, 700),
        })),
      },
    }).then(({ data: result, error }) => {
      if (active && !error && typeof result?.summary === 'string') setReviewSummary(result.summary);
    }).catch(() => {
      // Le résumé IA est facultatif : les critiques originales restent accessibles.
    }).finally(() => {
      if (active) setSummaryLoading(false);
    });
    return () => { active = false; };
  }, [data, title]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>BANDE-ANNONCE ET INFORMATIONS</Text>
        <View style={styles.loadingPreview}>
          {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.loadingShade} />
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.trailerOverlayText}>Préparation des informations…</Text>
        </View>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>INFORMATIONS COMPLÉMENTAIRES</Text>
        <Text style={styles.emptyMessage}>Impossible de charger ces informations. Vérifiez la connexion puis réessayez.</Text>
        <Pressable style={styles.retryButton} onPress={() => { setLoading(true); setRetry((n) => n + 1); }} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={18} color={colors.foreground} />
          <Text style={styles.retryText}>Réessayer le chargement</Text>
        </Pressable>
      </View>
    );
  }
  if (!data.trailer && !data.providers.length && !data.cast.length && !data.reviews.length && !data.constellation.items.length && !data.similar.length) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>INFORMATIONS COMPLÉMENTAIRES</Text>
        <Text style={styles.emptyMessage}>Aucune information complémentaire trouvée pour ce titre pour le moment.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {data.trailer ? (
        <>
          <Text style={styles.label}>BANDE-ANNONCE</Text>
          {showTrailer ? (
            <View style={styles.trailerPlayer}>
              <View style={styles.webViewFrame}>
                <WebView
                  source={{ uri: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.trailer)}?playsinline=1&autoplay=1&rel=0` }}
                  style={styles.trailerWebView}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  originWhitelist={['https://*']}
                  onLoadStart={() => setVideoLoading(true)}
                  onLoadEnd={() => setVideoLoading(false)}
                  onError={() => setVideoLoading(false)}
                />
                {videoLoading ? (
                  <View style={styles.videoLoadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                    <Text style={styles.trailerOverlayText}>Chargement de la vidéo…</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.trailerActions}>
                <Pressable style={styles.closeTrailer} onPress={() => { setShowTrailer(false); setVideoLoading(false); }}>
                  <Ionicons name="close" size={18} color="#fff" />
                  <Text style={styles.trailerText}>Fermer la vidéo</Text>
                </Pressable>
                <Pressable
                  style={styles.openYoutube}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${encodeURIComponent(data.trailer!)}`).catch(() => {})}
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir la bande-annonce sur YouTube"
                >
                  <Ionicons name="logo-youtube" size={18} color="#fff" />
                  <Text style={styles.trailerText}>Ouvrir sur YouTube</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.trailerPreview} onPress={() => { setVideoLoading(true); setShowTrailer(true); }}
              accessibilityRole="button" accessibilityLabel="Lire la bande-annonce dans Erëmīa">
              <Image
                source={{ uri: `https://i.ytimg.com/vi/${encodeURIComponent(data.trailer)}/hqdefault.jpg` }}
                style={styles.trailerPoster}
                resizeMode="cover"
              />
              <View style={styles.trailerOverlay}>
                <View style={styles.trailerPlayCircle}><Ionicons name="play" size={28} color="#fff" /></View>
                <Text style={styles.trailerOverlayText}>Lire dans Erëmīa</Text>
              </View>
            </Pressable>
          )}
        </>
      ) : null}

      {data.providers.length ? (
        <>
          <Text style={styles.label}>DISPONIBILITÉ (FRANCE)</Text>
          <View style={styles.providers}>
            {data.providers.map((p) => (
              <View key={p.name} style={styles.provider}>
                {p.logo ? <Image source={{ uri: p.logo }} style={styles.logo} /> : null}
                <Text style={styles.providerText}>{p.name}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.credit}>Données de disponibilité : TMDB / JustWatch.</Text>
        </>
      ) : null}

      {data.cast.length ? (
        <>
          <Text style={styles.label}>{kind === 'manga' ? 'PERSONNAGES' : 'CASTING PRINCIPAL'}</Text>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={data.cast}
            keyExtractor={(c, i) => `${c.name}${i}`} contentContainerStyle={{ gap: 14 }}
            renderItem={({ item }) => (
              <View style={styles.castItem}>
                {item.photo ? <Image source={{ uri: item.photo }} style={styles.castPhoto} /> : (
                  <View style={[styles.castPhoto, styles.castEmpty]}><Ionicons name="person" size={28} color={colors.mutedForeground} /></View>
                )}
                <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.castRole} numberOfLines={1}>{item.character}</Text>
              </View>
            )} />
        </>
      ) : null}

      {data.reviews.length ? (
        <>
          <Text style={styles.label}>CRITIQUES DES MEMBRES</Text>
          {summaryLoading || reviewSummary ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHead}>
                <Ionicons name="sparkles" size={17} color={colors.primary} />
                <Text style={styles.summaryTitle}>Résumé des critiques par IA</Text>
              </View>
              {summaryLoading ? (
                <View style={styles.summaryLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.summaryBody}>Lecture des avis en cours…</Text></View>
              ) : <Text style={styles.summaryBody}>{reviewSummary}</Text>}
              <Text style={styles.summaryNote}>Synthèse automatique des avis affichés, à prendre comme un aperçu.</Text>
            </View>
          ) : null}
          {data.reviews.map((r, i) => (
            <View key={`${r.author}${i}`} style={styles.review}>
              <View style={styles.reviewHead}>
                <Text style={styles.reviewAuthor}>{r.author}</Text>
                {r.rating ? <View style={styles.reviewRating}><Ionicons name="star" size={12} color="#000" /><Text style={styles.reviewRatingText}>{r.rating}/10</Text></View> : null}
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
              <Text style={styles.reviewText}>{r.content}</Text>
            </View>
          ))}
          <Text style={styles.credit}>Critiques : TMDB, publiées par leurs auteurs.</Text>
        </>
      ) : null}

      {data.similar.length ? (
        <>
          <Text style={styles.label}>TITRES SIMILAIRES</Text>
          <Text style={styles.constellationSub}>Des films et séries à découvrir dans le même esprit.</Text>
          <FlatList
            horizontal
            data={data.similar}
            keyExtractor={(it) => `similar:${it.kind}:${it.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2 }}
            renderItem={({ item }) => <PosterCard item={item} width={112} />}
          />
        </>
      ) : null}

      {data.constellation.items.length ? (
        <>
          <Text style={styles.label}>CONSTELLATION</Text>
          <Text style={styles.constellationSub}>Les titres liés : même réalisateur, même saga ou univers partagé.</Text>
          <View style={styles.legend}>
            <LegendDot color={C_DIRECTOR} label="Même réalisateur" />
            <LegendDot color={C_SAGA} label="Même saga" />
            <LegendDot color={C_SIMILAR} label="Dans le même esprit" />
          </View>
          <Constellation name={data.constellation.name} items={data.constellation.items} poster={poster ?? null}
            onPick={(it) => openTitle(router, it)} />
          <Text style={styles.credit}>{data.constellation.name}</Text>
        </>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 8, paddingBottom: 12 },
  loadingPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#15161B', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.58)' },
  trailerPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  trailerPoster: { width: '100%', height: '100%' },
  trailerOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.22)' },
  trailerPlayCircle: { width: 58, height: 42, borderRadius: 12, backgroundColor: '#e62117', alignItems: 'center', justifyContent: 'center' },
  trailerOverlayText: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
  trailerText: { color: '#fff', fontWeight: '700' },
  trailerPlayer: { width: '100%', gap: 8 },
  webViewFrame: { width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  trailerWebView: { width: '100%', height: 220, backgroundColor: 'transparent' },
  videoLoadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.72)' },
  emptyMessage: { color: colors.mutedForeground, lineHeight: 20 },
  retryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
  retryText: { color: colors.foreground, fontWeight: '700' },
  trailerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  closeTrailer: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  openYoutube: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#C4302B', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  label: { color: '#F04455', letterSpacing: 1.4, fontSize: 11, fontWeight: '900', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#211820' },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: colors.border },
  logo: { width: 28, height: 28, borderRadius: 6 },
  providerText: { color: colors.foreground, fontWeight: '600' },
  credit: { color: colors.mutedForeground, fontSize: 11 },
  castItem: { width: 84, alignItems: 'center', gap: 4 },
  castPhoto: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.muted, borderWidth: 1, borderColor: '#49313D' },
  castEmpty: { alignItems: 'center', justifyContent: 'center' },
  castName: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  castRole: { color: colors.mutedForeground, fontSize: 12 },
  summaryCard: { borderRadius: 12, padding: 13, backgroundColor: colors.card, gap: 9, borderWidth: 1, borderColor: colors.border },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  summaryTitle: { color: colors.foreground, fontWeight: '800', fontSize: 14 },
  summaryLoading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  summaryBody: { color: colors.foreground, lineHeight: 21 },
  summaryNote: { color: colors.mutedForeground, fontSize: 10, lineHeight: 15 },
  review: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reviewAuthor: { color: colors.foreground, fontWeight: '700' },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  reviewRatingText: { color: '#000', fontWeight: '800', fontSize: 12 },
  reviewDate: { color: colors.mutedForeground, fontSize: 12 },
  reviewText: { color: colors.foreground, lineHeight: 20 },
  constellationSub: { color: colors.mutedForeground, lineHeight: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.mutedForeground, fontSize: 12 },
  cosmos: { width: '100%', backgroundColor: '#090A10', borderRadius: 20, borderWidth: 1, borderColor: '#3C1C2B', padding: 6, alignItems: 'center', overflow: 'hidden' },
  center: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: '#FF5B70', overflow: 'hidden', shadowColor: '#FF173F', shadowOpacity: 0.9, shadowRadius: 14, elevation: 10 },
  centerImg: { width: 92, height: 92 },
  sat: { position: 'absolute', width: SAT, height: SAT, borderRadius: SAT / 2, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.card, shadowColor: '#FF405C', shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  satImg: { width: SAT - 4, height: SAT - 4, borderRadius: (SAT - 4) / 2 },
  cosmosHint: { color: colors.mutedForeground, fontSize: 12, marginTop: 8, marginBottom: 2 },
});