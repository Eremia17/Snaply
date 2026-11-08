import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../src/theme';

const tasks = [
  { title: 'Créer un événement', description: 'Préparer une fiche, un lieu, une date et des tarifs.', icon: '+', action: () => router.push('/organizer/create') },
  { title: 'Gérer les billets', description: 'Suivre les catégories, quotas et ventes.', icon: '▤' },
  { title: 'Suivi des ventes', description: 'Consulter les commandes et les montants à reverser.', icon: '↗' },
];
export default function OrganizerScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹  Retour au catalogue</Text></Pressable>
        <Text style={styles.kicker}>ESPACE PARTENAIRE</Text>
        <Text style={styles.title}>Espace organisateur</Text>
        <Text style={styles.subtitle}>Les outils pour préparer et suivre tes événements.</Text>
        <View style={styles.notice}><Text style={styles.noticeTitle}>Espace en aperçu</Text><Text style={styles.noticeText}>Tu peux déjà préparer une fiche événement et vérifier son aperçu. La publication sera réservée aux organisateurs dont le compte aura été validé.</Text></View>
        {tasks.map((task, index) => <Pressable key={task.title} onPress={task.action} disabled={index !== 0} style={[styles.task, index !== 0 && styles.taskDisabled]}><View style={styles.icon}><Text style={styles.iconText}>{task.icon}</Text></View><View style={styles.taskText}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskDescription}>{task.description}</Text></View><Text style={styles.arrow}>{index === 0 ? '›' : 'Bientôt'}</Text></Pressable>)}
        <View style={styles.feeCard}><Text style={styles.feeTitle}>Commissions et reversements</Text><Text style={styles.feeBody}>Chaque vente devra afficher séparément le prix du billet, les frais du prestataire, la commission Ticket Mada et le montant net organisateur. Aucun taux n'est appliqué tant que les conditions ne sont pas acceptées.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  back: { color: colors.primary, fontWeight: '800', paddingVertical: 12 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 25 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  notice: { padding: 15, backgroundColor: colors.primarySoft, borderRadius: 15, borderWidth: 1, borderColor: '#5A303D', marginTop: 22, gap: 6 },
  noticeTitle: { color: colors.text, fontWeight: '900' },
  noticeText: { color: '#D7BFC5', fontSize: 12, lineHeight: 19 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, marginTop: 12, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  taskDisabled: { opacity: 0.55 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.primary, fontSize: 23, fontWeight: '900' },
  taskText: { flex: 1, gap: 4 },
  taskTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  taskDescription: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  arrow: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  feeCard: { padding: 16, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border, marginTop: 20, gap: 8 },
  feeTitle: { color: colors.text, fontWeight: '900', fontSize: 15 },
  feeBody: { color: colors.muted, fontSize: 12, lineHeight: 19 }
});
