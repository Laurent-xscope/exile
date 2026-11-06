-- ==============================================================================
-- Exile — Schema Integrity, Partial Indexes & Constraint Hardening
-- File: supabase/migrations/20261105_schema_integrity_and_indexes.sql
-- ==============================================================================

-- 1. DROP REDUNDANT INDEXES
DROP INDEX IF EXISTS public.idx_game_rooms_code; -- Redundant with UNIQUE (room_code)

-- 2. PARTIAL & COMPOSITE PERFORMANCE INDEXES
-- Optimizes listActiveRooms() query
CREATE INDEX IF NOT EXISTS idx_game_rooms_active_updated
  ON public.game_rooms (updated_at DESC)
  WHERE status != 'finished';

-- Optimizes question retrieval by quiz & order
CREATE INDEX IF NOT EXISTS idx_questions_quiz_order
  ON public.questions (quiz_id, question_order ASC);

-- Optimizes roster filtering & pending admissions
CREATE INDEX IF NOT EXISTS idx_players_room_status
  ON public.players (room_code, status);

-- 3. SUBMISSION DEDUPLICATION WITH NULL HANDLING
DROP INDEX IF EXISTS public.uniq_submissions_player_question;
-- In Postgres 15+, NULLS NOT DISTINCT ensures NULL question_id doesn't bypass uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uniq_submissions_player_question
  ON public.submissions (room_code, player_id, question_id) NULLS NOT DISTINCT;

-- 4. CHECK CONSTRAINTS FOR DATA INTEGRITY
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_game_rooms_code_format') THEN
    ALTER TABLE public.game_rooms
      ADD CONSTRAINT chk_game_rooms_code_format CHECK (room_code ~ '^[0-9]{6}$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_game_rooms_status') THEN
    ALTER TABLE public.game_rooms
      ADD CONSTRAINT chk_game_rooms_status CHECK (status IN ('waiting', 'active', 'question_active', 'showing_leaderboard', 'finished'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_players_status') THEN
    ALTER TABLE public.players
      ADD CONSTRAINT chk_players_status CHECK (status IN ('approved', 'pending', 'rejected'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_option') THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT chk_submissions_option CHECK (selected_option IN ('A', 'B', 'C', 'D'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_questions_correct_answer') THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT chk_questions_correct_answer CHECK (correct_answer IN ('A', 'B', 'C', 'D'));
  END IF;
END $$;

-- 5. AUTO-PRUNING DISTRIBUTED RATE LIMITER
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
    -- Prune expired buckets periodically (5% chance per call or windows older than 1 hour)
    IF random() < 0.05 THEN
      DELETE FROM public.rate_limit_windows
      WHERE window_start < now() - INTERVAL '1 hour';
    END IF;

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

-- 6. ATOMIC SCORE RPC ENHANCEMENT
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
        streak = CASE
            WHEN p_streak_delta < 0 THEN 0
            ELSE GREATEST(0, p.streak + p_streak_delta)
        END,
        last_seen_at = now()
    WHERE p.room_code = p_room_code
      AND p.id = p_player_id
    RETURNING p.score, p.streak;
END;
$$;
