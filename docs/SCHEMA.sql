-- ===========================================================================
-- Saké — Database schema (Supabase / Postgres)
-- ===========================================================================
-- Run as a single migration. Idempotent where possible. Assumes Supabase auth
-- schema is already present (auth.users exists).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type app_language as enum ('en', 'nl', 'fr');
create type unit_system as enum ('metric', 'imperial');
create type unit_type as enum ('mass', 'volume', 'count');
create type meal_category as enum ('breakfast', 'lunch', 'dinner', 'dessert', 'sweets', 'snack');
create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type item_kind as enum ('food', 'household');
create type list_status as enum ('active', 'completed', 'archived');
create type member_role as enum ('owner', 'editor');

-- ---------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  preferred_language app_language not null default 'en',
  preferred_unit_system unit_system not null default 'metric',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CATEGORIES (fixed seed, 13 rows — see CATEGORIES.md)
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_nl text not null,
  name_fr text not null,
  emoji text not null,
  default_position int not null,
  created_at timestamptz not null default now()
);

-- Per-user customization of the category list
create table user_category_prefs (
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  position int not null,
  is_hidden boolean not null default false,
  primary key (user_id, category_id)
);

-- ---------------------------------------------------------------------------
-- INGREDIENTS (canonical, multilingual)
-- ---------------------------------------------------------------------------
-- Postgres requires expressions in generated columns to be IMMUTABLE.
-- to_tsvector('simple', ...) is STABLE, so we wrap it in an immutable
-- function. 'simple'::regconfig doesn't depend on session state, so marking
-- the wrapper IMMUTABLE is safe.
create or replace function ingredients_search_tsv(
  name_en text, name_nl text, name_fr text,
  aliases_en text[], aliases_nl text[], aliases_fr text[]
) returns tsvector
language sql
immutable
parallel safe
as $$
  select to_tsvector('simple'::regconfig,
    coalesce(name_en,'') || ' ' || coalesce(name_nl,'') || ' ' || coalesce(name_fr,'') || ' ' ||
    array_to_string(coalesce(aliases_en,'{}'), ' ') || ' ' ||
    array_to_string(coalesce(aliases_nl,'{}'), ' ') || ' ' ||
    array_to_string(coalesce(aliases_fr,'{}'), ' ')
  )
$$;

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                       -- machine ID, e.g. 'onion-yellow'
  emoji text not null,
  name_en text not null,
  name_nl text not null,
  name_fr text not null,
  aliases_en text[] not null default '{}',
  aliases_nl text[] not null default '{}',
  aliases_fr text[] not null default '{}',
  category_id uuid not null references categories(id) on delete restrict,
  item_kind item_kind not null default 'food',
  canonical_unit_type unit_type not null,
  -- ownership: null = global seed, otherwise scoped to the user who created it
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- generated multilingual search column (uses the wrapper above)
  search_tsv tsvector generated always as (
    ingredients_search_tsv(name_en, name_nl, name_fr, aliases_en, aliases_nl, aliases_fr)
  ) stored
);

create index idx_ingredients_search on ingredients using gin (search_tsv);
create index idx_ingredients_category on ingredients (category_id);
create index idx_ingredients_owner on ingredients (owner_id);

-- ---------------------------------------------------------------------------
-- RECIPES
-- ---------------------------------------------------------------------------
create table recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  url text,                               -- external source URL (optional)
  instructions text,                      -- markdown
  source_language app_language not null default 'en',  -- language the recipe was authored in
  meal_category meal_category not null,
  food_tags text[] not null default '{}', -- 'pasta', 'meat', 'fish', 'veggie', ...
  base_servings int not null default 4 check (base_servings > 0),
  prep_time_min int check (prep_time_min >= 0),
  lead_time_min int check (lead_time_min >= 0),
  -- a single emoji used as the recipe's "hero" visual (no photos in v1)
  hero_emoji text not null default '🍽️',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recipes_owner on recipes (owner_id);
create index idx_recipes_meal_category on recipes (meal_category);
create index idx_recipes_food_tags on recipes using gin (food_tags);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null,                     -- 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'whole', 'pinch', etc.
  is_optional boolean not null default false,
  position int not null default 0,
  notes text,                             -- e.g. "finely chopped"
  created_at timestamptz not null default now(),
  unique (recipe_id, ingredient_id, unit)
);

create index idx_recipe_ingredients_recipe on recipe_ingredients (recipe_id);
create index idx_recipe_ingredients_ingredient on recipe_ingredients (ingredient_id);

