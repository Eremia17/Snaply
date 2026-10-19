import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { Kind } from '@/lib/types';

type Message = { role: 'user' | 'assistant'; text: string };

export function FicheAssistant({ title, kind, year, synopsis }: {
  title: string;
  kind: Kind;
  year?: string | null;
  synopsis?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    if (!isSupabaseConfigured) {
      setError('Le service Supabase n’est pas configuré.');
      return;
    }
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('gemini', {
        body: {
          action: 'chat',
          title,
          kind,
          year: year ?? null,
          synopsis: synopsis ?? '',
          messages: next.slice(-12).map((m) => ({ role: m.role, text: m.text })),
        },
      });
      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(String(data.error));
      if (typeof data?.reply !== 'string' || !data.reply.trim()) throw new Error('Réponse vide du service.');
      setMessages((current) => [...current, { role: 'assistant', text: data.reply.trim() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de contacter l’assistant.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setVisible(true)} style={styles.launch}>
        <Ionicons name="sparkles" size={19} color="#fff" />
        <View style={styles.launchText}>
          <Text style={styles.launchTitle}>Assistant Erëmīa</Text>
          <Text style={styles.launchSub}>Pose une question sur cette œuvre</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </Pressable>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.headerIcon}><Ionicons name="sparkles" size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>Assistant Erëmīa</Text>
              <Text style={styles.subheading} numberOfLines={1}>{title}</Text>
            </View>
            <Pressable accessibilityLabel="Fermer l’assistant" onPress={() => setVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={27} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView style={styles.history} contentContainerStyle={styles.historyContent} keyboardShouldPersistTaps="handled">
            {messages.length === 0 ? (
              <View style={styles.welcome}>
                <Ionicons name="chatbubbles-outline" size={34} color={colors.primary} />
                <Text style={styles.welcomeTitle}>Parlons de {title}</Text>
                <Text style={styles.welcomeText}>Demande un résumé sans spoiler, des explications sur les personnages, ou des recommandations similaires.</Text>
              </View>
            ) : messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, m.role === 'user' && styles.userMessageText]}>{m.text}</Text>
              </View>
            ))}
            {busy ? <View style={styles.thinking}><ActivityIndicator color={colors.primary} /><Text style={styles.thinkingText}>L’assistant réfléchit…</Text></View> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Écris ta question…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={800}
              editable={!busy}
              style={styles.input}
              returnKeyType="default"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer la question" onPress={send} disabled={busy || !draft.trim()} style={[styles.send, (busy || !draft.trim()) && styles.sendDisabled]}>
              <Ionicons name="send" size={19} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>Les réponses peuvent contenir des erreurs. Précise si tu acceptes les spoilers.</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  launch: { marginTop: 22, borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary },
  launchText: { flex: 1, gap: 3 },
  launchTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  launchSub: { color: '#fff', opacity: 0.9, fontSize: 12 },
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  subheading: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  history: { flex: 1 },
  historyContent: { paddingVertical: 16, gap: 12, flexGrow: 1 },
  welcome: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 22 },
  welcomeTitle: { color: colors.foreground, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  welcomeText: { color: colors.mutedForeground, lineHeight: 21, textAlign: 'center' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 15 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  messageText: { color: colors.foreground, lineHeight: 21 },
  userMessageText: { color: '#fff' },
  thinking: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  thinkingText: { color: colors.mutedForeground },
  error: { color: '#ef4444', padding: 8, lineHeight: 19 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 8, backgroundColor: colors.card },
  input: { flex: 1, color: colors.foreground, minHeight: 42, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 9 },
  send: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  disclaimer: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center', paddingTop: 7 },
});
