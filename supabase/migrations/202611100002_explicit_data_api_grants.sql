-- Ticket Mada: privileges explicites pour le Data API Supabase.
-- Depuis le changement de défaut de Supabase (octobre 2026), les privilèges
-- des nouvelles tables ne sont plus automatiquement accordés aux rôles API.
-- Toutes les tables métier ont RLS activé dans les migrations précédentes.

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.events, public.ticket_types to anon;

grant select, insert, update, delete on table
  public.profiles,
  public.events,
  public.ticket_types,
  public.orders,
  public.tickets,
  public.organizer_commission_terms,
  public.payment_records,
  public.organizer_applications,
  public.order_items
to authenticated;

grant all privileges on all tables in schema public to service_role;
