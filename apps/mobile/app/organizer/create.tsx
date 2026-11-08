import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { colors } from '../../src/theme';

const categories = ['Musique', 'Culture', 'Sport', 'Conférence', 'Festival', 'Autre'];
type FieldProps = { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' };
function Field({ label, value, onChangeText, placeholder, multiline, keyboardType = 'default' }: FieldProps) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline]} /></View>;
}
export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Musique');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  function showPreview() {
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (title.trim().length < 3) return setError('Le titre doit contenir au moins 3 caractères.');
    if (!city.trim() || !venue.trim()) return setError('Ajoute la ville et le lieu de l’événement.');
    if (!validDate || !validTime) return setError('Date ou heure invalide. Format attendu : AAAA-MM-JJ et HH:MM.');
    if (!/^\d+$/.test(price) || Number(price) < 0) return setError('Indique un prix en Ariary (0 si gratuit).');
    if (!/^\d+$/.test(quantity) || Number(quantity) < 1) return setError('Le nombre de billets doit être au moins égal à 1.');
    setError('');
    setPreview(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => preview ? setPreview(false) : router.back()}><Text style={styles.back}>‹  {preview ? 'Modifier la fiche' : 'Retour organisateur'}</Text></Pressable>
        <Text style={styles.kicker}>OUTIL DE PRÉPARATION</Text>
        <Text style={styles.title}>{preview ? 'Aperçu événement' : 'Créer un événement'}</Text>
        <Text style={styles.subtitle}>{preview ? 'Vérifie les informations avant la prochaine étape.' : 'Renseigne les informations principales. Tu pourras les corriger dans l’aperçu.'}</Text>
        {!preview ? <>
          <Field label="NOM DE L’ÉVÉNEMENT" value={title} onChangeText={setTitle} placeholder="Ex. Festival des lumières" />
          <Text style={styles.label}>CATÉGORIE</Text>
          <View style={styles.chips}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
          <Field label="VILLE" value={city} onChangeText={setCity} placeholder="Ex. Antananarivo" />
          <Field label="LIEU / SALLE" value={venue} onChangeText={setVenue} placeholder="Ex. Palais des Sports" />
          <View style={styles.twoColumns}><View style={styles.half}><Field label="DATE (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2026-12-20" /></View><View style={styles.half}><Field label="HEURE (HH:MM)" value={time} onChangeText={setTime} placeholder="19:00" /></View></View>
          <View style={styles.twoColumns}><View style={styles.half}><Field label="PRIX (AR)" value={price} onChangeText={setPrice} placeholder="15000" keyboardType="numeric" /></View><View style={styles.half}><Field label="QUANTITÉ" value={quantity} onChangeText={setQuantity} placeholder="200" keyboardType="numeric" /></View></View>
          <Field label="DESCRIPTION" value={description} onChangeText={setDescription} placeholder="Présente ton événement en quelques lignes..." multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={showPreview}><Text style={styles.primaryButtonText}>Prévisualiser la fiche  →</Text></Pressable>
        </> : <>
          <View style={styles.previewCard}>
            <View style={styles.artwork}><Text style={styles.artworkSymbol}>✦</Text><Text style={styles.artworkTag}>{category.toUpperCase()}</Text></View>
            <Text style={styles.previewTitle}>{title}</Text>
            <Text style={styles.meta}>⌖  {city} · {venue}</Text>
            <View style={styles.separator} />
            <Text style={styles.label}>DATE ET HEURE</Text><Text style={styles.value}>{date} à {time}</Text>
            <Text style={styles.label}>TARIF</Text><Text style={styles.price}>{Number(price).toLocaleString('fr-FR')} Ar</Text>
            <Text style={styles.label}>QUOTA PRÉVU</Text><Text style={styles.value}>{Number(quantity).toLocaleString('fr-FR')} billets</Text>
            {description.trim() ? <><Text style={styles.label}>DESCRIPTION</Text><Text style={styles.description}>{description}</Text></> : null}
          </View>
          <View style={styles.notice}><Text style={styles.noticeTitle}>Aperçu uniquement</Text><Text style={styles.noticeText}>Cette fiche n’est pas encore enregistrée ni publiée. La sauvegarde sera activée après la connexion, la validation du compte organisateur et la configuration sécurisée de la base de données.</Text></View>
          <Pressable style={styles.primaryButton} onPress={() => setPreview(false)}><Text style={styles.primaryButtonText}>Modifier les informations</Text></Pressable>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  back: { color: colors.primary, fontWeight: '800', paddingVertical: 12 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 18 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 22 },
  field: { marginBottom: 15 },
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '900', marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  twoColumns: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  error: { color: '#FF8992', fontSize: 12, marginBottom: 13 },
  primaryButton: { minHeight: 52, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginTop: 7 },
  primaryButtonText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  previewCard: { padding: 16, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  artwork: { height: 155, borderRadius: 13, backgroundColor: '#5B2437', alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  artworkSymbol: { color: '#fff', fontSize: 58 },
  artworkTag: { position: 'absolute', bottom: 12, color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: '900' },
  previewTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 7 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 14 },
  price: { color: colors.success, fontSize: 20, fontWeight: '900', marginBottom: 14 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  notice: { padding: 15, borderRadius: 14, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#5A303D', marginTop: 16, gap: 6 },
  noticeTitle: { color: colors.text, fontWeight: '900' },
  noticeText: { color: '#D7BFC5', fontSize: 11, lineHeight: 18 }
});
