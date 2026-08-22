# Playlist de la Muerte 🎵

Plataforma de legado musical. Armá tu playlist, dejá tu mensaje final y tus fragmentos, y cuando estés listo, **activalo** para que quede público e inmutable.

## Qué hace

- **Login con Google** (Supabase Auth).
- **Tu legado** — mensaje final + 4 fragmentos (una cosa que no hiciste, un momento de alegría, lo que aprendiste, tus últimas palabras).
- **Tu playlist** — agregá y eliminá canciones (nombre, artista, enlace).
- **Dictado por voz** en todos los campos.
- **Explorar** — los legados activados se vuelven públicos y buscables.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (Postgres + Auth + Row Level Security)

## Cómo correrlo localmente

1. Cloná el repo.
2. `npm install`
3. Creá un archivo `.env` en la raíz con:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

4. `npm run dev`

## Configurar Supabase

1. Ejecutá `supabase/schema_completo.sql` en el **SQL Editor** (crea tablas, trigger de registro, vista pública y RLS).
2. Activá **Google** en *Authentication → Providers* y pegá tu Client ID / Secret.
3. Configurá *Authentication → URL Configuration* (Site URL + Redirect URLs).

## Estructura

- `src/App.tsx` — toda la app (login, legado, playlist, explorar).
- `supabase/schema_completo.sql` — esquema idempotente + RLS + trigger + vista pública.
- `supabase/rls_policies.sql` — referencia de las policies RLS.

## Contribuir

¡Bienvenido! Hacé un fork, creá una rama y mandá un pull request. Revisá los issues abiertos o proponé algo nuevo.

## Licencia

MIT — ver [LICENSE](LICENSE).
