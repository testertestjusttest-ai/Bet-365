create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  date_of_birth date not null,
  country text not null,
  document_type text not null,
  document_url text,
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected')),
  reviewer_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.verification_requests enable row level security;
create index if not exists verification_requests_user_created_idx on public.verification_requests(user_id,created_at desc);
