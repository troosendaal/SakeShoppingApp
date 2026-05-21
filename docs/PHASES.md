# Build phases

Execute these one at a time. Don't skip ahead — each phase assumes the previous is complete. After each phase, verify by running the app and exercising the feature end-to-end before moving on.

Each phase block below is intended to be copy-pasted (or referenced) as a Claude Code instruction.

---

## Phase 0 — Read everything first

Read these files completely before writing any code:

1. `CLAUDE.md` — master spec
2. `CATEGORIES.md` — the 13 categories
3. `SCHEMA.sql` — full DB structure
4. `SEED_INGREDIENTS.md` — seed file format
5. `DESIGN_TOKENS.md` — visual language
6. `hearth-mockup.html` — visual reference (open in a browser, click through every tab)

When in doubt about layout, density, or what a screen should look like: re-open the mockup. It's the source of truth.

---

## Phase 1 — Scaffold

Create a Next.js 15 + TypeScript + Tailwind v4 app named `sake`.

Install:
```
next@15 react@19 typescript
tailwindcss@4 @tailwindcss/postcss
@supabase/supabase-js @supabase/ssr
@tanstack/react-query
react-hook-form zod @hookform/resolvers
zustand
lucide-react
next-intl
@dnd-kit/sortable @dnd-kit/core
@emoji-mart/react @emoji-mart/data
fuse.js
cheerio
recipe-ingredients-parser
```

Set up:
- `/app` directory with App Router
- Two route groups: `(auth)` for login/signup, `(app)` for the main shell
- `next/font/google` loading Fraunces and DM Sans
- `app/globals.css` with the CSS variable block from `DESIGN_TOKENS.md`
- `lib/supabase/client.ts` and `lib/supabase/server.ts` (the standard Supabase SSR pattern)
- `messages/en.json`, `messages/nl.json`, `messages/fr.json` (start empty `{}`; fill as we build)
- `next-intl` middleware
- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- README with setup steps

The brand name is **Saké** — use it everywhere in code, copy, page titles, manifest. The mockup says "Hearth" — that was a working title; ignore it for branding.

---

## Phase 2 — Database

Apply `SCHEMA.sql` as a Supabase migration. After it runs, also run:

```sql
alter publication supabase_realtime add table shopping_lists;
alter publication supabase_realtime add table list_recipes;
alter publication supabase_realtime add table list_adhoc_items;
alter publication supabase_realtime add table list_line_state;
alter publication supabase_realtime add table list_members;
```

Verify:
- All tables exist with RLS enabled
- The 13 categories are seeded (check `select * from categories order by default_position`)
- `ingredients.search_tsv` works: insert one test ingredient, run `select * from ingredients where search_tsv @@ plainto_tsquery('simple','ui')` and confirm it matches an EN-named row with NL alias "ui"
- Drop the test row

---

## Phase 3 — Seed ingredients

Build the seed file. Two paths:

**Option A (recommended):** Write `scripts/generate-seed.ts` that calls the Anthropic API to generate ~200 ingredients in batches by category. Validate each batch against the schema in `SEED_INGREDIENTS.md`. Save to `supabase/seed/ingredients.json`. Then write `scripts/load-seed.ts` that reads the JSON and uses the Supabase admin client to insert.

**Option B (faster start):** Hand-write 30 essentials (the most common cooking items) and ship without a full seed. Add more later as we use the app.

Either way: the seed file is checked in. Don't query the Anthropic API at runtime.

---

## Phase 4 — Auth + app shell

Build:
- Login page (`/login`): Supabase email + magic link
- Signup page (`/signup`): collects display_name + preferred_language; creates a `profiles` row on success
- Middleware that redirects unauthenticated users to `/login` and authenticated users away from auth pages
- App shell layout (`app/(app)/layout.tsx`):
  - Topbar: brand mark + "saké" wordmark, language switcher (writes to `profiles.preferred_language`), settings icon, avatar
  - Tabs nav: Recipes / Meal plan / Shopping list / History / Shared / Ad-hoc
  - Render children below tabs
- Wire `next-intl` so the language switcher actually switches UI strings

Match the mockup topbar and tabs exactly — same spacing, fonts, colors.

---

