# Saké — Project Specification

> A personal recipe & shopping list app with multi-language support, shared lists, and meal planning. Built for one user (the spec author) and a small group of collaborators.

This document is the **master spec**. Read it end-to-end before writing any code. Other files in this folder:

- `docs/SCHEMA.sql` — full Postgres schema with RLS policies (also at `supabase/migrations/0001_init.sql`)
- `docs/CATEGORIES.md` — the 13 fixed shopping categories with EN/NL/FR
- `docs/SEED_INGREDIENTS.md` — spec for the ~200-item seed file
- `docs/DESIGN_TOKENS.md` — colors, fonts, spacing, component patterns
- `docs/PHASES.md` — step-by-step build order with prompts you can execute
- `docs/hearth-mockup.html` — visual reference of the target UI (open in a browser)

---

## 1. What we're building

A web app called **Saké** for managing personal recipes, planning meals, and generating a smart shopping list that:

- combines ingredients from multiple recipes (auto-summed)
- understands metric ↔ imperial within the same unit type
- works in **English, Dutch, and French** (UI + ingredient names)
- can be shared with collaborators who get full edit access
- sorts by user-customizable category order to match supermarket aisles
- supports non-food / household items in the same list
- has a drag-and-drop weekly meal planner
- keeps history of past lists

The brand name is **Saké** (with the accent — Japanese "purpose / for the sake of"). Logo is a single character or a small flame mark; surface design language is warm cookbook (cream + terracotta + olive). See `docs/DESIGN_TOKENS.md`.

---

## 2. Stack (locked)

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + custom CSS variables (see `docs/DESIGN_TOKENS.md`)
- **UI primitives:** shadcn/ui (Dialog, DropdownMenu, Popover, etc.)
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **i18n:** `next-intl` with `en.json`, `nl.json`, `fr.json` message bundles
- **Forms:** React Hook Form + Zod
- **Data fetching:** TanStack Query (client) + Supabase Server Components (initial render)
- **Local UI state:** Zustand
- **Drag & drop:** `@dnd-kit/sortable` (sort order modal AND meal planner)
- **Icons:** `lucide-react`
- **Emoji picker:** `@emoji-mart/react`
- **Recipe URL import:** `recipe-ingredients-parser` + `cheerio` (server-side fetch + parse schema.org JSON-LD)
- **Search:** Postgres `tsvector` for cross-language ingredient search; Fuse.js client-side fallback
- **Hosting:** Vercel (frontend) + Supabase cloud (DB)

---

## 3. Feature list (definitive)

