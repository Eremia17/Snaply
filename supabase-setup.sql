-- Erëmīa : mise en place de la base Supabase (à exécuter une seule fois, dans l'ordre)

-- ===== drizzle/migrations/0000_community_and_visits.sql =====
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null check (char_length(title) between 1 and 300),
  poster text,
  rating numeric,
  user_rating int check (user_rating between 1 and 10),
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 2000),
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.posts to anon, authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select using (true);
create policy "posts insertable" on public.posts for insert with check (likes_count = 0 and comments_count = 0);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert on public.post_comments to anon, authenticated;
grant all on public.post_comments to service_role;
alter table public.post_comments enable row level security;
create policy "comments readable" on public.post_comments for select using (true);
create policy "comments insertable" on public.post_comments for insert with check (true);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (post_id, device_id)
);
grant all on public.post_likes to service_role;
alter table public.post_likes enable row level security;

create table public.site_stats (
  id int primary key default 1 check (id = 1),
  visits bigint not null default 0
);
insert into public.site_stats (id, visits) values (1, 0);
grant select on public.site_stats to anon, authenticated;
grant all on public.site_stats to service_role;
alter table public.site_stats enable row level security;
create policy "stats readable" on public.site_stats for select using (true);

create or replace function public.bump_comments() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set comments_count = comments_count + 1 where id = new.post_id; return new; end $$;
create trigger trg_comments after insert on public.post_comments for each row execute function public.bump_comments();

create or replace function public.toggle_like(_post uuid, _device text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if char_length(_device) < 8 or char_length(_device) > 64 then raise exception 'invalid device'; end if;
  if exists (select 1 from post_likes where post_id=_post and device_id=_device) then
    delete from post_likes where post_id=_post and device_id=_device;
    update posts set likes_count = greatest(likes_count-1,0) where id=_post returning likes_count into n;
  else
    insert into post_likes(post_id, device_id) values (_post,_device);
    update posts set likes_count = likes_count+1 where id=_post returning likes_count into n;
  end if;
  return n;
end $$;
grant execute on function public.toggle_like(uuid, text) to anon, authenticated;

create or replace function public.register_visit() returns bigint language sql security definer set search_path = public as $$
  update site_stats set visits = visits + 1 where id = 1 returning visits;
$$;
grant execute on function public.register_visit() to anon, authenticated;

alter publication supabase_realtime add table public.site_stats;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
-- ===== drizzle/migrations/0001_auth_profiles_admin.sql =====
create type public.app_role as enum ('admin','moderator','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles readable" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (char_length(display_name) <= 40),
  avatar_url text check (char_length(avatar_url) <= 1000),
  phone text check (char_length(phone) <= 30),
  country text check (char_length(country) <= 60),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 80),
  birth_date date,
  gender text check (char_length(gender) <= 30),
  bio text check (char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile self read" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile self update" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
    left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),40),
    new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
-- ===== drizzle/migrations/0002_gemini_key_usage.sql =====
CREATE TABLE public.gemini_key_usage (
  key_name text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  ok_count int NOT NULL DEFAULT 0,
  quota_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  last_status text,
  last_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_name, day)
);
GRANT SELECT ON public.gemini_key_usage TO authenticated;
GRANT ALL ON public.gemini_key_usage TO service_role;
ALTER TABLE public.gemini_key_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read key usage" ON public.gemini_key_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_gemini_usage(_key text, _status text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.gemini_key_usage(key_name, ok_count, quota_count, error_count, last_status)
  VALUES (_key, (_status='ok')::int, (_status='quota')::int, (_status='error')::int, _status)
  ON CONFLICT (key_name, day) DO UPDATE SET
    ok_count = gemini_key_usage.ok_count + (_status='ok')::int,
    quota_count = gemini_key_usage.quota_count + (_status='quota')::int,
    error_count = gemini_key_usage.error_count + (_status='error')::int,
    last_status = _status, last_at = now();
