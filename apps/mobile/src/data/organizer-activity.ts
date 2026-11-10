import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type OrganizerScan = {
  ticket_id: string;
  event_id: string;
  event_title: string;
  ticket_type_name: string;
  checked_in_at: string;
};

export type OrganizerActivity = {
  events_total: number;
  events_published: number;
  tickets_issued: number;
  tickets_checked_in: number;
  gross_revenue_mga: number;
  recent_scans: OrganizerScan[];
};

const emptyActivity: OrganizerActivity = {
  events_total: 0,
  events_published: 0,
  tickets_issued: 0,
  tickets_checked_in: 0,
  gross_revenue_mga: 0,
  recent_scans: [],
};

export async function fetchOrganizerActivity(limit = 30): Promise<OrganizerActivity> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La connexion Ticket Mada n’est pas configurée.');
  }
  const { data, error } = await supabase.rpc('get_organizer_checkin_activity', {
    p_limit: Math.max(1, Math.min(50, Math.floor(limit))),
  });
  if (error) throw new Error(error.message || 'Impossible de charger les statistiques.');

  const payload = (data ?? {}) as Partial<OrganizerActivity>;
  const scans = Array.isArray(payload.recent_scans) ? payload.recent_scans : [];
  return {
    events_total: Number(payload.events_total ?? emptyActivity.events_total),
    events_published: Number(payload.events_published ?? emptyActivity.events_published),
    tickets_issued: Number(payload.tickets_issued ?? emptyActivity.tickets_issued),
    tickets_checked_in: Number(payload.tickets_checked_in ?? emptyActivity.tickets_checked_in),
    gross_revenue_mga: Number(payload.gross_revenue_mga ?? emptyActivity.gross_revenue_mga),
    recent_scans: scans.filter(scan =>
      Boolean(scan?.ticket_id && scan?.event_id && scan?.event_title && scan?.checked_in_at)
    ),
  };
}
