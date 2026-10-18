import { useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PosterCard } from '@/components/PosterCard';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const COLS = 3;
const CARD_W = (Dimensions.get('window').width - 32) / COLS - 8;

export default function MaListeScreen() {
  const { favorites, history, ready } = useStore();
  const [tab, setTab] = useState<'fav' | 'hist'>('fav');
  const items = tab === 'fav' ? favorites : history;

  return (
    <View style={styles.root}>
      <View style={styles.segment}>
        {(
          [
            ['fav', `Favoris (${favorites.length})`],
            ['hist', `Vu récemment (${history.length})`],
          ] as const
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.seg, tab === key && styles.segActive]}>
            <Text style={[styles.segText, tab === key && styles.segTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={items}
        numColumns={COLS}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => <PosterCard item={item} width={CARD_W} />}
        ListEmptyComponent={
          ready ? (
            <Text style={styles.empty}>
              {tab === 'fav'
                ? 'Ajoutez des titres avec le cœur pour les retrouver ici.'
                : 'Les fiches que vous consultez apparaîtront ici.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  segment: {
    flexDirection: 'row', alignSelf: 'center', marginTop: 16, backgroundColor: colors.muted,
    borderRadius: 999, padding: 4,
  },
  seg: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  segActive: { backgroundColor: colors.card },
  segText: { color: colors.mutedForeground, fontWeight: '600' },
  segTextActive: { color: colors.foreground },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 60 },
});