$$;
REVOKE ALL ON FUNCTION public.log_gemini_usage(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_gemini_usage(text, text) TO service_role;
-- ===== docs/phase2-a-tables.sql =====
-- =====================================================================
-- MovieVerse — Phase 2, PARTIE A : tables, sécurité, temps réel, modération, retours
-- À coller dans Lovable : Cloud > SQL editor, puis « Run ». Ne l'exécuter qu'UNE seule fois.
-- Tout est dans une transaction : si une erreur survient, rien n'est appliqué.
-- =====================================================================
begin;

-- 2) Synchronisation du compte (favoris, notes, journal) + hors-ligne
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
create policy "user_data perso" on public.user_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Profils publics, abonnés, classement
alter table public.profiles add column if not exists is_public boolean not null default false;
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create policy "follows lecture" on public.follows for select to authenticated using (true);
create policy "follows ajout perso" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "follows retrait perso" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  watched_count int not null default 0,
  ratings_count int not null default 0,
  trophies_count int not null default 0,
  points int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_stats enable row level security;
create policy "stats perso" on public.user_stats for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vue publique : uniquement les membres qui ont choisi un profil public (pseudo, photo, bio, stats)
create or replace view public.public_profiles as
  select p.id, p.display_name, p.avatar_url, p.bio,
         coalesce(s.watched_count,0) as watched_count, coalesce(s.trophies_count,0) as trophies_count, coalesce(s.points,0) as points
  from public.profiles p left join public.user_stats s on s.user_id = p.id
  where p.is_public = true;
grant select on public.public_profiles to authenticated;

-- 4) Listes publiques partageables
create table public.user_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 300),
  is_public boolean not null default false,
  share_code text unique not null default substr(md5(random()::text), 1, 10),
  created_at timestamptz not null default now()
);
create table public.user_list_items (
  list_id uuid not null references public.user_lists(id) on delete cascade,
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null,
  poster text,
  position int not null default 0,
  primary key (list_id, kind, item_id)
);
alter table public.user_lists enable row level security;
alter table public.user_list_items enable row level security;
create policy "listes lecture" on public.user_lists for select to authenticated using (is_public or owner_id = auth.uid());
create policy "listes écriture perso" on public.user_lists for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "items lecture" on public.user_list_items for select to authenticated
  using (exists (select 1 from public.user_lists l where l.id = list_id and (l.is_public or l.owner_id = auth.uid())));
create policy "items écriture perso" on public.user_list_items for all to authenticated
  using (exists (select 1 from public.user_lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.user_lists l where l.id = list_id and l.owner_id = auth.uid()));

-- 5) Watchlist partagée en temps réel
create table public.shared_watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  join_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);
create table public.shared_watchlist_members (
  watchlist_id uuid not null references public.shared_watchlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (watchlist_id, user_id)
);
create table public.shared_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.shared_watchlists(id) on delete cascade,
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null,
  poster text,
  added_by uuid not null default auth.uid() references auth.users(id),
  watched boolean not null default false,
  created_at timestamptz not null default now(),
  unique (watchlist_id, kind, item_id)
);
alter table public.shared_watchlists enable row level security;
alter table public.shared_watchlist_members enable row level security;
alter table public.shared_watchlist_items enable row level security;
create or replace function public.is_watchlist_member(_wl uuid) returns boolean
language sql stable security definer set search_path = public as $body$
  select exists (select 1 from public.shared_watchlist_members where watchlist_id = _wl and user_id = auth.uid())
      or exists (select 1 from public.shared_watchlists where id = _wl and owner_id = auth.uid());
$body$;
create policy "wl lecture membres" on public.shared_watchlists for select to authenticated using (public.is_watchlist_member(id));
create policy "wl création" on public.shared_watchlists for insert to authenticated with check (owner_id = auth.uid());
create policy "wl suppression propriétaire" on public.shared_watchlists for delete to authenticated using (owner_id = auth.uid());
create policy "membres lecture" on public.shared_watchlist_members for select to authenticated using (public.is_watchlist_member(watchlist_id));
create policy "membres départ" on public.shared_watchlist_members for delete to authenticated using (user_id = auth.uid());
create policy "wl items tout membres" on public.shared_watchlist_items for all to authenticated
  using (public.is_watchlist_member(watchlist_id)) with check (public.is_watchlist_member(watchlist_id));
-- Rejoindre via le code (fonction sécurisée : le code fait office de clé)
create or replace function public.join_watchlist(_code text) returns uuid
language plpgsql security definer set search_path = public as $body$
declare wl uuid;
begin
  select id into wl from public.shared_watchlists where join_code = _code;
  if wl is null then raise exception 'Code invalide'; end if;
  insert into public.shared_watchlist_members (watchlist_id, user_id) values (wl, auth.uid()) on conflict do nothing;
  return wl;
end $body$;
alter publication supabase_realtime add table public.shared_watchlist_items;

