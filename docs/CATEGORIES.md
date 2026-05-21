# Categories

13 fixed shopping categories, seeded into the `categories` table. These are NOT user-creatable. Users can only:
- reorder them (per-user via `user_category_prefs.position`)
- hide them (per-user via `user_category_prefs.is_hidden`)
- recategorize ingredients (global change via `ingredients.category_id`)

Order in the table below is the **default `default_position`** new users start with — based on a typical European supermarket walk-through (produce first, frozen near the end, pet food and personal-care last).

| # | slug | EN | NL (source) | FR | emoji |
|---|------|----|-------------|----|-------|
| 1 | `fruit_veg` | Fruit & Vegetables | Fruit & Groenten | Fruits & Légumes | 🥬 |
| 2 | `bread` | Bread & Pastries | Brood & gebak | Pain & Pâtisseries | 🥖 |
| 3 | `meat_fish` | Meat & Fish | Vlees & Vis | Viande & Poisson | 🥩 |
| 4 | `dairy` | Dairy | Zuivel | Produits laitiers | 🥛 |
| 5 | `grains` | Grains | Graanproducten | Céréales | 🌾 |
| 6 | `spices` | Spices & Ingredients | Ingrediënten & Kruiden | Épices & Ingrédients | 🧂 |
| 7 | `household` | Household | Huishouden | Ménage | 🧼 |
| 8 | `personal_care` | Personal Care & Health | Verzorging & Gezondheid | Soins & Santé | 🧴 |
| 9 | `drinks` | Drinks | Dranken | Boissons | 🥤 |
| 10 | `frozen` | Ready meals & Frozen | Gereed- en diepvriesproducten | Plats préparés & Surgelés | ❄️ |
| 11 | `snacks` | Snacks & Sweets | Snacks & Snoep | Snacks & Confiseries | 🍫 |
| 12 | `pet` | Pet food | Dierenvoeding | Nourriture pour animaux | 🐾 |
| 13 | `own` | My items | Eigen items | Mes articles | ⭐ |

## Notes

- Translations are based on Bring!'s Dutch category list (the user provided a screenshot — see context). FR was filled in with natural everyday French.
- `own` ("My items" / "Eigen items") is the catch-all bucket for new ingredients that don't fit elsewhere. The "create new ingredient" form defaults to this category if the user doesn't pick one.
- Hidden categories don't disappear from the system — items in them still show on the shopping list but in an "Other" group pinned to the bottom (with a hint linking back to the sort settings).
- Don't rename or remove any of these without a migration and clear UX for existing users.

## Routing items to categories — common mappings

When seeding the ~200 base ingredients (`SEED_INGREDIENTS.md`), use these rules of thumb:

- Fresh produce, herbs, salad bags → `fruit_veg`
- Bread, rolls, croissants, tortillas, naan → `bread`
- Fresh + cured meat, fresh fish + seafood → `meat_fish`
- Milk, butter, cheese, yogurt, cream, **eggs** → `dairy`
- Pasta, rice, flour, couscous, oats, lentils, beans (dry), quinoa → `grains`
- Salt, pepper, dried spices, sauces, vinegar, oil, stock cubes, sugar, baking powder, mustard → `spices`
- Cleaning, paper, kitchen utensils, candles, batteries → `household`
- Toothpaste, shampoo, deodorant, vitamins, OTC meds, sunscreen → `personal_care`
- Coffee, tea, juice, soda, water, beer, wine, spirits → `drinks`
- Frozen pizza, frozen fish, ice cream, ready meals → `frozen`
- Chocolate, cookies, chips, candy → `snacks`
- Dry/wet pet food, treats, litter → `pet`
- (anything genuinely unclassifiable) → `own`
