-- ===========================================================================
-- Re-base recipe usage_count on meal_plan_entries
-- ===========================================================================
-- Previously usage_count was driven by an AFTER INSERT trigger on
-- list_recipes. That doesn't fit the "every meal-plan add/remove changes
-- the counter" semantics we want now:
--   • auto-sync from the planner often UPDATEs list_recipes (no INSERT, no
--     trigger fire) so adding a meal whose recipe is already on the list
--     wouldn't bump the count.
--   • removing a meal plan entry never decremented.
--
-- New rule: usage_count = number of meal_plan_entries currently referencing
-- the recipe (per-user, summed). INSERT bumps +1, DELETE drops -1, with a
-- floor at 0 in case of weird state.
-- ===========================================================================

-- 1. Remove the old list_recipes-based trigger + helper function.
drop trigger if exists trg_list_recipes_usage_count on list_recipes;
drop function if exists public.increment_recipe_usage_count();

-- 2. New unified bump function — handles INSERT and DELETE.
create or replace function public.bump_recipe_usage_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.recipes
    set usage_count = usage_count + 1
    where id = new.recipe_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.recipes
    set usage_count = greatest(0, usage_count - 1)
    where id = old.recipe_id;
    return old;
  end if;
  return null;
end;
$$;

-- 3. Wire the triggers on meal_plan_entries.
drop trigger if exists trg_meal_plan_entries_usage_count_ins on meal_plan_entries;
create trigger trg_meal_plan_entries_usage_count_ins
  after insert on meal_plan_entries
  for each row execute function public.bump_recipe_usage_count();

drop trigger if exists trg_meal_plan_entries_usage_count_del on meal_plan_entries;
create trigger trg_meal_plan_entries_usage_count_del
  after delete on meal_plan_entries
  for each row execute function public.bump_recipe_usage_count();

-- 4. Backfill: recompute every recipe's usage_count from current
--    meal_plan_entries. This wipes the old "ever added to a shopping list"
--    semantic, which is fine — we're switching to a cleaner one.
update recipes r
set usage_count = coalesce(sub.cnt, 0)
from (
  select recipe_id, count(*)::int as cnt
  from meal_plan_entries
  group by recipe_id
) sub
where sub.recipe_id = r.id;

-- Reset to zero for any recipes that have no meal plan entries.
update recipes
set usage_count = 0
where id not in (select distinct recipe_id from meal_plan_entries);

-- Sanity check
select id, title, usage_count from recipes order by usage_count desc limit 10;
