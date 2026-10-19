import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchSeriesEpisodes, fetchSeriesMetadata, type SeriesEpisode, type SeriesSeason } from '@/lib/catalog';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

type Props = {
  id: string;
  kind: Kind;
  title: string;
  onSelect: (selection: { season: number; episode: number; episodeTitle: string }) => void;
};

export function SeasonEpisodePicker({ id, kind, title, onSelect }: Props) {
  const [seasons, setSeasons] = useState<SeriesSeason[]>([]);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [episode, setEpisode] = useState<number | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingSeasons(true);
    setError(null);
    setSeasons([]);
    setEpisodes([]);
    setSeason(null);
    setEpisode(null);

    fetchSeriesMetadata(id, kind, title)
      .then((result) => {
        if (!active) return;
        const available = result.seasons
          .filter((item) => item.number > 0 && item.episodeCount > 0)
          .sort((a, b) => a.number - b.number);
        setSeasons(available);
        if (available.length === 0) setError('Aucune saison disponible dans les métadonnées.');
        else setSeason(available[0].number);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les saisons.');
      })
      .finally(() => { if (active) setLoadingSeasons(false); });

    return () => { active = false; };
  }, [id, kind, title]);

  useEffect(() => {
    if (season === null) return;
    let active = true;
    setLoadingEpisodes(true);
    setEpisodes([]);
    setEpisode(null);
    fetchSeriesEpisodes(id, season, kind, title)
      .then((items) => {
        if (!active) return;
        const available = items.slice().sort((a, b) => a.number - b.number);
        setEpisodes(available);
        if (available.length === 0) setError('Aucun épisode listé pour cette saison.');
        else {
          setError(null);
          setEpisode(available[0].number);
          onSelect({ season, episode: available[0].number, episodeTitle: available[0].name });
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les épisodes.');
      })
      .finally(() => { if (active) setLoadingEpisodes(false); });
    return () => { active = false; };
  }, [id, season, kind, title, onSelect]);

  const selectedSeason = seasons.find((item) => item.number === season);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Saison</Text>
      {loadingSeasons ? <ActivityIndicator color={colors.primary} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {seasons.map((item) => (
            <Pressable key={item.number} onPress={() => setSeason(item.number)} style={[styles.chip, season === item.number && styles.chipSelected]}>
              <Text style={[styles.chipText, season === item.number && styles.chipTextSelected]}>{item.name || `Saison ${item.number}`}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={styles.heading}>{selectedSeason ? `Épisodes · ${selectedSeason.episodeCount} au catalogue` : 'Épisodes'}</Text>
      {loadingEpisodes ? <ActivityIndicator color={colors.primary} /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {episodes.map((item) => (
            <Pressable
              key={item.number}
              onPress={() => {
                setEpisode(item.number);
                onSelect({ season: season ?? 1, episode: item.number, episodeTitle: item.name });
              }}
              style={[styles.episode, episode === item.number && styles.chipSelected]}
            >
              <Text style={[styles.chipText, episode === item.number && styles.chipTextSelected]}>Épisode {item.number}</Text>
              {!!item.name && <Text numberOfLines={1} style={[styles.episodeTitle, episode === item.number && styles.chipTextSelected]}>{item.name}</Text>}
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingVertical: 12 },
  heading: { color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 4 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: '#292a33', borderWidth: 1, borderColor: '#3a3b45' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  episode: { width: 142, minHeight: 62, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#292a33', borderWidth: 1, borderColor: '#3a3b45', gap: 5 },
  episodeTitle: { color: '#bfc0cb', fontSize: 11 },
  error: { color: '#ffb4ab', fontSize: 12 },
});
