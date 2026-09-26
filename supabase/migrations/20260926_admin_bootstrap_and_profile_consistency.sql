-- BETNOW365 admin bootstrap and profile consistency
-- Aligns the live database role model with the back-office application.
alter table public.profiles
  add column if not exists admin_permissions jsonb not null default '{}'::jsonb;

alter table public.profiles drop constraint if exists profiles_admin_role_check;
alter table public.profiles
  add constraint profiles_admin_role_check
  check (admin_role in ('user','support_admin','admin','main_admin'));

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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

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

alter table public.verification_requests enable row level security;

drop policy if exists "users can read own verification requests" on public.verification_requests;
create policy "users can read own verification requests"
on public.verification_requests for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users can submit own verification requests" on public.verification_requests;
create policy "users can submit own verification requests"
on public.verification_requests for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can create own verification request" on public.verification_requests;
create policy "users can create own verification request"
on public.verification_requests for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own pending verification requests" on public.verification_requests;
create policy "users can update own pending verification requests"
on public.verification_requests for update
to authenticated
using ((auth.uid() = user_id and status = 'pending') or public.is_admin())
with check ((auth.uid() = user_id and status = 'pending') or public.is_admin());

drop policy if exists "admins can update verification requests" on public.verification_requests;
create policy "admins can update verification requests"
on public.verification_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Bootstrap the project owner's already-created account as Main Admin.
insert into public.profiles (id, display_name, admin_role)
select id,
       coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email,''),'@',1)),
       'main_admin'
from auth.users
where email = 'shakib191561@gmail.com'
on conflict (id) do update set admin_role = 'main_admin';

insert into public.audit_log (actor_user_id, action, entity_type, entity_id, metadata)
select id, 'bootstrap_main_admin', 'profile', id::text,
       '{"reason":"project owner admin bootstrap"}'::jsonb
from auth.users
where email = 'shakib191561@gmail.com'
and not exists (
  select 1 from public.audit_log
  where action = 'bootstrap_main_admin' and entity_id = id::text
);
