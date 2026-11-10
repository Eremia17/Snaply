-- Security: this function is invoked by the auth.users trigger only.
-- Trigger execution does not require callers to have direct EXECUTE privileges.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Cover foreign keys flagged by Supabase's performance advisor.
create index if not exists order_items_ticket_type_id_idx on public.order_items(ticket_type_id);
create index if not exists orders_event_id_idx on public.orders(event_id);
create index if not exists tickets_ticket_type_id_idx on public.tickets(ticket_type_id);
