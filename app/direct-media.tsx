import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { NativeVideoPlayer } from '@/components/NativeVideoPlayer';
import { OfflineDownloadButton } from '@/components/OfflineDownloadButton';
import { colors } from '@/lib/theme';

function getDirectFileExtension(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    const match = url.pathname.toLowerCase().match(/\.(mp4|m4v|mov)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Standalone native test screen for direct, authorized media URLs.
 * MP4/M4V/MOV can be saved offline; HLS (.m3u8) is playback-only here.
 */
export default function DirectMediaScreen() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('Vidéo de test');
  const extension = useMemo(() => getDirectFileExtension(sourceUrl), [sourceUrl]);
  const cleanUrl = sourceUrl.trim();
  const downloadId = useMemo(() => {
    try {
      const url = new URL(cleanUrl);
      const tail = url.pathname.split('/').filter(Boolean).pop() ?? 'video';
      return `direct-${tail}`;
    } catch {
      return 'direct-video';
    }
  }, [cleanUrl]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Lecteur vidéo direct' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Lecteur natif</Text>
        <Text style={styles.explanation}>
          Colle une URL HTTPS directe autorisée. Le lecteur accepte les flux MP4 et HLS (.m3u8). Les pages de lecteur intégrées ne sont pas des URL vidéo directes.
        </Text>

        <Text style={styles.label}>URL de la source vidéo</Text>
        <TextInput
          value={sourceUrl}
          onChangeText={setSourceUrl}
          placeholder="https://exemple.com/video.mp4"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
          style={styles.input}
          accessibilityLabel="URL directe de la source vidéo"
        />

        <Text style={styles.label}>Titre affiché / nom hors ligne</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de la vidéo"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          accessibilityLabel="Titre de la vidéo"
        />

        {cleanUrl ? (
          <NativeVideoPlayer sourceUrl={cleanUrl} title={title.trim() || 'Vidéo'} />
        ) : (
          <View style={styles.emptyPlayer}>
            <Text style={styles.emptyText}>Le lecteur apparaîtra ici après la saisie d’une URL directe.</Text>
          </View>
        )}

        <View style={styles.downloadSection}>
          <Text style={styles.sectionHeading}>Téléchargement hors ligne</Text>
          {extension ? (
            <OfflineDownloadButton
              id={downloadId}
              title={title.trim() || 'Vidéo'}
              url={cleanUrl}
            />
          ) : (
            <Text style={styles.explanation}>
              Pour enregistrer un fichier hors ligne, saisis une URL directe HTTPS terminant par .mp4, .m4v ou .mov. Les flux HLS (.m3u8) restent lisibles, mais leur téléchargement complet nécessite une prise en charge dédiée du fournisseur.
            </Text>
          )}
          <Text style={styles.storageNote}>
            Les fichiers sont conservés dans le stockage privé persistant de l’application, et non dans la galerie publique du téléphone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 36 },
  heading: { color: colors.foreground, fontSize: 23, fontWeight: '900' },
  explanation: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
  label: { color: colors.foreground, fontSize: 12, fontWeight: '800', marginTop: 4 },
  input: { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
  emptyPlayer: { aspectRatio: 16 / 9, backgroundColor: '#09090b', borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  downloadSection: { gap: 10, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  sectionHeading: { color: colors.foreground, fontSize: 16, fontWeight: '900' },
  storageNote: { color: colors.mutedForeground, fontSize: 11, lineHeight: 16 },
});
