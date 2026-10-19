import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import type { Item } from '@/lib/types';
import { colors } from '@/lib/theme';
import { usePrefs } from '@/lib/prefs';

export function PosterCard({ item, width, rating }: { item: Item; width?: number; rating?: number }) {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useStore();
  const [prefs] = usePrefs();
  const [imageFailed, setImageFailed] = useState(false);
  const fav = isFavorite(item);
  const note = rating ?? (item as { rating?: number }).rating ?? 0;

  return (
    <Pressable
      style={[styles.card, width ? { width, flex: 0 } : null, prefs.contraste && styles.highContrastCard]}
      onPress={() =>
        router.push({
          pathname: '/titre/[kind]/[id]',
          params: { kind: item.kind, id: item.id, title: item.title, poster: item.poster ?? '', year: item.year ?? '' },
        })
      }
    >
      <View style={[styles.poster, prefs.contraste && styles.highContrastPoster]}>
        {item.poster && !imageFailed ? (
          <Image source={{ uri: item.poster }} style={styles.img} resizeMode="cover" onError={() => setImageFailed(true)} />
        ) : (
          <View style={[styles.img, styles.fallback]}>
            <Ionicons name={imageFailed ? 'image-outline' : 'film-outline'} size={26} color={colors.mutedForeground} />
            <Text style={styles.fallbackText} numberOfLines={4}>{item.title}</Text>
          </View>
        )}
        {note > 0 ? (
          <View style={styles.badge}>
            <Ionicons name="star" size={12} color="#000" />
            <Text style={styles.badgeText}>{note.toFixed(1)}</Text>
          </View>
        ) : null}
        <Pressable style={styles.heart} hitSlop={8} onPress={() => toggleFavorite(item)}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? colors.primary : '#fff'} />
        </Pressable>
      </View>
      <Text style={[styles.title, prefs.contraste && styles.highContrastText]} numberOfLines={2}>{item.title}</Text>
      {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  highContrastCard: { borderColor: '#FFFFFF', borderWidth: 2 },
  highContrastPoster: { borderColor: '#FFFFFF', borderWidth: 2 },
  highContrastText: { color: '#FFFFFF', fontWeight: '900' },
  card: { flex: 1, margin: 4 },
  poster: {
    aspectRatio: 2 / 3, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  img: { width: '100%', height: '100%' },
  fallback: { justifyContent: 'center', alignItems: 'center', padding: 8 },
  fallbackText: { color: colors.mutedForeground, textAlign: 'center', fontWeight: '600' },
  badge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { color: '#000', fontWeight: '800', fontSize: 12 },
  heart: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: 6 },
  title: { color: colors.foreground, marginTop: 8, fontSize: 14, fontWeight: '700' },
  year: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
});