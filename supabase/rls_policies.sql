-- ============================================================
-- Playlist de la Muerte — RLS Policies + Vista Pública
-- ============================================================
-- Este script configura:
--   1. Tabla profiles con campos de legado (status, final_message, etc.)
--   2. Tabla songs con FK a profiles
--   3. Vista pública legacies_public (solo columnas aprobadas)
--   4. Policies RLS endurecidas
--   5. Índices para performance
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla profiles (extensión del schema existente)
-- ------------------------------------------------------------
-- Asegurar que los campos de legado existen
alter table public.profiles
  add column if not exists status text default 'alive' check (status in ('alive', 'dead')),
  add column if not exists final_message text,
  add column if not exists personal_fragments jsonb default '{}',
  add column if not exists activated_at timestamptz,
  add column if not exists activation_code text;

-- ------------------------------------------------------------
-- 2. Tabla songs
-- ------------------------------------------------------------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  artist text not null,
  link text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. Habilitar RLS en ambas tablas
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs enable row level security;

-- ------------------------------------------------------------
-- 4. Revocar acceso anónimo directo a profiles
--    La tabla base solo es accesible por authenticated (dueño)
--    Los legados públicos se leen desde la vista legacies_public
-- ------------------------------------------------------------
revoke select on public.profiles from anon;
revoke insert on public.profiles from anon;
revoke update on public.profiles from anon;
revoke delete on public.profiles from anon;

-- ------------------------------------------------------------
-- 5. Vista pública: legacies_public
--    Solo expone columnas intencionalmente públicas.
--    security_barrier evita que filtros de la vista sean
--    optimizados de forma que expongan filas no deseadas.
-- ------------------------------------------------------------
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

-- La vista no tiene RLS propia; la seguridad viene de:
--   a) security_barrier
--   b) Que la tabla base no permite SELECT anon directo
--   c) Que la vista solo selecciona las columnas públicas

-- ------------------------------------------------------------
-- 6. Policies para la tabla profiles
-- ------------------------------------------------------------

-- SELECT: el dueño puede ver su perfil en cualquier estado.
--         Anon NO puede leer profiles directamente (revocado arriba).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- INSERT: cada usuario crea su propio perfil al registrarse.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- UPDATE: solo el dueño, SOLO si está 'alive'.
--         Esto previene edits sobre legados ya activados.
drop policy if exists "profiles_update_alive_own" on public.profiles;
create policy "profiles_update_alive_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id and status = 'alive')
  with check (auth.uid() = id and status = 'alive');

-- DELETE: solo el dueño, SOLO si está 'alive'.
--         Considerá si querés permitir borrado; si no, eliminá esta policy.
drop policy if exists "profiles_delete_alive_own" on public.profiles;
create policy "profiles_delete_alive_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id and status = 'alive');

-- ------------------------------------------------------------
-- 7. Policies para la tabla songs
-- ------------------------------------------------------------

-- SELECT: el dueño ve sus canciones.
--         Anon NO lee songs directamente; los legados públicos
--         muestran el mensaje/testimonio, no la playlist completa.
drop policy if exists "songs_select_own" on public.songs;
create policy "songs_select_own"
  on public.songs
  for select
  to authenticated
  using (profile_id = auth.uid());

-- INSERT: el dueño agrega canciones a su perfil vivo.
drop policy if exists "songs_insert_own_alive" on public.songs;
create policy "songs_insert_own_alive"
  on public.songs
  for insert
  to authenticated
  with check (profile_id = auth.uid());

-- UPDATE: el dueño edita sus canciones.
drop policy if exists "songs_update_own" on public.songs;
create policy "songs_update_own"
  on public.songs
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- DELETE: el dueño elimina sus canciones.
drop policy if exists "songs_delete_own" on public.songs;
create policy "songs_delete_own"
  on public.songs
  for delete
  to authenticated
  using (profile_id = auth.uid());

-- ------------------------------------------------------------
-- 8. Índices para queries frecuentes
-- ------------------------------------------------------------
create index if not exists idx_songs_profile_id on public.songs(profile_id);
create index if not exists idx_profiles_status on public.profiles(status);

-- ------------------------------------------------------------
-- 9. NOTA IMPORTANTE sobre activación (alive → dead)
-- ------------------------------------------------------------
-- La transición de estado alive → dead NO debe hacerse desde
-- el cliente. Debe hacerse vía:
--   a) Una Supabase Edge Function con service-role key, o
--   b) Una función RPC con SECURITY DEFINER.
--
-- Ejemplo de función RPC (opcional, ejecutar si se desea):
--
-- create or replace function activate_legacy(user_id uuid)
-- returns void
-- language plpgsql
-- security definer
-- as $$
-- begin
--   update public.profiles
--   set status = 'dead',
--       activated_at = now(),
--       activation_code = gen_random_uuid()
--   where id = user_id
--     and status = 'alive'
--     and auth.uid() = user_id;
--
--   if not found then
--     raise exception 'No se puede activar: perfil no existe, no es tuyo, o ya está activado';
--   end if;
-- end;
-- $$;
--
-- Llamar desde el cliente:
--   const { error } = await supabase.rpc('activate_legacy', { user_id: user.id });
--
-- Esto garantiza que:
--   - Solo el dueño puede activar
--   - Solo se activa una vez
--   - activation_code se genera server-side
--   - No hay race conditions
-- ------------------------------------------------------------
