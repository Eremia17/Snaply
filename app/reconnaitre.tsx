import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function ReconnaitreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const analyse = async (photo: string, mime: string) => {
    setBusy(true);
    setChecked(false);
    try {
      const b64 = await FileSystem.readAsStringAsync(photo, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.functions.invoke('gemini', { body: { image: b64, mime } });
      if (error) throw error;
      setTitle(data?.title ? `${data.title}${data.year ? ` (${data.year})` : ''}` : null);
      setChecked(true);
      if (data?.title) setTitle(`${data.title}${data.year ? ` (${data.year})` : ''}`);
      setSearchTerm(data?.title ?? null);
    } catch (e: any) {
      Alert.alert('Analyse impossible', e.message ?? 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState<string | null>(null);

  const pick = async () => {
    if (!user) return router.push('/(auth)/login');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Accès refusé', 'Autorisez l’accès aux photos dans les réglages.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled || !r.assets[0]) return;
    setUri(r.assets[0].uri);
    setTitle(null);
    analyse(r.assets[0].uri, r.assets[0].mimeType ?? 'image/jpeg');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Reconnaître une affiche', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <View style={styles.root}>
        <Text style={styles.lead}>Choisissez la photo d’une affiche : l’IA essaie d’identifier le titre.</Text>
        <Pressable style={styles.primary} onPress={pick} disabled={busy}>
          <Ionicons name="scan-outline" size={18} color="#fff" />
          <Text style={styles.primaryText}>Choisir une photo</Text>
        </Pressable>
        {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="contain" /> : null}
        {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
        {checked && title ? (
          <View style={styles.result}>
            <Text style={styles.resultLabel}>Titre reconnu</Text>
            <Text style={styles.resultTitle}>{title}</Text>
            <Pressable style={styles.primary} onPress={() => router.push({ pathname: '/recherche', params: { q: searchTerm ?? '' } })}>
              <Text style={styles.primaryText}>Voir la fiche dans la recherche</Text>
            </Pressable>
          </View>
        ) : null}
        {checked && !title ? <Text style={styles.lead}>Titre non reconnu. Essayez une autre photo, plus nette.</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 14 },
  lead: { color: colors.mutedForeground, lineHeight: 21, textAlign: 'center' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18 },
  primaryText: { color: '#fff', fontWeight: '800' },
  preview: { width: '100%', height: 320, borderRadius: 14, backgroundColor: colors.card },
  result: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  resultLabel: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12 },
  resultTitle: { color: colors.foreground, fontSize: 20, fontWeight: '900' },
});