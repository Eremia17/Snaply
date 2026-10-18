import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Entry = { label: string; icon: IconName; to?: string; hint?: string };
type Section = { title: string; items: Entry[] };

// Routes existantes dans l'application ; les autres affichent « bientôt disponible »
const BUILT = new Set([
  '/', '/films', '/catalogue/film', '/catalogue/manga', '/catalogue/occidental', '/catalogue/serie',
  '/sports', '/classiques', '/recherche', '/ce-soir', '/calendrier', '/comparer', '/listes', '/ma-liste',
  '/journal', '/bilan', '/communaute', '/membres', '/profil', '/donnees', '/info/aide', '/info/a-propos',
  '/info/confidentialite', '/info/conditions', '/contact', '/statut', '/developpeurs', '/reconnaitre', '/partage', '/moderation', '/membres', '/recherche',
]);

const SECTIONS: Section[] = [
  { title: 'Explorer', items: [
    { label: 'Accueil', icon: 'home-outline', to: '/' },
    { label: 'Films', icon: 'film-outline', to: '/catalogue/film' },
    { label: 'Animés manga', icon: 'film-outline', to: '/catalogue/manga' },
    { label: 'Animés occidentaux', icon: 'tv-outline', to: '/catalogue/occidental' },
    { label: 'Séries', icon: 'play-circle-outline', to: '/catalogue/serie' },
    { label: 'Sports en direct', icon: 'trophy-outline', to: '/sports' },
    { label: 'Classiques du domaine public', icon: 'library-outline', hint: 'Films complets gratuits', to: '/classiques' },
  ] },
  { title: 'Outils', items: [
    { label: 'Recherche avancée', icon: 'options-outline', hint: 'Filtres, tri, recherches enregistrées', to: '/recherche' },
    { label: 'Que regarder ce soir ?', icon: 'sparkles-outline', to: '/ce-soir' },
    { label: 'Calendrier des sorties', icon: 'calendar-outline', to: '/calendrier' },
    { label: 'Comparer deux titres', icon: 'git-compare-outline', to: '/comparer' },
    { label: 'Reconnaître une affiche', icon: 'scan-outline', hint: 'Par photo, grâce à l’IA', to: '/reconnaitre' },
  ] },
  { title: 'Ma bibliothèque', items: [
    { label: 'Ma liste', icon: 'heart-outline', to: '/ma-liste' },
    { label: 'Mes listes', icon: 'list-outline', hint: 'Collections partageables', to: '/listes' },
    { label: 'Listes partagées', icon: 'people-outline', hint: 'À plusieurs, en direct', to: '/partage' },
    { label: 'Journal & trophées', icon: 'journal-outline', to: '/journal' },
    { label: 'Mon bilan de l’année', icon: 'stats-chart-outline', to: '/bilan' },
  ] },
  { title: 'Communauté', items: [
    { label: 'Avis & discussions', icon: 'chatbubbles-outline', to: '/communaute' },
    { label: 'Classement des membres', icon: 'medal-outline', to: '/membres' },
  ] },
  { title: 'Mon compte', items: [
    { label: 'Mon profil', icon: 'person-outline', to: '/profil' },
    { label: 'Données & confidentialité', icon: 'server-outline', hint: 'Export, suppression, annonces', to: '/donnees' },
  ] },
  { title: 'Pro & aide', items: [
    { label: 'Aide & mode d’emploi', icon: 'help-circle-outline', hint: 'Toutes les fonctions expliquées', to: '/info/aide' },
    { label: 'API publique', icon: 'code-slash-outline', hint: 'Documentation et limites', to: '/developpeurs' },
    { label: 'État du système', icon: 'pulse-outline', to: '/statut' },
    { label: 'Contact & suggestions', icon: 'mail-outline', to: '/contact' },
    { label: 'À propos', icon: 'information-circle-outline', to: '/info/a-propos' },
    { label: 'Confidentialité', icon: 'document-text-outline', to: '/info/confidentialite' },
    { label: 'Conditions d’utilisation', icon: 'document-outline', to: '/info/conditions' },
  ] },
];

const ADMIN: Section = { title: 'Administration', items: [
  { label: 'Tableau de bord admin', icon: 'shield-checkmark-outline', hint: 'Statistiques anonymisées, rôles', to: '/moderation' },
  { label: 'Modération', icon: 'shield-half-outline', hint: 'Signalements d’avis', to: '/moderation' },
] };

export default function MenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const open = (e: Entry) => {
    if (e.to && BUILT.has(e.to)) {
      if (e.to === '/' || e.to === '/ma-liste' || e.to === '/profil') router.navigate(e.to as never);
      else router.push(e.to as never);
    } else {
      Alert.alert('Bientôt disponible', `« ${e.label} » sera ajouté dans une prochaine version.`);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.head}>
        <View style={styles.logoTile}><Ionicons name="film-outline" size={18} color="#fff" /></View>
        <Text style={styles.brand}>Erëmīa</Text>
        {user ? <Text style={styles.mail}>{user.email}</Text> : null}
      </View>

      <View style={styles.quick}>
        <View style={styles.quickBox}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <TextInput placeholder="Recherche rapide" placeholderTextColor={colors.mutedForeground} style={styles.quickInput}
            onSubmitEditing={(e) => router.push({ pathname: '/recherche', params: { q: e.nativeEvent.text } })} />
        </View>
      </View>

      {[...SECTIONS, ...(user ? [ADMIN] : [])].map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title.toUpperCase()}</Text>
          {s.items.map((e) => (
            <Pressable key={e.label} style={styles.row} onPress={() => open(e)}>
              <Ionicons name={e.icon} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{e.label}</Text>
                {e.hint ? <Text style={styles.hint}>{e.hint}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ))}

      {user ? (
        <Pressable style={styles.logout} onPress={() => Alert.alert('Se déconnecter', 'Vous pourrez vous reconnecter à tout moment.', [
          { text: 'Annuler', style: 'cancel' }, { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
        ])}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.logout} onPress={() => router.push('/(auth)/login')}>
          <Ionicons name="log-in-outline" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Se connecter (facultatif)</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: 48 },
  head: { alignItems: 'center', paddingHorizontal: 20, gap: 6, paddingVertical: 10 },
  logoTile: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  mail: { color: colors.mutedForeground, fontSize: 13 },
  quick: { paddingHorizontal: 16, marginTop: 8 },
  quickBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  quickInput: { flex: 1, color: colors.foreground, paddingVertical: 12 },
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowText: { color: colors.foreground, fontSize: 15 },
  hint: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, marginHorizontal: 16, paddingVertical: 12 },
  logoutText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});