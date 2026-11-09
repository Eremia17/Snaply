import { isSupabaseConfigured, supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { listEventDrafts, saveEventDraft, type EventDraft } from '../storage/eventDrafts';

export type DraftSyncResult = { eventId: string; created: boolean; cloudPosterPath?: string | null };\n\n
function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const output = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let outputIndex = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? 'A');
    const b = alphabet.indexOf(clean[index + 1] ?? 'A');
    const c = alphabet.indexOf(clean[index + 2] ?? 'A');
    const d = alphabet.indexOf(clean[index + 3] ?? 'A');
    const chunk = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    if (outputIndex < output.length) output[outputIndex++] = (chunk >> 16) & 255;
    if (index + 2 < clean.length && outputIndex < output.length) output[outputIndex++] = (chunk >> 8) & 255;
    if (index + 3 < clean.length && outputIndex < output.length) output[outputIndex++] = chunk & 255;
  }
  return output.subarray(0, outputIndex);
}

async function uploadEventPoster(
  userId: string,
  draft: EventDraft,
  eventKey: string,
): Promise<string | null> {
  if (!supabase) return draft.cloudPosterPath ?? null;
  const uri = draft.posterUri;
  if (!uri || (!uri.startsWith('file://') && !uri.startsWith('content://'))) {
    return draft.cloudPosterPath ?? null;
  }

  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (!info.exists) throw new Error('Le fichier de l’affiche est introuvable sur cet appareil.');
  if (typeof info.size === 'number' && info.size > 5 * 1024 * 1024) {
    throw new Error('L’affiche dépasse la limite de 5 Mo. Choisis une image plus légère.');
  }

  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  const safeExtension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const encoded = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = decodeBase64(encoded);
  const path = userId + '/' + eventKey + '/poster.' + safeExtension;
  const { error } = await supabase.storage.from('event-posters').upload(path, bytes, {
    contentType: mime,
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw new Error('Envoi de l’affiche impossible : ' + error.message);
  return path;
}



function toLocalIso(date: string, time: string): string {
  // Madagascar uses UTC+03:00. Store an explicit offset so device timezone
  // settings cannot silently shift the event's advertised local time.
  return new Date(date + 'T' + time + ':00+03:00').toISOString();
}

export async function syncEventDraft(draft: EventDraft): Promise<DraftSyncResult> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase n’est pas configuré sur cette application.');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Connecte-toi pour synchroniser cet événement.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) throw new Error('Impossible de vérifier les droits du compte.');
  if (profile?.role !== 'organizer') throw new Error('Seuls les organisateurs approuvés peuvent synchroniser des événements.');

  const startsAt = toLocalIso(draft.date, draft.startTime);
  const endsAt = draft.endTime ? toLocalIso(draft.date, draft.endTime) : null;
  if (!Number.isFinite(Date.parse(startsAt)) || (endsAt && Date.parse(endsAt) <= Date.parse(startsAt))) {
    throw new Error('Vérifie la date et les horaires de cet événement.');
  }

  const posterPath = await uploadEventPoster(authData.user.id, draft, draft.cloudEventId ?? draft.id);\n\n  const ticketTiers = draft.tiers.map(tier => ({
    name: tier.name.trim(),
    price_mga: Number(tier.price),
    quantity_total: Number(tier.quantity),
  }));

  const { data: eventId, error: saveError } = await supabase.rpc('save_organizer_event_draft', {
    p_event_id: draft.cloudEventId ?? null,
    p_title: draft.title.trim(),
    p_description: draft.description.trim(),
    p_category: draft.category,
    p_city: draft.city.trim(),
    p_venue: draft.venue.trim(),
    p_address: draft.address.trim(),
    p_cover_path: posterPath,\n    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_ticket_tiers: ticketTiers,
  });

  if (saveError || !eventId) {
    if (saveError?.code === '42501') throw new Error('Accès refusé : vérifie que ton compte organisateur est bien approuvé et que les migrations Supabase sont appliquées.');
    throw new Error(saveError?.message || 'La synchronisation du brouillon cloud a échoué.');
  }

  return { eventId, created: !draft.cloudEventId, cloudPosterPath: posterPath } as DraftSyncResult;
}

function madagascarDateTime(value: string): { date: string; time: string } {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Indian/Antananarivo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Indian/Antananarivo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find(item => item.type === type)?.value ?? '';
  return {
    date: part(dateParts, 'year') + '-' + part(dateParts, 'month') + '-' + part(dateParts, 'day'),
    time: part(timeParts, 'hour') + ':' + part(timeParts, 'minute'),
  };
}

/** Pull the signed-in organizer's private cloud drafts into the local offline cache. */
export async function refreshOrganizerCloudDrafts(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return 0;

  const { data, error } = await supabase
    .from('events')
    .select('id,title,description,category,city,venue,address,cover_path,starts_at,ends_at,status,created_at,updated_at,ticket_types(id,name,price_mga,quantity_total)')
    .eq('organizer_id', authData.user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false });
  if (error) throw new Error('Impossible de récupérer les brouillons cloud : ' + error.message);

  const localDrafts = await listEventDrafts();
  let imported = 0;
  for (const remote of data ?? []) {
    const cloudId = String(remote.id);
    const existing = localDrafts.find(item => item.cloudEventId === cloudId);
    const cloudUpdatedAt = String(remote.updated_at ?? remote.created_at ?? new Date().toISOString());
    // Keep newer local edits; the organizer can explicitly synchronize them.
    if (existing && Date.parse(existing.updatedAt) > Date.parse(cloudUpdatedAt)) continue;

    const start = madagascarDateTime(String(remote.starts_at));
    const end = remote.ends_at ? madagascarDateTime(String(remote.ends_at)) : null;
    const tiers = (remote.ticket_types ?? []).map((tier, index) => ({
      id: index + 1,
      name: String(tier.name),
      price: String(tier.price_mga),
      quantity: String(tier.quantity_total),
    }));
    const posterPath = remote.cover_path ? String(remote.cover_path) : undefined;\n    const signedPoster = posterPath ? await supabase.storage.from('event-posters').createSignedUrl(posterPath, 3600) : null;\n    const draft: EventDraft = {
      id: existing?.id ?? 'cloud-' + cloudId,
      cloudEventId: cloudId,
      title: String(remote.title ?? ''),
      category: String(remote.category ?? 'Autre'),
      description: String(remote.description ?? ''),
      city: String(remote.city ?? ''),
      venue: String(remote.venue ?? ''),
      address: String(remote.address ?? existing?.address ?? ''),
      date: start.date,
      startTime: start.time,
      endTime: end?.time ?? '',
      tiers,
      posterUri: signedPoster?.data?.signedUrl ?? existing?.posterUri ?? null,\n      cloudPosterPath: posterPath ?? existing?.cloudPosterPath,
      status: 'draft',
      createdAt: String(remote.created_at ?? cloudUpdatedAt),
      updatedAt: cloudUpdatedAt,
    };
    await saveEventDraft(draft);
    imported += 1;
  }
  return imported;
}
