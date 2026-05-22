-- ===========================================================================
-- Phase 9: sharing — re-enable member access without RLS recursion
-- ===========================================================================
-- Migration 0003 collapsed every list-side policy to owner-only because the
-- original cross-table references (recipes ↔ list_recipes ↔ list_members ↔
-- shopping_lists) created infinite recursion. This migration brings member
-- access back using SECURITY DEFINER helper functions that bypass RLS
-- internally — Postgres no longer loops because the inner query doesn't
-- re-enter the policy chain.
--
-- Adds:
--   • is_list_owner(uuid)           — owner of a given list
--   • is_list_accessible(uuid)      — owner OR member of a given list
--   • consume_list_invite(text)     — atomically validates token + inserts
--                                     list_members + marks invite consumed,
--                                     bypassing RLS (so non-owners can
--                                     accept their own invite)
-- ===========================================================================

-- 1. Helper: is the current user the owner of this list?
create or replace function public.is_list_owner(check_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.shopping_lists
    where id = check_list_id
      and owner_id = auth.uid()
  );
$$;

-- 2. Helper: can the current user see/edit this list (owner or member)?
create or replace function public.is_list_accessible(check_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.shopping_lists sl
    where sl.id = check_list_id
      and (
        sl.owner_id = auth.uid()
        or exists (
          select 1 from public.list_members lm
          where lm.list_id = sl.id and lm.user_id = auth.uid()
        )
      )
  );
$$;

-- 3. shopping_lists — owner OR member can SELECT/UPDATE; only owner deletes.
drop policy if exists "lists read" on shopping_lists;
create policy "lists read" on shopping_lists for select
  using (public.is_list_accessible(id));

drop policy if exists "lists update" on shopping_lists;
create policy "lists update" on shopping_lists for update
  using (public.is_list_accessible(id));

-- (lists insert + delete already owner-only from earlier migrations, leave
--  them alone — sharing doesn't change ownership semantics.)

-- 4. list_recipes / list_adhoc_items / list_line_state — same access rule
--    as the parent list. Members get full CRUD (editor role per spec).
drop policy if exists "list_recipes all" on list_recipes;
create policy "list_recipes all" on list_recipes for all
  using (public.is_list_accessible(list_id))
  with check (public.is_list_accessible(list_id));

drop policy if exists "list_adhoc all" on list_adhoc_items;
create policy "list_adhoc all" on list_adhoc_items for all
  using (public.is_list_accessible(list_id))
  with check (public.is_list_accessible(list_id));

drop policy if exists "list_line_state all" on list_line_state;
create policy "list_line_state all" on list_line_state for all
  using (public.is_list_accessible(list_id))
  with check (public.is_list_accessible(list_id));

-- 5. list_members — members can read their own row + others on the same
--    list; owner can manage everyone.
drop policy if exists "members read" on list_members;
create policy "members read" on list_members for select
  using (
    user_id = auth.uid()
    or public.is_list_accessible(list_id)
  );

drop policy if exists "members write" on list_members;
create policy "members write" on list_members for insert
  with check (public.is_list_owner(list_id));

drop policy if exists "list_members delete" on list_members;
create policy "list_members delete" on list_members for delete
  using (
    user_id = auth.uid()           -- leaving on my own
    or public.is_list_owner(list_id) -- owner kicking
  );

-- 6. recipes — collaborators on a list that contains the recipe can SELECT.
drop policy if exists "recipes own read" on recipes;
create policy "recipes own read" on recipes for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.list_recipes lr
      where lr.recipe_id = recipes.id
        and public.is_list_accessible(lr.list_id)
    )
  );

-- 7. recipe_ingredients — follows the recipe.
drop policy if exists "recipe_ingredients read" on recipe_ingredients;
create policy "recipe_ingredients read" on recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          r.owner_id = auth.uid()
          or exists (
            select 1 from public.list_recipes lr
            where lr.recipe_id = r.id
              and public.is_list_accessible(lr.list_id)
          )
        )
    )
  );

-- 8. list_invites — owner of the list can manage invites for it.
drop policy if exists "invites all" on list_invites;
create policy "invites read" on list_invites for select
  using (public.is_list_owner(list_id) or created_by = auth.uid());
create policy "invites insert" on list_invites for insert
  with check (public.is_list_owner(list_id) and created_by = auth.uid());
create policy "invites delete" on list_invites for delete
  using (public.is_list_owner(list_id));

-- 9. RPC: consume_list_invite(token) — the only path a non-owner has to
--    insert themselves into list_members. Runs as the function owner so
--    the SELECT-then-INSERT is atomic and bypasses RLS.
create or replace function public.consume_list_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Must be signed in to accept an invite';
  end if;

  select id, list_id, created_by, consumed_by, expires_at
    into v_invite
  from public.list_invites
  where token = invite_token
  limit 1;

  if v_invite.id is null then
    raise exception 'Invite not found';
  end if;
  if v_invite.consumed_by is not null then
    raise exception 'Invite already used';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  insert into public.list_members (list_id, user_id, role, invited_by)
  values (v_invite.list_id, v_uid, 'editor'::member_role, v_invite.created_by)
  on conflict (list_id, user_id) do nothing;

  update public.list_invites
  set consumed_by = v_uid, consumed_at = now()
  where id = v_invite.id;

  return v_invite.list_id;
end;
$$;

-- Allow authenticated users to call the RPC.
grant execute on function public.consume_list_invite(text) to authenticated;

-- Sanity check: owner + member counts per list
select sl.id, sl.title,
       (select count(*) from list_members lm where lm.list_id = sl.id) as members,
       sl.owner_id = auth.uid() as is_mine
from shopping_lists sl
limit 10;