-- ---------------------------------------------------------------------------
-- SHOPPING LISTS
-- ---------------------------------------------------------------------------
create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Shopping list',
  status list_status not null default 'active',
  completed_at timestamptz,
  source_meal_plan_id uuid,               -- FK added below after meal_plans is created
  source_list_id uuid references shopping_lists(id) on delete set null,  -- "duplicated from"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shopping_lists_owner_status on shopping_lists (owner_id, status);

create table list_recipes (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete restrict,
  servings int not null check (servings > 0),    -- the user's desired servings, may differ from recipe.base_servings
  added_at timestamptz not null default now(),
  unique (list_id, recipe_id)
);

create index idx_list_recipes_list on list_recipes (list_id);

create table list_adhoc_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(10,3) not null check (quantity > 0),
  unit text not null,
  added_by uuid references profiles(id),
  added_at timestamptz not null default now()
);

create index idx_list_adhoc_list on list_adhoc_items (list_id);

-- Per-merged-row state (notes, urgent, checked, qty override).
-- A "line" is identified by (list_id, ingredient_id) since the auto-sum
-- collapses contributions across recipes and ad-hoc items into one row.
create table list_line_state (
  list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  is_checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references profiles(id),
  note text check (char_length(coalesce(note,'')) <= 200),
  is_urgent boolean not null default false,
  quantity_override numeric(10,3),         -- if user manually edits qty on the list, store override here
  unit_override text,
  updated_at timestamptz not null default now(),
  primary key (list_id, ingredient_id)
);

-- Sharing
create table list_members (
  list_id uuid not null references shopping_lists(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null default 'editor',
  invited_by uuid references profiles(id),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index idx_list_members_user on list_members (user_id);

-- Optional: invite tokens for sharing via link
create table list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  token text not null unique,
  invited_email text,
  created_by uuid not null references profiles(id),
  expires_at timestamptz,
  consumed_by uuid references profiles(id),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MEAL PLANS
-- ---------------------------------------------------------------------------
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start_date date not null,           -- Monday of the week
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  date date not null,
  meal_slot meal_slot not null,
  recipe_id uuid not null references recipes(id) on delete cascade,
  servings int not null check (servings > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_meal_plan_entries_plan on meal_plan_entries (meal_plan_id);
create index idx_meal_plan_entries_date on meal_plan_entries (date);

-- now add the deferred FK on shopping_lists
alter table shopping_lists
  add constraint shopping_lists_source_meal_plan_fk
  foreign key (source_meal_plan_id) references meal_plans(id) on delete set null;

-- ---------------------------------------------------------------------------
-- TRIGGERS — keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_profiles before update on profiles
  for each row execute function touch_updated_at();
create trigger trg_touch_ingredients before update on ingredients
  for each row execute function touch_updated_at();
create trigger trg_touch_recipes before update on recipes
  for each row execute function touch_updated_at();
create trigger trg_touch_shopping_lists before update on shopping_lists
  for each row execute function touch_updated_at();
create trigger trg_touch_list_line_state before update on list_line_state
  for each row execute function touch_updated_at();
create trigger trg_touch_meal_plans before update on meal_plans
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table categories enable row level security;
alter table user_category_prefs enable row level security;
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table shopping_lists enable row level security;
alter table list_recipes enable row level security;
alter table list_adhoc_items enable row level security;
alter table list_line_state enable row level security;
alter table list_members enable row level security;
alter table list_invites enable row level security;
alter table meal_plans enable row level security;
alter table meal_plan_entries enable row level security;

-- profiles: each user reads/edits their own; everyone can read others' display_name (for collaborator UI)
create policy "own profile read" on profiles for select using (true);
create policy "own profile write" on profiles for update using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

-- categories: world-readable, no writes from clients (seeded only)
create policy "categories read" on categories for select using (true);

-- user_category_prefs: own only
create policy "own prefs all" on user_category_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ingredients: everyone can read all ingredients (canonical list).
-- writes: own-only OR global (owner_id is null is writable by anyone authenticated — we treat the list as collaborative).
create policy "ingredients read" on ingredients for select using (true);
create policy "ingredients insert" on ingredients for insert
  with check (auth.uid() is not null);
create policy "ingredients update" on ingredients for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- recipes: owner reads/writes; collaborators on a list that includes the recipe can read.
create policy "recipes own read" on recipes for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from list_recipes lr
      join list_members lm on lm.list_id = lr.list_id
      where lr.recipe_id = recipes.id and lm.user_id = auth.uid()
    )
  );
create policy "recipes own write" on recipes for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- recipe_ingredients: follows the recipe
create policy "recipe_ingredients read" on recipe_ingredients for select
  using (
    exists (select 1 from recipes r where r.id = recipe_id and (
      r.owner_id = auth.uid()
      or exists (
        select 1 from list_recipes lr
        join list_members lm on lm.list_id = lr.list_id
        where lr.recipe_id = r.id and lm.user_id = auth.uid()
      )
    ))
  );
create policy "recipe_ingredients write" on recipe_ingredients for all
  using (exists (select 1 from recipes r where r.id = recipe_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.owner_id = auth.uid()));

-- shopping_lists: owner OR member
create policy "lists read" on shopping_lists for select
  using (
    owner_id = auth.uid()
    or exists (select 1 from list_members where list_id = shopping_lists.id and user_id = auth.uid())
  );
create policy "lists insert" on shopping_lists for insert with check (owner_id = auth.uid());
create policy "lists update" on shopping_lists for update
  using (
    owner_id = auth.uid()
    or exists (select 1 from list_members where list_id = shopping_lists.id and user_id = auth.uid())
  );
create policy "lists delete" on shopping_lists for delete using (owner_id = auth.uid());

-- list_recipes, list_adhoc_items, list_line_state: anyone with list access
create policy "list_recipes all" on list_recipes for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  );

