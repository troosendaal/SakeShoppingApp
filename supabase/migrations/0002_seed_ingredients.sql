-- ===========================================================================
-- Saké — Phase 3 seed (30 essential ingredients, EN/NL/FR)
-- ===========================================================================
-- Idempotent: ON CONFLICT (slug) DO NOTHING — safe to re-run.
-- Categories are looked up by slug from the categories table (must exist already).
-- ===========================================================================

insert into ingredients
  (slug, emoji, name_en, name_nl, name_fr,
   aliases_en, aliases_nl, aliases_fr,
   category_id, item_kind, canonical_unit_type)
values
  -- Fruit & Vegetables
  ('onion-yellow', '🧅', 'Yellow onion', 'Ui', 'Oignon',
    array['onion','onions','yellow onions'], array['uien','gele ui'], array['oignons','oignon jaune'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('garlic', '🧄', 'Garlic', 'Knoflook', 'Ail',
    array['garlic clove','garlic cloves','garlic bulb'], array['knoflookteen','knoflookbol'], array['gousse d''ail','gousses d''ail'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('carrot', '🥕', 'Carrot', 'Wortel', 'Carotte',
    array['carrots'], array['wortels','wortelen'], array['carottes'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('lemon', '🍋', 'Lemon', 'Citroen', 'Citron',
    array['lemons'], array['citroenen'], array['citrons'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('tomato', '🍅', 'Tomato', 'Tomaat', 'Tomate',
    array['tomatoes'], array['tomaten'], array['tomates'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('potato', '🥔', 'Potato', 'Aardappel', 'Pomme de terre',
    array['potatoes'], array['aardappels','aardappelen'], array['pommes de terre','patate','patates'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('bell-pepper', '🫑', 'Bell pepper', 'Paprika', 'Poivron',
    array['bell peppers','peppers','capsicum'], array['paprikas'], array['poivrons'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  ('avocado', '🥑', 'Avocado', 'Avocado', 'Avocat',
    array['avocados'], array['avocados'], array['avocats'],
    (select id from categories where slug = 'fruit_veg'), 'food', 'count'),

  -- Dairy
  ('milk', '🥛', 'Milk', 'Melk', 'Lait',
    array['whole milk','cow milk'], array['volle melk'], array['lait entier'],
    (select id from categories where slug = 'dairy'), 'food', 'volume'),

  ('butter', '🧈', 'Butter', 'Boter', 'Beurre',
    array['unsalted butter'], array['ongezouten boter'], array['beurre doux'],
    (select id from categories where slug = 'dairy'), 'food', 'mass'),

  ('egg', '🥚', 'Egg', 'Ei', 'Œuf',
    array['eggs'], array['eieren'], array['oeufs'],
    (select id from categories where slug = 'dairy'), 'food', 'count'),

  ('parmesan', '🧀', 'Parmesan', 'Parmezaan', 'Parmesan',
    array['parmesan cheese','parmigiano','grana padano'], array['parmezaanse kaas','parmigiano'], array['parmesan râpé'],
    (select id from categories where slug = 'dairy'), 'food', 'mass'),

  -- Meat & Fish
  ('chicken-breast', '🍗', 'Chicken breast', 'Kipfilet', 'Blanc de poulet',
    array['chicken breasts','chicken fillet'], array['kipfilets','kippenborst'], array['filets de poulet'],
    (select id from categories where slug = 'meat_fish'), 'food', 'mass'),

  ('minced-beef', '🥩', 'Minced beef', 'Rundergehakt', 'Bœuf haché',
    array['ground beef','beef mince'], array['gehakt'], array['viande hachée'],
    (select id from categories where slug = 'meat_fish'), 'food', 'mass'),

  ('salmon-fillet', '🐟', 'Salmon fillet', 'Zalmfilet', 'Filet de saumon',
    array['salmon','salmon fillets'], array['zalm','zalmfilets'], array['saumon'],
    (select id from categories where slug = 'meat_fish'), 'food', 'mass'),

  -- Grains
  ('pasta', '🍝', 'Pasta', 'Pasta', 'Pâtes',
    array['spaghetti','penne','fusilli','noodles'], array['spaghetti','penne','noedels'], array['spaghetti','penne'],
    (select id from categories where slug = 'grains'), 'food', 'mass'),

  ('rice', '🍚', 'Rice', 'Rijst', 'Riz',
    array['basmati rice','long grain rice','jasmine rice'], array['basmatirijst'], array['riz basmati','riz long'],
    (select id from categories where slug = 'grains'), 'food', 'mass'),

  ('flour', '🌾', 'Flour', 'Bloem', 'Farine',
    array['all-purpose flour','plain flour','wheat flour'], array['tarwebloem','patentbloem'], array['farine de blé','farine tout usage'],
    (select id from categories where slug = 'grains'), 'food', 'mass'),

  ('oats', '🥣', 'Oats', 'Havermout', 'Flocons d''avoine',
    array['rolled oats','oatmeal'], array['haver','haverlokken'], array['avoine'],
    (select id from categories where slug = 'grains'), 'food', 'mass'),

  -- Spices & Ingredients
  ('salt', '🧂', 'Salt', 'Zout', 'Sel',
    array['sea salt','table salt'], array['zeezout','tafelzout'], array['sel de mer','sel de table'],
    (select id from categories where slug = 'spices'), 'food', 'mass'),

  ('black-pepper', '🌶️', 'Black pepper', 'Zwarte peper', 'Poivre noir',
    array['pepper','ground pepper'], array['peper','gemalen peper'], array['poivre','poivre moulu'],
    (select id from categories where slug = 'spices'), 'food', 'mass'),

  ('olive-oil', '🫒', 'Olive oil', 'Olijfolie', 'Huile d''olive',
    array['extra virgin olive oil','evoo'], array['extra vergine olijfolie'], array['huile d''olive vierge extra'],
    (select id from categories where slug = 'spices'), 'food', 'volume'),

  ('sugar', '🍬', 'Sugar', 'Suiker', 'Sucre',
    array['white sugar','granulated sugar','caster sugar'], array['witte suiker','kristalsuiker'], array['sucre blanc','sucre en poudre'],
    (select id from categories where slug = 'spices'), 'food', 'mass'),

  ('soy-sauce', '🥢', 'Soy sauce', 'Sojasaus', 'Sauce soja',
    array['soya sauce','shoyu'], array['soja-saus'], array['sauce de soja'],
    (select id from categories where slug = 'spices'), 'food', 'volume'),

  ('mustard', '🟡', 'Mustard', 'Mosterd', 'Moutarde',
    array['dijon mustard','english mustard'], array['dijonmosterd'], array['moutarde de dijon'],
    (select id from categories where slug = 'spices'), 'food', 'volume'),

  -- Bread & Pastries
  ('bread-loaf', '🍞', 'Bread', 'Brood', 'Pain',
    array['sourdough','loaf'], array['zuurdesem','boterham'], array['pain au levain','miche'],
    (select id from categories where slug = 'bread'), 'food', 'count'),

  ('croissant', '🥐', 'Croissant', 'Croissant', 'Croissant',
    array['croissants','butter croissant'], array['croissants','boterhoorntje'], array['croissants','viennoiserie'],
    (select id from categories where slug = 'bread'), 'food', 'count'),

  -- Household
  ('toilet-paper', '🧻', 'Toilet paper', 'Toiletpapier', 'Papier toilette',
    array['tp','loo roll'], array['wc papier','toiletrol'], array['papier wc','rouleau de pq'],
    (select id from categories where slug = 'household'), 'household', 'count'),

  -- Drinks
  ('coffee', '☕', 'Coffee', 'Koffie', 'Café',
    array['ground coffee','coffee beans'], array['gemalen koffie','koffiebonen'], array['café moulu','grains de café'],
    (select id from categories where slug = 'drinks'), 'food', 'mass'),

  ('mineral-water', '💧', 'Mineral water', 'Bronwater', 'Eau minérale',
    array['water','still water','sparkling water'], array['water','spuitwater'], array['eau plate','eau gazeuse'],
    (select id from categories where slug = 'drinks'), 'food', 'volume')
on conflict (slug) do nothing;

-- Verify
select category_id, count(*) from ingredients group by category_id order by category_id;
