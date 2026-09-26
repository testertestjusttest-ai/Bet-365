alter table public.verification_requests enable row level security;

drop policy if exists "users can read own verification requests" on public.verification_requests;
create policy "users can read own verification requests"
on public.verification_requests
for select
using (auth.uid() = user_id);

drop policy if exists "users can submit own verification requests" on public.verification_requests;
create policy "users can submit own verification requests"
on public.verification_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can update own pending verification requests" on public.verification_requests;
create policy "users can update own pending verification requests"
on public.verification_requests
for update
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');
