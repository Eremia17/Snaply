import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KIND_LABEL, trending, useCatalog, type Detail } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import { colors } from '@/lib/theme';

function pickRandom(exclude?: string): Detail | null {
  const pool = trending().filter((x) => x.id !== exclude);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export default function CeSoirScreen() {
  const version = useCatalog();
  const router = useRouter();
  const [pick, setPick] = useState<Detail | null>(null);

  // Choisit un titre dès que le catalogue est disponible
  useEffect(() => {
    if (!pick) setPick(pickRandom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Que regarder ce soir ?', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <View style={styles.root}>
        {!pick ? (
          <Text style={styles.empty}>Le catalogue se charge…</Text>
        ) : (
          <>
            <View style={styles.card}>
              {pick.poster ? <Image source={{ uri: pick.poster }} style={styles.poster} /> : <View style={[styles.poster, styles.posterEmpty]}><Ionicons name="film-outline" size={48} color={colors.mutedForeground} /></View>}
              <Text style={styles.kind}>{KIND_LABEL[pick.kind]}</Text>
              <Text style={styles.title}>{pick.title}</Text>
              <Text style={styles.meta}>{pick.year} · ★ {pick.rating.toFixed(1)}/10</Text>
              <Text style={styles.synopsis}>{pick.synopsis}</Text>
            </View>
            <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => openTitle(router, pick)}>
              <Text style={styles.btnText}>Voir la fiche</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.muted }]} onPress={() => setPick(pickRandom(pick.id) ?? pick)}>
              <Text style={styles.btnText}>Proposer autre chose</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 },
  empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 12, backgroundColor: colors.muted, marginBottom: 8 },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  kind: { color: colors.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  meta: { color: colors.gold, fontWeight: '600' },
  synopsis: { color: colors.mutedForeground, lineHeight: 20, marginTop: 4 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});