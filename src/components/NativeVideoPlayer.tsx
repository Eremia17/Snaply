import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors } from '@/lib/theme';
import { inferContentType, normalizeMediaSources, type MediaSource } from '@/lib/mediaSources';

type Props = {
  sources: MediaSource[];
  title?: string;
  autoPlay?: boolean;
  onSourceChange?: (source: MediaSource | null) => void;
};

export function NativeVideoPlayer({
  sources,
  title,
  autoPlay = true,
  onSourceChange,
}: Props) {
  const validSources = normalizeMediaSources(sources);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const attemptedIndex = useRef(-1);
  const activeSource = validSources[sourceIndex] ?? null;
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    setSourceIndex(0);
    setPlayerError(null);
    attemptedIndex.current = -1;
  }, [sources]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeSource) {
        if (validSources.length === 0) {
          setPlayerError('Aucune source vidéo directe et autorisée n’est configurée.');
        } else {
          setPlayerError('Toutes les sources vidéo ont échoué.');
        }
        onSourceChange?.(null);
        return;
      }
      if (attemptedIndex.current === sourceIndex) return;
      attemptedIndex.current = sourceIndex;
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
      } catch {
        if (cancelled) return;
        setSourceIndex((current) => current + 1);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeSource, autoPlay, onSourceChange, player, sourceIndex, title, validSources.length]);

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status, error }) => {
      if (status !== 'error') return;
      setPlayerError(error?.message ?? 'La lecture de cette source a échoué.');
      setSourceIndex((current) => current + 1);
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />
      {!activeSource || playerError ? (
        <View style={styles.status}>
          {activeSource && sourceIndex < validSources.length ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.statusText}>{playerError ?? 'Préparation du lecteur…'}</Text>
        </View>
      ) : null}
      {activeSource ? <Text style={styles.sourceLabel}>Source : {activeSource.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  status: { padding: 12, alignItems: 'center', gap: 8 },
  statusText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  sourceLabel: { color: '#b7b7c2', fontSize: 11, paddingHorizontal: 10, paddingBottom: 8 },
});
