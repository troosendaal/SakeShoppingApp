-- ===========================================================================
-- Fix RLS infinite recursion
-- ===========================================================================
-- The original 0001_init.sql introduced a cycle:
--   recipes.read  → references list_members
--   list_members.read → references shopping_lists
--   shopping_lists.read → references list_members  (LOOP)
-- Postgres aborts queries with "infinite recursion detected in policy for
-- relation X" once it spots the cycle, which surfaces in the app as a vague
-- "Failed to load recipes" error.
--
-- For now we collapse to owner-only access on every list-side table. The
-- spec's collaborator/membership-based access will be reintroduced in
-- Phase 9 (sharing) via SECURITY DEFINER helper functions that bypass RLS
-- inside the policy bodies, which is the canonical fix.
-- ===========================================================================

-- recipes: owner only
drop policy if exists "recipes own read" on recipes;
create policy "recipes own read" on recipes for select
  using (owner_id = auth.uid());

-- recipe_ingredients: follows the recipe (recipe owner only)
drop policy if exists "recipe_ingredients read" on recipe_ingredients;
create policy "recipe_ingredients read" on recipe_ingredients for select
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and r.owner_id = auth.uid()
    )
  );

-- shopping_lists: owner only (sharing returns in Phase 9)
drop policy if exists "lists read" on shopping_lists;
create policy "lists read" on shopping_lists for select
  using (owner_id = auth.uid());

drop policy if exists "lists update" on shopping_lists;
create policy "lists update" on shopping_lists for update
  using (owner_id = auth.uid());

-- list_recipes / list_adhoc_items / list_line_state: gated by list ownership
drop policy if exists "list_recipes all" on list_recipes;
create policy "list_recipes all" on list_recipes for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  );

drop policy if exists "list_adhoc all" on list_adhoc_items;
create policy "list_adhoc all" on list_adhoc_items for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  );

drop policy if exists "list_line_state all" on list_line_state;
create policy "list_line_state all" on list_line_state for all
  using (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from shopping_lists sl where sl.id = list_id and sl.owner_id = auth.uid())
  );

-- list_members: user can read their own memberships + lists they own
-- (writes still restricted to list owner via the existing "members write" policy)
drop policy if exists "members read" on list_members;
create policy "members read" on list_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from shopping_lists sl
      where sl.id = list_id and sl.owner_id = auth.uid()
    )
  );
