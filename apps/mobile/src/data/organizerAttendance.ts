import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type AttendanceStat = {
  eventId: string;
  eventTitle: string;
  eventCity: string;
  eventStartsAt: string;
  ticketsIssued: number;
  ticketsValid: number;
  ticketsCheckedIn: number;
  lastCheckInAt: string | null;
};

export type CheckInHistoryItem = {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  ticketTypeName: string;
  checkedInAt: string;
};

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('La connexion à Ticket Mada n’est pas configurée.');
  }
  return supabase;
}

export async function fetchOrganizerAttendanceStats(): Promise<AttendanceStat[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('organizer_attendance_stats');
  if (error) throw new Error(error.message || 'Impossible de charger les statistiques.');
  return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
    eventId: String(row.event_id),
    eventTitle: String(row.event_title ?? 'Événement'),
    eventCity: String(row.event_city ?? ''),
    eventStartsAt: String(row.event_starts_at ?? ''),
    ticketsIssued: Number(row.tickets_issued ?? 0),
    ticketsValid: Number(row.tickets_valid ?? 0),
    ticketsCheckedIn: Number(row.tickets_checked_in ?? 0),
    lastCheckInAt: row.last_check_in_at ? String(row.last_check_in_at) : null,
  }));
}

export async function fetchOrganizerCheckInHistory(): Promise<CheckInHistoryItem[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('organizer_checkin_history');
  if (error) throw new Error(error.message || 'Impossible de charger l’historique.');
  return ((data ?? []) as Array<Record<string, unknown>>).map(row => ({
    ticketId: String(row.ticket_id),
    eventId: String(row.event_id),
    eventTitle: String(row.event_title ?? 'Événement'),
    ticketTypeName: String(row.ticket_type_name ?? 'Billet'),
    checkedInAt: String(row.checked_in_at ?? ''),
  }));
}
