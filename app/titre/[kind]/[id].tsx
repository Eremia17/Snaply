import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useStore } from '@/lib/store';
import { addToList, fetchLists, type UserList } from '@/lib/lists';
import { KIND_LABEL, fetchDetail, fetchSeriesSeasons, getDetail, useCatalog, type Detail, type SeriesSeason } from '@/lib/catalog';
import type { Item, Kind } from '@/lib/types';
import { colors } from '@/lib/theme';
import { FicheExtras } from '@/components/FicheExtras';
import { FicheAssistant } from '@/components/FicheAssistant';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TitreScreen() {
  const p = useLocalSearchParams<{ kind: Kind; id: string; title: string; poster?: string; backdrop?: string; year?: string }>();
  const router = useRouter();
  const item: Item = {
    kind: p.kind,
    id: String(p.id),
    title: String(p.title ?? ''),
    poster: p.poster || null,
    backdrop: p.backdrop || null,
    year: p.year || null,
  };
  useCatalog();
  const { isFavorite, toggleFavorite, pushHistory } = useStore();
  const fav = isFavorite(item);
  const [remote, setRemote] = useState<Detail | null>(null);
  const matchingRemote = remote?.kind === item.kind && remote.id === item.id ? remote : null;
  const detail = matchingRemote ?? getDetail(item.kind, item.id);
  const [myRating, setMyRating] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lists, setLists] = useState<UserList[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState<SeriesSeason[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'vostfr' | 'en' | 'original'>('fr');
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    pushHistory(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.kind, p.id]);

  useEffect(() => {
    let active = true;
    setPlayerOpen(false);
    setSeason(1);
    setEpisode(1);
    setLanguage('fr');
    const cached = getDetail(item.kind, item.id);
    setRemote(cached ?? null);
    // Le cache de catalogue est léger : charger aussi les détails complets (durée, synopsis, arrière-plan…).
    fetchDetail(item.kind, item.id).then((result) => {
      if (active && result) setRemote(result);
    }).catch(() => {
      // Conserver les données du catalogue si le service détaillé est temporairement indisponible.
    });
    AsyncStorage.getItem('mv:ratings').then((v) => {
      if (!active) return;
      const all = v ? JSON.parse(v) : {};
      setMyRating(all[`${item.kind}:${item.id}`] ?? 0);
    }).catch(() => {
      if (active) setMyRating(0);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.kind, item.id]);

  useEffect(() => {
    let active = true;
    setSeasons([]);
    setSeasonsLoading(false);
    if (item.kind === 'film' || item.kind === 'manga') return () => { active = false; };
    setSeasonsLoading(true);
    fetchSeriesSeasons(item.id).then((result) => {
      if (!active) return;
      setSeasons(result);
      if (result.length) {
        setSeason(result[0].number);
        setEpisode(1);
      }
    }).catch(() => {
      if (active) setSeasons([]);
    }).finally(() => {
      if (active) setSeasonsLoading(false);
    });
    return () => { active = false; };
  }, [item.kind, item.id]);

  const [seen, setSeen] = useState(false);
  useEffect(() => {
    let active = true;
    setSeen(false);
    AsyncStorage.getItem('mv:seen').then((v) => {
      if (!active) return;
      const all = v ? JSON.parse(v) : {};
      setSeen(!!all[`${item.kind}:${item.id}`]);
    }).catch(() => {
      if (active) setSeen(false);
    });
    return () => { active = false; };
  }, [item.kind, item.id]);

  const toggleSeen = async () => {
    const v = await AsyncStorage.getItem('mv:seen');
    const all = v ? JSON.parse(v) : {};
    const key = `${item.kind}:${item.id}`;
    all[key] = !all[key];
    setSeen(!!all[key]);
    await AsyncStorage.setItem('mv:seen', JSON.stringify(all));
  };

  const rate = async (n: number) => {
    setMyRating(n);
    const v = await AsyncStorage.getItem('mv:ratings');
    const all = v ? JSON.parse(v) : {};
    all[`${item.kind}:${item.id}`] = n;
    await AsyncStorage.setItem('mv:ratings', JSON.stringify(all));
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setLists(null);
    try {
      setLists(await fetchLists());
    } catch (e: any) {
      Alert.alert('Connexion requise', 'Les listes personnelles demandent un compte (Paramètres).');
      setPickerOpen(false);
    }
  };

  const pickList = async (list: UserList) => {
    setAdding(true);
    try {
      await addToList(list.id, item);
      setPickerOpen(false);
      Alert.alert('Ajouté', `« ${item.title} » a été ajouté à « ${list.title} ».`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setAdding(false);
    }
  };

  const share = () =>
    Share.share({
      message: `${item.title}${detail?.rating ? ` — ★ ${detail.rating.toFixed(1)}/10` : ''} sur Erëmīa`,
    });

  const meta = [detail?.year ?? item.year, detail?.runtime].filter(Boolean).join(' · ');

  const playbackUrl = item.kind === 'film'
    ? `https://vidsrc.to/embed/movie/${encodeURIComponent(item.id)}`
    : `https://vidsrc.to/embed/tv/${encodeURIComponent(item.id)}/${season}/${episode}`;

  const openPlaybackSource = async () => {
    try {
      await Linking.openURL(playbackUrl);
    } catch {
      Alert.alert('Ouverture impossible', 'Le téléphone ne peut pas ouvrir cette source vidéo pour le moment.');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View pointerEvents="none" style={styles.backdropHero}>
          {(detail?.backdrop || item.backdrop) ? <Image source={{ uri: detail?.backdrop || item.backdrop || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.backdropShade} />
        </View>
        <View style={styles.posterWrap}>
          {(detail?.poster || item.poster) ? (
            <Image source={{ uri: detail?.poster || item.poster || undefined }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.posterEmpty]}>
              <Text style={styles.posterEmptyText}>{item.title}</Text>
            </View>
          )}
        </View>

        <Text style={styles.kind}>{KIND_LABEL[item.kind]}</Text>
        <Text style={styles.title}>{detail?.title || item.title}</Text>

        <View style={styles.metaRow}>
          {detail && detail.rating > 0 ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={16} color="#000" />
              <Text style={styles.ratingText}>{detail.rating.toFixed(1)}</Text>
              <Text style={styles.ratingSub}>/10</Text>
            </View>
          ) : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>

        {detail && detail.genres.length ? (
          <View style={styles.genres}>
            {detail.genres.map((g) => (
              <View key={g} style={styles.genre}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {detail?.synopsis ? <Text style={styles.synopsis}>{detail.synopsis}</Text> : null}

        <View style={styles.buttons}>
          <Btn label={fav ? 'Retirer de ma liste' : 'Ma liste'} icon={fav ? 'heart' : 'heart-outline'} onPress={() => toggleFavorite(item)} primary />
          <Btn label="Partager" icon="share-social-outline" onPress={share} />
          <Btn label={seen ? 'Vu' : 'Marquer comme vu'} icon={seen ? 'checkmark-circle' : 'checkmark-outline'} onPress={toggleSeen} />
          <Btn label="Ajouter à…" icon="list-outline" onPress={openPicker} />
          <Btn
            label="Publier un avis"
            icon="chatbubbles-outline"
            onPress={() =>
              router.push({ pathname: '/communaute/nouveau', params: { kind: item.kind, id: item.id, title: item.title, poster: item.poster ?? '' } })
            }
          />
          {item.kind === 'manga' ? (
            <Btn label="Lire les scans" icon="book-outline" primary onPress={() => router.push({ pathname: '/chapitres/[id]', params: { id: item.id, title: item.title } })} />
          ) : null}
          <Btn label="Comparer" icon="git-compare-outline" onPress={() => router.push('/comparer')} />
        </View>

        <Text style={styles.sectionLabel}>MA NOTE · {myRating}/10</Text>
        <View style={styles.stars}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Pressable key={i} onPress={() => rate(i + 1)} hitSlop={4}>
              <Ionicons name={i < myRating ? 'star' : 'star-outline'} size={24} color={colors.primary} />
            </Pressable>
          ))}
        </View>

        {item.kind !== 'manga' ? (
          <View style={styles.playerSection}>
            <Text style={styles.playerTitle}>Lecteur vidéo</Text>
            <Text style={styles.playerNote}>Sélectionnez une préférence de langue. Ce lecteur externe ne garantit pas que ce choix change la piste audio ou les sous-titres ; vérifiez les options proposées dans la vidéo.</Text>
            <View style={styles.playerControls}>
              {([
                ['fr', 'VF — Français'],
                ['vostfr', 'VOSTFR'],
                ['en', 'VO — Anglais'],
                ['original', 'Langue originale'],
              ] as const).map(([value, label]) => (
                <Pressable key={value} onPress={() => setLanguage(value)} style={[styles.playerChip, language === value && styles.playerChipOn]}>
                  <Text style={[styles.playerChipText, language === value && styles.playerChipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {item.kind !== 'film' ? (
              <View style={styles.playerControls}>
                <View style={styles.stepper}>
                  <Text style={styles.stepLabel}>Saison</Text>
                  <Pressable accessibilityLabel="Saison précédente" onPress={() => {
                    if (seasons.length) {
                      const index = seasons.findIndex((s) => s.number === season);
                      if (index > 0) setSeason(seasons[index - 1].number);
                    } else setSeason((v) => Math.max(1, v - 1));
                    setEpisode(1);
                  }} style={styles.stepButton} disabled={seasons.length > 0 && seasons.findIndex((s) => s.number === season) <= 0}><Ionicons name="remove" size={18} color={colors.foreground} /></Pressable>
                  <Text style={styles.stepValue}>{seasonsLoading ? '…' : season}</Text>
                  <Pressable accessibilityLabel="Saison suivante" onPress={() => {
                    if (seasons.length) {
                      const index = seasons.findIndex((s) => s.number === season);
                      if (index >= 0 && index < seasons.length - 1) setSeason(seasons[index + 1].number);
                    } else setSeason((v) => Math.min(20, v + 1));
                    setEpisode(1);
                  }} style={styles.stepButton} disabled={seasons.length > 0 && seasons.findIndex((s) => s.number === season) >= seasons.length - 1}><Ionicons name="add" size={18} color={colors.foreground} /></Pressable>
                </View>
                <View style={styles.stepper}>
                  <Text style={styles.stepLabel}>Épisode</Text>
                  <Pressable accessibilityLabel="Épisode précédent" onPress={() => setEpisode((v) => Math.max(1, v - 1))} style={styles.stepButton}><Ionicons name="remove" size={18} color={colors.foreground} /></Pressable>
                  <Text style={styles.stepValue}>{episode}</Text>
                  <Pressable accessibilityLabel="Épisode suivant" onPress={() => setEpisode((v) => Math.min(seasons.find((s) => s.number === season)?.episodeCount ?? 100, v + 1))} style={styles.stepButton} disabled={episode >= (seasons.find((s) => s.number === season)?.episodeCount ?? 100)}><Ionicons name="add" size={18} color={colors.foreground} /></Pressable>
                </View>
                {seasonsLoading ? <Text style={styles.playerNote}>Chargement des saisons réelles…</Text> : null}
                {!seasonsLoading && seasons.length > 0 ? <Text style={styles.playerNote}>{seasons.find((s) => s.number === season)?.name ?? `Saison ${season}`} · {seasons.find((s) => s.number === season)?.episodeCount ?? 0} épisodes</Text> : null}
              </View>
            ) : null}
            <View style={styles.playerActions}>
              <Pressable style={[styles.playerToggle, styles.playerActionButton]} onPress={() => setPlayerOpen((v) => !v)}>
                <Ionicons name={playerOpen ? 'close-circle-outline' : 'play-circle-outline'} size={20} color="#fff" />
                <Text style={styles.playerToggleText}>{playerOpen ? 'Fermer le lecteur' : 'Lire ici'}</Text>
              </Pressable>
              <Pressable style={[styles.playerToggle, styles.playerExternalButton]} onPress={openPlaybackSource}>
                <Ionicons name="open-outline" size={18} color={colors.foreground} />
                <Text style={styles.playerExternalText}>Ouvrir la source</Text>
              </Pressable>
            </View>
            {playerOpen ? (
              <View style={styles.playerFrame}>
                <WebView
                  key={`${item.kind}-${item.id}-${season}-${episode}-${language}`}
                  source={{ uri: playbackUrl }}
                  style={styles.playerWebView}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction
                  originWhitelist={['https://*']}
                  setSupportMultipleWindows={false}
                  startInLoadingState
                  renderLoading={() => <View style={styles.playerLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.playerNote}>Chargement du lecteur…</Text></View>}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <FicheExtras kind={item.kind} id={item.id} poster={item.poster} />
        <FicheAssistant title={item.title} kind={item.kind} year={detail?.year ?? item.year} synopsis={detail?.synopsis ?? ''} />

        {!detail ? <Text style={styles.note}>Chargement des informations…</Text> : null}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Choisir une liste</Text>
          {lists === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : lists.length === 0 ? (
            <Text style={styles.sheetEmpty}>Vous n’avez pas encore de liste. Créez-en une dans « Plus » › « Mes listes ».</Text>
          ) : (
            lists.map((l) => (
              <Pressable key={l.id} style={styles.sheetRow} onPress={() => pickList(l)} disabled={adding}>
                <Text style={styles.sheetRowText}>{l.title}</Text>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              </Pressable>
            ))
          )}
        </View>
      </Modal>
    </>
  );
}

function Btn({ label, icon, onPress, primary }: { label: string; icon: IconName; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, primary && styles.btnPrimary]}>
      <Ionicons name={icon} size={18} color={primary ? '#fff' : colors.foreground} />
      <Text style={[styles.btnText, primary && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  backdropHero: { position: 'absolute', top: 0, left: 0, right: 0, height: 640, overflow: 'hidden' },
  backdropShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,11,16,0.72)' },
  posterWrap: { alignItems: 'center', marginBottom: 20 },
  poster: { width: 210, aspectRatio: 2 / 3, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  posterEmpty: { alignItems: 'center', justifyContent: 'center', padding: 12 },
  posterEmptyText: { color: colors.mutedForeground, textAlign: 'center', fontWeight: '600' },
  kind: { color: colors.primary, letterSpacing: 3, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 30, fontWeight: '900', marginTop: 6, lineHeight: 34 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  ratingText: { color: '#000', fontWeight: '900', fontSize: 18 },
  ratingSub: { color: '#000', fontWeight: '600' },
  meta: { color: colors.mutedForeground },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  genre: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  genreText: { color: colors.foreground, fontSize: 13 },
  synopsis: { color: colors.foreground, lineHeight: 23, marginTop: 16, fontSize: 15 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11,
  },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { color: colors.foreground, fontWeight: '600' },
  sectionLabel: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, marginTop: 26 },
  stars: { flexDirection: 'row', gap: 6, marginTop: 10 },
  playerSection: { marginTop: 28, paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  playerTitle: { color: colors.foreground, fontSize: 23, fontWeight: '900' },
  playerNote: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
  playerControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  playerChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  playerChipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  playerChipText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  playerChipTextOn: { color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  stepLabel: { color: colors.mutedForeground, fontSize: 12 },
  stepButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.muted },
  stepValue: { color: colors.foreground, minWidth: 16, textAlign: 'center', fontWeight: '800' },
  playerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  playerActionButton: { flex: 1, minWidth: 140 },
  playerExternalButton: { flex: 1, minWidth: 140, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  playerToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 16 },
  playerToggleText: { color: '#fff', fontWeight: '800' },
  playerExternalText: { color: colors.foreground, fontWeight: '800' },
  playerFrame: { width: '100%', height: 240, overflow: 'hidden', borderRadius: 14, backgroundColor: '#000', borderWidth: 1, borderColor: colors.border },
  playerWebView: { flex: 1, backgroundColor: '#000' },
  playerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#111' },
  note: { color: colors.mutedForeground, marginTop: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.card, padding: 20, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetTitle: { color: colors.foreground, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sheetEmpty: { color: colors.mutedForeground, lineHeight: 20, paddingVertical: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sheetRowText: { color: colors.foreground, fontSize: 15 },
});