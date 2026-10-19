import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { downloadAuthorizedVideo, type OfflineDownloadProgress, type OfflineVideo } from '@/lib/offlineDownloads';
import { colors } from '@/lib/theme';

type Props = {
  id: string;
  title: string;
  url: string;
  onComplete?: (video: OfflineVideo) => void;
};

export function OfflineDownloadButton({ id, title, url, onComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OfflineDownloadProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setProgress({ writtenBytes: 0, totalBytes: 0, percent: 0 });
    setMessage(null);
    try {
      const video = await downloadAuthorizedVideo({ id, title, url }, setProgress);
      setMessage('Vidéo enregistrée pour la lecture hors ligne.');
      onComplete?.(video);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Échec du téléchargement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={start} style={[styles.button, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color="#fff" /> : null}
        <Text style={styles.buttonText}>{busy ? `Téléchargement… ${progress?.percent ?? 0}%` : 'Télécharger pour hors ligne'}</Text>
      </Pressable>
      {progress && busy ? (
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress.percent }} style={styles.track}>
          <View style={[styles.fill, { width: `${progress.percent}%` }]} />
        </View>
      ) : null}
      {progress && busy && progress.totalBytes > 0 ? (
        <Text style={styles.detail}>{formatBytes(progress.writtenBytes)} / {formatBytes(progress.totalBytes)}</Text>
      ) : null}
      {!!message && <Text accessibilityRole="text" style={styles.message}>{message}</Text>}
    </View>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

const styles = StyleSheet.create({
  container: { gap: 8, width: '100%' },
  button: { minHeight: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  disabled: { opacity: 0.75 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  track: { height: 8, borderRadius: 8, backgroundColor: '#343540', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 8 },
  detail: { color: '#bfc0cb', fontSize: 11, textAlign: 'right' },
  message: { color: colors.foreground, fontSize: 12 },
});
