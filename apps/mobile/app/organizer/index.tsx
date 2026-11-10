import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '../../src/theme';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';

const shortcuts = [
  { icon: '▦', title: 'Mes événements', detail: 'Retrouver, modifier et suivre tes événements', route: '/organizer/events' as const },
  { icon: '+', title: 'Nouvel événement', detail: 'Créer une fiche et configurer la billetterie', route: '/organizer/create' as const },
  { icon: '▤', title: 'Billetterie', detail: 'Types de billets, quotas et tarifs', route: null },
  { icon: '⌁', title: 'Contrôle d’accès', detail: 'Scanner et valider les billets à l’entrée', route: '/organizer/scanner' as const },
  { icon: '↗', title: 'Rapports', detail: 'Fréquentation, entrées et historique des contrôles', route: '/organizer/attendance' as const },
];
const pipeline = [
  { number: '01', title: 'Configurer l’organisation', detail: 'Profil, coordonnées et validation du compte' },
  { number: '02', title: 'Préparer un événement', detail: 'Programme, lieu, capacité et tarifs' },
  { number: '03', title: 'Ouvrir la billetterie', detail: 'Paiement, émission des billets et contrôles' },
];

function Metric({ label, hint }: { label: string; hint: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>—</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricHint}>{hint}</Text></View>;
}
export default function OrganizerScreen() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    async function verifyAccess() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace('/account?next=organizer');
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/account?next=organizer');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!active) return;
      if (profile?.role !== 'organizer' && profile?.role !== 'admin') {
        router.replace('/organizer/request');
        return;
      }
      setAuthorized(true);
      setCheckingAccess(false);
    }
    void verifyAccess();
    return () => { active = false; };
  }, []);

  if (checkingAccess || !authorized) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View><Text style={styles.brand}>TICKET <Text style={styles.brandAccent}>MADA</Text></Text><Text style={styles.workspace}>ESPACE ORGANISATEUR</Text></View>
          <Pressable onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Changer d’espace" style={styles.avatar}><Text style={styles.avatarText}>↔</Text></Pressable>
        </View>
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>CENTRE DE PILOTAGE</Text><Text style={styles.title}>Vue d’ensemble</Text><Text style={styles.subtitle}>Pilote tes événements depuis un seul espace.</Text></View>
          <Pressable onPress={() => router.push('/organizer/create')} style={styles.createButton}><Text style={styles.createPlus}>＋</Text><Text style={styles.createText}>Créer</Text></Pressable>
        </View>

        <View style={styles.statusBanner}><View style={styles.statusDot} /><View style={{ flex: 1 }}><Text style={styles.statusTitle}>Espace en préparation</Text><Text style={styles.statusBody}>Les statistiques apparaîtront ici dès que les événements et les ventes seront connectés.</Text></View></View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Activité</Text><Text style={styles.sectionMeta}>DONNÉES EN ATTENTE</Text></View>
        <View style={styles.metrics}>
          <Metric label="Événements" hint="Total publié" />
          <Metric label="Billets vendus" hint="Toutes périodes" />
          <Metric label="Chiffre d’affaires" hint="En Ariary" />
          <Metric label="Entrées validées" hint="Contrôle d’accès" />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Outils de gestion</Text><Text style={styles.sectionMeta}>WORKSPACE</Text></View>
        <View style={styles.tools}>
          {shortcuts.map((item, index) => <Pressable key={item.title} onPress={() => item.route && router.push(item.route)} style={styles.tool}>
            <View style={[styles.toolIcon, index === 0 && styles.toolIconPrimary]}><Text style={[styles.toolIconText, index === 0 && styles.toolIconTextPrimary]}>{item.icon}</Text></View>
            <View style={styles.toolCopy}><Text style={styles.toolTitle}>{item.title}</Text><Text style={styles.toolDetail}>{item.detail}</Text></View>
            <Text style={styles.toolArrow}>{item.route ? '›' : '—'}</Text>
          </Pressable>)}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Mise en service</Text><Text style={styles.sectionMeta}>3 ÉTAPES</Text></View>
        <View style={styles.pipeline}>
          {pipeline.map((item, index) => <View key={item.number} style={styles.pipelineRow}><View style={styles.pipelineNumber}><Text style={styles.pipelineNumberText}>{item.number}</Text></View><View style={styles.pipelineCopy}><Text style={styles.pipelineTitle}>{item.title}</Text><Text style={styles.pipelineDetail}>{item.detail}</Text></View>{index < 2 ? <View style={styles.pipelineLine} /> : null}</View>)}
        </View>
        <Text style={styles.footer}>TICKET MADA · ORGANIZER WORKSPACE · V 0.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 19, paddingTop: 12, paddingBottom: 38 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 26, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  brandAccent: { color: colors.primary },
  workspace: { color: colors.muted, fontSize: 8, letterSpacing: 2, fontWeight: '800', marginTop: 5 },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 20 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 7, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  createButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  createPlus: { color: colors.white, fontSize: 17, fontWeight: '700' },
  createText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  statusBanner: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: '#202A30', borderWidth: 1, borderColor: '#35464A' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5B85C', marginTop: 4 },
  statusTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  statusBody: { color: '#AEBFC0', fontSize: 10, lineHeight: 16, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 13 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, minHeight: 104 },
  metricValue: { color: colors.text, fontSize: 25, fontWeight: '900' },
  metricLabel: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 7 },
  metricHint: { color: colors.muted, fontSize: 9, marginTop: 3 },
  tools: { borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 72 },
  toolIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  toolIconPrimary: { backgroundColor: colors.primarySoft },
  toolIconText: { color: colors.muted, fontSize: 19, fontWeight: '800' },
  toolIconTextPrimary: { color: colors.primary },
  toolCopy: { flex: 1, gap: 4 },
  toolTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  toolDetail: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  toolArrow: { color: colors.muted, fontSize: 19, paddingHorizontal: 4 },
  pipeline: { backgroundColor: colors.surface, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: colors.border },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 61, position: 'relative' },
  pipelineNumber: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  pipelineNumberText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  pipelineCopy: { flex: 1, gap: 4 },
  pipelineTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  pipelineDetail: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  pipelineLine: { position: 'absolute', left: 15, top: 43, height: 28, width: 1, backgroundColor: colors.border },
  footer: { color: colors.muted, fontSize: 8, letterSpacing: 1.5, textAlign: 'center', marginTop: 28 }
});
