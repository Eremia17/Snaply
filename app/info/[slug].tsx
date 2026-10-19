import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

type InfoPage = { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; sections: { heading: string; body: string }[] };

const PAGES: Record<string, InfoPage> = {
  aide: {
    title: 'Centre d’aide',
    subtitle: 'Les repères essentiels pour profiter pleinement d’Erëmīa.',
    icon: 'help-circle-outline',
    sections: [
      { heading: 'Explorer', body: 'Parcourez les films, les animés manga, les animations occidentales et les séries. Utilisez les filtres pour affiner les résultats par genre, année ou note.' },
      { heading: 'Gérer votre liste', body: 'Ajoutez vos œuvres favorites et retrouvez les fiches récemment consultées depuis l’onglet Ma liste.' },
      { heading: 'Découvrir une fiche', body: 'Chaque fiche rassemble les informations disponibles : synopsis, casting, bande-annonce, critiques et titres associés.' },
      { heading: 'Besoin d’aide ?', body: 'Ouvrez Contact & suggestions depuis le menu pour signaler un problème ou proposer une amélioration.' },
    ],
  },
  'a-propos': {
    title: 'À propos d’Erëmīa',
    subtitle: 'Votre espace pour découvrir de nouvelles histoires.',
    icon: 'sparkles-outline',
    sections: [
      { heading: 'Notre objectif', body: 'Erëmīa rassemble la découverte de films, séries et animés dans une expérience simple, soignée et accessible sur mobile.' },
      { heading: 'Catalogue et sources', body: 'Les informations affichées dépendent des fournisseurs de données connectés et peuvent être incomplètes ou différer selon les œuvres.' },
      { heading: 'Une application en évolution', body: 'Les fonctions et la présentation continuent d’évoluer. Vos retours nous aident à prioriser les améliorations.' },
    ],
  },
  conditions: {
    title: 'Conditions d’utilisation',
    subtitle: 'Les règles qui permettent à la communauté de rester utile et respectueuse.',
    icon: 'document-text-outline',
    sections: [
      { heading: 'Respect et responsabilité', body: 'Publiez des avis respectueux. Les contenus illégaux, menaçants, discriminatoires ou destinés à harceler d’autres personnes ne sont pas acceptés.' },
      { heading: 'Avis et modération', body: 'Les avis reflètent les opinions de leurs auteurs. Les contenus signalés peuvent être examinés et modérés.' },
      { heading: 'Informations du catalogue', body: 'Les données et recommandations sont fournies à titre informatif. Des erreurs ou des informations manquantes peuvent survenir.' },
    ],
  },
  confidentialite: {
    title: 'Confidentialité',
    subtitle: 'Comprendre où sont conservées vos informations et comment les gérer.',
    icon: 'shield-checkmark-outline',
    sections: [
      { heading: 'Données sur l’appareil', body: 'Les favoris et l’historique local sont conservés sur votre appareil. La page Données & confidentialité permet de les exporter, importer ou supprimer.' },
      { heading: 'Données en ligne', body: 'Certaines fonctions liées au compte, au profil et aux avis nécessitent un service en ligne. Évitez de publier des informations personnelles dans les contenus publics.' },
      { heading: 'Vos choix', body: 'Vous pouvez gérer vos données locales depuis les outils dédiés. La suppression locale ne supprime pas automatiquement les données associées à un compte en ligne.' },
    ],
  },
};

export default function InfoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = PAGES[String(slug)];
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: page?.title ?? 'Information', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false, headerTitleStyle: { fontFamily: 'sans-serif-medium', fontWeight: '700' } }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {page ? (
          <>
            <View style={styles.hero}>
              <View style={styles.iconTile}><Ionicons name={page.icon} size={28} color="#fff" /></View>
              <Text style={styles.eyebrow}>ERËMĪA  /  INFORMATIONS</Text>
              <Text style={styles.title}>{page.title}</Text>
              <Text style={styles.subtitle}>{page.subtitle}</Text>
            </View>
            <View style={styles.guideLabel}><Ionicons name="layers-outline" size={14} color={colors.primary} /><Text style={styles.guideLabelText}>GUIDE RAPIDE</Text></View>
            {page.sections.map((section, index) => {
              const open = expanded === index;
              const sectionIcons: (keyof typeof Ionicons.glyphMap)[] = ['compass-outline', 'bookmark-outline', 'information-circle-outline', 'chatbubble-ellipses-outline'];
              return (
                <View key={section.heading} style={[styles.card, open && styles.cardOpen]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : index)} style={styles.cardTop}>
                    <View style={[styles.number, open && styles.numberOpen]}><Ionicons name={sectionIcons[index % sectionIcons.length]} size={18} color={open ? '#fff' : colors.primary} /></View>
                    <View style={styles.cardHeadingWrap}>
                      <Text style={styles.cardIndex}>ÉTAPE {String(index + 1).padStart(2, '0')}</Text>
                      <Text style={styles.heading}>{section.heading}</Text>
                    </View>
                    <View style={[styles.chevron, open && styles.chevronOpen]}><Ionicons name={open ? 'remove' : 'add'} size={18} color={open ? '#fff' : colors.mutedForeground} /></View>
                  </Pressable>
                  {open ? <Text style={styles.body}>{section.body}</Text> : null}
                </View>
              );
            })}
            <Text style={styles.footer}>Erëmīa · Découvrir, comprendre, partager.</Text>
          </>
        ) : (
          <View style={styles.notFound}>
            <Ionicons name="alert-circle-outline" size={34} color={colors.mutedForeground} />
            <Text style={styles.heading}>Page introuvable</Text>
            <Text style={styles.body}>Cette page n’est pas disponible. Revenez au menu et choisissez une rubrique existante.</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 38, gap: 10 },
  hero: { borderRadius: 24, padding: 22, marginBottom: 8, backgroundColor: '#171923', borderWidth: 1, borderColor: '#303341', gap: 10, overflow: 'hidden' },
  iconTile: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginBottom: 3 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, includeFontPadding: false },
  title: { color: colors.foreground, fontSize: 26, lineHeight: 32, fontWeight: '900', fontFamily: 'sans-serif-black', includeFontPadding: false },
  subtitle: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, fontFamily: 'sans-serif' },
  guideLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2, marginBottom: 2, paddingHorizontal: 4 },
  guideLabelText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 13, gap: 12, borderWidth: 1, borderColor: colors.border },
  cardOpen: { borderColor: colors.primary, backgroundColor: '#171820' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardHeadingWrap: { flex: 1, gap: 3 },
  cardIndex: { color: colors.mutedForeground, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  chevron: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#252731' },
  chevronOpen: { backgroundColor: colors.primary },
  number: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B1A23' },
  numberOpen: { backgroundColor: colors.primary },
  numberText: { color: colors.primary, fontSize: 11, fontWeight: '900', fontFamily: 'sans-serif-medium' },
  heading: { flex: 1, color: colors.foreground, fontSize: 16, lineHeight: 21, fontWeight: '800', fontFamily: 'sans-serif-medium', includeFontPadding: false },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 22, fontFamily: 'sans-serif' },
  footer: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 8, letterSpacing: 0.4 },
  notFound: { alignItems: 'center', gap: 12, padding: 28, backgroundColor: colors.card, borderRadius: 18 },
});
