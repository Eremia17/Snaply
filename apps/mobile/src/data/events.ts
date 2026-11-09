import { formatAriary } from '../utils/currency';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type EventTicketTier = { id: string; name: string; priceMGA: number; available: number };

export type EventItem = {
  id: string;
  title: string;
  category: string;
  city: string;
  venue: string;
  dateLabel: string;
  priceLabel: string;
  accent: string;
  symbol: string;
  description?: string;
  coverUrl?: string;
  ticketTiers?: EventTicketTier[];
  isDemo: boolean;
};

export const demoEvents: EventItem[] = [
  { id: 'demo-1', title: 'Soirée live', category: 'Musique', city: 'Antananarivo', venue: 'Centre-ville', dateLabel: 'À venir', priceLabel: 'Dès 15 000 Ar', accent: '#573044', symbol: '♫', description: 'Exemple de fiche événement pour présenter le fonctionnement de Ticket Mada.', isDemo: true },
  { id: 'demo-2', title: 'Festival culturel', category: 'Culture', city: 'Antsirabe', venue: 'Espace culturel', dateLabel: 'À venir', priceLabel: 'Dès 10 000 Ar', accent: '#30465C', symbol: '✦', description: 'Exemple de fiche événement pour présenter le fonctionnement de Ticket Mada.', isDemo: true },
  { id: 'demo-3', title: 'Rencontre créative', category: 'Conférence', city: 'Toamasina', venue: 'Salle polyvalente', dateLabel: 'À venir', priceLabel: 'Entrée libre', accent: '#4B4930', symbol: '✧', description: 'Exemple de fiche événement pour présenter le fonctionnement de Ticket Mada.', isDemo: true }
];

const accents: Record<string, { accent: string; symbol: string }> = {
  Musique: { accent: '#573044', symbol: '♫' },
  Festival: { accent: '#49334D', symbol: '✦' },
  Culture: { accent: '#30465C', symbol: '✧' },
  Sport: { accent: '#315044', symbol: '⚑' },
  Conférence: { accent: '#4B4930', symbol: '◇' },
  Spectacle: { accent: '#583A31', symbol: '✶' },
};

export async function fetchPublishedEvents(): Promise<EventItem[]> {
  if (!isSupabaseConfigured || !supabase) return demoEvents;
  const client = supabase;
  const client = supabase;
  try {
    const { data, error } = await client
      .from('events')
      .select('id,title,description,category,city,venue,starts_at,cover_path,ticket_types(id,name,price_mga,quantity_total,quantity_sold,quantity_reserved)')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });
    if (error || !data?.length) return demoEvents;

    return await Promise.all(data.map(async raw => {
      const event = raw as unknown as {
        id: string;
        title: string;
        description: string;
        category: string;
        city: string;
        venue: string;
        starts_at: string;
        cover_path?: string | null;
        ticket_types?: { id: string; name: string; price_mga: number | string; quantity_total: number; quantity_sold: number; quantity_reserved: number }[];
      };
      const ticketTiers = (event.ticket_types ?? []).map(ticket => ({ id: ticket.id, name: ticket.name, priceMGA: Number(ticket.price_mga), available: Math.max(0, Number(ticket.quantity_total) - Number(ticket.quantity_sold) - Number(ticket.quantity_reserved ?? 0)) }));
      const prices = ticketTiers.map(ticket => ticket.priceMGA).filter(price => Number.isFinite(price) && price >= 0);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const poster = event.cover_path ? await client.storage.from('event-posters').createSignedUrl(event.cover_path, 3600) : null;
      const visual = accents[event.category] ?? { accent: '#394052', symbol: '✦' };
      return {
        id: event.id,
        title: event.title,
        category: event.category,
        city: event.city,
        venue: event.venue,
        dateLabel: new Date(event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Indian/Antananarivo' }),
        priceLabel: minPrice === null ? 'Prix à confirmer' : minPrice === 0 ? 'Entrée libre' : 'Dès ' + formatAriary(minPrice),
        accent: visual.accent,
        symbol: visual.symbol,
        description: event.description,
        coverUrl: poster?.data?.signedUrl,
        ticketTiers,
        isDemo: false,
      };
    }));
  } catch {
    return demoEvents;
  }
}

export async function fetchEventById(id: string): Promise<EventItem | null> {
  const demo = demoEvents.find(item => item.id === id);
  if (demo) return demo;
  if (!isSupabaseConfigured || !supabase) return null;
  const client = supabase;
  try {
    const { data, error } = await client
      .from('events')
      .select('id,title,description,category,city,venue,starts_at,cover_path,ticket_types(id,name,price_mga,quantity_total,quantity_sold,quantity_reserved)')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();
    if (error || !data) return null;
    const event = data as unknown as {
      id: string;
      title: string;
      description: string;
      category: string;
      city: string;
      venue: string;
      starts_at: string;
      cover_path?: string | null;
      ticket_types?: { id: string; name: string; price_mga: number | string; quantity_total: number; quantity_sold: number; quantity_reserved: number }[];
    };
    const ticketTiers = (event.ticket_types ?? []).map(ticket => ({ id: ticket.id, name: ticket.name, priceMGA: Number(ticket.price_mga), available: Math.max(0, Number(ticket.quantity_total) - Number(ticket.quantity_sold) - Number(ticket.quantity_reserved ?? 0)) }));
    const prices = ticketTiers.map(ticket => ticket.priceMGA).filter(price => Number.isFinite(price) && price >= 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const poster = event.cover_path ? await client.storage.from('event-posters').createSignedUrl(event.cover_path, 3600) : null;
    const visual = accents[event.category] ?? { accent: '#394052', symbol: '✦' };
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      city: event.city,
      venue: event.venue,
      dateLabel: new Date(event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Indian/Antananarivo' }),
      priceLabel: minPrice === null ? 'Prix à confirmer' : minPrice === 0 ? 'Entrée libre' : 'Dès ' + formatAriary(minPrice),
      accent: visual.accent,
      symbol: visual.symbol,
      description: event.description,
      coverUrl: poster?.data?.signedUrl,
      ticketTiers,
      isDemo: false,
    };
  } catch {
    return null;
  }
}
