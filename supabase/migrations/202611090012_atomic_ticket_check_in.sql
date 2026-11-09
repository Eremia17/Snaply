-- Atomic QR check-in. The QR payload is a random opaque token; only its SHA-256
-- digest is stored in tickets.qr_token_hash. No personal data belongs in the QR.
create or replace function public.check_in_ticket(p_qr_token text)
returns table (
  ticket_id uuid,
  event_id uuid,
  event_title text,
  ticket_type_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket record;
  v_checked_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Connecte-toi avec un compte organisateur.';
  end if;

  if p_qr_token is null or length(p_qr_token) < 32 or length(p_qr_token) > 512 then
    raise exception 'QR code invalide.';
  end if;

  select
    t.id as ticket_id,
    t.status as ticket_status,
    t.checked_in_at,
    e.id as event_id,
    e.title as event_title,
    e.organizer_id,
    e.status as event_status,
    tt.name as ticket_type_name
  into v_ticket
  from public.tickets t
  join public.orders o on o.id = t.order_id
  join public.ticket_types tt on tt.id = t.ticket_type_id
  join public.events e on e.id = o.event_id and e.id = tt.event_id
  where t.qr_token_hash = encode(digest(convert_to(p_qr_token, 'UTF8'), 'sha256'), 'hex')
  for update of t;

  if not found then
    raise exception 'Billet introuvable : QR code non reconnu.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.role in ('organizer', 'admin')
  ) then
    raise exception 'Seuls les organisateurs approuvés peuvent contrôler les billets.';
  end if;

  if v_ticket.organizer_id <> v_user_id and not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.role = 'admin'
  ) then
    raise exception 'Ce billet appartient à un autre organisateur.';
  end if;

  if v_ticket.ticket_status <> 'valid' then
    if v_ticket.ticket_status = 'used' then
      raise exception 'Billet déjà utilisé le %.', to_char(v_ticket.checked_in_at at time zone 'Indian/Antananarivo', 'DD/MM/YYYY à HH24:MI');
    end if;
    raise exception 'Ce billet est annulé ou remboursé.';
  end if;

  if v_ticket.event_status not in ('published', 'completed') then
    raise exception 'Cet événement n’est pas ouvert au contrôle.';
  end if;

  update public.tickets
  set status = 'used', checked_in_at = v_checked_at
  where id = v_ticket.ticket_id and status = 'valid';

  if not found then
    raise exception 'Ce billet vient déjà d’être contrôlé.';
  end if;

  return query select
    v_ticket.ticket_id,
    v_ticket.event_id,
    v_ticket.event_title,
    v_ticket.ticket_type_name,
    v_checked_at;
end;
$$;

revoke all on function public.check_in_ticket(text) from public, anon;
grant execute on function public.check_in_ticket(text) to authenticated;

-- The function is the only client-accessible path for check-in; direct ticket
-- updates remain blocked by RLS and the existing inventory protections.
