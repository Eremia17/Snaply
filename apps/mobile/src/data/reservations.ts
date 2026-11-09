import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type TicketReservation = {
  orderId: string;
  expiresAt: string;
  subtotalMGA: number;
};

function createReservationKey(): string {
  return Date.now().toString(36) + '-' +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2);
}

export async function reserveEventTickets(
  ticketTypeId: string,
  quantity: number,
): Promise<TicketReservation> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La réservation en ligne n’est pas encore configurée.');
  }

  const client = supabase;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Connecte-toi à ton compte Ticket Mada pour réserver.');
  }

  const reservationKey = createReservationKey();
  const { data, error } = await client.rpc('reserve_event_tickets', {
    p_ticket_type_id: ticketTypeId,
    p_quantity: quantity,
    p_reservation_key: reservationKey,
  });

  if (error) {
    const message = error.message || '';
    if (message.includes('not enough') || message.includes('pas assez')) {
      throw new Error('Il ne reste pas assez de billets. Actualise la fiche événement.');
    }
    if (message.toLowerCase().includes('jwt') || message.toLowerCase().includes('auth')) {
      throw new Error('Ta session a expiré. Reconnecte-toi puis réessaie.');
    }
    throw new Error(message || 'La réservation n’a pas pu être créée.');
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.order_id || !result?.expires_at) {
    throw new Error('Le serveur n’a pas confirmé la réservation. Vérifie tes commandes avant de réessayer.');
  }

  return {
    orderId: String(result.order_id),
    expiresAt: String(result.expires_at),
    subtotalMGA: Number(result.subtotal_mga),
  };
}

export type ReservationHistoryItem = {
  id: string;
  status: string;
  subtotalMGA: number;
  createdAt: string;
  expiresAt: string | null;
  eventTitle: string;
  eventCity: string;
  eventStartsAt: string | null;
  ticketName: string;
  quantity: number;
};

export async function fetchMyReservations(): Promise<ReservationHistoryItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La connexion à Ticket Mada n’est pas configurée.');
  }

  const client = supabase;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Connecte-toi pour consulter tes réservations.');
  }

  const { data, error } = await client
    .from('orders')
    .select('id,status,subtotal_mga,created_at,expires_at,events(title,city,starts_at),order_items(quantity,ticket_types(name))')
    .eq('buyer_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message || 'Impossible de charger tes réservations.');

  return (data ?? []).map(raw => {
    const row = raw as unknown as {
      id: string;
      status: string;
      subtotal_mga: number | string;
      created_at: string;
      expires_at: string | null;
      events?: { title?: string; city?: string; starts_at?: string } | null;
      order_items?: { quantity: number; ticket_types?: { name?: string } | null }[];
    };
    const item = row.order_items?.[0];
    return {
      id: row.id,
      status: row.status,
      subtotalMGA: Number(row.subtotal_mga),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      eventTitle: row.events?.title ?? 'Événement',
      eventCity: row.events?.city ?? '',
      eventStartsAt: row.events?.starts_at ?? null,
      ticketName: item?.ticket_types?.name ?? 'Billet',
      quantity: Number(item?.quantity ?? 0),
    };
  });
}
