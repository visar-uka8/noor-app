-- Product analytics events (run in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx
  ON analytics_events (user_id);

CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx
  ON analytics_events (event_name);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON analytics_events (created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
CREATE POLICY "Users can insert own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can read all events" ON analytics_events;
CREATE POLICY "Service role can read all events"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'service_role');

-- Admin overview (Supabase SQL Editor):
-- SELECT
--   event_name,
--   COUNT(*) AS count,
--   COUNT(DISTINCT user_id) AS unique_users,
--   MAX(created_at) AS last_occurred
-- FROM analytics_events
-- GROUP BY event_name
-- ORDER BY count DESC;
