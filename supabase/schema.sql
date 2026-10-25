-- BeatShare database schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
--
-- BeatShare is built for one group of friends: every signed-in member can see
-- every profile, release and review. Members can only change their own
-- profile and their own reviews. The release catalogue is shared, but only the
-- person who added a release (or an admin) can edit or delete it.
-- Joining needs an unused invite code, which only admins can create.

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_url text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
-- for projects set up before these changes
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles drop column if exists bio;

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#a78bfa',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists genres_name_key on public.genres (lower(name));
create index if not exists genres_created_by_idx on public.genres (created_by);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  artist text not null default '' check (char_length(artist) <= 200),
  type text not null default 'album' check (type in ('album', 'compilation', 'ep')),
  year text not null default '' check (year ~ '^[0-9]{0,4}$'),
  cover_url text not null default '',
  genres uuid[] not null default '{}',
  -- [{ "id": "…", "title": "…", "interlude": false }]
  tracks jsonb not null default '[]',
  -- a page for the release (streaming service, Bandcamp, YouTube…)
  link text not null default '' check (char_length(link) <= 500 and (link = '' or link ~* '^https?://')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.albums add column if not exists link text not null default ''
  check (char_length(link) <= 500 and (link = '' or link ~* '^https?://'));
-- a release can only be added once
create unique index if not exists albums_release_key on public.albums (lower(btrim(artist)), lower(btrim(title)));
create index if not exists albums_created_by_idx on public.albums (created_by);

create table if not exists public.reviews (
  album_id uuid not null references public.albums (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- stars, 0–5 in halves (shown in the app as points out of 10); 0 = not scored
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  -- { "<track id>": 4.5, … }
  track_ratings jsonb not null default '{}',
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (album_id, user_id)
);
create index if not exists reviews_user_idx on public.reviews (user_id);

-- helpers kept out of the API (the private schema isn't exposed)
create schema if not exists private;
grant usage on schema private to authenticated;

-- e.g. "K7QM2-XH9TD": 10 random characters, no look-alikes (0/O, 1/I)
create or replace function private.new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select substr(c, 1, 5) || '-' || substr(c, 6, 5)
  from (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + get_byte(b, i) % 32, 1), '' order by i) as c
    from (select extensions.gen_random_bytes(10) as b) r, generate_series(0, 9) i
  ) x;
$$;

create or replace function private.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;
grant execute on function private.new_invite_code() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- every account needs an unused invite code
create table if not exists public.invites (
  code text primary key default private.new_invite_code() check (code ~ '^[A-Z0-9-]{6,32}$'),
  -- the account that signs up with it becomes an admin (only set from SQL)
  makes_admin boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz
);
create index if not exists invites_created_by_idx on public.invites (created_by);
create index if not exists invites_used_by_idx on public.invites (used_by);

-- one member pointing another at a release; shows up in the recipient's inbox
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (from_user <> to_user),
  unique (album_id, from_user, to_user)
);
create index if not exists recommendations_to_user_idx on public.recommendations (to_user, created_at desc);
create index if not exists recommendations_from_user_idx on public.recommendations (from_user);

-- ───────────────────────── triggers ─────────────────────────

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- whoever added a release stays its owner, however many people edit it
create or replace function public.keep_album_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_by = old.created_by;
  new.created_at = old.created_at;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists albums_touch on public.albums;
create trigger albums_touch before update on public.albums
  for each row execute function public.keep_album_owner();

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- every new account uses up an invite and gets a profile named from what was typed at sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites
  where code = upper(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', ''))) and used_by is null
  for update;
  if not found then
    raise exception 'invalid invite code';
  end if;

  insert into public.profiles (id, username, display_name, is_admin)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), new.raw_user_meta_data ->> 'username'),
    inv.makes_admin
  );
  update public.invites set used_by = new.id, used_at = now() where code = inv.code;
  return new;
end $$;
-- only the trigger should run this, never a client through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- lets the sign-up form check a username before an account exists
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- …and an invite code
create or replace function public.invite_available(invite text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invites i where i.code = upper(btrim(invite)) and i.used_by is null);
$$;
grant execute on function public.invite_available(text) to anon, authenticated;

-- ───────────────────────── row level security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.albums enable row level security;
alter table public.reviews enable row level security;
alter table public.invites enable row level security;
alter table public.recommendations enable row level security;

-- members can't make themselves admin: only these profile columns are writable
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
revoke update on public.invites from anon, authenticated;

drop policy if exists "admins read invites" on public.invites;
create policy "admins read invites" on public.invites
  for select to authenticated using ((select private.is_admin()));
drop policy if exists "admins create invites" on public.invites;
create policy "admins create invites" on public.invites
  for insert to authenticated
  with check ((select private.is_admin()) and created_by = (select auth.uid()) and not makes_admin);
