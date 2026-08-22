-- ============================================================
-- PLAYLIST DE LA MUERTE — Esquema completo (idempotente)
-- Ejecutar TODO este script en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Es seguro correrlo varias veces (usa IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ============================================================
-- 1. TABLAS
-- ============================================================

-- Perfiles (1:1 con auth.users). Se crea solo al registrarse.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'alive' check (status in ('alive','dead')),
  final_message text,
  personal_fragments jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  activation_code text
);

-- Canciones de la playlist
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  artist text not null,
  link text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. TRIGGER: crear perfil al registrarse
--    (sin esto, fetchProfile() falla y addSong() viola el FK)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.songs enable row level security;

-- ============================================================
-- 4. VISTA PÚBLICA (exploración de legados)
-- ============================================================
drop view if exists public.legacies_public;

create view public.legacies_public with (security_barrier) as
select
  id as profile_id,
  status,
  activated_at,
  final_message,
  personal_fragments
from public.profiles
where status = 'dead';

-- ============================================================
-- 5. POLICIES — profiles
-- ============================================================
revoke select, insert, update, delete on public.profiles from anon;
revoke select, insert, update, delete on public.songs from anon;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_alive_own" on public.profiles;
create policy "profiles_update_alive_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id and status = 'alive')
  with check (auth.uid() = id and status = 'alive');

drop policy if exists "profiles_delete_alive_own" on public.profiles;
create policy "profiles_delete_alive_own" on public.profiles
  for delete to authenticated
  using (auth.uid() = id and status = 'alive');

-- ============================================================
-- 6. POLICIES — songs
-- ============================================================
drop policy if exists "songs_select_own" on public.songs;
create policy "songs_select_own" on public.songs
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "songs_insert_own" on public.songs;
create policy "songs_insert_own" on public.songs
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "songs_update_own" on public.songs;
create policy "songs_update_own" on public.songs
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "songs_delete_own" on public.songs;
create policy "songs_delete_own" on public.songs
  for delete to authenticated using (profile_id = auth.uid());

-- ============================================================
-- 7. GRANTS (exponer vía Data API / REST)
-- ============================================================
grant select on public.legacies_public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.songs to authenticated;

-- ============================================================
-- 8. ÍNDICES
-- ============================================================
create index if not exists idx_songs_profile_id on public.songs(profile_id);
create index if not exists idx_profiles_status on public.profiles(status);

-- ============================================================
-- 9. ACTIVACIÓN alive -> dead (opcional; el front aún no lo llama)
--    Se llama desde el cliente con:
--      supabase.rpc('activate_legacy', { user_id: user.id })
-- ============================================================
create or replace function public.activate_legacy(user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set status = 'dead',
      activated_at = now(),
      activation_code = gen_random_uuid()
  where id = user_id
    and status = 'alive'
    and auth.uid() = user_id;

  if not found then
    raise exception 'No se puede activar: el perfil no existe, no es tuyo, o ya está activado';
  end if;
end;
$$;

grant execute on function public.activate_legacy(uuid) to authenticated;
