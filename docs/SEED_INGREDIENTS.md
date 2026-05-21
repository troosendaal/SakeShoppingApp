# Seed ingredients

Ship the app with ~200 pre-translated, pre-categorized ingredients so users don't need to type "carrot / wortel / carotte" for every basic item.

## Format

A single JSON file at `supabase/seed/ingredients.json`. The seed migration reads this and runs an `INSERT … ON CONFLICT (slug) DO NOTHING`.

```json
[
  {
    "slug": "onion-yellow",
    "emoji": "🧅",
    "name_en": "Yellow onion",
    "name_nl": "Ui",
    "name_fr": "Oignon",
    "aliases_en": ["onion", "onions", "yellow onions"],
    "aliases_nl": ["uien", "gele ui"],
    "aliases_fr": ["oignons", "oignon jaune"],
    "category_slug": "fruit_veg",
    "item_kind": "food",
    "canonical_unit_type": "count"
  },
  {
    "slug": "garlic-clove",
    "emoji": "🧄",
    "name_en": "Garlic",
    "name_nl": "Knoflook",
    "name_fr": "Ail",
    "aliases_en": ["garlic clove", "garlic cloves", "garlic bulb"],
    "aliases_nl": ["knoflookteen", "knoflookbol"],
    "aliases_fr": ["gousse d'ail", "gousses d'ail"],
    "category_slug": "fruit_veg",
    "item_kind": "food",
    "canonical_unit_type": "count"
  }
]
```

The seed loader maps `category_slug` to the actual `category_id` at insert time.

## Coverage targets

Aim for ~200 items, distributed roughly:

| category | target count |
|---|---|
| fruit_veg | 50 (most variety) |
| dairy | 15 |
| meat_fish | 20 |
| grains | 15 |
| spices | 35 (salt, pepper, full spice rack, oils, vinegars, stock cubes, sauces) |
| bread | 8 |
| drinks | 20 |
| frozen | 8 |
| snacks | 15 |
| household | 15 |
| personal_care | 10 |
| pet | 5 |
| own | 0 (left empty, fills as users add custom items) |

## Generation approach

Don't hand-write this. Use a **one-time generation script** that calls the Claude API with a prompt like:

> "Generate a JSON array of N grocery items for a multilingual shopping list. Each item needs: slug (kebab-case), emoji (single most-recognizable emoji), name in English/Dutch/French, 2-3 aliases per language, category from this list: [...], item_kind (food/household), canonical_unit_type (mass/volume/count). Output only valid JSON."

Run this in batches by category to keep responses bounded. Spot-check translations (especially FR which has gendered articles for some terms — "le" vs "la" — usually skip articles in names).

Then check the JSON into the repo under `supabase/seed/ingredients.json` and load it from a Supabase migration:

```sql
-- in supabase/migrations/<timestamp>_seed_ingredients.sql
\set seed_json `cat supabase/seed/ingredients.json`
-- ... INSERT loop using jsonb_array_elements ...
```

Or simpler — write a Node.js seed script (`scripts/seed-ingredients.ts`) that reads the JSON and calls the Supabase admin client.

## Unit type guidance

The `canonical_unit_type` determines how quantities sum on the shopping list:

- **`mass`** — anything weighed: meat, cheese, flour, butter, dry goods. Conversion within type: g ↔ kg ↔ oz ↔ lb.
- **`volume`** — anything poured: milk, oil, stock, wine. Conversion: ml ↔ L ↔ tsp ↔ tbsp ↔ cup ↔ fl_oz.
- **`count`** — whole units: eggs, onions, lemons, bell peppers, packs, bottles. No conversion.

When in doubt: if you buy it sold by weight at the store, it's mass. If sold whole, count.

## Adding new ingredients later

When a user creates a new ingredient inline (Phase 4), it gets `owner_id = auth.uid()` so it's user-scoped at first. There's no automatic promotion to "global" — that happens manually if we ever decide to do moderation. For now: user-created ingredients are private but visible to that user's collaborators when they appear on shared lists or recipes.
