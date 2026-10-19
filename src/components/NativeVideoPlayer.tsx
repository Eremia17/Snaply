import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer, type AudioTrack, type SubtitleTrack } from 'expo-video';
import { colors } from '@/lib/theme';
import { inferContentType, normalizeMediaSources, type MediaSource } from '@/lib/mediaSources';

const EMPTY_SOURCES: MediaSource[] = [];

type Props = {
  /** Direct HTTPS .mp4/.m3u8 URL. Pass this from screen state or a route parameter. */
  sourceUrl?: string;
  /** Optional prioritized list of direct, authorized sources. */
  sources?: MediaSource[];
  title?: string;
  autoPlay?: boolean;
  onSourceChange?: (source: MediaSource | null) => void;
};

export function NativeVideoPlayer({
  sourceUrl,
  sources = EMPTY_SOURCES,
  title,
  autoPlay = true,
  onSourceChange,
}: Props) {
  const validSources = useMemo(() => {
    const direct: MediaSource[] = sourceUrl?.trim()
      ? [{
          id: 'direct-source',
          label: 'Source directe',
          uri: sourceUrl.trim(),
          contentType: inferContentType(sourceUrl.trim()),
        }]
      : [];
    return normalizeMediaSources([...direct, ...sources]);
  }, [sourceUrl, sources]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const activeSource = validSources[sourceIndex] ?? null;
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 1;
  });

  useEffect(() => {
    setSourceIndex(0);
    setPlayerError(null);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setSelectedAudioId(null);
    setSelectedSubtitleId(null);
  }, [validSources]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeSource) {
        setPlayerError(validSources.length
          ? 'Toutes les sources vidéo ont échoué.'
          : 'Saisis une URL HTTPS directe en .mp4 ou .m3u8.');
        onSourceChange?.(null);
        return;
      }
      try {
        await player.replaceAsync({
          uri: activeSource.uri,
          contentType: activeSource.contentType ?? inferContentType(activeSource.uri),
          metadata: { title: title ?? activeSource.label },
        });
        if (cancelled) return;
        setPlayerError(null);
        onSourceChange?.(activeSource);
        if (autoPlay) player.play();
      } catch (error) {
        if (cancelled) return;
        setPlayerError(error instanceof Error ? error.message : 'Impossible de charger cette source vidéo.');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeSource, autoPlay, onSourceChange, player, title, validSources.length]);

  useEffect(() => {
    const refreshTracks = () => {
      setAudioTracks([...player.availableAudioTracks]);
      setSubtitleTracks([...player.availableSubtitleTracks]);
    };
    const subscription = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') {
        setPlayerError(error?.message ?? 'La lecture de cette source a échoué.');
        return;
      }
      if (status === 'readyToPlay') refreshTracks();
    });
    const tracksSubscription = player.addListener('availableAudioTracksChange', refreshTracks);
    const subtitlesSubscription = player.addListener('availableSubtitleTracksChange', refreshTracks);
    return () => {
      subscription.remove();
      tracksSubscription.remove();
      subtitlesSubscription.remove();
    };
  }, [player]);

  const chooseAudio = (track: AudioTrack | null) => {
    player.audioTrack = track;
    setSelectedAudioId(track?.id ?? track?.language ?? null);
  };
  const chooseSubtitle = (track: SubtitleTrack | null) => {
    player.subtitleTrack = track;
    setSelectedSubtitleId(track?.id ?? track?.language ?? null);
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true, orientation: 'landscape' }}
        allowsPictureInPicture
      />
      {playerError ? (
        <View style={styles.status}>
          {activeSource && !playerError.includes('échoué') ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.statusText}>{playerError}</Text>
        </View>
      ) : null}
      {activeSource ? <Text style={styles.sourceLabel}>Source directe : {activeSource.label}</Text> : null}
      {audioTracks.length > 0 ? (
        <View style={styles.trackSection}>
          <Text style={styles.trackTitle}>Piste audio</Text>
          <View style={styles.trackRow}>
            {audioTracks.map((track, index) => {
              const key = track.id ?? track.language ?? String(index);
              const selected = selectedAudioId === key || (!selectedAudioId && track.isDefault);
              return (
                <Pressable key={key} onPress={() => chooseAudio(track)} style={[styles.trackChip, selected && styles.trackChipSelected]}>
                  <Text style={[styles.trackText, selected && styles.trackTextSelected]}>{track.label || track.name || track.language || `Audio ${index + 1}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {subtitleTracks.length > 0 ? (
        <View style={styles.trackSection}>
          <Text style={styles.trackTitle}>Sous-titres</Text>
          <View style={styles.trackRow}>
            <Pressable onPress={() => chooseSubtitle(null)} style={[styles.trackChip, selectedSubtitleId === null && styles.trackChipSelected]}>
              <Text style={[styles.trackText, selectedSubtitleId === null && styles.trackTextSelected]}>Désactivés</Text>
            </Pressable>
            {subtitleTracks.map((track, index) => {
              const key = track.id ?? track.language ?? String(index);
              const selected = selectedSubtitleId === key;
              return (
                <Pressable key={key} onPress={() => chooseSubtitle(track)} style={[styles.trackChip, selected && styles.trackChipSelected]}>
                  <Text style={[styles.trackText, selected && styles.trackTextSelected]}>{track.label || track.name || track.language || `Sous-titre ${index + 1}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {!playerError && activeSource && audioTracks.length === 0 && subtitleTracks.length === 0 ? (
        <Text style={styles.trackHint}>Les pistes audio et sous-titres apparaîtront ici si le flux les expose au lecteur natif.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', paddingBottom: 10 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  status: { padding: 12, alignItems: 'center', gap: 8 },
  statusText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  sourceLabel: { color: '#b7b7c2', fontSize: 11, paddingHorizontal: 10 },
  trackSection: { gap: 6, paddingHorizontal: 10, paddingTop: 4 },
  trackTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
  trackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trackChip: { borderWidth: 1, borderColor: '#464650', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  trackChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  trackText: { color: '#ddd', fontSize: 11 },
  trackTextSelected: { color: '#fff', fontWeight: '800' },
  trackHint: { color: '#b7b7c2', fontSize: 11, paddingHorizontal: 10, lineHeight: 16 },
});
