-- BETNOW365 real-money security test plan
-- Run with Supabase CLI after applying migrations.
-- These tests are intentionally fail-closed: client roles must not mutate money state directly.

begin;

do $$
declare rls boolean;
begin
  select c.relrowsecurity into rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='wallets';
  if not coalesce(rls,false) then raise exception 'wallets RLS is disabled'; end if;
  select c.relrowsecurity into rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='wallet_ledger';
  if not coalesce(rls,false) then raise exception 'wallet_ledger RLS is disabled'; end if;
  select c.relrowsecurity into rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='bets';
  if not coalesce(rls,false) then raise exception 'bets RLS is disabled'; end if;
end $$;

do $$
declare n bigint;
begin
  select count(*) into n from information_schema.role_table_grants
  where table_schema='public' and table_name in ('wallets','wallet_ledger')
    and grantee in ('anon','authenticated')
    and privilege_type in ('INSERT','UPDATE','DELETE');
  if n > 0 then raise exception 'client mutation grants remain on wallet tables'; end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='wallet_ledger' and t.tgname='wallet_ledger_append_only'
  ) then raise exception 'wallet_ledger append-only trigger is missing'; end if;
end $$;

rollback;
