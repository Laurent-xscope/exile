-- ==============================================================================
-- Exile — Security hardening
-- File: supabase/migrations/20261104_security_hardening.sql
--
-- Goals:
--   1. Give every room a host capability token and every player a player token.
--   2. Prevent duplicate submissions per player/question.
--   3. Remove anonymous read/write access (answer keys, scores, submissions).
--   4. Add a distributed rate-limit window usable by server routes.
--   5. Add an atomic score update used by concurrent submissions.
--
-- The application server uses SUPABASE_SERVICE_ROLE_KEY. The anon key is only
-- used for browser authentication and must not be able to read quiz answers.
-- ==============================================================================

-- 1. CAPABILITY TOKENS
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS host_token TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS player_token TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- 2. SUBMISSION DEDUPLICATION
-- Keep the oldest row if a database already contains duplicates before the index
-- is created; otherwise the unique index would fail.
DELETE FROM public.submissions newer
USING public.submissions older
WHERE newer.room_code = older.room_code
  AND newer.player_id = older.player_id
  AND newer.question_id = older.question_id
  AND newer.created_at > older.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_submissions_player_question
  ON public.submissions (room_code, player_id, question_id);

-- 3. LOCK DOWN ROW LEVEL SECURITY
-- Drop every permissive policy created by the initial migration.
DROP POLICY IF EXISTS "Public Read Quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Public Insert Quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Public Update Quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Public Read Questions" ON public.questions;
DROP POLICY IF EXISTS "Public Insert Questions" ON public.questions;
DROP POLICY IF EXISTS "Public Update Questions" ON public.questions;
DROP POLICY IF EXISTS "Public Read Game Rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Public Insert Game Rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Public Update Game Rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Public Read Players" ON public.players;
DROP POLICY IF EXISTS "Public Insert Players" ON public.players;
DROP POLICY IF EXISTS "Public Update Players" ON public.players;
DROP POLICY IF EXISTS "Public Read Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Insert Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Read Class Diagnostics" ON public.class_diagnostics;
DROP POLICY IF EXISTS "Public Insert Class Diagnostics" ON public.class_diagnostics;
DROP POLICY IF EXISTS "Public Update Class Diagnostics" ON public.class_diagnostics;
DROP POLICY IF EXISTS "Public Update Submissions" ON public.submissions;

-- Deliberately no policies. Anonymous and authenticated Supabase clients get no
-- access; all reads/writes happen through trusted server route handlers using
-- the service-role key. Realtime postgres_changes is not used by this app.
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_diagnostics ENABLE ROW LEVEL SECURITY;

-- 4. DISTRIBUTED RATE LIMITING
CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
    bucket TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    hits INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start
  ON public.rate_limit_windows(window_start);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
    p_bucket TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_in INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_hits INTEGER;
BEGIN
    INSERT INTO public.rate_limit_windows AS r (bucket, window_start, hits)
    VALUES (p_bucket, now(), 1)
    ON CONFLICT (bucket) DO UPDATE
    SET hits = CASE
            WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                THEN 1
            ELSE r.hits + 1
        END,
        window_start = CASE
            WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                THEN now()
            ELSE r.window_start
        END
    RETURNING r.window_start, r.hits INTO v_start, v_hits;

    RETURN QUERY
    SELECT
        v_hits <= p_limit,
        GREATEST(0, p_limit - v_hits),
        GREATEST(
            1,
            CEIL(EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - now())))::INTEGER
        );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 5. ATOMIC SCORE UPDATES
CREATE OR REPLACE FUNCTION public.apply_player_score(
    p_room_code TEXT,
    p_player_id UUID,
    p_score_delta INTEGER,
    p_streak_delta INTEGER
)
RETURNS TABLE(score INTEGER, streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.players AS p
    SET score = GREATEST(0, p.score + p_score_delta),
        streak = GREATEST(0, p.streak + p_streak_delta),
        last_seen_at = now()
    WHERE p.room_code = p_room_code
      AND p.id = p_player_id
    RETURNING p.score, p.streak;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_player_score(TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_player_score(TEXT, UUID, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.apply_player_score(TEXT, UUID, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_player_score(TEXT, UUID, INTEGER, INTEGER) TO service_role;
