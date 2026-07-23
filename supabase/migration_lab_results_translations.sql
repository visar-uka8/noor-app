-- Cache translated lab analyses per language (DeepL).
alter table public.lab_results
  add column if not exists analysis_language text default 'de';

alter table public.lab_results
  add column if not exists analysis_translations jsonb default '{}'::jsonb;
