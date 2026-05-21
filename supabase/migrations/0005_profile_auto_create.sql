-- ===========================================================================
-- Auto-create the profile row on signup, and backfill any orphaned users
-- ===========================================================================
-- recipes.owner_id (and several other tables) reference profiles(id). The
-- /auth/callback handler used to upsert that profile, but if the upsert ever
-- failed silently (e.g. before the GRANT migration was run), the user was
-- left with an auth.users row but no profiles row — and every recipe insert
-- would fail with:
--     insert or update on table "recipes"
--     violates foreign key constraint "recipes_owner_id_fkey"
--
-- This migration moves profile creation to a database trigger on auth.users
-- so it runs atomically, before the user can hit the app. SECURITY DEFINER
-- lets the function insert into public.profiles regardless of RLS.
-- Idempotent — safe to re-run.
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lang text := coalesce(new.raw_user_meta_data->>'preferred_language', 'en');
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1),
    'Saké user'
  );
begin
  if v_lang not in ('en', 'nl', 'fr') then
    v_lang := 'en';
  end if;

  insert into public.profiles (id, display_name, preferred_language)
  values (new.id, v_name, v_lang::app_language)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any auth.users without a profile row gets one now.
insert into public.profiles (id, display_name, preferred_language)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    split_part(u.email, '@', 1),
    'Saké user'
  ),
  case
    when coalesce(u.raw_user_meta_data->>'preferred_language', 'en') in ('en', 'nl', 'fr')
      then coalesce(u.raw_user_meta_data->>'preferred_language', 'en')::app_language
    else 'en'::app_language
  end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Sanity check (will appear in the result panel)
select count(*) as profiles_total from public.profiles;
