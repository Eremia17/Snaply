import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/lib/theme';

const PAGES: Record<string, { title: string; body: string[] }> = {
  aide: {
    title: 'Aide & mode d’emploi',
    body: [
      'Accueil : vos récents et vos favoris, et une sélection de tendances.',
      'Catalogue : parcourez films, animés manga, animés occidentaux et séries. Appuyez sur un titre pour ouvrir sa fiche.',
      'Ma liste : vos favoris et les titres consultés récemment.',
      'Fiche d’un titre : ajoutez-le à vos favoris, à une de vos listes, ou publiez un avis.',
      'Plus : tous les outils, la communauté, votre compte et les pages d’information.',
    ],
  },
  'a-propos': {
    title: 'À propos',
    body: [
      'Erëmīa est une application pour découvrir et suivre films, animés et séries, au même endroit.',
      'Elle reprend les fonctions du site MovieVerse, avec la même logique et les mêmes données.',
    ],
  },
  conditions: {
    title: 'Conditions d’utilisation',
    body: [
      'En utilisant Erëmīa, vous acceptez de partager des avis respectueux et de ne pas publier de contenu illégal ou offensant.',
      'Les avis peuvent être modérés. Les contenus signalés sont examinés et peuvent être masqués.',
    ],
  },
  confidentialite: {
    title: 'Confidentialité',
    body: [
      'Vos favoris et votre historique sont enregistrés sur votre téléphone. Vous pouvez les exporter ou les supprimer à tout moment dans « Données & confidentialité ».',
      'Votre compte, votre profil et vos avis sont enregistrés en ligne. Votre profil reste privé tant que vous ne le rendez pas public.',
    ],
  },
};

export default function InfoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = PAGES[String(slug)];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: page?.title ?? 'Information', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {page ? page.body.map((p, i) => <Text key={i} style={styles.p}>{p}</Text>) : <Text style={styles.p}>Page introuvable.</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  p: { color: colors.foreground, fontSize: 15, lineHeight: 23 },
});