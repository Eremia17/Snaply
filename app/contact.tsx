import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

const TYPES = ['Suggestion', 'Bug', 'Contenu à corriger', 'Suppression de mon compte', 'Autre'] as const;

export default function ContactScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [type, setType] = useState<(typeof TYPES)[number]>('Suggestion');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user) return Alert.alert('Connexion requise', 'Connectez-vous (facultatif) pour envoyer un message.');
    if (message.trim().length < 10) return Alert.alert('Message trop court', 'Écrivez au moins 10 caractères.');
    setBusy(true);
    const { error } = await supabase.from('feedback').insert({ type, message: message.trim().slice(0, 1000) });
    setBusy(false);
    if (error) return Alert.alert('Envoi impossible', error.message);
    setMessage('');
    Alert.alert('Merci', 'Votre message a bien été envoyé.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Contact & suggestions', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground, headerShadowVisible: false }} />
      <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={styles.label}>TYPE DE MESSAGE</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipOn]}>
              <Text style={[styles.chipText, type === t && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>VOTRE MESSAGE</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          placeholder="Décrivez votre suggestion ou le problème rencontré"
          placeholderTextColor={colors.mutedForeground}
        />
        <Pressable style={styles.send} onPress={send} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Envoyer</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  label: { color: colors.mutedForeground, letterSpacing: 2, fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.muted },
  chipText: { color: colors.mutedForeground, fontSize: 13 },
  chipTextOn: { color: colors.primary, fontWeight: '700' },
  input: { backgroundColor: colors.card, color: colors.foreground, borderRadius: 14, padding: 14, minHeight: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
  send: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  sendText: { color: '#fff', fontWeight: '800' },
});