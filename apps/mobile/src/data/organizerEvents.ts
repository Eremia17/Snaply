import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { listEventDrafts, saveEventDraft, type EventDraft } from '../storage/eventDrafts';

export type DraftSyncResult = { eventId: string; created: boolean };

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

  const ticketTiers = draft.tiers.map(tier => ({
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
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_ticket_tiers: ticketTiers,
  });

  if (saveError || !eventId) {
    if (saveError?.code === '42501') throw new Error('Accès refusé : vérifie que ton compte organisateur est bien approuvé et que les migrations Supabase sont appliquées.');
    throw new Error(saveError?.message || 'La synchronisation du brouillon cloud a échoué.');
  }

  return { eventId, created: !draft.cloudEventId };
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
    .select('id,title,description,category,city,venue,starts_at,ends_at,status,created_at,updated_at,ticket_types(id,name,price_mga,quantity_total)')
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
    const draft: EventDraft = {
      id: existing?.id ?? 'cloud-' + cloudId,
      cloudEventId: cloudId,
      title: String(remote.title ?? ''),
      category: String(remote.category ?? 'Autre'),
      description: String(remote.description ?? ''),
      city: String(remote.city ?? ''),
      venue: String(remote.venue ?? ''),
      address: existing?.address ?? '',
      date: start.date,
      startTime: start.time,
      endTime: end?.time ?? '',
      tiers,
      posterUri: existing?.posterUri ?? null,
      status: 'draft',
      createdAt: String(remote.created_at ?? cloudUpdatedAt),
      updatedAt: cloudUpdatedAt,
    };
    await saveEventDraft(draft);
    imported += 1;
  }
  return imported;
}
