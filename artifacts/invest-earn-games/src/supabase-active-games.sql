-- ==========================================================================
-- SUPABASE MIGRATION: ACTIVE GAMES REALTIME SYNCHRONIZATION TABLE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.active_games (
  game_name TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phase TEXT NOT NULL DEFAULT 'WAITING',
  crash_point NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
  countdown_sec INT NOT NULL DEFAULT 7,
  elapsed_ms INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.active_games ENABLE ROW LEVEL SECURITY;

-- Allow all users (both anonymous and authenticated) to read active games state
DROP POLICY IF EXISTS "Allow public read on active_games" ON public.active_games;
CREATE POLICY "Allow public read on active_games"
ON public.active_games FOR SELECT
USING (true);

-- Allow upserting / updating active game states from authorized game clients
DROP POLICY IF EXISTS "Allow public write on active_games" ON public.active_games;
CREATE POLICY "Allow public write on active_games"
ON public.active_games FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime publication so clients receive instant postgres updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'active_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_games;
  END IF;
END $$;
