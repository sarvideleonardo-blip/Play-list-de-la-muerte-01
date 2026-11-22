🇪🇸 [Leer en español](README.md)

# Playlist of Death 🎵

A musical legacy platform. Build your playlist, write your final message and your fragments, and when you're ready, **activate it** so it becomes public and immutable.

## What it does

- **Sign in with Google** (Supabase Auth).
- **Your legacy**: a final message + 4 fragments (something you never did, a moment of joy, what you learned, your last words).
- **Your playlist**: add and remove songs (title, artist, link).
- **Voice dictation** in every field.
- **Explore**: activated legacies become public and searchable.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (Postgres + Auth + Row Level Security)

## How to run it locally

1. Clone the repo.
2. `npm install`
3. Create a `.env` file in the root with:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

4. `npm run dev`

## Setting up Supabase

1. Run `supabase/schema_completo.sql` in the **SQL Editor** (creates the tables, the sign-up trigger, the public view and RLS).
2. Enable **Google** under *Authentication → Providers* and paste your Client ID / Secret.
3. Configure *Authentication → URL Configuration* (Site URL + Redirect URLs).

## Structure

- `src/App.tsx`: the whole app (sign-in, legacy, playlist, explore).
- `supabase/schema_completo.sql`: idempotent schema + RLS + trigger + public view.
- `supabase/rls_policies.sql`: reference for the RLS policies.

## Contributing

Welcome! Fork the repo, create a branch and open a pull request. Check the open issues or propose something new.

Read [CONTRIBUTING.en.md](CONTRIBUTING.en.md) to see how to help. The draft privacy notice and terms are in [docs/legal](docs/legal/borrador-aviso-privacidad-y-terminos.en.md) (English translation; the Spanish original is the reference text), pending legal review.

## License

MIT: see [LICENSE](LICENSE).
