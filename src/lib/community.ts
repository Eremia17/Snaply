// Avis et discussions : mêmes tables que le site (posts, post_comments, post_likes).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Kind } from './types';

export type Post = {
  id: string;
  kind: string;
  item_id: string;
  title: string;
  poster: string | null;
  rating: number | null;
  user_rating: number | null;
  author: string;
  body: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

export type Comment = { id: string; post_id: string; author: string; body: string; created_at: string };

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Identifiant anonyme de cet appareil (remplace localStorage du site)
export async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('mv:device');
  if (!id) {
    id = uuid();
    await AsyncStorage.setItem('mv:device', id);
  }
  return id;
}

export async function getPseudo(): Promise<string> {
  return (await AsyncStorage.getItem('mv:pseudo')) ?? '';
}

export async function setPseudo(p: string): Promise<void> {
  await AsyncStorage.setItem('mv:pseudo', p);
}

export async function likedPosts(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem('mv:liked')) ?? '[]');
  } catch {
    return [];
  }
}

export async function fetchPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured) return [];

  // Échec fermé : ne jamais relancer une requête sans le filtre de modération,
  // car cela pourrait exposer des avis masqués si la première requête échoue.
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function fetchPost(id: string): Promise<Post> {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Post;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function createPost(p: {
  kind: Kind;
  item_id: string;
  title: string;
  poster: string | null;
  rating: number | null;
  user_rating: number | null;
  author: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from('posts').insert(p);
  if (error) throw error;
}

export async function addComment(postId: string, author: string, body: string): Promise<void> {
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, author, body });
  if (error) throw error;
}

export async function toggleLike(postId: string): Promise<number> {
  const device = await deviceId();
  const { data, error } = await supabase.rpc('toggle_like', { _post: postId, _device: device });
  if (error) throw error;
  const liked = await likedPosts();
  const next = liked.includes(postId) ? liked.filter((x) => x !== postId) : [...liked, postId];
  await AsyncStorage.setItem('mv:liked', JSON.stringify(next));
  return Number(data);
}

export async function shareTitle(title: string, rating?: number | null) {
  const text = `${title}${rating != null ? ` — ★ ${rating.toFixed(1)}/10` : ''} sur Erëmīa`;
  await Share.share({ message: text, title });
}