import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import {
  fetchProfile, removeAvatar, saveProfile, setPublic, uploadAvatar, type Profile,
} from '@/lib/profile';
import { colors } from '@/lib/theme';

const EMPTY: Partial<Profile> = {
  display_name: '', phone: '', country: '', region: '', city: '', gender: '', bio: '', birth_date: '',
};

export default function ProfilScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<Partial<Profile>>(EMPTY);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await fetchProfile(user.id);
      if (p) {
        setForm({ ...EMPTY, ...p });
        setAvatar(p.avatar_url);
        setIsPublic(p.is_public);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const set = (k: keyof Profile) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    const name = (form.display_name ?? '').trim();
    const phone = (form.phone ?? '').trim();
    const birth = (form.birth_date ?? '').trim();
    if (name.length < 2) return Alert.alert('Pseudo trop court', 'Le pseudo doit contenir au moins 2 caractères.');
    if (phone && !/^[+0-9 ().-]{6,30}$/.test(phone)) return Alert.alert('Téléphone invalide', 'Vérifiez le numéro.');
    if (birth && (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || new Date(birth) > new Date())) {
      return Alert.alert('Date invalide', 'Format attendu : AAAA-MM-JJ, et une date passée.');
    }
    setSaving(true);
    try {
      await saveProfile(user.id, user.email ?? null, form);
      Alert.alert('Profil enregistré');
    } catch (e: any) {
      Alert.alert('Enregistrement impossible', e.message);
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Accès refusé', 'Autorisez l’accès aux photos dans les réglages.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoBusy(true);
    try {
      setAvatar(await uploadAvatar(user.id, result.assets[0].uri));
    } catch (e: any) {
      Alert.alert('Photo impossible', e.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const deletePhoto = async () => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      await removeAvatar(user.id);
      setAvatar(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const togglePublic = async (v: boolean) => {
    if (!user) return;
    setIsPublic(v);
    try {
      await setPublic(user.id, v);
    } catch (e: any) {
      setIsPublic(!v);
      Alert.alert('Réglage impossible', e.message);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Ionicons name="person-circle-outline" size={64} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
          Le profil est disponible avec un compte. La connexion est facultative.
        </Text>
        <Pressable style={styles.save} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.saveText}>Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
      <View style={styles.avatarRow}>
        <Pressable onPress={changePhoto} disabled={photoBusy} style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Ionicons name="person" size={40} color={colors.mutedForeground} />
            </View>
          )}
          {photoBusy ? <ActivityIndicator style={styles.avatarBusy} color="#fff" /> : null}
        </Pressable>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.smallBtn} onPress={changePhoto} disabled={photoBusy}>
              <Text style={styles.smallBtnText}>Changer la photo</Text>
            </Pressable>
            {avatar ? (
              <Pressable style={styles.smallBtn} onPress={deletePhoto} disabled={photoBusy}>
                <Text style={styles.smallBtnText}>Retirer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Field label="Pseudo" value={form.display_name ?? ''} onChangeText={set('display_name')} maxLength={40} />
      <Field label="Téléphone" value={form.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Pays" value={form.country ?? ''} onChangeText={set('country')} />
      <Field label="Région" value={form.region ?? ''} onChangeText={set('region')} />
      <Field label="Ville" value={form.city ?? ''} onChangeText={set('city')} />
      <Field label="Genre" value={form.gender ?? ''} onChangeText={set('gender')} />
      <Field label="Date de naissance (AAAA-MM-JJ)" value={form.birth_date ?? ''} onChangeText={set('birth_date')} />
      <Field
        label="Bio"
        value={form.bio ?? ''}
        onChangeText={set('bio')}
        multiline
        maxLength={300}
      />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Profil public</Text>
          <Text style={styles.switchHint}>Visible par les autres membres dans le classement.</Text>
        </View>
        <Switch value={isPublic} onValueChange={togglePublic} trackColor={{ true: colors.primary }} />
      </View>

      <Pressable style={styles.save} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer le profil</Text>}
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.push('/donnees')}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.foreground} />
        <Text style={styles.secondaryText}>Données & confidentialité</Text>
      </Pressable>

      <Pressable style={styles.danger} onPress={signOut}>
        <Text style={styles.dangerText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  email: { color: colors.mutedForeground, fontSize: 13 },
  smallBtn: { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  label: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.card, color: colors.foreground, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  switchTitle: { color: colors.foreground, fontWeight: '700' },
  switchHint: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  save: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  secondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.muted, borderRadius: 12, padding: 14,
  },
  secondaryText: { color: colors.foreground, fontWeight: '600' },
  danger: { backgroundColor: colors.destructive, borderRadius: 12, padding: 14, alignItems: 'center' },
  dangerText: { color: '#fff', fontWeight: '700' },
});