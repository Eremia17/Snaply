import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import type { Item, Kind } from '@/lib/types';
import { colors } from '@/lib/theme';

// Accepte aussi les exports faits sur le site (app: "MovieVerse")
const ACCEPTED_APPS = ['Erëmīa', 'MovieVerse'];

export default function DonneesScreen() {
  const { favorites, history, mergeLists, clearLocal, clearHistory } = useStore();
  const [busy, setBusy] = useState(false);

  const exportAll = async () => {
    setBusy(true);
    try {
      const payload = {
        app: 'Erëmīa',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites,
        history,
      };
      const date = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}eremia-mes-donnees-${date}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exporter mes données' });
    } catch (e: any) {
      Alert.alert('Export impossible', e.message);
    } finally {
      setBusy(false);
    }
  };

  const importAll = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    try {
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const d = JSON.parse(text);
      if (!ACCEPTED_APPS.includes(d?.app)) throw new Error('Ce fichier ne vient pas d’Erëmīa ou de MovieVerse.');
      const arr = (v: unknown): Item[] =>
        Array.isArray(v)
          ? v
              .filter((x) => x && x.kind && x.id && x.title)
              .map((x) => ({ kind: x.kind as Kind, id: String(x.id), title: String(x.title), poster: x.poster ?? null, year: x.year ?? null }))
          : [];
      mergeLists(arr(d.favorites), arr(d.history));
      Alert.alert('Import terminé', 'Vos données ont été ajoutées sans rien remplacer.');
    } catch (e: any) {
      Alert.alert('Import impossible', e.message);
    } finally {
      setBusy(false);
    }
  };

  const wipe = () => {
    Alert.alert(
      'Supprimer mes données',
      'Supprimer favoris et historique de cet appareil ? Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { clearLocal(); Alert.alert('Données supprimées de cet appareil.'); } },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Données & confidentialité', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <Card icon="download-outline" title="Exporter mes données" text={`Un fichier JSON avec vos ${favorites.length} favoris et ${history.length} entrées d’historique.`}>
          <Btn label="Télécharger mon export" onPress={exportAll} disabled={busy} primary />
        </Card>

        <Card icon="cloud-upload-outline" title="Importer un export" text="Fusion avec vos données actuelles : rien n’est écrasé. Les exports du site MovieVerse sont acceptés.">
          <Btn label="Choisir un fichier" onPress={importAll} disabled={busy} />
        </Card>

        <Card icon="time-outline" title="Effacer l’historique" text="Retire les fiches de « Vu récemment ». Vos favoris restent.">
          <Btn label="Effacer l’historique" onPress={() => clearHistory()} disabled={busy} />
        </Card>

        <Card icon="trash-outline" title="Supprimer mes données" text="Supprime favoris et historique de cet appareil. Votre compte et votre profil en ligne ne sont pas touchés.">
          <Btn label="Supprimer de cet appareil" onPress={wipe} disabled={busy} danger />
        </Card>

        {busy ? <ActivityIndicator color={colors.primary} /> : null}
      </ScrollView>
    </>
  );
}

function Card({ icon, title, text, children }: { icon: any; title: string; text: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardText}>{text}</Text>
      {children}
    </View>
  );
}

function Btn({ label, onPress, disabled, primary, danger }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, primary && { backgroundColor: colors.primary }, danger && { backgroundColor: colors.destructive }]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  cardText: { color: colors.mutedForeground, lineHeight: 20 },
  btn: { backgroundColor: colors.muted, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});