-- 6) Modération : signalements, masquage, permissions modérateur
alter table public.posts add column if not exists hidden boolean not null default false;
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "signaler" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "moderation lecture" on public.reports for select to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderation traitement" on public.reports for update to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur masque avis" on public.posts for update to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur supprime avis" on public.posts for delete to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur supprime commentaires" on public.post_comments for delete to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "admin gère les rôles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- 7) Notifications push (stockage des abonnements ; l'envoi demande une clé VAPID côté serveur)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push perso" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8) Droits d'accès (indispensables : sans eux, les politiques ci-dessus ne servent à rien)
grant select, insert, update, delete on public.user_data, public.follows, public.user_stats, public.user_lists,
  public.user_list_items, public.shared_watchlists, public.shared_watchlist_members, public.shared_watchlist_items,
  public.reports, public.push_subscriptions to authenticated;
grant all on public.user_data, public.follows, public.user_stats, public.user_lists, public.user_list_items,
  public.shared_watchlists, public.shared_watchlist_members, public.shared_watchlist_items,
  public.reports, public.push_subscriptions to service_role;
grant update, delete on public.posts to authenticated;
grant delete on public.post_comments to authenticated;
grant insert, update, delete on public.user_roles to authenticated;

-- 9) Retours des membres (page « Contact »)
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('Suggestion','Bug','Contenu à corriger','Suppression de mon compte','Autre')),
  message text not null check (char_length(message) between 10 and 1000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "feedback envoi" on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy "feedback lecture admin" on public.feedback for select to authenticated using (public.has_role(auth.uid(), 'admin'));
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;

commit;

-- ===== docs/phase2-b-stockage-photos.sql =====
-- =====================================================================
-- MovieVerse — Phase 2, PARTIE B : stockage des photos de profil (bucket « avatars »)
-- À exécuter APRÈS la partie A. Si cette partie échoue (droits insuffisants),
-- demandez plutôt à Lovable dans le chat de créer ce bucket (voir les explications).
-- =====================================================================
begin;

-- 1) Photos de profil (bucket public, chaque membre ne gère que son dossier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "avatars lecture publique" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars envoi perso" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars modif perso" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars suppression perso" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

commit;

-- ===== docs/phase3-series.sql =====
-- MovieVerse — Séries : autorise la nouvelle catégorie « serie » dans les avis, les listes et les listes partagées.
-- À coller dans Lovable : Cloud > SQL editor, puis « Run », une seule fois.
begin;

-- Supprime les anciennes limites (qui n'acceptent que film / manga / occidental), quel que soit leur nom
do $body$
declare r record;
begin
  for r in
    select conrelid::regclass as t, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.posts'::regclass, 'public.user_list_items'::regclass, 'public.shared_watchlist_items'::regclass)
      and pg_get_constraintdef(oid) ilike '%kind%occidental%'
  loop
    execute format('alter table %s drop constraint %I', r.t, r.conname);
  end loop;
end $body$;

alter table public.posts add constraint posts_kind_check check (kind in ('film','manga','occidental','serie'));
alter table public.user_list_items add constraint user_list_items_kind_check check (kind in ('film','manga','occidental','serie'));
alter table public.shared_watchlist_items add constraint shared_watchlist_items_kind_check check (kind in ('film','manga','occidental','serie'));

commit;

-- ===== docs/phase4-listes-partagees-anonymes.sql =====
-- Phase 4 : permettre aux visiteurs NON connectés de voir une liste publique via son lien.
-- À exécuter une seule fois dans Supabase > SQL Editor (projet MovieVerse).
-- Ne change rien pour les listes privées : elles restent invisibles pour tout le monde sauf le propriétaire.

-- 1) Droits de lecture pour le rôle anonyme (sans eux, PostgreSQL refuse la lecture avant même les politiques)
grant select on public.user_lists to anon;
grant select on public.user_list_items to anon;

-- 2) Politiques : seules les listes marquées « publique » sont lisibles sans compte
drop policy if exists "listes publiques lecture anonyme" on public.user_lists;
create policy "listes publiques lecture anonyme" on public.user_lists
  for select to anon
  using (is_public);

drop policy if exists "items publics lecture anonyme" on public.user_list_items;
create policy "items publics lecture anonyme" on public.user_list_items
  for select to anon
  using (exists (select 1 from public.user_lists l where l.id = list_id and l.is_public));