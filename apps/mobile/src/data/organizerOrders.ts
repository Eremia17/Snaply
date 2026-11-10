import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type OrganizerOrder = {
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventCity: string;
  eventStartsAt: string | null;
  buyerName: string;
  status: string;
  subtotalMGA: number;
  quantity: number;
  ticketSummary: string;
  createdAt: string;
  expiresAt: string | null;
};

export async function fetchOrganizerOrders(): Promise<OrganizerOrder[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La connexion à Ticket Mada n’est pas configurée.');
  }
  const { data, error } = await supabase.rpc('organizer_order_overview');
  if (error) throw new Error(error.message || 'Impossible de charger les réservations.');
  return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
    orderId: String(row.order_id),
    eventId: String(row.event_id),
    eventTitle: String(row.event_title ?? 'Événement'),
    eventCity: String(row.event_city ?? ''),
    eventStartsAt: row.event_starts_at ? String(row.event_starts_at) : null,
    buyerName: String(row.buyer_name ?? 'Spectateur'),
    status: String(row.order_status ?? 'pending'),
    subtotalMGA: Number(row.subtotal_mga ?? 0),
    quantity: Number(row.quantity_total ?? 0),
    ticketSummary: String(row.ticket_summary ?? 'Billet'),
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }));
}

export function organizerOrderStatusLabel(status: string): string {
  if (status === 'paid') return 'PAYÉE';
  if (status === 'pending') return 'EN ATTENTE';
  if (status === 'cancelled') return 'ANNULÉE';
  if (status === 'refunded') return 'REMBOURSÉE';
  return status.toUpperCase();
}
