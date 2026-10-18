// Listes personnelles (tables user_lists et user_list_items de Supabase).
import { supabase } from './supabase';
import type { Item } from './types';

export type UserList = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  share_code: string;
  created_at: string;
};

export type ListItem = {
  list_id: string;
  item_id: string;
  kind: string;
  title: string;
  poster: string | null;
  position: number;
};

export async function fetchLists(): Promise<UserList[]> {
  const { data, error } = await supabase
    .from('user_lists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserList[];
}

export async function createList(ownerId: string, title: string): Promise<UserList> {
  const { data, error } = await supabase
    .from('user_lists')
    .insert({ owner_id: ownerId, title })
    .select()
    .single();
  if (error) throw error;
  return data as UserList;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from('user_lists').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchListItems(listId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('user_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ListItem[];
}

export async function addToList(listId: string, item: Item): Promise<void> {
  // Position basée sur l'heure : donne un ordre croissant sans relire la liste
  const position = Math.floor(Date.now() / 1000);
  const { error } = await supabase.from('user_list_items').insert({
    list_id: listId,
    item_id: item.id,
    kind: item.kind,
    title: item.title,
    poster: item.poster ?? null,
    position,
  });
  if (error) throw error;
}

export async function removeFromList(listId: string, itemId: string, kind: string): Promise<void> {
  const { error } = await supabase
    .from('user_list_items')
    .delete()
    .match({ list_id: listId, item_id: itemId, kind });
  if (error) throw error;
}