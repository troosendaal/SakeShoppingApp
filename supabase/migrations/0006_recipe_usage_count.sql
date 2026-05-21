-- ===========================================================================
-- Recipe usage counter
-- ===========================================================================
-- Track how many times each recipe has been added to a shopping list, so we
-- can surface "used N×" on the card and sort by popularity.
--
-- Semantics: monotonic counter. Every INSERT into list_recipes increments
-- the count. Upserts (changing servings on a recipe already on a list) and
-- deletes do NOT change the counter — we want "ever added" rather than
-- "currently on a list".
--
-- Idempotent — safe to re-run.
-- ===========================================================================

alter table recipes
  add column if not exists usage_count int not null default 0;

-- Backfill from existing list_recipes rows
update recipes r
set usage_count = coalesce(sub.cnt, 0)
from (
  select recipe_id, count(*)::int as cnt
  from list_recipes
  group by recipe_id
) sub
where sub.recipe_id = r.id;

-- Increment on each new list_recipes insert
create or replace function public.increment_recipe_usage_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recipes
  set usage_count = usage_count + 1
  where id = new.recipe_id;
  return new;
end;
$$;

drop trigger if exists trg_list_recipes_usage_count on list_recipes;
create trigger trg_list_recipes_usage_count
  after insert on list_recipes
  for each row execute function public.increment_recipe_usage_count();

-- Helpful index for popularity-ordered queries
create index if not exists idx_recipes_usage_count on recipes (usage_count desc);

-- Sanity check
select id, title, usage_count from recipes order by usage_count desc limit 10;
