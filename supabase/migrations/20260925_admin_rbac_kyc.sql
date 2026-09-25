-- BETNOW365 admin RBAC and KYC workflow foundation
alter table public.profiles
  add column if not exists admin_role text not null default 'user'
    check (admin_role in ('user','support_admin','admin','main_admin')),
  add column if not exists admin_permissions jsonb not null default '{}'::jsonb;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and admin_role in ('support_admin','admin','main_admin')
  );
$$;

create or replace function public.prevent_self_admin_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and (
    new.admin_role is distinct from old.admin_role or
    new.admin_permissions is distinct from old.admin_permissions
  ) then
    raise exception 'admin role changes require authorized back-office access';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_admin_rbac_guard on public.profiles;
create trigger profiles_admin_rbac_guard
before update on public.profiles
for each row execute function public.prevent_self_admin_role_change();

drop policy if exists "admins can read profiles" on public.profiles;
create policy "admins can read profiles"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.is_admin());

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_type text not null default 'identity_age',
  legal_name text,
  date_of_birth date,
  country text,
  document_type text,
  document_reference text,
  status text not null default 'pending'
    check (status in ('pending','in_review','approved','rejected','needs_more_info')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_requests_user_time_idx on public.verification_requests(user_id,created_at desc);
create index if not exists verification_requests_status_idx on public.verification_requests(status,created_at);
alter table public.verification_requests enable row level security;
drop policy if exists "users can read own verification requests" on public.verification_requests;
create policy "users can read own verification requests" on public.verification_requests
for select to authenticated using (auth.uid()=user_id or public.is_admin());
drop policy if exists "users can create own verification request" on public.verification_requests;
create policy "users can create own verification request" on public.verification_requests
for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "admins can update verification requests" on public.verification_requests;
create policy "admins can update verification requests" on public.verification_requests
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_verification_updated_at()
returns trigger language plpgsql security invoker set search_path=public
as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists verification_requests_updated_at on public.verification_requests;
create trigger verification_requests_updated_at before update on public.verification_requests
for each row execute function public.set_verification_updated_at();
