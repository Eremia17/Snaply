import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { colors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ParametresScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { favorites, history } = useStore();
  const [prefs, setPref] = usePrefs();

  const logout = () =>
    Alert.alert('Se déconnecter', 'Vous pourrez vous reconnecter à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
    ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Paramètres', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 18 }}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={22} color={colors.primary} />
            <Text style={styles.statTitle}>Ma liste</Text>
            <Text style={styles.statSub}>{favorites.length} titres</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={styles.statTitle}>Vu récemment</Text>
            <Text style={styles.statSub}>{history.length} titres</Text>
          </View>
        </View>

        <Section icon="moon-outline" title="Apparence">
          <Segment options={['Sombre', 'Clair', 'Auto'] as const} value={prefs.apparence} onChange={(v) => setPref('apparence', v)} />
          <Text style={styles.hint}>Le thème est appliqué immédiatement aux éléments qui prennent en charge la palette.</Text>
        </Section>

        <Section icon="speedometer-outline" title="Performance & contrôle">
          <Toggle label="Économiseur de données" hint="Réduit le chargement en arrière-plan" value={prefs.economiseur} onChange={(v) => setPref('economiseur', v)} />
          <Toggle label="Mode famille" hint="Masque horreur, thriller et crime dans les catalogues" value={prefs.famille} onChange={(v) => setPref('famille', v)} />
        </Section>

        <Section icon="color-palette-outline" title="Couleur du thème">
          <Segment options={['Rouge', 'Bleu', 'Violet', 'Vert', 'Orange'] as const} value={prefs.theme} onChange={(v) => setPref('theme', v)} />
          <Text style={styles.hint}>La couleur d’accent est appliquée immédiatement aux éléments compatibles.</Text>
        </Section>

        <Section icon="accessibility-outline" title="Accessibilité">
          <Toggle label="Contraste renforcé" value={prefs.contraste} onChange={(v) => setPref('contraste', v)} />
          <Toggle label="Réduire les animations" value={prefs.animations} onChange={(v) => setPref('animations', v)} />
          <Toggle label="Sous-titres des bandes-annonces" value={prefs.soustitres} onChange={(v) => setPref('soustitres', v)} />
        </Section>

        <Section icon="globe-outline" title="Langue du contenu">
          <View style={styles.field}>
            <Text style={styles.fieldText}>Français</Text>
          </View>
        </Section>

        <Section icon="grid-outline" title="Affichage">
          <Text style={styles.label}>Taille des cartes et grille</Text>
          <Text style={styles.hint}>Compact : 3 colonnes. Normal : 2 colonnes. Grand : 1 grande affiche. L’accueil ajuste aussi la largeur des affiches.</Text>
          <Segment options={['Compact', 'Normal', 'Grand'] as const} value={prefs.taille} onChange={(v) => setPref('taille', v)} />
        </Section>

        <Section icon="person-outline" title="Compte">
          {user ? (
            <>
              <Text style={styles.label}>Connecté en tant que</Text>
              <Text style={styles.value}>{user.email}</Text>
              <Pressable style={styles.dangerBtn} onPress={logout}>
                <Text style={styles.btnText}>Se déconnecter</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>La connexion est facultative. Un compte permet de synchroniser vos listes et de publier des avis.</Text>
              <Pressable style={styles.primaryBtn} onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.btnText}>Se connecter ou créer un compte</Text>
              </Pressable>
            </>
          )}
        </Section>

        <Section icon="shield-outline" title="Application">
          <Link label="Données & confidentialité" onPress={() => router.push('/donnees')} />
          <Link label="À propos" onPress={() => router.push('/info/a-propos')} />
        </Section>

        <Text style={styles.footnote}>Données : TMDB, AniList, MangaDex. Tout est enregistré sur cet appareil.</Text>
      </ScrollView>
    </>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={16} color={colors.mutedForeground} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function Segment<T extends string>({ options, value, onChange }: { options: readonly T[]; value: string; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.segItem, value === o && styles.segItemOn]}>
          <Text style={[styles.segText, value === o && styles.segTextOn]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.muted }} thumbColor="#fff" />
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  statTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 6 },
  statSub: { color: colors.mutedForeground },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.primary, letterSpacing: 1.5, fontSize: 11, fontWeight: '900', fontFamily: 'sans-serif-medium', includeFontPadding: false },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border, gap: 3 },
  segItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 9, borderRadius: 10 },
  segItemOn: { backgroundColor: colors.primary },
  segText: { color: colors.mutedForeground, fontWeight: '600' },
  segTextOn: { color: '#FFFFFF', fontWeight: '800' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { color: colors.foreground, fontSize: 15 },
  hint: { color: colors.mutedForeground, fontSize: 12, marginTop: 2, lineHeight: 17 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.mutedForeground, fontSize: 13 },
  value: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  field: { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  fieldText: { color: colors.foreground, fontSize: 15 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  dangerBtn: { backgroundColor: colors.destructive, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  footnote: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 8 },
});