## Phase 5 — Recipes (list + detail + create/edit)

### /recipes
Grid of recipe cards matching the mockup:
- Color-coded category strip on top
- Gradient background from category-soft to white
- Category eyebrow + heart icon row
- Big food emoji (left) + times stack (right)
- Body: title (Fraunces), food tag pills, dashed-divided ingredient emoji preview
- Hover lifts the card and adds terracotta border
- "Add a new recipe" dashed-border card at the end of the grid

Two filter rows above:
1. Meal category pills (All, Breakfast, Lunch, Dinner, Dessert, Sweets)
2. Food tag pills (Pasta, Meat, Fish, Veggie, Rice, Bread, Soup, etc.)

Cross-language search in the top-right (`<input>` posting to a server action that queries `recipes` joined with `ingredients` via `recipe_ingredients`, using `search_tsv @@ plainto_tsquery('simple', $1)` for ingredients and `ILIKE '%query%'` for recipe titles).

### /recipes/[id]
Detail view matching the mockup:
- Left column (`detail-hero`): category-tinted gradient, eyebrow, food tag pills, BIG emoji (140px), times stat row at bottom
- Right column (`detail-content`): title with italic accent, description, source URL link, servings stepper, ingredient list (icon + name + optional flag + quantity), action row at bottom

Servings stepper live-scales all quantities. Show "scaled from 4" hint when not at base servings.

### /recipes/new (and /recipes/[id]/edit)
Form fields:
- Title, description, url (with "Import from URL" button next to it — see Phase 6)
- Meal category (single-select radio cards)
- Food tags (multi-select pills)
- Base servings (number, default 4)
- Prep time (min) + lead time (min)
- Hero emoji (emoji picker)
- Instructions (textarea)
- Ingredients list — each row:
  - Ingredient autocomplete (search across `name_en/nl/fr` and `aliases_*` via `search_tsv`). If no match, show "+ Create '{query}' as a new ingredient" at the bottom of the dropdown → opens the inline create modal (see below)
  - Quantity (number, supports decimals)
  - Unit (dropdown: g, kg, ml, l, tsp, tbsp, cup, fl_oz, oz, lb, whole, pinch, bunch, bulb, clove, can, jar, pack, slice)
  - Optional checkbox
  - Drag handle to reorder
  - Trash icon

**Inline "create ingredient" modal:**
- All three language names (required)
- Aliases (optional, comma-separated per language)
- Emoji picker (required)
- Category dropdown (required — all 13 from `categories`, shown with emoji + EN/NL/FR labels)
- Item kind (food / household)
- Canonical unit type (mass / volume / count)
- On save: insert into `ingredients` with `owner_id = auth.uid()`, then auto-select in the parent autocomplete

---

## Phase 6 — Recipe URL import

Server action: `importRecipeFromUrl(url: string)`.

1. `fetch(url)` server-side
2. Parse HTML with `cheerio`
3. Look for `<script type="application/ld+json">` containing schema.org `Recipe`
4. Extract: `name`, `description`, `recipeIngredient[]` (raw strings), `recipeInstructions`, `recipeYield`, `prepTime`, `totalTime` (ISO 8601 durations → minutes)
5. Run each ingredient string through `recipe-ingredients-parser` to get `{ quantity, unit, name }`
6. For each parsed name, fuzzy-match against `ingredients.search_tsv`. If no match, flag for the user to create after import.
7. Pre-fill the `/recipes/new` form with all the parsed data; user reviews + edits + saves

Tested sites: NYT Cooking, Serious Eats, BBC Good Food, Bon Appétit, AllRecipes, lekkervanbijons.be — most publish JSON-LD. If a URL has none, return a friendly "couldn't extract — fill in manually" message.

---

## Phase 7 — Shopping list (the heart of the app)

### Data layer
Write `lib/units.ts`:
- `convert(quantity, fromUnit, toUnit)` — only converts within the same unit type. Throws if you try mass↔volume.
- `formatQuantity(qty, unit, lang)` — formats for display, picking sensible unit (1200g → "1.2 kg")
- Unit catalog: mass {g, kg, oz, lb}, volume {ml, l, tsp, tbsp, cup, fl_oz}, count {whole, pinch, bunch, bulb, clove, can, jar, pack, slice}