create policy "list_adhoc all" on list_adhoc_items for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  );

create policy "list_line_state all" on list_line_state for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid()
      or exists (select 1 from list_members where list_id = sl.id and user_id = auth.uid())
    ))
  );

-- list_members: members can read; owner can write
create policy "members read" on list_members for select
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and (
      sl.owner_id = auth.uid() or list_members.user_id = auth.uid()
    ))
  );
create policy "members write" on list_members for all
  using (exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid()))
  with check (exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid()));

-- list_invites: creator/owner only
create policy "invites all" on list_invites for all
  using (
    created_by = auth.uid()
    or exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  )
  with check (created_by = auth.uid());

-- meal_plans: own only
create policy "meal_plans all" on meal_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal_plan_entries all" on meal_plan_entries for all
  using (exists (select 1 from meal_plans mp where mp.id = meal_plan_id and mp.user_id = auth.uid()))
  with check (exists (select 1 from meal_plans mp where mp.id = meal_plan_id and mp.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- REALTIME — enable for the tables collaborators need to see live
-- ---------------------------------------------------------------------------
-- Run after migration:
--   alter publication supabase_realtime add table shopping_lists;
--   alter publication supabase_realtime add table list_recipes;
--   alter publication supabase_realtime add table list_adhoc_items;
--   alter publication supabase_realtime add table list_line_state;
--   alter publication supabase_realtime add table list_members;

-- ---------------------------------------------------------------------------
-- SEED — categories (run before any user-facing query)
-- See CATEGORIES.md for the full list. This is the canonical insert.
-- ---------------------------------------------------------------------------
insert into categories (slug, name_en, name_nl, name_fr, emoji, default_position) values
  ('fruit_veg',     'Fruit & Vegetables',     'Fruit & Groenten',              'Fruits & Légumes',              '🥬', 1),
  ('bread',         'Bread & Pastries',       'Brood & gebak',                 'Pain & Pâtisseries',            '🥖', 2),
  ('meat_fish',     'Meat & Fish',            'Vlees & Vis',                   'Viande & Poisson',              '🥩', 3),
  ('dairy',         'Dairy',                  'Zuivel',                        'Produits laitiers',             '🥛', 4),
  ('grains',        'Grains',                 'Graanproducten',                'Céréales',                      '🌾', 5),
  ('spices',        'Spices & Ingredients',   'Ingrediënten & Kruiden',        'Épices & Ingrédients',          '🧂', 6),
  ('household',     'Household',              'Huishouden',                    'Ménage',                        '🧼', 7),
  ('personal_care', 'Personal Care & Health', 'Verzorging & Gezondheid',       'Soins & Santé',                 '🧴', 8),
  ('drinks',        'Drinks',                 'Dranken',                       'Boissons',                      '🥤', 9),
  ('frozen',        'Ready meals & Frozen',   'Gereed- en diepvriesproducten', 'Plats préparés & Surgelés',     '❄️', 10),
  ('snacks',        'Snacks & Sweets',        'Snacks & Snoep',                'Snacks & Confiseries',          '🍫', 11),
  ('pet',           'Pet food',               'Dierenvoeding',                 'Nourriture pour animaux',       '🐾', 12),
  ('own',           'My items',               'Eigen items',                   'Mes articles',                  '⭐', 13)
on conflict (slug) do nothing;
