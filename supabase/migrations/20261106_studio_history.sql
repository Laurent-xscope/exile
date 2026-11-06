-- ==============================================================================
-- Exile — Studio History Storage & Sync
-- File: supabase/migrations/20261106_studio_history.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.studio_history (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.studio_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own studio history" ON public.studio_history;
CREATE POLICY "Users can select own studio history"
  ON public.studio_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own studio history" ON public.studio_history;
CREATE POLICY "Users can insert own studio history"
  ON public.studio_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own studio history" ON public.studio_history;
CREATE POLICY "Users can update own studio history"
  ON public.studio_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own studio history" ON public.studio_history;
CREATE POLICY "Users can delete own studio history"
  ON public.studio_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_studio_history_user_updated
  ON public.studio_history (user_id, updated_at DESC);
