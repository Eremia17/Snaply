import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { colors } from '../../src/theme';

type TicketTier = { id: number; name: string; price: string; quantity: string };
const categories = ['Musique', 'Festival', 'Culture', 'Sport', 'Conférence', 'Spectacle', 'Autre'];
const steps = [{ title: 'Identité', caption: 'Informations générales' }, { title: 'Planning', caption: 'Lieu et calendrier' }, { title: 'Billetterie', caption: 'Tarifs et capacité' }, { title: 'Validation', caption: 'Contrôle final' }];
const money = (value: string) => value && /^\d+$/.test(value) ? Number(value).toLocaleString('fr-FR') + ' Ar' : 'À définir';

function Input({ label, value, onChangeText, placeholder, multiline = false, numeric = false }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean; numeric?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#778094" multiline={multiline} keyboardType={numeric ? 'numeric' : 'default'} style={[styles.input, multiline && styles.textarea]} /></View>;
}
export default function CreateEventScreen() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Musique');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('');
  const [tiers, setTiers] = useState<TicketTier[]>([{ id: 1, name: 'Entrée standard', price: '', quantity: '' }]);
  const [nextId, setNextId] = useState(2);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const totalCapacity = tiers.reduce((sum, tier) => sum + (Number(tier.quantity) || 0), 0);
  const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + 'T23:59:59').getTime() > Date.now();
  function validateStep() {
    if (step === 0) {
      if (title.trim().length < 4) return 'Le nom doit contenir au moins 4 caractères.';
      if (description.trim().length < 30) return 'Ajoute une description plus complète (30 caractères minimum).';
    }
    if (step === 1) {
      if (!city.trim() || !venue.trim() || !address.trim()) return 'Complète la ville, le lieu et son adresse.';
      if (!hasValidDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return 'Vérifie la date et l’heure de début.';
      if (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) return 'Le format de l’heure de fin doit être HH:MM.';
    }
    if (step === 2) {
      if (!tiers.length) return 'Ajoute au moins une catégorie de billet.';
      if (tiers.some(t => !t.name.trim() || !/^\d+$/.test(t.price) || !/^\d+$/.test(t.quantity) || Number(t.quantity) < 1)) return 'Chaque catégorie doit avoir un nom, un prix et un quota valide.';
    }
    return '';
  }
  function next() {
    const issue = validateStep();
    if (issue) { setError(issue); return; }
    setError('');
    setStep(Math.min(3, step + 1));
  }
  function updateTier(id: number, key: keyof TicketTier, value: string) {
    setTiers(current => current.map(t => t.id === id ? { ...t, [key]: value } : t));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable onPress={() => step > 0 ? setStep(step - 1) : router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.topTitle}>NOUVEL ÉVÉNEMENT</Text><Text style={styles.topSub}>CONFIGURATION DE LA BILLETTERIE</Text></View>
        <Text style={styles.stepCount}>{String(step + 1).padStart(2, '0')} / 04</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: ((step + 1) * 25) + '%' }]} /></View>
      <View style={styles.stepNav}>{steps.map((item, index) => <Pressable key={item.title} onPress={() => index < step && setStep(index)} style={styles.stepItem}><View style={[styles.stepBullet, index === step && styles.stepBulletActive, index < step && styles.stepBulletDone]}><Text style={[styles.stepBulletText, (index === step || index < step) && styles.stepBulletTextActive]}>{index < step ? '✓' : index + 1}</Text></View><Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{item.title}</Text></Pressable>)}</View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ÉDITEUR D’ÉVÉNEMENT</Text>
        <Text style={styles.heading}>{steps[step].title}</Text>
        <Text style={styles.subheading}>{steps[step].caption}. Les informations seront utilisées sur la page publique de l’événement.</Text>

        {step === 0 ? <>
          <View style={styles.coverPlaceholder}><View style={styles.coverIcon}><Text style={styles.coverIconText}>＋</Text></View><Text style={styles.coverTitle}>Visuel de couverture</Text><Text style={styles.coverHint}>Le téléversement d’affiche sera disponible dans la prochaine version.</Text><View style={styles.coverRecommended}><Text style={styles.coverRecommendedText}>FORMAT RECOMMANDÉ · 16:9</Text></View></View>
          <Input label="NOM DE L’ÉVÉNEMENT" value={title} onChangeText={setTitle} placeholder="Ex. Mada Urban Festival 2027" />
          <Text style={styles.fieldLabel}>CATÉGORIE</Text>
          <View style={styles.categoryGrid}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</View>
          <Input label="DESCRIPTION PUBLIQUE" value={description} onChangeText={setDescription} placeholder="Présente le concept, les artistes, les temps forts et les informations utiles..." multiline />
          <Text style={styles.helper}>Une description claire aide les participants à comprendre ce qu’ils réservent.</Text>
        </> : null}

        {step === 1 ? <>
          <View style={styles.sectionCard}><Text style={styles.sectionCardTitle}>Lieu de l’événement</Text><Text style={styles.sectionCardHint}>Où les participants doivent-ils se rendre ?</Text>
            <Input label="VILLE" value={city} onChangeText={setCity} placeholder="Antananarivo" />
            <Input label="NOM DU LIEU / ÉTABLISSEMENT" value={venue} onChangeText={setVenue} placeholder="Palais des Sports, salle..." />
            <Input label="ADRESSE COMPLÈTE" value={address} onChangeText={setAddress} placeholder="Quartier, rue, repère..." multiline />
          </View>
          <View style={styles.sectionCard}><Text style={styles.sectionCardTitle}>Date et horaires</Text><Text style={styles.sectionCardHint}>Heure locale de Madagascar (UTC+3).</Text>
            <Input label="DATE (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2027-03-18" />
            <View style={styles.inlineFields}><View style={styles.inlineField}><Input label="OUVERTURE / DÉBUT" value={startTime} onChangeText={setStartTime} placeholder="19:00" /></View><View style={styles.inlineField}><Input label="FIN (FACULTATIF)" value={endTime} onChangeText={setEndTime} placeholder="23:00" /></View></View>
          </View>
        </> : null}

        {step === 2 ? <>
          <View style={styles.ticketIntro}><View style={{ flex: 1 }}><Text style={styles.ticketIntroTitle}>Structure tarifaire</Text><Text style={styles.ticketIntroText}>Crée une ou plusieurs catégories avec un quota distinct.</Text></View><View style={styles.capacityBadge}><Text style={styles.capacityValue}>{totalCapacity || '—'}</Text><Text style={styles.capacityLabel}>PLACES</Text></View></View>
          {tiers.map((tier, index) => <View key={tier.id} style={styles.tierCard}>
            <View style={styles.tierHeader}><Text style={styles.tierIndex}>CATÉGORIE {String(index + 1).padStart(2, '0')}</Text>{tiers.length > 1 ? <Pressable onPress={() => setTiers(current => current.filter(t => t.id !== tier.id))}><Text style={styles.removeText}>Supprimer</Text></Pressable> : null}</View>
            <Input label="INTITULÉ DU BILLET" value={tier.name} onChangeText={v => updateTier(tier.id, 'name', v)} placeholder="Entrée standard, VIP..." />
            <View style={styles.inlineFields}><View style={styles.inlineField}><Input label="PRIX (ARIARY)" value={tier.price} onChangeText={v => updateTier(tier.id, 'price', v)} placeholder="25000" numeric /></View><View style={styles.inlineField}><Input label="QUOTA" value={tier.quantity} onChangeText={v => updateTier(tier.id, 'quantity', v)} placeholder="300" numeric /></View></View>
          </View>)}
          <Pressable style={styles.addTier} onPress={() => { setTiers(current => [...current, { id: nextId, name: '', price: '', quantity: '' }]); setNextId(v => v + 1); }}><Text style={styles.addTierText}>＋  Ajouter une catégorie</Text></Pressable>
          <View style={styles.infoNote}><Text style={styles.infoNoteTitle}>Gestion des capacités</Text><Text style={styles.infoNoteBody}>Les quotas devront être réservés de manière atomique au paiement pour éviter toute survente. Aucun billet n’est émis dans cette version.</Text></View>
        </> : null}

        {step === 3 ? <>
          <View style={styles.reviewHero}><Text style={styles.reviewEyebrow}>PRÊT POUR LA VÉRIFICATION</Text><Text style={styles.reviewTitle}>{title || 'Événement sans titre'}</Text><Text style={styles.reviewMeta}>{category}  ·  {city || 'Ville à préciser'}</Text></View>
          <View style={styles.reviewSection}><Text style={styles.reviewSectionTitle}>ÉVÉNEMENT</Text><ReviewLine label="Lieu" value={venue + (address ? ' · ' + address : '')} /><ReviewLine label="Date" value={date + ' · ' + startTime + (endTime ? ' – ' + endTime : '')} /><ReviewLine label="Description" value={description} /></View>
          <View style={styles.reviewSection}><Text style={styles.reviewSectionTitle}>BILLETTERIE</Text>{tiers.map(t => <ReviewLine key={t.id} label={t.name} value={money(t.price) + '  ·  ' + t.quantity + ' billets'} />)}<View style={styles.reviewTotal}><Text style={styles.reviewTotalLabel}>CAPACITÉ TOTALE</Text><Text style={styles.reviewTotalValue}>{totalCapacity.toLocaleString('fr-FR')} billets</Text></View></View>
          <View style={styles.infoNote}><Text style={styles.infoNoteTitle}>Étape suivante : connexion et validation</Text><Text style={styles.infoNoteBody}>Le dossier est prêt à être relu. L’enregistrement, l’envoi des justificatifs organisateur et la publication seront activés après mise en place de l’authentification et des services serveur.</Text></View>
          <Pressable onPress={() => setShowPreview(v => !v)} style={styles.previewToggle}><Text style={styles.previewToggleText}>{showPreview ? 'Masquer le résumé public' : 'Afficher le résumé public'}  {showPreview ? '−' : '+'}</Text></Pressable>
          {showPreview ? <View style={styles.publicPreview}><Text style={styles.publicPreviewTag}>APERÇU CÔTÉ PARTICIPANT</Text><Text style={styles.publicPreviewTitle}>{title}</Text><Text style={styles.publicPreviewMeta}>{date} · {city}</Text><Text style={styles.publicPreviewMeta}>{venue}</Text><Text style={styles.publicPreviewPrice}>À partir de {tiers.length ? money(tiers.reduce((min, t) => Math.min(min, Number(t.price)), Infinity).toString()) : '—'}</Text></View> : null}
        </> : null}
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}><Text style={styles.bottomHint}>{step === 3 ? 'Aucune publication sans validation' : 'Progression sauvegardée dans cette session'}</Text></View>
        <Pressable onPress={() => step < 3 ? next() : router.replace('/organizer')} style={styles.nextButton}><Text style={styles.nextButtonText}>{step < 3 ? 'Continuer  →' : 'Terminer'}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
function ReviewLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.reviewLine}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value || '—'}</Text></View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 17, paddingTop: 8, paddingBottom: 13 },
  backButton: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 25, lineHeight: 28 },
  topTitle: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  topSub: { color: colors.muted, fontSize: 8, marginTop: 4, letterSpacing: 1 },
  stepCount: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  progressTrack: { height: 2, backgroundColor: colors.border },
  progressFill: { height: 2, backgroundColor: colors.primary },
  stepNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepItem: { alignItems: 'center', gap: 5, minWidth: 48 },
  stepBullet: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepBulletActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepBulletDone: { backgroundColor: '#275E4B', borderColor: '#275E4B' },
  stepBulletText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  stepBulletTextActive: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 8, fontWeight: '700' },
  stepLabelActive: { color: colors.text },
  content: { paddingHorizontal: 18, paddingTop: 23, paddingBottom: 35 },
  eyebrow: { color: colors.primary, fontSize: 9, letterSpacing: 2, fontWeight: '900' },
  heading: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 7 },
  subheading: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 6, marginBottom: 22 },
  coverPlaceholder: { minHeight: 145, borderRadius: 15, borderWidth: 1, borderColor: '#465064', borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 14, marginBottom: 21 },
  coverIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  coverIconText: { color: colors.primary, fontSize: 20 },
  coverTitle: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 8 },
  coverHint: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 4 },
  coverRecommended: { marginTop: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, backgroundColor: colors.surfaceRaised },
  coverRecommendedText: { color: colors.muted, fontSize: 7, letterSpacing: 1, fontWeight: '800' },
  field: { marginBottom: 16 },
  fieldLabel: { color: '#BAC1CF', fontSize: 9, letterSpacing: 1.2, fontWeight: '900', marginBottom: 8 },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#171C28', paddingHorizontal: 13, paddingVertical: 12, color: colors.text, fontSize: 12 },
  textarea: { minHeight: 110, textAlignVertical: 'top', lineHeight: 19 },
  helper: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: -7, marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20, marginTop: 2 },
  category: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  categoryActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  categoryText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  categoryTextActive: { color: colors.text },
  sectionCard: { padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 13 },
  sectionCardTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  sectionCardHint: { color: colors.muted, fontSize: 9, marginTop: 4, marginBottom: 17 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 },
  ticketIntro: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, padding: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ticketIntroTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  ticketIntroText: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 4 },
  capacityBadge: { minWidth: 62, alignItems: 'center', padding: 8, borderRadius: 10, backgroundColor: colors.surfaceRaised },
  capacityValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  capacityLabel: { color: colors.muted, fontSize: 7, letterSpacing: 1, marginTop: 2 },
  tierCard: { padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 11 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tierIndex: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  removeText: { color: '#F08B92', fontSize: 9, fontWeight: '800' },
  addTier: { padding: 14, borderRadius: 11, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center' },
  addTierText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  infoNote: { marginTop: 15, padding: 13, borderRadius: 11, backgroundColor: '#202A30', borderWidth: 1, borderColor: '#35464A', gap: 5 },
  infoNoteTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  infoNoteBody: { color: '#AEBFC0', fontSize: 9, lineHeight: 15 },
  reviewHero: { backgroundColor: '#28202C', borderRadius: 15, borderWidth: 1, borderColor: '#4B3447', padding: 17, marginBottom: 13 },
  reviewEyebrow: { color: '#D98D9B', fontSize: 8, letterSpacing: 1.5, fontWeight: '900' },
  reviewTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 9 },
  reviewMeta: { color: colors.muted, fontSize: 10, marginTop: 6 },
  reviewSection: { backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  reviewSectionTitle: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 13 },
  reviewLine: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 5 },
  reviewLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  reviewValue: { color: colors.text, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  reviewTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 13 },
  reviewTotalLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  reviewTotalValue: { color: colors.text, fontSize: 11, fontWeight: '900' },
  previewToggle: { padding: 13, borderRadius: 10, backgroundColor: colors.surfaceRaised, alignItems: 'center', marginTop: 12 },
  previewToggleText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  publicPreview: { padding: 15, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 10, gap: 7 },
  publicPreviewTag: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  publicPreviewTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 5 },
  publicPreviewMeta: { color: colors.muted, fontSize: 10 },
  publicPreviewPrice: { color: colors.success, fontSize: 13, fontWeight: '900', marginTop: 8 },
  errorBox: { padding: 12, borderRadius: 9, backgroundColor: '#3A202B', marginTop: 13 },
  errorText: { color: '#FFADB4', fontSize: 10, lineHeight: 16 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 17, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  bottomHint: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  nextButton: { minWidth: 125, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingHorizontal: 17, paddingVertical: 13, borderRadius: 10 },
  nextButtonText: { color: colors.white, fontSize: 10, fontWeight: '900' }
});