### Core
1. **Auth** — Supabase email + magic link login, user profile with preferred_language and unit_system.
2. **Recipes tab** — grid view with category color strip, big food-tag emoji as visual anchor (no photos), prep + lead time badges, food-tag chips, ingredient emoji preview. Filter by meal category and food tags. Cross-language search.
3. **Recipe detail** — typography-led hero with category color, emoji, time stats, servings stepper that live-scales quantities, optional/required ingredient flags, original-source URL link, edit/delete actions, "Add to shopping list" CTA.
4. **Recipe form** — title, description, url, instructions (textarea), meal_category (single select), food_tag (multi-select), base_servings (default 4), prep_time + lead_time minutes. Inline-create new ingredients (requires all 3 language names + emoji + category).
5. **Recipe URL import** — paste a URL, server-side fetcher pulls schema.org Recipe JSON-LD, fills the form for review before saving.
6. **Shopping list tab** — grouped by category (in user's custom sort order), auto-summed quantities, source chip on each item ("Pasta al limone" or "3 recipes · EN+NL+FR"), inline quantity stepper, per-item notes, urgent flag, language-aware display.
7. **Ad-hoc items** — separate tab showing all ingredients tagged as food or household, in a chip grid; tap to add to active list. Subtabs: Food / Household / Personal care / Drinks / Frequent.
8. **Meal plan tab** — week grid Mon–Sun, drag recipes from a bottom drawer onto days, color-coded by meal type, copy-last-week button, "Build shopping list" combines all week's meals.
9. **History tab** — past completed shopping lists with date block, recipe + item counts, View and Duplicate actions.
10. **Shared with me tab** — lists collaborators have invited me to.
11. **Settings** — language, unit system (metric/imperial preference), category sort order (drag to reorder, hide categories), manage all ingredients view.
12. **Bulk paste** — quick-add supports multi-line / comma-separated input, parses quantities + matches ingredients across languages.

### Locked design decisions
- Each ingredient has **one canonical row** with `name_en`, `name_nl`, `name_fr` and is linked to **one of 13 fixed categories** (see `docs/CATEGORIES.md`).
- Categories are **fixed seed data** — users cannot create, rename, or delete categories. They can reorder and hide categories per-user via `user_category_prefs`.
- Recipe titles stay in the language they were authored; ingredient names render in the viewer's `preferred_language` with EN fallback.
- Unit conversion only happens **within the same `canonical_unit_type`** (mass↔mass, volume↔volume, count↔count). No mass↔volume conversion.
- Ad-hoc items become real `ingredients` rows on the fly — there's no separate "custom string" path.
- Recategorizing an ingredient updates it **globally** (affects all users). This is intentional — the canonical list is shared.
- Recipe photos are **not** stored — visual identity comes from category color + a big food-tag emoji.

### Not in v1 (explicitly deferred)
- Real-time push notifications (in-app realtime is enough; revisit when PWA is solid)
- Native iOS/Android apps (PWA only)
- Apple Watch
- Offline-first mode (basic service worker only)
- Per-store lists / store flyers / pricing
- AI recipe scanning from photo
- Sponsored content / brand inspiration feed
- Dark mode (CSS variables are set up for it; flip in v1.1)

---

## 4. Data model summary

See `docs/SCHEMA.sql` for the full DDL with RLS. Quick overview:

```
profiles                     ← id, display_name, preferred_language, unit_system
categories                   ← 13 seeded rows, multilingual names
user_category_prefs          ← per-user sort order + hidden flags
ingredients                  ← canonical, multilingual, linked to a category
recipes                      ← user-owned, category + food_tag[], no photos
recipe_ingredients           ← join, references canonical ingredient_id
shopping_lists               ← status enum (active/completed/archived)
list_recipes                 ← which recipes feed this list, with servings override
list_adhoc_items             ← ad-hoc additions (still reference canonical ingredient_id)
list_line_state              ← per-list-line: checked, note, is_urgent, qty override
list_members                 ← collaborators with editor role
meal_plans                   ← weekly plans
meal_plan_entries            ← scheduled meals (date + meal_type + recipe + servings)
```

Key invariants:
- `ingredients.category_id` is **NOT NULL** — every ingredient must have a category.
- All recipe_ingredients and ad-hoc items reference `ingredient_id`, never raw strings.
- RLS ensures users see only their own data plus lists they're members of.

---

## 5. Auto-sum logic (the heart of the app)

When viewing a shopping list, the client reducer:

1. **Collect** all lines from `list_recipes` (expanded via `recipe_ingredients`, scaled by `list_recipes.servings / recipes.base_servings`) plus `list_adhoc_items`.
2. **Group** by `(ingredient_id, canonical_unit_type)`. Same ingredient with different unit types (e.g. butter 100g + butter 1 tbsp) stays separate — show two lines.
3. **Convert** each line's unit into the user's preferred unit within its unit type. See `lib/units.ts`.
4. **Sum** converted quantities.
5. **Sort** by `user_category_prefs.position` (with fallback to `categories.default_position`), then alphabetically within category. Urgent items sort first within each category.
6. **Render** each grouped row with `ingredients.name_{preferred_language}` and a "source" chip showing contributing recipes (or "ad-hoc").

Language is **purely a display concern** — the data model is language-agnostic via canonical IDs.

---

## 6. Where to begin

Read `docs/PHASES.md` and execute one phase at a time. The scaffold (Phase 1) and DB migration (Phase 2 source) are already in this repo.

When in doubt about UX: copy Bring!'s simplicity. When in doubt about design polish: copy NYT Cooking's warmth.
