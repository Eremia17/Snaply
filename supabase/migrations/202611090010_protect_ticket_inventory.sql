-- Inventory counters may only be changed by trusted transactional server functions.
create or replace function public.guard_ticket_inventory_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.quantity_sold, 0) <> 0
       or coalesce(new.quantity_reserved, 0) <> 0 then
      raise exception 'Ticket inventory counters are server-managed';
    end if;
  elsif new.quantity_sold is distinct from old.quantity_sold
     or new.quantity_reserved is distinct from old.quantity_reserved then
    raise exception 'Ticket inventory counters are server-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_ticket_inventory_columns on public.ticket_types;
create trigger guard_ticket_inventory_columns
before insert or update of quantity_sold, quantity_reserved on public.ticket_types
for each row execute function public.guard_ticket_inventory_columns();
