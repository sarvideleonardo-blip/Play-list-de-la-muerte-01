-- Enable and enforce row-level security for owner-only access.
-- Run this in the Supabase SQL editor.

alter table public.profiles enable row level security;
alter table public.songs enable row level security;

-- Profiles: users can read/update only their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Songs: users can CRUD only songs linked to their own profile.
drop policy if exists "songs_select_own" on public.songs;
create policy "songs_select_own"
  on public.songs
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "songs_insert_own" on public.songs;
create policy "songs_insert_own"
  on public.songs
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "songs_update_own" on public.songs;
create policy "songs_update_own"
  on public.songs
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "songs_delete_own" on public.songs;
create policy "songs_delete_own"
  on public.songs
  for delete
  to authenticated
  using (profile_id = auth.uid());
