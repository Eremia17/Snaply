import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useStore } from '@/lib/store';
import { addToList, fetchLists, type UserList } from '@/lib/lists';
import { KIND_LABEL, fetchDetail, fetchFilmParts, fetchSeriesEpisodes, fetchSeriesMetadata, getDetail, useCatalog, type Detail, type FilmPart, type SeriesEpisode, type SeriesSeason } from '@/lib/catalog';
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
  const [downloadPickerOpen, setDownloadPickerOpen] = useState(false);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [seriesSourceId, setSeriesSourceId] = useState<string | null>(null);
  const [seasonUnavailable, setSeasonUnavailable] = useState(false);
  const [filmParts, setFilmParts] = useState<FilmPart[]>([]);
  const [filmCollection, setFilmCollection] = useState<string | null>(null);
  const [filmPartsLoading, setFilmPartsLoading] = useState(false);
  const [selectedFilmId, setSelectedFilmId] = useState(item.id);
  const [selectedFilmIds, setSelectedFilmIds] = useState<string[]>([item.id]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);

  useEffect(() => {
    pushHistory(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.kind, p.id]);

  useEffect(() => {
    let active = true;
    setPlayerOpen(false);
    setDownloadPickerOpen(false);
    setEpisodes([]);
    setSeriesSourceId(null);
    setSeasonUnavailable(false);
    setFilmParts([]);
    setFilmCollection(null);
    setSelectedFilmId(item.id);
    setSelectedFilmIds([item.id]);
    setSelectedEpisodes([]);
    setSeasonPickerOpen(false);
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
    setFilmParts([]);
    setFilmCollection(null);
    setSelectedFilmId(item.id);
    if (item.kind !== 'film') return () => { active = false; };
    setFilmPartsLoading(true);
    fetchFilmParts(item.id).then((result) => {
      if (!active) return;
      setFilmParts(result.parts);
      setFilmCollection(result.collection);
      const initialId = result.parts.some((part) => part.id === item.id) ? item.id : result.parts[0]?.id ?? item.id;
      setSelectedFilmId(initialId);
      setSelectedFilmIds([initialId]);
    }).catch(() => {
      if (active) { setFilmParts([]); setFilmCollection(null); }
    }).finally(() => { if (active) setFilmPartsLoading(false); });
    return () => { active = false; };
  }, [item.kind, item.id]);

  useEffect(() => {
    let active = true;
    setSeasons([]);
    setSeriesSourceId(null);
    setSeasonUnavailable(false);
    setSeasonsLoading(false);
    if (item.kind === 'film') return () => { active = false; };
    setSeasonsLoading(true);
    fetchSeriesMetadata(item.id, item.kind, item.title).then((result) => {
      if (!active) return;
      setSeasons(result.seasons);
      setSeriesSourceId(result.sourceId);
      setSeasonUnavailable(result.unavailable || result.seasons.length === 0);
      if (result.seasons.length) {
        setSeason(result.seasons[0].number);
        setEpisode(1);
      }
    }).catch(() => {
      if (active) {
        setSeasons([]);
        setSeriesSourceId(null);
        setSeasonUnavailable(true);
      }
    }).finally(() => {
      if (active) setSeasonsLoading(false);
    });
    return () => { active = false; };
  }, [item.kind, item.id, item.title]);

  useEffect(() => {
    let active = true;
    if (!downloadPickerOpen || item.kind === 'film' || !seriesSourceId || !seasons.some((s) => s.number === season)) {
      setEpisodes([]);
      return () => { active = false; };
    }
    setEpisodesLoading(true);
    fetchSeriesEpisodes(item.id, season, item.kind, item.title).then((result) => {
      if (!active) return;
      setEpisodes(result);
      if (result.length) {
        setEpisode(result[0].number);
        setSelectedEpisodes([]);
      }
    }).catch(() => {
      if (active) setEpisodes([]);
    }).finally(() => {
      if (active) setEpisodesLoading(false);
    });
    return () => { active = false; };
  }, [downloadPickerOpen, item.kind, item.id, item.title, season, seriesSourceId, seasons]);

  const toggleEpisodeSelection = (number: number) => {
    setSelectedEpisodes((current) => current.includes(number)
      ? current.filter((n) => n !== number)
      : [...current, number].sort((a, b) => a - b));
  };
  const toggleAllEpisodes = () => {
    setSelectedEpisodes((current) => current.length === episodes.length
      ? []
      : episodes.map((ep) => ep.number));
  };
  const toggleFilmSelection = (id: string) => {
    setSelectedFilmIds((current) => {
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      if (next.length) setSelectedFilmId(next[next.length - 1]);
      return next;
    });
  };

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

  const playbackId = seriesSourceId ?? item.id;
  const playbackUrl = item.kind === 'film'
    ? `https://vidsrc.to/embed/movie/${encodeURIComponent(selectedFilmId)}`
    : `https://vidsrc.to/embed/tv/${encodeURIComponent(playbackId)}/${season}/${episode}`;

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
      <ScrollView removeClippedSubviews={false} style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <FicheExtras kind={item.kind} id={item.id} poster={item.poster} title={item.title} />
        <FicheAssistant title={item.title} kind={item.kind} year={detail?.year ?? item.year} synopsis={detail?.synopsis ?? ''} />

        <View style={styles.downloadEntry}>
          <Pressable style={styles.downloadButton} onPress={() => setDownloadPickerOpen(true)}>
            <Ionicons name="download-outline" size={22} color="#fff" />
            <View style={styles.downloadButtonCopy}>
              <Text style={styles.downloadButtonTitle}>Télécharger</Text>
              <Text style={styles.downloadButtonSub}>Choisir la langue, la saison et l’épisode</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
          {playerOpen ? (
            <View style={styles.playerFrame}>
              <WebView
                key={`${item.kind}-${item.kind === 'film' ? selectedFilmId : playbackId}-${season}-${episode}-${language}`}
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


        {!detail ? <Text style={styles.note}>Chargement des informations…</Text> : null}
      </ScrollView>

      <Modal visible={downloadPickerOpen} transparent animationType="slide" onRequestClose={() => setDownloadPickerOpen(false)}>
        <View style={styles.downloadModalRoot}>
          <Pressable style={styles.downloadBackdrop} onPress={() => setDownloadPickerOpen(false)} />
          <View style={styles.downloadSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.downloadHeading}>
              <View style={styles.downloadHeadingIcon}><Ionicons name="download-outline" size={23} color="#fff" /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.downloadSheetTitle}>Préparer le téléchargement</Text>
                <Text style={styles.downloadSheetSubtitle} numberOfLines={2}>{detail?.title || item.title}</Text>
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={() => setDownloadPickerOpen(false)} style={styles.downloadClose}><Ionicons name="close" size={20} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView style={styles.downloadOptionsScroll} contentContainerStyle={styles.downloadOptions} showsVerticalScrollIndicator={false}>
              <Text style={styles.optionLabel}>LANGUE SOUHAITÉE</Text>
              <View style={styles.optionChips}>
                {([
                  ['fr', 'VF · Français'],
                  ['vostfr', 'VOSTFR'],
                  ['en', 'VO · Anglais'],
                  ['original', 'Langue originale'],
                ] as const).map(([value, label]) => (
                  <Pressable key={value} onPress={() => setLanguage(value)} style={[styles.playerChip, language === value && styles.playerChipOn]}>
                    <Text style={[styles.playerChipText, language === value && styles.playerChipTextOn]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.languageNote}>Choix souhaité uniquement : la disponibilité réelle de la piste audio ne pourra être confirmée qu’après connexion des sources de téléchargement.</Text>
              {item.kind === 'film' ? (
                <>
                  <View style={styles.optionDivider} />
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionLabel}>{filmCollection ? `FILMS DE LA SAGA · ${filmCollection.toUpperCase()}` : 'AUTRES FILMS DE LA SAGA'}</Text>
                    {filmPartsLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                  </View>
                  {filmParts.length > 1 ? (
                    <>
                    <Pressable style={styles.selectAllRow} onPress={() => {
                      const allIds = filmParts.map((part) => part.id);
                      setSelectedFilmIds((current) => current.length === allIds.length ? [] : allIds);
                    }}>
                      <Ionicons name={selectedFilmIds.length === filmParts.length ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                      <Text style={styles.selectAllText}>{selectedFilmIds.length === filmParts.length ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
                      <Text style={styles.selectionCount}>{selectedFilmIds.length} sélectionné(s)</Text>
                    </Pressable>
                    <View style={styles.filmPartsList}>
                      {filmParts.map((part, index) => (
                        <Pressable key={part.id} onPress={() => toggleFilmSelection(part.id)} style={[styles.filmPartRow, selectedFilmIds.includes(part.id) && styles.filmPartRowOn]}>
                          {part.poster ? <Image source={{ uri: part.poster }} style={styles.filmPartPoster} resizeMode="cover" /> : <View style={styles.filmPartPosterEmpty}><Ionicons name="film-outline" size={18} color={colors.mutedForeground} /></View>}
                          <View style={styles.filmPartCopy}>
                            <Text style={styles.filmPartOrder}>{`FILM ${index + 1}`}{part.year ? ` · ${part.year}` : ''}</Text>
                            <Text style={styles.filmPartTitle} numberOfLines={2}>{part.title}</Text>
                            {part.current ? <Text style={styles.filmPartCurrent}>Film affiché</Text> : null}
                          </View>
                          <Ionicons name={selectedFilmIds.includes(part.id) ? 'checkbox' : 'square-outline'} size={20} color={selectedFilmIds.includes(part.id) ? colors.primary : colors.mutedForeground} />
                        </Pressable>
                      ))}
                    </View>
                    </>
                  ) : (
                    <Text style={styles.noEpisodes}>{filmPartsLoading ? 'Recherche des autres films de cette saga…' : 'Aucune autre partie référencée. Ce film reste sélectionnable seul.'}</Text>
                  )}
                </>
              ) : null}
              {item.kind !== 'film' ? (
                <>
                  <View style={styles.optionDivider} />
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionLabel}>SAISON</Text>
                    {seasonsLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                  </View>
                  {seasons.length > 0 ? (
                    <>
                    <Pressable style={styles.seasonDropdown} onPress={() => setSeasonPickerOpen((open) => !open)}>
                      <Text style={styles.seasonDropdownText}>{seasons.find((s) => s.number === season)?.name ?? 'Choisir une saison'}</Text>
                      <Ionicons name={seasonPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.foreground} />
                    </Pressable>
                    {seasonPickerOpen ? (
                      <View style={styles.seasonDropdownList}>
                        {seasons.map((s) => (
                          <Pressable key={s.number} onPress={() => {
                            setSeason(s.number);
                            setEpisode(1);
                            setSelectedEpisodes([]);
                            setSeasonPickerOpen(false);
                          }} style={styles.seasonDropdownItem}>
                            <Text style={styles.seasonDropdownText}>{s.name}</Text>
                            <Text style={styles.seasonEpisodeCount}>{s.episodeCount} épisode(s)</Text>
                            {season === s.number ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    </>
                  ) : (
                    <Text style={styles.noEpisodes}>{seasonsLoading ? 'Récupération des saisons officielles…' : seasonUnavailable ? 'Les saisons officielles de ce titre ne sont pas disponibles. Aucune saison fictive ne sera proposée.' : 'Aucune saison disponible.'}</Text>
                  )}
                  {seasons.length > 0 ? (
                    <>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionLabel}>ÉPISODE</Text>
                        {episodesLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.episodeCount}>{episodes.length} disponible(s)</Text>}
                      </View>
                      {episodesLoading ? (
                        <View style={styles.episodeLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.noEpisodes}>Chargement des épisodes réels…</Text></View>
                      ) : episodes.length ? (
                        <>
                        <Pressable style={styles.selectAllRow} onPress={toggleAllEpisodes}>
                          <Ionicons name={selectedEpisodes.length === episodes.length ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                          <Text style={styles.selectAllText}>{selectedEpisodes.length === episodes.length ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
                          <Text style={styles.selectionCount}>{selectedEpisodes.length} sélectionné(s)</Text>
                        </Pressable>
                        <View style={styles.episodeGrid}>
                          {episodes.map((ep) => {
                            const checked = selectedEpisodes.includes(ep.number);
                            return (
                              <Pressable key={ep.number} onPress={() => toggleEpisodeSelection(ep.number)} style={[styles.episodeOption, checked && styles.episodeOptionOn]}>
                                <View style={styles.episodeCheckboxRow}>
                                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={17} color={checked ? colors.primary : colors.mutedForeground} />
                                  <Text style={[styles.episodeNumber, checked && styles.episodeNumberOn]}>E{String(ep.number).padStart(2, '0')}</Text>
                                </View>
                                <Text style={[styles.episodeName, checked && styles.episodeNameOn]} numberOfLines={2}>{ep.name}</Text>
                                {ep.airDate ? <Text style={styles.episodeDate}>{ep.airDate}</Text> : null}
                              </Pressable>
                            );
                          })}
                        </View>
                        </> 
                      ) : <Text style={styles.noEpisodes}>Aucun épisode réel trouvé pour cette saison. Aucun numéro fictif ne sera ajouté.</Text>}
                    </>
                  ) : null}
                </>
              ) : null}
              <View style={styles.downloadNotice}>
                <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
                <Text style={styles.downloadNoticeText}>Les saisons, épisodes et sagas affichés viennent des métadonnées réelles. Les sources de fichiers et la vérification des pistes audio seront ajoutées dans une prochaine étape : aucun faux lien de téléchargement n’est créé.</Text>
              </View>
              <Text style={styles.selectionSummary}>
                {item.kind === 'film'
                  ? `${selectedFilmIds.length || 0} film(s) sélectionné(s)`
                  : `${selectedEpisodes.length} épisode(s) sélectionné(s) · ${seasons.find((s) => s.number === season)?.name ?? 'aucune saison'}`}
              </Text>
            </ScrollView>
            <Pressable
              style={[styles.continueButton, styles.continueButtonDisabled]}
              disabled
              accessibilityLabel="Téléchargement indisponible tant que les sources ne sont pas connectées"
            >
              <Ionicons name="download-outline" size={21} color="#fff" />
              <Text style={styles.continueButtonText}>Sources de téléchargement à connecter</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  content: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 18 },
  backdropHero: { position: 'absolute', top: 0, left: 0, right: 0, height: 250, overflow: 'hidden' },
  backdropShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,11,16,0.72)' },
  posterWrap: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  poster: { width: 154, aspectRatio: 2 / 3, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  posterEmpty: { alignItems: 'center', justifyContent: 'center', padding: 12 },
  posterEmptyText: { color: colors.mutedForeground, textAlign: 'center', fontWeight: '600' },
  kind: { color: colors.primary, letterSpacing: 3, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 27, fontWeight: '900', marginTop: 4, lineHeight: 32 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  ratingText: { color: '#000', fontWeight: '900', fontSize: 18 },
  ratingSub: { color: '#000', fontWeight: '600' },
  meta: { color: colors.mutedForeground },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  genre: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  genreText: { color: colors.foreground, fontSize: 13 },
  synopsis: { color: colors.foreground, lineHeight: 23, marginTop: 10, fontSize: 15 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11,
  },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { color: colors.foreground, fontWeight: '600' },
  sectionLabel: { color: colors.mutedForeground, letterSpacing: 1.5, fontSize: 11, marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  stars: { flexDirection: 'row', gap: 6, marginTop: 10 },
  filmPartsList: { gap: 8 },
  filmPartRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filmPartRowOn: { borderColor: colors.primary, backgroundColor: 'rgba(210,55,92,0.12)' },
  filmPartPoster: { width: 48, height: 68, borderRadius: 8, backgroundColor: colors.muted },
  filmPartPosterEmpty: { width: 48, height: 68, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  filmPartCopy: { flex: 1, gap: 3 },
  filmPartOrder: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  filmPartTitle: { color: colors.foreground, fontSize: 13, fontWeight: '800' },
  filmPartCurrent: { color: colors.mutedForeground, fontSize: 10 },
  downloadEntry: { marginTop: 18, marginBottom: 8, gap: 12 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  downloadButtonCopy: { flex: 1, gap: 3 },
  downloadButtonTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  downloadButtonSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11, lineHeight: 16 },
  downloadModalRoot: { flex: 1, justifyContent: 'flex-end' },
  downloadBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.68)' },
  downloadSheet: { maxHeight: '78%', backgroundColor: '#111216', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 6, paddingHorizontal: 12, paddingBottom: 9, borderWidth: 1, borderColor: colors.border, gap: 6 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: colors.muted, marginBottom: 2 },
  downloadHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  downloadHeadingIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  downloadSheetTitle: { color: colors.foreground, fontSize: 15, fontWeight: '900' },
  downloadSheetSubtitle: { color: colors.mutedForeground, fontSize: 13 },
  downloadClose: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  downloadOptionsScroll: { flexShrink: 1 },
  downloadOptions: { gap: 6, paddingBottom: 5 },
  optionLabel: { color: colors.mutedForeground, fontSize: 9, letterSpacing: 1.1, fontWeight: '900' },
  optionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  languageNote: { color: colors.mutedForeground, fontSize: 9, lineHeight: 12 },
  optionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  seasonChip: { maxWidth: 210, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  seasonDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  seasonDropdownText: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  seasonDropdownList: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, overflow: 'hidden' },
  seasonDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  seasonEpisodeCount: { flex: 1, textAlign: 'right', color: colors.mutedForeground, fontSize: 11 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  selectAllText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  selectionCount: { marginLeft: 'auto', color: colors.mutedForeground, fontSize: 10 },
  episodeCheckboxRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  selectionSummary: { color: colors.foreground, fontSize: 12, fontWeight: '800', paddingVertical: 5 },
  noEpisodes: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  episodeCount: { color: colors.mutedForeground, fontSize: 11 },
  episodeLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  episodeOption: { width: '31%', minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 6, gap: 2 },
  episodeOptionOn: { borderColor: colors.primary, backgroundColor: 'rgba(210,55,92,0.16)' },
  episodeNumber: { color: colors.mutedForeground, fontSize: 11, fontWeight: '900' },
  episodeNumberOn: { color: colors.primary },
  episodeName: { color: colors.foreground, fontSize: 10, fontWeight: '700' },
  episodeNameOn: { color: colors.foreground },
  episodeDate: { color: colors.mutedForeground, fontSize: 9 },
  downloadNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  downloadNoticeText: { flex: 1, color: colors.mutedForeground, fontSize: 9, lineHeight: 13 },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, marginTop: 0 },
  continueButtonDisabled: { opacity: 0.4 },
  continueButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  playerSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
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