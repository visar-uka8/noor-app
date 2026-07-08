-- Makes date_of_birth optional so registration only needs
-- name, email, and password. Run once in the Supabase SQL Editor.
alter table public.profiles alter column date_of_birth drop not null;
