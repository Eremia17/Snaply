import { router } from 'expo-router';
import { SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';

export default function EntryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.screen}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoGlyph}>T</Text>
            <View style={styles.logoSpark} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>TICKET<Text style={styles.brandAccent}> MADA</Text></Text>
            <Text style={styles.brandSub}>L'EXPÉRIENCE ÉVÉNEMENTIELLE MALGACHE</Text>
          </View>
          <View style={styles.countryPill}><Text style={styles.countryText}>MG</Text></View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroKicker}>
            <View style={styles.kickerLine} />
            <Text style={styles.kickerText}>VIVRE. PARTAGER. SE RETROUVER.</Text>
          </View>
          <Text style={styles.title}>Les bons moments<Text style={styles.titleAccent}> commencent ici.</Text></Text>
          <Text style={styles.subtitle}>Concerts, festivals, spectacles et rencontres. Trouve ta prochaine sortie à Madagascar.</Text>

          <View style={styles.ticketVisual}>
            <View style={styles.ticketOrbOne} />
            <View style={styles.ticketOrbTwo} />
            <View style={styles.ticketTopRow}>
              <Text style={styles.ticketLabel}>TON PROCHAIN SOUVENIR</Text>
              <View style={styles.liveDot} />
            </View>
            <View style={styles.ticketMain}>
              <Text style={styles.ticketSymbol}>✳</Text>
              <View style={styles.ticketTextBlock}>
                <Text style={styles.ticketTitle}>L'aventure{ '\n' }t'attend.</Text>
                <Text style={styles.ticketMeta}>PARTOUT À MADAGASCAR</Text>
              </View>
            </View>
            <View style={styles.ticketBottom}>
              <Text style={styles.ticketBottomText}>DÉCOUVRE LES ÉVÉNEMENTS</Text>
              <Text style={styles.ticketArrow}>↗</Text>
            </View>
            <View style={styles.ticketNotchTop} />
            <View style={styles.ticketNotchBottom} />
          </View>
        </View>

        <View style={styles.choiceHeader}>
          <Text style={styles.choiceTitle}>Tu es ici pour...</Text>
          <Text style={styles.choiceHint}>CHOISIS TON ESPACE</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans l'espace spectateur" onPress={() => router.replace('/spectator')} style={({ pressed }) => [styles.choiceCard, styles.spectatorCard, pressed && styles.pressed]}>
          <View style={styles.choiceIconSpectator}><Text style={styles.choiceIconText}>✦</Text></View>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceEyebrow}>DÉCOUVRIR & VIVRE</Text>
            <Text style={styles.choiceName}>Je suis spectateur</Text>
            <Text style={styles.choiceDescription}>Explore les sorties et réserve ta place.</Text>
          </View>
          <View style={styles.choiceArrow}><Text style={styles.choiceArrowText}>↗</Text></View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans l'espace organisateur" onPress={() => router.replace('/account?next=organizer')} style={({ pressed }) => [styles.choiceCard, styles.organizerCard, pressed && styles.pressed]}>
          <View style={styles.choiceIconOrganizer}><Text style={styles.choiceIconText}>▦</Text></View>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceEyebrow}>CRÉER & ORGANISER</Text>
            <Text style={styles.choiceName}>Je suis organisateur</Text>
            <Text style={styles.choiceDescription}>Publie tes événements et gère tes billets.</Text>
          </View>
          <View style={[styles.choiceArrow, styles.organizerArrow]}><Text style={styles.choiceArrowText}>↗</Text></View>
        </Pressable>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>NATAO HO AN'I MADAGASIKARA</Text>
          <View style={styles.footerLine} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090D18' },
  screen: { flex: 1, paddingHorizontal: 23, paddingTop: 17, paddingBottom: 14, overflow: 'hidden', justifyContent: 'space-between' },
  glowTop: { position: 'absolute', width: 330, height: 330, borderRadius: 165, backgroundColor: '#28234B', opacity: 0.55, top: -205, right: -115 },
  glowBottom: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#3B1F35', opacity: 0.28, bottom: 90, left: -210 },
  header: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#F05B67', alignItems: 'center', justifyContent: 'center', marginRight: 11, shadowColor: '#F05B67', shadowOpacity: 0.3, shadowRadius: 13, shadowOffset: { width: 0, height: 5 } },
  logoGlyph: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', fontStyle: 'italic' },
  logoSpark: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD6A5', top: 7, right: 7 },
  brandCopy: { flex: 1 },
  brand: { color: '#F7F5F2', fontSize: 16, fontWeight: '900', letterSpacing: 1.6 },
  brandAccent: { color: '#F06B76' },
  brandSub: { color: '#737B91', fontSize: 7, letterSpacing: 1.25, fontWeight: '800', marginTop: 4 },
  countryPill: { borderWidth: 1, borderColor: '#343B50', backgroundColor: '#171D2C', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  countryText: { color: '#C7CDDA', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hero: { marginTop: 18 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  kickerLine: { width: 22, height: 2, backgroundColor: '#F06B76', borderRadius: 2 },
  kickerText: { color: '#F18B91', fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F7F5F2', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.1 },
  titleAccent: { color: '#F07880' },
  subtitle: { color: '#A3AABD', fontSize: 12, lineHeight: 19, marginTop: 11, maxWidth: 310 },
  ticketVisual: { height: 139, borderRadius: 20, marginTop: 18, padding: 15, backgroundColor: '#242344', borderWidth: 1, borderColor: '#484369', overflow: 'hidden' },
  ticketOrbOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#67446D', opacity: 0.45, right: -43, top: -93 },
  ticketOrbTwo: { position: 'absolute', width: 105, height: 105, borderRadius: 53, borderWidth: 1, borderColor: '#A77C99', opacity: 0.4, right: 36, bottom: -62 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketLabel: { color: '#B6A9CB', fontSize: 7, fontWeight: '900', letterSpacing: 1.8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F4B36A' },
  ticketMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ticketSymbol: { color: '#F7B0A7', fontSize: 44, marginRight: 13 },
  ticketTextBlock: { flex: 1 },
  ticketTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 25, fontWeight: '900', letterSpacing: -0.6 },
  ticketMeta: { color: '#C1B7D0', fontSize: 7, fontWeight: '800', letterSpacing: 1.5, marginTop: 7 },
  ticketBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#514A70', paddingTop: 8 },
  ticketBottomText: { color: '#E5D9E8', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  ticketArrow: { color: '#F5B5A9', fontSize: 14, fontWeight: '900' },
  ticketNotchTop: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#090D18', right: -9, top: 67 },
  ticketNotchBottom: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#090D18', left: -9, top: 67 },
  choiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  choiceTitle: { color: '#F5F3F0', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  choiceHint: { color: '#747D91', fontSize: 7, fontWeight: '900', letterSpacing: 1.3 },
  choiceCard: { minHeight: 77, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 9, borderWidth: 1 },
  spectatorCard: { backgroundColor: '#202B3B', borderColor: '#35465D' },
  organizerCard: { backgroundColor: '#211F31', borderColor: '#45405D' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  choiceIconSpectator: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#34465B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  choiceIconOrganizer: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#41334F', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  choiceIconText: { color: '#F6B6A8', fontSize: 22, fontWeight: '900' },
  choiceCopy: { flex: 1 },
  choiceEyebrow: { color: '#AAB4C6', fontSize: 7, fontWeight: '900', letterSpacing: 1.25 },
  choiceName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 3 },
  choiceDescription: { color: '#A2AABD', fontSize: 9, marginTop: 4 },
  choiceArrow: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F06B76', alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  organizerArrow: { backgroundColor: '#8170A9' },
  choiceArrowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 },
  footerLine: { height: 1, backgroundColor: '#343B4D', flex: 1 },
  footerText: { color: '#737B8E', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 }
});
