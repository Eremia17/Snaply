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
