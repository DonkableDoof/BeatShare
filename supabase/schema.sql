-- BeatShare database schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
--
-- BeatShare is built for one group of friends: every signed-in member can see
-- every profile, release and review. Members can only change their own
-- profile and their own reviews. The release catalogue is shared, so anyone
-- can fix up a release's details, but only the person who added it can delete it.

-- ───────────────────────── tables ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_url text not null default '',
  bio text not null default '' check (char_length(bio) <= 300),
  created_at timestamptz not null default now()
);

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
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
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

-- every new account gets a profile, named from what was typed at sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), new.raw_user_meta_data ->> 'username')
  );
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

-- ───────────────────────── row level security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.albums enable row level security;
alter table public.reviews enable row level security;

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
create policy "members edit albums" on public.albums
  for update to authenticated using (true) with check (true);
drop policy if exists "owners delete albums" on public.albums;
create policy "owners delete albums" on public.albums
  for delete to authenticated using (created_by = (select auth.uid()));

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
drop policy if exists "members delete own images" on storage.objects;
create policy "members delete own images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────────────────── realtime ─────────────────────────
-- So a friend's new review shows up without restarting the app.

do $$
declare t text;
begin
  foreach t in array array['profiles', 'genres', 'albums', 'reviews'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
