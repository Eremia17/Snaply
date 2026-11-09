import { router } from 'expo-router';
import { SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '../src/theme';

export default function EntryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>T</Text></View>
        <Text style={styles.brand}>TICKET <Text style={styles.brandAccent}>MADA</Text></Text>
        <Text style={styles.eyebrow}>MADAGASCAR · BILLETTERIE</Text>
        <Text style={styles.title}>Bienvenue dans votre espace.</Text>
        <Text style={styles.subtitle}>Choisissez comment vous souhaitez utiliser Ticket Mada. Vous pourrez changer d’espace à tout moment.</Text>

        <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans l'espace spectateur" onPress={() => router.replace('/spectator')} style={styles.choiceCard}>
          <View style={styles.choiceIcon}><Text style={styles.choiceIconText}>♫</Text></View>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceEyebrow}>DÉCOUVRIR & PARTICIPER</Text>
            <Text style={styles.choiceTitle}>Je suis spectateur</Text>
            <Text style={styles.choiceBody}>Découvrir les événements, consulter les billets et retrouver mes réservations.</Text>
            <Text style={styles.choiceAction}>Explorer les événements  →</Text>
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans l'espace organisateur" onPress={() => router.replace('/organizer')} style={[styles.choiceCard, styles.organizerCard]}>
          <View style={[styles.choiceIcon, styles.organizerIcon]}><Text style={styles.choiceIconText}>▦</Text></View>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceEyebrow}>CRÉER & PILOTER</Text>
            <Text style={styles.choiceTitle}>Je suis organisateur</Text>
            <Text style={styles.choiceBody}>Créer des événements, préparer les billets et gérer les participants.</Text>
            <Text style={styles.choiceAction}>Ouvrir mon espace  →</Text>
          </View>
        </Pressable>

        <View style={styles.languageNote}>
          <Text style={styles.languageTitle}>MIARAKA AMIN'NY TENY MALAGASY</Text>
          <Text style={styles.languageBody}>Safidio ny toerana tianao hidirana. Afaka miova toerana ianao amin’ny fotoana rehetra.</Text>
        </View>
        <Text style={styles.footer}>TICKET MADA · FAIT POUR MADAGASCAR</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28 },
  brandMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  brandMarkText: { color: colors.white, fontSize: 28, fontWeight: '900' },
  brand: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: 2 },
  brandAccent: { color: colors.primary },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 18, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9, marginBottom: 22 },
  choiceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  organizerCard: { backgroundColor: '#211D2A', borderColor: '#493342' },
  choiceIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  organizerIcon: { backgroundColor: colors.primarySoft },
  choiceIconText: { color: colors.primary, fontSize: 23, fontWeight: '900' },
  choiceCopy: { flex: 1 },
  choiceEyebrow: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  choiceTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 5 },
  choiceBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  choiceAction: { color: colors.primary, fontSize: 10, fontWeight: '900', marginTop: 12 },
  languageNote: { padding: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  languageTitle: { color: colors.text, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  languageBody: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  footer: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, textAlign: 'center', marginTop: 24 }
});
