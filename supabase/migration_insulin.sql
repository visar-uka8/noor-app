-- Insulin medication support
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS is_insulin BOOLEAN DEFAULT false;

ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS insulin_type TEXT;

ALTER TABLE medication_confirmations
  ADD COLUMN IF NOT EXISTS insulin_units INTEGER;

-- Relax dose_time check to allow night, custom, and meal insulin slots
ALTER TABLE medication_confirmations
  DROP CONSTRAINT IF EXISTS medication_confirmations_dose_time_check;