Write `lib/sum-list.ts`:
- Input: a list ID
- Fetches `list_recipes` (joined with `recipe_ingredients` joined with `ingredients`), `list_adhoc_items` (joined with `ingredients`), and `list_line_state`
- For each `list_recipe`, scale quantities by `servings / recipes.base_servings`
- Group by `(ingredient_id, canonical_unit_type)` — different unit types stay as separate lines
- Convert all contributions to the user's preferred unit
- Sum
- Apply `list_line_state` overrides (qty override, unit override) if present
- Output: `MergedLine[]` with `{ ingredient, totalQty, unit, sources: ContributingSource[], note, isUrgent, isChecked }`

### Page
- Quick-add card at top with Single / Bulk paste toggle (Phase 12 polishes this; build the Single mode now)
- List grouped by category (joined with `user_category_prefs` for sort order, hidden categories at the bottom in an "Other" group)
- Each line: checkbox, emoji, item name + source chip, optional note line, qty cell
- Urgent items sort first within their category, with left-edge terracotta accent + red Urgent pill
- Long-press / click qty to open inline stepper
- Click "+ add note" or the note text to edit
- Three-dot menu per item: Edit category, Toggle urgent, Edit note, Delete
- Bottom action: "Finish shopping" → marks list `completed`, opens prompt for new active list

Realtime subscription: anyone with list access sees changes (check-offs, notes, urgent flags, adds) instantly.

---

## Phase 8 — Ad-hoc tab

`/adhoc`:
- Subtabs: Food / Household / Personal care / Drinks / Frequent
- Chip grid: tap to add to active shopping list (creates a `list_adhoc_items` row with default qty=1, unit='whole' or category-appropriate)
- Search input at top (cross-language via `search_tsv`)
- "+ Add new" button → opens the same inline create-ingredient modal from Phase 5

"Frequent" subtab queries the user's history: count occurrences across `list_adhoc_items` (own lists only) over the past 90 days, top 24.

---

## Phase 9 — Sharing

Build:
- Share dialog on shopping list (modal): list current members with avatars + roles, "Invite by link" generates a token, "Invite by email" sends a Supabase magic-link to the email (requires email auth)
- `/invite/[token]` page: accept invite, adds row to `list_members`
- "Shared with me" tab (`/shared`): query `list_members` joined with `shopping_lists` where `user_id = auth.uid()` — list with last-updated timestamps + collaborator counts
- Permissions: all collaborators get `editor` role in v1 (no read-only yet). Owner can remove members.

Test by signing up a second account and inviting it.

---

## Phase 10 — Meal plan

