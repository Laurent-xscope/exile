-- ==============================================================================
-- Exile — Database Migration
-- File: supabase/migrations/20261103_init_schema.sql
-- Topic: Closed-Loop Localized Gamified Learning & AI Diagnostic Platform
-- Bali DigiFest 2026 | Kurikulum Merdeka & Muatan Lokal Bali
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE: quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    grade_level TEXT NOT NULL DEFAULT 'Fase D (SMP)',
    category TEXT NOT NULL DEFAULT 'Muatan Lokal Bali',
    cultural_theme TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLE: questions
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 options: [{label: 'A', text: '...', isCorrect: true, distractorRationale: '...'}]
    correct_answer VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D'
    explanation TEXT NOT NULL,
    concept_tag TEXT NOT NULL, -- e.g. "Anggah-ungguhing Basa: Alus Singgih"
    cultural_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLE: game_rooms
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL UNIQUE, -- 6-Digit PIN
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
    host_name TEXT NOT NULL DEFAULT 'Guru',
    status VARCHAR(30) NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'question_active', 'showing_leaderboard', 'finished'
    current_question_index INTEGER NOT NULL DEFAULT 0,
    question_start_time TIMESTAMPTZ,
    settings JSONB NOT NULL DEFAULT '{"timePerQuestionSec": 20, "streakBonus": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLE: players
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL REFERENCES public.game_rooms(room_code) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT 'garuda',
    score INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_room_player UNIQUE (room_code, nickname)
);

-- 6. TABLE: submissions
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL REFERENCES public.game_rooms(room_code) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    selected_option VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D'
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    score_awarded INTEGER NOT NULL DEFAULT 0,
    micro_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLE: class_diagnostics
CREATE TABLE IF NOT EXISTS public.class_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(6) NOT NULL REFERENCES public.game_rooms(room_code) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    class_mastery_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    summary_text TEXT,
    cluster_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_reteaching JSONB NOT NULL DEFAULT '{}'::jsonb,
    adaptive_remedial_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. INDEXES FOR HIGH-THROUGHPUT REAL-TIME ACCESS
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_code ON public.players(room_code);
CREATE INDEX IF NOT EXISTS idx_submissions_room_code ON public.submissions(room_code);
CREATE INDEX IF NOT EXISTS idx_submissions_player ON public.submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_room ON public.class_diagnostics(room_code);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies so anonymous students can join live games seamlessly without login barriers
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_diagnostics ENABLE ROW LEVEL SECURITY;

-- Quizzes RLS
CREATE POLICY "Public Read Quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Public Insert Quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Quizzes" ON public.quizzes FOR UPDATE USING (true);

-- Questions RLS
CREATE POLICY "Public Read Questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public Insert Questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Questions" ON public.questions FOR UPDATE USING (true);

-- Game Rooms RLS
CREATE POLICY "Public Read Game Rooms" ON public.game_rooms FOR SELECT USING (true);
CREATE POLICY "Public Insert Game Rooms" ON public.game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Game Rooms" ON public.game_rooms FOR UPDATE USING (true);

-- Players RLS
CREATE POLICY "Public Read Players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public Insert Players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Players" ON public.players FOR UPDATE USING (true);

-- Submissions RLS
CREATE POLICY "Public Read Submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Public Insert Submissions" ON public.submissions FOR INSERT WITH CHECK (true);

-- Class Diagnostics RLS
CREATE POLICY "Public Read Class Diagnostics" ON public.class_diagnostics FOR SELECT USING (true);
CREATE POLICY "Public Insert Class Diagnostics" ON public.class_diagnostics FOR INSERT WITH CHECK (true);
