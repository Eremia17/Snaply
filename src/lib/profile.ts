// Profil public et avatar (tables et bucket Supabase du site).
import { supabase } from './supabase';

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  gender: string | null;
  bio: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  is_public: boolean;
};

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function saveProfile(userId: string, email: string | null, f: Partial<Profile>): Promise<void> {
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    display_name: clean(f.display_name),
    phone: clean(f.phone),
    country: clean(f.country),
    region: clean(f.region),
    city: clean(f.city),
    gender: clean(f.gender),
    bio: clean(f.bio),
    birth_date: clean(f.birth_date),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function setPublic(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_public: value, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const buffer = await res.arrayBuffer();
  const path = `${userId}/avatar.jpg`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (upErr) throw upErr;

  const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: url, updated_at: new Date().toISOString() });
  if (error) throw error;
  return url;
}

export async function removeAvatar(userId: string): Promise<void> {
  await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`]);
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}