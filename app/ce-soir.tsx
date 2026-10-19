import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { browseKind, KIND_LABEL, type Detail } from '@/lib/catalog';
import { openTitle } from '@/lib/navigation';
import type { Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

type Mood = 'rire' | 'frissons' | 'emotion' | 'action' | 'reve';
const MOODS: { value: Mood; label: string; hint: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'rire', label: 'Rire', hint: 'Comédies légères', icon: 'happy-outline' },
  { value: 'frissons', label: 'Frissons', hint: 'Suspense et horreur', icon: 'eye-outline' },
  { value: 'emotion', label: 'Émotion', hint: 'Drames et romances', icon: 'heart-outline' },
  { value: 'action', label: 'Action', hint: 'Adrénaline et aventure', icon: 'flash-outline' },
  { value: 'reve', label: 'Évasion', hint: 'Fantastique et science-fiction', icon: 'planet-outline' },
];
const KINDS: Kind[] = ['film', 'manga', 'occidental', 'serie'];
const moodGenre: Record<Mood, Record<Kind, string>> = {
  rire: { film: 'Comédie', manga: 'Comédie', occidental: 'Comédie', serie: 'Comédie' },
  frissons: { film: 'Horreur', manga: 'Horreur', occidental: 'Science-fiction', serie: 'Mystère' },
  emotion: { film: 'Romance', manga: 'Shojo', occidental: 'Famille', serie: 'Drame' },
  action: { film: 'Action', manga: 'Shonen', occidental: 'Action', serie: 'Action & Aventure' },
  reve: { film: 'Fantastique', manga: 'Fantastique', occidental: 'Science-fiction', serie: 'Science-fiction & Fantastique' },
};

