import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PosterCard } from '@/components/PosterCard';
import { fetchExtras, type Extras } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import type { Detail } from '@/lib/catalog';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

const W = 320;
const H = 320;
const R = 118;
const SAT = 52;
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
  const shown = items.slice(0, 12);
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
          return (
            <View
              key={`l${i}`}
              style={{
                position: 'absolute', left: mx - len / 2, top: my - 0.75, width: len, height: 1.5,
                backgroundColor: color, opacity: 0.55, transform: [{ rotate: `${ang}deg` }],
              }}
            />
          );
        })}

        <View style={[styles.center, { left: cx - 46, top: cy - 46 }]}>
          {poster ? <Image source={{ uri: poster }} style={styles.centerImg} /> : <View style={[styles.centerImg, { backgroundColor: colors.muted }]} />}
        </View>

        {shown.map((it, i) => (
          <Pressable
            key={`${it.kind}:${it.id}`}
            onPress={() => onPick(it)}
            style={[styles.sat, { left: pts[i].x - SAT / 2, top: pts[i].y - SAT / 2, borderColor: color }]}
          >
            {it.poster ? <Image source={{ uri: it.poster }} style={styles.satImg} /> : <View style={[styles.satImg, { backgroundColor: colors.muted }]} />}
          </Pressable>
        ))}
      </View>
      <Text style={styles.cosmosHint}>Touchez un titre pour l’ouvrir.</Text>
    </View>
  );
}

export function FicheExtras({ kind, id, poster }: { kind: Kind; id: string; poster?: string | null }) {
  const router = useRouter();
  const [data, setData] = useState<Extras | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    fetchExtras(kind, id).then((result) => {
      if (active) setData(result);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [kind, id]);

  if (loading) return null;
  if (!data) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>INFORMATIONS COMPLÉMENTAIRES</Text>
        <Text style={styles.emptyMessage}>Impossible de charger ces informations. La fonction serveur doit être déployée et accessible.</Text>
      </View>
    );
  }
  if (!data.trailer && !data.providers.length && !data.cast.length && !data.reviews.length && !data.constellation.items.length) {
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
              <WebView
                source={{ uri: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.trailer)}?playsinline=1&autoplay=1&rel=0` }}
                style={styles.trailerWebView}
                javaScriptEnabled
                domStorageEnabled
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                originWhitelist={['https://*']}
              />
              <Pressable style={styles.closeTrailer} onPress={() => setShowTrailer(false)}>
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.trailerText}>Fermer la vidéo</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.trailerPreview} onPress={() => setShowTrailer(true)} accessibilityRole="button" accessibilityLabel="Lire la bande-annonce dans Erëmīa">
              <Image
                source={{ uri: `https://i.ytimg.com/vi/${encodeURIComponent(data.trailer)}/hqdefault.jpg` }}
                style={styles.trailerPoster}
                resizeMode="cover"
              />
              <View style={styles.trailerOverlay}>
                <View style={styles.trailerPlayCircle}>
                  <Ionicons name="play" size={28} color="#fff" />
                </View>
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
          <Text style={styles.label}>PERSONNAGES</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={data.cast}
            keyExtractor={(c, i) => `${c.name}${i}`}
            contentContainerStyle={{ gap: 14 }}
            renderItem={({ item }) => (
              <View style={styles.castItem}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={styles.castPhoto} />
                ) : (
                  <View style={[styles.castPhoto, styles.castEmpty]}>
                    <Ionicons name="person" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.castRole} numberOfLines={1}>{item.character}</Text>
              </View>
            )}
          />
        </>
      ) : null}

      {data.reviews.length ? (
        <>
          <Text style={styles.label}>CRITIQUES DES MEMBRES</Text>
          {data.reviews.map((r, i) => (
            <View key={`${r.author}${i}`} style={styles.review}>
              <View style={styles.reviewHead}>
                <Text style={styles.reviewAuthor}>{r.author}</Text>
                {r.rating ? (
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={12} color="#000" />
                    <Text style={styles.reviewRatingText}>{r.rating}/10</Text>
                  </View>
                ) : null}
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
              <Text style={styles.reviewText}>{r.content}</Text>
            </View>
          ))}
          <Text style={styles.credit}>Critiques : TMDB, publiées par leurs auteurs.</Text>
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
          <Constellation
            name={data.constellation.name}
            items={data.constellation.items}
            poster={poster ?? null}
            onPick={(it) => openTitle(router, it)}
          />
          <Text style={styles.credit}>{data.constellation.name}</Text>
        </>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24, gap: 14 },
  trailerPreview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  trailerPoster: { width: '100%', height: '100%' },
  trailerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.22)' },
  trailerPlayCircle: { width: 58, height: 42, borderRadius: 12, backgroundColor: '#e62117', alignItems: 'center', justifyContent: 'center' },
  trailerOverlayText: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
  trailerText: { color: '#fff', fontWeight: '700' },
  trailerPlayer: { width: '100%', gap: 8 },
  emptyMessage: { color: colors.mutedForeground, lineHeight: 20 },
  trailerWebView: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  closeTrailer: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  label: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, marginTop: 6 },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  provider: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card,
    borderRadius: 12, padding: 8, borderWidth: 1, borderColor: colors.border,
  },
  logo: { width: 28, height: 28, borderRadius: 6 },
  providerText: { color: colors.foreground, fontWeight: '600' },
  credit: { color: colors.mutedForeground, fontSize: 11 },
  castItem: { width: 90, alignItems: 'center', gap: 4 },
  castPhoto: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted },
  castEmpty: { alignItems: 'center', justifyContent: 'center' },
  castName: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  castRole: { color: colors.mutedForeground, fontSize: 12 },
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
  cosmos: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 8, alignItems: 'center' },
  center: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: colors.foreground, overflow: 'hidden' },
  centerImg: { width: 92, height: 92 },
  sat: { position: 'absolute', width: SAT, height: SAT, borderRadius: SAT / 2, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.card },
  satImg: { width: SAT - 4, height: SAT - 4, borderRadius: (SAT - 4) / 2 },
  cosmosHint: { color: colors.mutedForeground, fontSize: 12, marginBottom: 6 },
});