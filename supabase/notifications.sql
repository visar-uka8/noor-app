create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);
