-- Onboarding checklist progress on profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{
  "profile": false,
  "medication": false,
  "lab": false,
  "family": false
}'::jsonb;
