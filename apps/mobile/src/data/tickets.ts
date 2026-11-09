import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type IssuedTicket = {
  id: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded' | string;
  checkedInAt: string | null;
  createdAt: string;
  eventTitle: string;
  eventCity: string;
  eventStartsAt: string | null;
  ticketName: string;
  orderId: string;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function fetchMyIssuedTickets(): Promise<IssuedTicket[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La connexion à Ticket Mada n’est pas configurée.');
  }

  const client = supabase;
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Connecte-toi pour consulter tes billets.');
  }

  const { data, error } = await client
    .from('tickets')
    .select('id,status,checked_in_at,created_at,orders!inner(id,buyer_id,status,events(title,city,starts_at)),ticket_types(name)')
    .eq('orders.buyer_id', authData.user.id)
    .eq('orders.status', 'paid')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || 'Impossible de charger tes billets.');

  return (data ?? []).flatMap(raw => {
    const row = raw as unknown as {
      id: string;
      status: string;
      checked_in_at: string | null;
      created_at: string;
      orders?: { id: string; status: string; events?: { title?: string; city?: string; starts_at?: string } | { title?: string; city?: string; starts_at?: string }[] | null } | null;
      ticket_types?: { name?: string } | { name?: string }[] | null;
    };
    const order = first(row.orders);
    if (!order || order.status !== 'paid') return [];
    const event = first(order.events);
    const ticketType = first(row.ticket_types);
    return [{
      id: row.id,
      status: row.status,
      checkedInAt: row.checked_in_at,
      createdAt: row.created_at,
      eventTitle: event?.title ?? 'Événement',
      eventCity: event?.city ?? '',
      eventStartsAt: event?.starts_at ?? null,
      ticketName: ticketType?.name ?? 'Billet',
      orderId: order.id,
    }];
  });
}
