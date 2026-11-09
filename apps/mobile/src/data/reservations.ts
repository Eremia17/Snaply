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