export default function CeSoirScreen() {
  const router = useRouter();
  const [mood, setMood] = useState<Mood>('rire');
  const [kind, setKind] = useState<Kind>('film');
  const [short, setShort] = useState(false);
  const [family, setFamily] = useState(false);
  const [results, setResults] = useState<Detail[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultOffset = useRef(new Animated.Value(22)).current;
  const sparkleTurn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) return;
    const spin = Animated.loop(Animated.timing(sparkleTurn, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true }));
    spin.start();
    return () => spin.stop();
  }, [loading, sparkleTurn]);

  useEffect(() => {
    if (!results?.length) { resultOpacity.setValue(0); resultOffset.setValue(22); return; }
    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(resultOffset, { toValue: 0, speed: 15, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [results, resultOpacity, resultOffset]);

  const go = async () => {
    setLoading(true);
    setError(null);
    try {
      const genre = moodGenre[mood][kind];
      const response = await browseKind(kind, 1, {
        genre,
        family,
        short: short && kind === 'film',
      });
      const pool = response.items.filter((item) => item.poster);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      setResults(pool.slice(0, 3));
      if (!pool.length) setError('Aucun titre ne correspond à ces critères. Essayez une autre combinaison.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de chercher pour le moment.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Que regarder ce soir ?', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          <Text style={styles.kicker}>IDÉE DE SOIRÉE</Text>
        </View>
        <Text style={styles.title}>Que regarder ce soir ?</Text>
        <Text style={styles.description}>Répondez à quatre petites questions et Erëmīa vous propose trois titres adaptés à votre soirée.</Text>

        <View style={styles.question}>
          <Text style={styles.questionTitle}>1. Votre humeur</Text>
          <View style={styles.moods}>
            {MOODS.map((m) => (
              <Pressable key={m.value} accessibilityRole="button" accessibilityState={{ selected: mood === m.value }} onPress={() => setMood(m.value)} style={[styles.moodCard, mood === m.value && styles.selectedCard]}>
                <View style={[styles.moodIcon, mood === m.value && styles.selectedIcon]}><Ionicons name={m.icon} size={21} color={mood === m.value ? '#fff' : colors.mutedForeground} /></View>
                <Text style={[styles.moodLabel, mood === m.value && styles.selectedText]}>{m.label}</Text>
                <Text style={styles.moodHint}>{m.hint}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.question}>
          <Text style={styles.questionTitle}>2. Votre univers</Text>
          <View style={styles.chips}>
            {KINDS.map((k) => <Chip key={k} label={KIND_LABEL[k]} active={kind === k} onPress={() => setKind(k)} />)}
          </View>
        </View>

        <View style={styles.question}>
          <Text style={styles.questionTitle}>3. Durée</Text>
          <View style={styles.chips}>
            <Chip label="Peu importe" active={!short} onPress={() => setShort(false)} />
            <Chip label="Court (moins de 1 h 45)" active={short} onPress={() => setShort(true)} />
          </View>
          {short && kind !== 'film' ? <Text style={styles.hint}>Le filtre de durée s’applique uniquement aux films.</Text> : null}
        </View>

        <View style={styles.question}>
          <Text style={styles.questionTitle}>4. Avec qui ?</Text>
          <View style={styles.chips}>
            <Chip label="Seul·e ou entre amis" active={!family} onPress={() => setFamily(false)} />
            <Chip label="En famille (sans horreur)" active={family} onPress={() => setFamily(true)} />
          </View>
        </View>

        <Pressable style={[styles.primary, loading && styles.disabled]} onPress={go} disabled={loading}>
          {loading ? <Animated.View style={{ transform: [{ rotate: sparkleTurn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><Ionicons name="sparkles" size={20} color="#fff" /></Animated.View> : <Ionicons name="sparkles-outline" size={20} color="#fff" />}
          <Text style={styles.primaryText}>{loading ? 'Recherche en cours…' : 'Proposez-moi 3 titres'}</Text>
        </Pressable>

        {error ? <View style={styles.error}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /><Text style={styles.errorText}>{error}</Text></View> : null}
        {results && results.length > 0 ? (
          <Animated.View style={[styles.results, { opacity: resultOpacity, transform: [{ translateY: resultOffset }] }]}>
            <View style={styles.resultHeading}>
              <Text style={styles.resultTitle}>Pour ce soir</Text>
              <Pressable onPress={go} disabled={loading} style={styles.again}><Ionicons name="refresh-outline" size={17} color={colors.foreground} /><Text style={styles.againText}>Autres idées</Text></Pressable>
            </View>
            {results.map((item) => (
              <Pressable key={`${item.kind}:${item.id}`} style={styles.resultCard} onPress={() => openTitle(router, item)}>
                {item.poster ? <Image source={{ uri: item.poster }} style={styles.poster} /> : <View style={[styles.poster, styles.posterFallback]}><Ionicons name="film-outline" size={28} color={colors.mutedForeground} /></View>}
                <View style={styles.resultCopy}>
                  <Text style={styles.kind}>{KIND_LABEL[item.kind]}</Text>
                  <Text style={styles.resultName} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.meta}>{item.year || 'Année inconnue'} · ★ {item.rating.toFixed(1)}/10</Text>
                  <Text style={styles.synopsis} numberOfLines={3}>{item.synopsis || 'Synopsis non disponible.'}</Text>
                  <Text style={styles.open}>Voir la fiche  →</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08090D' },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.foreground, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  description: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  question: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  questionTitle: { color: colors.foreground, fontSize: 16, fontWeight: '800' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodCard: { width: '48%', minHeight: 106, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 5 },
  selectedCard: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  moodIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  selectedIcon: { backgroundColor: colors.primary },
  moodLabel: { color: colors.foreground, fontWeight: '800' },
  selectedText: { color: colors.primary },
  moodHint: { color: colors.mutedForeground, fontSize: 11, lineHeight: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  hint: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 15, marginTop: 6 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  errorText: { flex: 1, color: colors.foreground, lineHeight: 20 },
  results: { gap: 12, marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#29212C' },
  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  again: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  againText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  resultCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  poster: { width: 100, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: colors.muted },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, gap: 5 },
  kind: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  resultName: { color: colors.foreground, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  synopsis: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  open: { color: colors.primary, fontWeight: '800', fontSize: 12, marginTop: 3 },
});
