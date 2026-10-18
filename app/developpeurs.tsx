import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function DeveloppeursScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'API publique', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.p}>L’application utilise une interface interne pour récupérer le catalogue, les fiches, les bandes-annonces, les critiques et les matchs sportifs.</Text>
        <View style={styles.card}>
          <Text style={styles.code}>POST /functions/v1/browse</Text>
          <Text style={styles.p}>Actions : list (par catégorie et page), search, extras (fiche), chapters et pages (lecture manga), sports.</Text>
        </View>
        <Text style={styles.p}>Une documentation publique complète et des limites d’usage seront publiées plus tard.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  p: { color: colors.foreground, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  code: { color: colors.primary, fontWeight: '700', fontFamily: 'monospace' },
});