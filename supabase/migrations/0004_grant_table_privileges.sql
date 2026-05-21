-- ===========================================================================
-- Restore Supabase default GRANTs on the public schema
-- ===========================================================================
-- When the public schema was dropped + recreated to recover from the failed
-- initial migration, Supabase's default table/sequence/function privileges
-- were lost. RLS policies don't help if the role can't even SELECT the table
-- in the first place. This puts them back AND sets ALTER DEFAULT PRIVILEGES
-- so any future objects created in public inherit the right grants.
--
-- Safe to re-run.
-- ===========================================================================

-- Schema usage
grant usage on schema public to anon, authenticated, service_role;

-- Existing tables / sequences / functions
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Default privileges for FUTURE objects created in public
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
