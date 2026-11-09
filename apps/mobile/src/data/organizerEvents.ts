import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { EventDraft } from '../storage/eventDrafts';

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

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      organizer_id: authData.user.id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      city: draft.city.trim(),
      venue: draft.venue.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'draft',
    })
    .select('id')
    .single();

  if (eventError || !event) {
    if (eventError?.code === '42501') throw new Error('Accès refusé : vérifie que ton compte organisateur est bien approuvé et que les migrations Supabase sont appliquées.');
    throw new Error(eventError?.message || 'La création du brouillon cloud a échoué.');
  }

  const ticketRows = draft.tiers.map(tier => ({
    event_id: event.id,
    name: tier.name.trim(),
    price_mga: Number(tier.price),
    quantity_total: Number(tier.quantity),
  }));

  const { error: ticketError } = await supabase.from('ticket_types').insert(ticketRows);
  if (ticketError) {
    // Avoid leaving an incomplete event if tier creation fails.
    await supabase.from('events').delete().eq('id', event.id).eq('organizer_id', authData.user.id);
    throw new Error('Événement non synchronisé : ' + ticketError.message);
  }

  return { eventId: event.id, created: true };
}