`/plan`:
- Week navigator (prev / next / today, with date range label)
- 7-column day grid (Mon–Sun), each day has stacked meal slots
- Recipe drawer at the bottom: horizontal-scrolling strip of recipe tiles
- `@dnd-kit` for drag-and-drop:
  - Recipes drag from drawer onto a day → creates `meal_plan_entries` row with smart meal_slot inference (recipe's `meal_category` maps to a slot, or defaults to next empty slot)
  - Existing entries drag between days and reorder within a day
- Each entry shows: meal type eyebrow, recipe emoji + title, servings (with quick edit)
- Click empty slot → opens recipe picker modal
- Top buttons:
  - "Copy last week" — duplicates entries to next week (clones the meal_plan + entries)
  - "Build shopping list" — see below

### Build shopping list logic
1. If an active `shopping_list` exists where `source_meal_plan_id` matches this week:
   - Prompt: "Update existing list" (merge new entries, leave existing ones alone), "Replace" (delete + rebuild), or "Create new list alongside"
   - Default: Update existing
2. Otherwise: create new active `shopping_list` with `source_meal_plan_id` set
3. For each `meal_plan_entries.recipe_id`, upsert into `list_recipes` with servings from the entry
4. Existing `list_line_state` (notes, urgent, check-offs) preserved across rebuilds — keyed on `(list_id, ingredient_id)`

---

## Phase 11 — History

`/history`:
- Query `shopping_lists` where `status IN ('completed', 'archived') AND (owner_id = auth.uid() OR user is member)`
- Order by `completed_at DESC`
- Each card: date block (month + day), title, "X recipes · Y items · completed {timestamp}", bought/skipped stat, View + Duplicate actions
- View: opens read-only version of the list view
- Duplicate: clones into new active list (new `shopping_list` with `source_list_id` set, clones `list_recipes` and `list_adhoc_items`, resets all `list_line_state.is_checked` to false)

Search across past list titles and the ingredients they contained.

---

## Phase 12 — Bulk paste

Update the shopping list quick-add (Phase 7) with the toggle.

Write `lib/parse-bulk.ts`:
- Input: a multi-line string
- Split on newlines AND commas (`/[\n,]/`)
- For each fragment: trim, skip if empty
- Run regex: `/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/` to extract qty / unit / name; if no qty, default qty=1 unit='whole'
- Use the cross-language ingredient search to match each name → ingredient_id
- Items with no match: queue them; show a single modal with a list "Need to set up: avocado, paneer, …" and let user create each in sequence
- Output: a list of `{ ingredient_id, quantity, unit }` ready to insert as `list_adhoc_items`
- Show summary toast: "5 added, 1 needs setup"

---

## Phase 13 — Notes & urgent flag

Add the inline note input and urgent toggle to each shopping list line.

Schema is already in place (`list_line_state.note`, `list_line_state.is_urgent`). Just need:
- Note input: textarea inline (or popover), 200-char limit, debounced save
- Urgent toggle: in the row's three-dot menu OR with a long-press
- Urgent items sort first within their category
- Realtime sync (subscribe to `list_line_state` changes)

---

## Phase 14 — Inline quantity editing

Update the shopping list quantity cell from Phase 7. The static qty becomes clickable. Clicking expands into the stepper component. Edits write to `list_line_state.quantity_override` and `unit_override` (so original recipe contributions are preserved — when you remove the recipe, the qty falls back to whatever auto-sum gives without the override).

For merged ingredients with multiple recipe sources, tapping the qty shows a popover with the breakdown:

```
Onions · 5 whole
  ├─ Pasta al limone (4 srv): 2
  ├─ Shakshuka (4 srv): 1
  ├─ Risotto (2 srv): 1
  └─ Ad-hoc: 1
[Edit total override]
```

User can either set a total override or remove a contributing recipe.

---

## Phase 15 — Settings

`/settings`:
- Profile: display_name, avatar upload, preferred_language, preferred_unit_system
- Category sort: drag-and-drop list of all 13 categories with eye toggle for hidden (matches the modal in the mockup). Saves to `user_category_prefs`.
- Manage ingredients: a paginated table of all `ingredients`, with filters by category, owner (mine vs global), item_kind. Allow editing names/aliases/category/emoji for owned ingredients. Read-only for global seed ingredients.
- Manage shares: list of all `list_members` rows touching the user — both their own lists shared with others, and others' lists they're members of.
- Danger zone: delete account (cascades via FK).

---

## Phase 16 — PWA polish

- Add `manifest.json` with Saké branding (icon = terracotta circle with white flame)
- Service worker: cache app shell + recent lists for basic offline read
- "Install app" prompt on supported browsers
- iOS home-screen icon meta tags
- Tested: opening from home screen runs full-screen, navigation works offline (read-only)

---

## Verification checklist (run before declaring done)

- [ ] Sign up two accounts in two browsers
- [ ] Account A: create a recipe in EN with "onion"; Account B: create a recipe in NL with "ui"
- [ ] Both add to the same shared list → shopping list shows ONE line "Onion" with combined qty
- [ ] Switch Account B's language to FR → ingredient names render in French
- [ ] Recategorize "onion" from Fruit & Veg to Spices → both accounts see the change
- [ ] Account A drags their recipe to Wednesday on the meal planner → "Build shopping list" generates a list that includes onion
- [ ] Mark all items checked → "Finish shopping" → list moves to History
- [ ] Bulk-paste "2 avocados, milk, 6 eggs" → all three added
- [ ] Add urgent flag + note on one item → Account B sees both live within 1 second
- [ ] Inline-edit qty from 2 → 5 → both accounts see the change
- [ ] Drag-reorder categories in settings → list re-sorts on save
- [ ] Hide "Pet food" category → ingredients in it appear in "Other" at the bottom
