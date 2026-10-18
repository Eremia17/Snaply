import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

export default function TelechargementsScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Ionicons name="download-outline" size={40} color={colors.primary} />
        <Text style={styles.title}>Téléchargements</Text>
        <Text style={styles.text}>
          Les téléchargements hors ligne ne sont pas disponibles dans cette version. Vos favoris, votre historique et
          vos listes restent enregistrés sur votre appareil.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10, alignItems: 'flex-start' },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  text: { color: colors.mutedForeground, lineHeight: 21 },
});