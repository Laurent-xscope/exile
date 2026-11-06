-- ==============================================================================
-- Exile — Auto-close Inactive Quiz Rooms
-- File: supabase/migrations/20261106_room_idle_autoclose.sql
-- ==============================================================================

-- 1. IDEMPOTENT FUNCTION TO CLOSE IDLE ROOMS (30 MINUTES INACTIVITY)
-- A room is considered inactive if:
--   - game_rooms.updated_at is older than 30 minutes, AND
--   - no player has last_seen_at within 30 minutes, AND
--   - no submission has created_at within 30 minutes.
CREATE OR REPLACE FUNCTION public.close_idle_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH idle AS (
    SELECT r.id
    FROM public.game_rooms r
    WHERE r.status != 'finished'
      AND r.updated_at < (NOW() - INTERVAL '30 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.room_code = r.room_code
          AND p.last_seen_at >= (NOW() - INTERVAL '30 minutes')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.room_code = r.room_code
          AND s.created_at >= (NOW() - INTERVAL '30 minutes')
      )
  ),
  updated AS (
    UPDATE public.game_rooms gr
    SET status = 'finished',
        updated_at = NOW()
    FROM idle
    WHERE gr.id = idle.id
    RETURNING gr.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.close_idle_rooms() TO authenticated, service_role;

-- 2. PG_CRON SCHEDULE (IF EXTENSION AND CRON SCHEMA EXIST)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'cron' AND p.proname = 'schedule'
    ) THEN
      -- Safely unschedule previous definition if present
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-idle-rooms-every-5-min') THEN
        PERFORM cron.unschedule('close-idle-rooms-every-5-min');
      END IF;

      -- Schedule every 5 minutes
      PERFORM cron.schedule(
        'close-idle-rooms-every-5-min',
        '*/5 * * * *',
        'SELECT public.close_idle_rooms();'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule omitted: %', SQLERRM;
END $$;
