# Saké

A personal recipe & shopping list app with multi-language support (EN / NL / FR), shared lists, and meal planning. Next.js 15 + React 19 + Tailwind v4 + Supabase, deployed on Vercel.

For the full product spec, read [CLAUDE.md](./CLAUDE.md). For phased build instructions, read [docs/PHASES.md](./docs/PHASES.md).

## What's in this repo right now

This is the Phase 1 scaffold:

- Next.js 15 App Router with route groups `(app)` and `(auth)`
- Design tokens, Fraunces + DM Sans fonts, full `globals.css` from `docs/DESIGN_TOKENS.md`
- Static mockup converted to React for `/recipes`, `/plan`, `/list`, `/history`, `/shared`
- `next-intl` wired up with `en` / `nl` / `fr` message bundles and a cookie-based language switcher
- Supabase SSR client (`@supabase/ssr`) and auth middleware
- Login + Signup pages using Supabase magic-link OTP
- Database schema migration at `supabase/migrations/0001_init.sql` (also viewable at `docs/SCHEMA.sql`)

The static-data screens are placeholders. Pages 2–16 in [docs/PHASES.md](./docs/PHASES.md) wire them to live data.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new>, import the repo. Vercel auto-detects Next.js — no config changes needed.
3. Add the env vars from `.env.example` in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. The first build takes ~2 minutes.

The app builds and renders without Supabase env vars — a banner on each page tells the user to connect Supabase. Auth and data operations only work once the env vars are set.

## Set up Supabase

1. Create a project at <https://supabase.com>.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`. This creates the schema, RLS policies, and seeds the 13 categories.
3. Enable realtime on the list tables (also in SQL editor):

   ```sql
   alter publication supabase_realtime add table shopping_lists;
   alter publication supabase_realtime add table list_recipes;
   alter publication supabase_realtime add table list_adhoc_items;
   alter publication supabase_realtime add table list_line_state;
   alter publication supabase_realtime add table list_members;
   ```

4. Go to **Authentication → Email** and enable email + magic link. Add your Vercel deployment URL to **Redirect URLs**.
5. Copy your project URL and anon key from **Settings → API** into your `.env.local` (and Vercel project settings).

## Run locally

```sh
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Project structure

```
app/
  (app)/             — main shell (topbar + tabs)
    layout.tsx
    recipes/page.tsx
    plan/page.tsx
    list/page.tsx
    history/page.tsx
    shared/page.tsx
  (auth)/
    login/
    signup/
  layout.tsx         — html shell, fonts, NextIntlClientProvider
  globals.css        — design tokens
  page.tsx           — redirects to /recipes

components/          — Topbar, TabsNav, LangSwitch, ConfigureBanner
lib/supabase/        — browser + server client factories
messages/            — en.json, nl.json, fr.json
supabase/
  migrations/0001_init.sql
  seed/              — populated in Phase 3
docs/                — full spec (CLAUDE.md is master, docs/PHASES.md is the build plan)
i18n.ts              — next-intl request config (cookie-based locale)
middleware.ts        — auth redirect (no-op until Supabase env is set)
next.config.ts
```

## Next steps

Open [docs/PHASES.md](./docs/PHASES.md) and execute Phase 2 onwards. The scaffolding (Phase 1) is done.