drop policy if exists "admins delete unused invites" on public.invites;
create policy "admins delete unused invites" on public.invites
  for delete to authenticated using ((select private.is_admin()) and used_by is null);

drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated using (true);
drop policy if exists "members edit own profile" on public.profiles;
create policy "members edit own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "members read genres" on public.genres;
create policy "members read genres" on public.genres
  for select to authenticated using (true);
drop policy if exists "members add genres" on public.genres;
create policy "members add genres" on public.genres
  for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "members edit genres" on public.genres;
create policy "members edit genres" on public.genres
  for update to authenticated using (true) with check (true);
drop policy if exists "members delete genres" on public.genres;
create policy "members delete genres" on public.genres
  for delete to authenticated using (true);

drop policy if exists "members read albums" on public.albums;
create policy "members read albums" on public.albums
  for select to authenticated using (true);
drop policy if exists "members add albums" on public.albums;
create policy "members add albums" on public.albums
  for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "members edit albums" on public.albums;
drop policy if exists "owners and admins edit albums" on public.albums;
create policy "owners and admins edit albums" on public.albums
  for update to authenticated
  using (created_by = (select auth.uid()) or (select private.is_admin()))
  with check (created_by = (select auth.uid()) or (select private.is_admin()));
drop policy if exists "owners delete albums" on public.albums;
drop policy if exists "owners and admins delete albums" on public.albums;
create policy "owners and admins delete albums" on public.albums
  for delete to authenticated using (created_by = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "members read reviews" on public.reviews;
create policy "members read reviews" on public.reviews
  for select to authenticated using (true);
drop policy if exists "members add own reviews" on public.reviews;
create policy "members add own reviews" on public.reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "members edit own reviews" on public.reviews;
create policy "members edit own reviews" on public.reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members delete own reviews" on public.reviews;
create policy "members delete own reviews" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));

-- the recipient can only change whether a recommendation has been read
revoke update on public.recommendations from anon, authenticated;
grant update (read_at) on public.recommendations to authenticated;

drop policy if exists "members see their recommendations" on public.recommendations;
create policy "members see their recommendations" on public.recommendations
  for select to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()));
drop policy if exists "members send recommendations" on public.recommendations;
create policy "members send recommendations" on public.recommendations
  for insert to authenticated with check (from_user = (select auth.uid()));
drop policy if exists "recipients mark recommendations read" on public.recommendations;
create policy "recipients mark recommendations read" on public.recommendations
  for update to authenticated using (to_user = (select auth.uid())) with check (to_user = (select auth.uid()));
drop policy if exists "members remove their recommendations" on public.recommendations;
create policy "members remove their recommendations" on public.recommendations
  for delete to authenticated using (to_user = (select auth.uid()) or from_user = (select auth.uid()));

-- ───────────────────────── image storage ─────────────────────────
-- Public buckets: anyone with a link can view an image. Each member uploads
-- into a folder named after their own user id.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "members upload own images" on storage.objects;
create policy "members upload own images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);
-- admins can also remove other members' images (Settings → Unused Images)
drop policy if exists "members delete own images" on storage.objects;
create policy "members delete own images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'covers') and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin())));

-- admins only: uploaded images that no release or profile uses any more.
-- Uploads from the last 10 minutes are left out, since a save may still be finishing.
-- (Files themselves can only be deleted through the Storage API, which the app does.)
create or replace function public.unused_images()
returns table (bucket text, name text, bytes bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can list unused images';
  end if;
  return query
  select o.bucket_id::text, o.name::text, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
  from storage.objects o
  where o.bucket_id in ('covers', 'avatars')
    and o.created_at < now() - interval '10 minutes'
    and not exists (
      select 1 from public.albums a
      where right(split_part(a.cover_url, '?', 1), length(o.name) + length(o.bucket_id) + 2) = '/' || o.bucket_id || '/' || o.name
    )
    and not exists (
      select 1 from public.profiles p
      where right(split_part(p.avatar_url, '?', 1), length(o.name) + length(o.bucket_id) + 2) = '/' || o.bucket_id || '/' || o.name
    )
  order by o.created_at;
end $$;
revoke execute on function public.unused_images() from public, anon;
grant execute on function public.unused_images() to authenticated;

-- ───────────────────────── realtime ─────────────────────────
-- So a friend's new review shows up without restarting the app.

do $$
declare t text;
begin
  foreach t in array array['profiles', 'genres', 'albums', 'reviews', 'recommendations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ───────────────────────── first member ─────────────────────────
-- Nobody can join without a code, so make the first one here and sign up with it.
-- Whoever uses it becomes the admin, and can create invite codes for everyone else
-- in Settings:
--
--   insert into public.invites (makes_admin) values (true) returning code;
