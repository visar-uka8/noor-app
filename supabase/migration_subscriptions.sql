-- Subscription billing (Stripe)
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'active',
  add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.profiles.subscription_tier is 'free | familie | familie_plus';
comment on column public.profiles.subscription_status is 'active | past_due | canceled | unpaid';
