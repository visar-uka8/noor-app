create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  ai_analysis text not null,
  created_at timestamptz not null default now()
);

create index if not exists lab_results_user_created_idx
  on public.lab_results (user_id, created_at desc);
