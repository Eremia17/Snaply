import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View, ScrollView } from 'react-native';

export default function EntryScreen() {
  const intro = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(intro, { toValue: 1, speed: 0.65, bounciness: 5, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, [float, intro, pulse]);

  const rise = (delay: number) => ({
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [24 + delay * 0.04, 0] }) }],
  });
  const orbShift = float.interpolate({ inputRange: [0, 1], outputRange: [-8, 9] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.22] });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.screen}>
          <View style={styles.ambientA} />
          <View style={styles.ambientB} />
          <Animated.View style={[styles.ring, { transform: [{ translateY: orbShift }, { rotate: '22deg' }] }]} />
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoGlyph}>T</Text><View style={styles.logoSpark} /></View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>TICKET<Text style={styles.brandAccent}> MADA</Text></Text>
              <Text style={styles.brandSub}>L'EXPÉRIENCE ÉVÉNEMENTIELLE MALGACHE</Text>
            </View>
            <View style={styles.countryPill}><Text style={styles.countryText}>MG</Text></View>
          </View>

          <Animated.View style={[styles.hero, rise(1)]}>
            <View style={styles.heroKicker}><View style={styles.kickerLine} /><Text style={styles.kickerText}>VIVRE. PARTAGER. SE RETROUVER.</Text></View>
            <Text style={styles.title}>La nuit est jeune.{'\n'}<Text style={styles.titleAccent}>Vis quelque chose.</Text></Text>
            <Text style={styles.subtitle}>Les concerts, les rencontres et les instants qui deviennent des souvenirs. Tout Madagascar, au même endroit.</Text>
          </Animated.View>

          <Animated.View style={[styles.artStage, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
            <View style={styles.artGlow} />
            <Animated.View style={[styles.floatingDisc, { transform: [{ translateY: orbShift }, { rotate: '-13deg' }] }]} />
            <View style={styles.artGrid} />
            <View style={styles.artTop}><Text style={styles.artTopLabel}>ÉDITION MADAGASCAR</Text><Animated.View style={[styles.livePulse, { transform: [{ scale: pulseScale }] }]} /><Text style={styles.artTopRight}>2026</Text></View>
            <View style={styles.artMiddle}>
              <Text style={styles.artNumber}>01</Text>
              <View style={styles.artHeadlineWrap}><Text style={styles.artHeadline}>MAKE</Text><Text style={styles.artHeadlineSecond}>MEMORIES.</Text></View>
              <View style={styles.artStamp}><Text style={styles.artStampText}>TICKET</Text><Text style={styles.artStampText}>MADA ✳</Text></View>
            </View>
            <View style={styles.artBottom}><Text style={styles.artBottomLeft}>MUSIQUE · CULTURE · LIVE</Text><Text style={styles.artBottomRight}>ANTANANARIVO ↗</Text></View>
            <View style={styles.ticketCutLeft} /><View style={styles.ticketCutRight} />
          </Animated.View>

          <Animated.View style={[styles.choices, rise(2)]}>
            <View style={styles.choiceHeader}><Text style={styles.choiceTitle}>Entre dans ton univers.</Text><Text style={styles.choiceHint}>CHOISIS TON ESPACE</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/spectator')} style={({ pressed }) => [styles.choiceCard, styles.spectatorCard, pressed && styles.pressed]}>
              <View style={styles.choiceIconSpectator}><Text style={styles.choiceIconText}>✦</Text></View>
              <View style={styles.choiceCopy}><Text style={styles.choiceEyebrow}>DÉCOUVRIR · RÉSERVER · VIVRE</Text><Text style={styles.choiceName}>Je suis spectateur</Text><Text style={styles.choiceDescription}>Trouve ton prochain moment fort.</Text></View>
              <View style={styles.choiceArrow}><Text style={styles.choiceArrowText}>↗</Text></View>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/account?next=organizer')} style={({ pressed }) => [styles.choiceCard, styles.organizerCard, pressed && styles.pressed]}>
              <View style={styles.choiceIconOrganizer}><Text style={styles.choiceIconText}>▦</Text></View>
              <View style={styles.choiceCopy}><Text style={styles.choiceEyebrow}>CRÉER · PUBLIER · PILOTER</Text><Text style={styles.choiceName}>Je suis organisateur</Text><Text style={styles.choiceDescription}>Fais vivre tes événements.</Text></View>
              <View style={[styles.choiceArrow, styles.organizerArrow]}><Text style={styles.choiceArrowText}>↗</Text></View>
            </Pressable>
          </Animated.View>
          <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>NATAO HO AN'I MADAGASIKARA</Text><View style={styles.footerLine} /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080B14' },
  scroll: { flexGrow: 1 },
  screen: { flex: 1, minHeight: 760, paddingHorizontal: 23, paddingTop: 17, paddingBottom: 17, overflow: 'hidden', justifyContent: 'space-between' },
  ambientA: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#55315B', opacity: 0.3, top: -230, right: -130 },
  ambientB: { position: 'absolute', width: 290, height: 290, borderRadius: 145, backgroundColor: '#244B60', opacity: 0.19, bottom: 120, left: -210 },
  ring: { position: 'absolute', width: 220, height: 310, borderRadius: 110, borderWidth: 1, borderColor: '#9D6C89', opacity: 0.18, right: -105, top: 160 },
  header: { flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  logo: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#F05B67', alignItems: 'center', justifyContent: 'center', marginRight: 11, shadowColor: '#F05B67', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
  logoGlyph: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', fontStyle: 'italic' },
  logoSpark: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD6A5', top: 7, right: 7 },
  brandCopy: { flex: 1 },
  brand: { color: '#F7F5F2', fontSize: 16, fontWeight: '900', letterSpacing: 1.6 },
  brandAccent: { color: '#F06B76' },
  brandSub: { color: '#81879A', fontSize: 7, letterSpacing: 1.25, fontWeight: '800', marginTop: 4 },
  countryPill: { borderWidth: 1, borderColor: '#343B50', backgroundColor: '#171D2C', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  countryText: { color: '#C7CDDA', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hero: { marginTop: 30 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  kickerLine: { width: 22, height: 2, backgroundColor: '#F06B76', borderRadius: 2 },
  kickerText: { color: '#F18B91', fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F7F5F2', fontSize: 35, lineHeight: 39, fontWeight: '900', letterSpacing: -1.3 },
  titleAccent: { color: '#F07880' },
  subtitle: { color: '#A3AABD', fontSize: 12, lineHeight: 19, marginTop: 12, maxWidth: 320 },
  artStage: { height: 190, borderRadius: 22, marginTop: 22, marginBottom: 23, padding: 16, backgroundColor: '#252039', borderWidth: 1, borderColor: '#594665', overflow: 'hidden', justifyContent: 'space-between' },
  artGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: '#A54D70', opacity: 0.3, right: -60, top: -120 },
  floatingDisc: { position: 'absolute', width: 175, height: 175, borderRadius: 88, borderWidth: 1, borderColor: '#E3A0A4', opacity: 0.24, right: 4, top: 24 },
  artGrid: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: '#D7B2CB', opacity: 0.13, right: 34, top: 44 },
  artTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  artTopLabel: { color: '#D8C4D6', fontSize: 7, letterSpacing: 1.7, fontWeight: '900', flex: 1 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5B86B' },
  artTopRight: { color: '#C4B2C9', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  artMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  artNumber: { color: '#F4A7A6', fontSize: 12, fontWeight: '900', alignSelf: 'flex-start', marginTop: 27, marginRight: 12 },
  artHeadlineWrap: { flex: 1 },
  artHeadline: { color: '#FFF8F4', fontSize: 38, lineHeight: 37, fontWeight: '900', letterSpacing: -1.7 },
  artHeadlineSecond: { color: '#F39A9A', fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1.2 },
  artStamp: { borderWidth: 1, borderColor: '#E9B3B0', borderRadius: 30, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] },
  artStampText: { color: '#F7D8D2', fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  artBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#67536D', paddingTop: 9 },
  artBottomLeft: { color: '#C5B4CA', fontSize: 7, letterSpacing: 1.1, fontWeight: '800' },
  artBottomRight: { color: '#F0C3BA', fontSize: 7, letterSpacing: 1, fontWeight: '900' },
  ticketCutLeft: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#080B14', left: -9, top: 85 },
  ticketCutRight: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#080B14', right: -9, top: 85 },
  choices: { marginTop: 2 },
  choiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  choiceTitle: { color: '#F5F3F0', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  choiceHint: { color: '#747D91', fontSize: 7, fontWeight: '900', letterSpacing: 1.3 },
  choiceCard: { minHeight: 76, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 9, borderWidth: 1 },
  spectatorCard: { backgroundColor: '#202B3B', borderColor: '#40556D' },
  organizerCard: { backgroundColor: '#211F31', borderColor: '#514565' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  choiceIconSpectator: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#34465B', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  choiceIconOrganizer: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#41334F', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  choiceIconText: { color: '#F6B6A8', fontSize: 22, fontWeight: '900' },
  choiceCopy: { flex: 1 },
  choiceEyebrow: { color: '#B7BFD0', fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  choiceName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 3 },
  choiceDescription: { color: '#A2AABD', fontSize: 9, marginTop: 4 },
  choiceArrow: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F06B76', alignItems: 'center', justifyContent: 'center', marginLeft: 7 },
  organizerArrow: { backgroundColor: '#8170A9' },
  choiceArrowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 5 },
  footerLine: { height: 1, backgroundColor: '#343B4D', flex: 1 },
  footerText: { color: '#737B8E', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 }
});
