-- ==============================================================================
-- exile.org — Supabase Database Migration
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

-- ==============================================================================
-- 10. SEED DATA SCRIPT: Asesmen Muatan Lokal Bali: Basa Alus & Aksara
-- ==============================================================================

DO $$
DECLARE
    v_quiz_id UUID := 'e1a84f3c-5026-4d2c-9749-34b865fa7b21'::uuid;
    v_q1_id UUID := 'a1111111-1111-1111-1111-111111111111'::uuid;
    v_q2_id UUID := 'a2222222-2222-2222-2222-222222222222'::uuid;
    v_q3_id UUID := 'a3333333-3333-3333-3333-333333333333'::uuid;
    v_q4_id UUID := 'a4444444-4444-4444-4444-444444444444'::uuid;
    v_q5_id UUID := 'a5555555-5555-5555-5555-555555555555'::uuid;
    v_player1_id UUID := 'b1111111-1111-1111-1111-111111111111'::uuid;
    v_player2_id UUID := 'b2222222-2222-2222-2222-222222222222'::uuid;
    v_player3_id UUID := 'b3333333-3333-3333-3333-333333333333'::uuid;
    v_player4_id UUID := 'b4444444-4444-4444-4444-444444444444'::uuid;
BEGIN
    -- 10.1 Insert Pre-loaded Quiz
    INSERT INTO public.quizzes (id, title, description, grade_level, category, cultural_theme)
    VALUES (
        v_quiz_id,
        'Asesmen Muatan Lokal Bali: Basa Alus & Aksara',
        'Evaluasi pemahaman mendalam Anggah-ungguhing Basa Bali (Alus Singgih & Alus Sor), Pasang Aksara Bali Baku, serta nilai kearifan Tri Hita Karana.',
        'Fase D (SMP Kelas 7-9)',
        'Muatan Lokal Bali',
        'Pelestarian Bahasa, Aksara, dan Budi Pekerti Krama Bali'
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- 10.2 Insert Questions with Mandated 4 Options & Explicit Distractor Rationales
    -- Question 1: Anggah-ungguhing Basa (ASI vs ASO kata ganti diri)
    INSERT INTO public.questions (id, quiz_id, question_order, question_text, options, correct_answer, explanation, concept_tag, cultural_context)
    VALUES (
        v_q1_id,
        v_quiz_id,
        1,
        'Rikala mabaos majeng ring Bapak utawi Ibu Guru ring sekolah, kruna sane patut kaanggen nyihnayang raga (diri sendiri) mangda manut ring anggah-ungguhing basa inggih punika...',
        '[
            {"label": "A", "text": "Titiang", "isCorrect": true, "distractorRationale": "Kunci benar: Kruna Alus Sor (ASO) kaanggen ngasorang raga majeng ring wangsa utawi status sane kasinggihang sakadi guru."},
            {"label": "B", "text": "Icang", "isCorrect": false, "distractorRationale": "Pengecoh: Icang punika Basa Andap/Kasar sane wantah dados kaanggen majeng ring timpal sane sampun lulut raket."},
            {"label": "C", "text": "Kai", "isCorrect": false, "distractorRationale": "Pengecoh: Kai punika kruna Kasar pisan, nenten dados kaanggen ring lingkungan sekolah."},
            {"label": "D", "text": "Iraga", "isCorrect": false, "distractorRationale": "Pengecoh: Iraga punika kata ganti jamak (kita/kami), nenten tepat kaanggen nyihnayang raga pribadi tunggal majeng ring guru."}
        ]'::jsonb,
        'A',
        'Rikala mabebaosan sareng anak sane kasungkemang (guru, sang maraga suci), raga patut nganggen kruna Alus Sor (ASO) sakadi "titiang".',
        'Anggah-ungguhing Basa: Alus Sor (Kata Ganti Diri)',
        'Etika Kesantunan Bahasa di Sekolah Bali'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Question 2: Anggah-ungguhing Basa (ASI Kruna Ngandika)
    INSERT INTO public.questions (id, quiz_id, question_order, question_text, options, correct_answer, explanation, concept_tag, cultural_context)
    VALUES (
        v_q2_id,
        v_quiz_id,
        2,
        'Kruna "ngandika" ring anggah-ungguhing basa Bali kabaos ngranjing ring soroh kruna...',
        '[
            {"label": "A", "text": "Alus Singgih (ASI)", "isCorrect": true, "distractorRationale": "Kunci benar: Ngandika kaanggen ngapingitang/ngajunjung sang kasinggihang sakadi guru, sulinggih, utawi pejabat."},
            {"label": "B", "text": "Alus Sor (ASO)", "isCorrect": false, "distractorRationale": "Pengecoh: Miskonsepsi umum siswa sering menganggap ngandika adalah Alus Sor, padahal untuk Alus Sor kata yang tepat adalah matur atau nguningayang."},
            {"label": "C", "text": "Alus Madia (AMA)", "isCorrect": false, "distractorRationale": "Pengecoh: Alus Madia adalah bentuk sopan menengah santai, bukan kruna kasinggihan formal."},
            {"label": "D", "text": "Basa Andap", "isCorrect": false, "distractorRationale": "Pengecoh: Bentuk Andap dari kata ini adalah ngomong atau munyi."}
        ]'::jsonb,
        'A',
        '"Ngandika" punika kruna Alus Singgih (ASI) sane kanggen majeng ring sang maraga utama/singgih. Yening dewek ngraga patut ngangge "matur".',
        'Anggah-ungguhing Basa: Alus Singgih (Kruna Kriya)',
        'Tata Krama Mabebaosan Adat Bali'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Question 3: Pasang Aksara Bali (Tengenan Surang)
    INSERT INTO public.questions (id, quiz_id, question_order, question_text, options, correct_answer, explanation, concept_tag, cultural_context)
    VALUES (
        v_q3_id,
        v_quiz_id,
        3,
        'Tengenan "r" ring pungkur kruna "pasar" yening kasurat ring Pasang Aksara Bali patut nganggen...',
        '[
            {"label": "A", "text": "Surang", "isCorrect": true, "distractorRationale": "Kunci benar: Tengenan r ring tengah utawi ungkur kruna kasurat nganggen Pangangge Tengenan Surang ring duur aksara."},
            {"label": "B", "text": "Adeg-adeg ring aksara Ra", "isCorrect": false, "distractorRationale": "Pengecoh: Siswa sering keliru menggunakan adeg-adeg untuk mematikan aksara Ra, padahal uger-uger melarang adeg-adeg pada konsonan r."},
            {"label": "C", "text": "Cecek", "isCorrect": false, "distractorRationale": "Pengecoh: Cecek adalah pangangge tengenan untuk bunyi sengau ng, bukan r."},
            {"label": "D", "text": "Bisah", "isCorrect": false, "distractorRationale": "Pengecoh: Bisah adalah pangangge tengenan untuk bunyi hembusan h."}
        ]'::jsonb,
        'A',
        'Manut uger-uger pasang aksara Bali, tengenan "r" kasurat nganggen Surang. Adeg-adeg nenten dados kasurat ring aksara Ra.',
        'Pasang Aksara: Pangangge Tengenan Surang',
        'Uger-uger Pasang Aksara Pasamuan Alit'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Question 4: Pasang Aksara Bali (Pangangge Suara Suku)
    INSERT INTO public.questions (id, quiz_id, question_order, question_text, options, correct_answer, explanation, concept_tag, cultural_context)
    VALUES (
        v_q4_id,
        v_quiz_id,
        4,
        'Pangangge suara sane kaanggen ngembasang suara vokal "u" ring aksara Bali inggih punika...',
        '[
            {"label": "A", "text": "Suku", "isCorrect": true, "distractorRationale": "Kunci benar: Suku magenah ring sor aksara mangda ngasilang swara vokal u."},
            {"label": "B", "text": "Ulu", "isCorrect": false, "distractorRationale": "Pengecoh: Siswa sering tertukar antara Ulu (vokal i) dan Suku (vokal u)."},
            {"label": "C", "text": "Pepet", "isCorrect": false, "distractorRationale": "Pengecoh: Pepet digunakan untuk suara e lemah (pepet), bukan u."},
            {"label": "D", "text": "Tedung", "isCorrect": false, "distractorRationale": "Pengecoh: Tedung digunakan untuk memperpanjang vokal atau kombinasi taling tedong."}
        ]'::jsonb,
        'A',
        'Pangangge suara sane mawasta Suku magenah ring sor aksara anggen ngembasang suara "u". Ulu mangge suara "i".',
        'Pasang Aksara: Pangangge Suara Suku',
        'Pangangge Suara Baku Bali'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Question 5: Tri Hita Karana (Pawongan Gotong Royong Banjar)
    INSERT INTO public.questions (id, quiz_id, question_order, question_text, options, correct_answer, explanation, concept_tag, cultural_context)
    VALUES (
        v_q5_id,
        v_quiz_id,
        5,
        'Parilaksana gotong royong nyiagayang genah upacara piodalan sareng krama banjar punika pamargi Tri Hita Karana pahan...',
        '[
            {"label": "A", "text": "Pawongan", "isCorrect": true, "distractorRationale": "Kunci benar: Pawongan fokus ring pasawitran miwah rasa sagilik-saguluk salunglung sabayantaka sesama karma banjar."},
            {"label": "B", "text": "Parahyangan kemanten", "isCorrect": false, "distractorRationale": "Pengecoh: Walaupun tujuannya untuk piodalan pura (Parahyangan), kegiatan gotong royong antarmanusia secara sosiologis adalah pilar Pawongan."},
            {"label": "C", "text": "Palemahan", "isCorrect": false, "distractorRationale": "Pengecoh: Palemahan menyangkut hubungan manusia dengan alam lingkungan fisik."},
            {"label": "D", "text": "Sad Ripu", "isCorrect": false, "distractorRationale": "Pengecoh: Sad Ripu adalah enam musuh dalam diri manusia, bukan bagian dari Tri Hita Karana."}
        ]'::jsonb,
        'A',
        'Pawongan inggih punika pasubayan miwah rasa asah, asih, asuh ring krama banjar sane kadasarin gotong royong.',
        'Tri Hita Karana: Pawongan & Banjar Adat',
        'Sistem Kemasyarakatan Banjar Adat Bali'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 10.3 Insert Pre-loaded Demo Game Room (PIN 849201)
    INSERT INTO public.game_rooms (room_code, quiz_id, host_name, status, current_question_index, settings)
    VALUES (
        '849201',
        v_quiz_id,
        'Guru Sujana',
        'active',
        0,
        '{"timePerQuestionSec": 20, "streakBonus": true}'::jsonb
    )
    ON CONFLICT (room_code) DO UPDATE SET
        host_name = EXCLUDED.host_name,
        status = EXCLUDED.status;

    -- 10.4 Insert Demo Connected Players
    INSERT INTO public.players (id, room_code, nickname, avatar, score, streak, is_connected)
    VALUES
        (v_player1_id, '849201', 'Wayan Satria', 'garuda', 940, 2, true),
        (v_player2_id, '849201', 'Made Ayu', 'barong', 880, 1, true),
        (v_player3_id, '849201', 'Nyoman Surya', 'dragon', 790, 1, true),
        (v_player4_id, '849201', 'Ketut Lestari', 'lion', 650, 0, true)
    ON CONFLICT (room_code, nickname) DO NOTHING;

    -- 10.5 Insert Demo Submissions for Question 1
    INSERT INTO public.submissions (room_code, player_id, question_id, selected_option, is_correct, response_time_ms, score_awarded, micro_feedback)
    VALUES
        ('849201', v_player1_id, v_q1_id, 'A', true, 3200, 940, 'Bagus pisan! Kruna Alus Sor (titiang) sampun tepat kaanggen ngasorang raga majeng ring guru.'),
        ('849201', v_player2_id, v_q1_id, 'A', true, 4100, 880, 'Tepat sekali! Memilih Alus Sor untuk berbicara dengan guru.'),
        ('849201', v_player3_id, v_q1_id, 'A', true, 5500, 790, 'Tepat! Kata titiang adalah bentuk kesantunan Alus Sor.'),
        ('849201', v_player4_id, v_q1_id, 'B', false, 7200, 0, 'Kata icang adalah basa andap untuk teman sebaya, bukan untuk guru.')
    ON CONFLICT DO NOTHING;

    -- 10.6 Insert Pre-loaded Initial Diagnostic Summary
    INSERT INTO public.class_diagnostics (room_code, quiz_id, class_mastery_rate, summary_text, cluster_analysis, recommended_reteaching, adaptive_remedial_questions)
    VALUES (
        '849201',
        v_quiz_id,
        75.00,
        'Kelas menunjukkan penguasaan sangat baik pada konsep Basa Alus Sor (75%), namun perlu penguatan pada aturan penulisan Surang dan pembedaan Pawongan.',
        '[
            {"concept": "Anggah-ungguhing Basa: Alus Singgih vs Alus Sor", "errorRate": 25, "primaryMisconception": "Tertukar antara Alus Singgih dan Basa Andap", "affectedStudentsCount": 1},
            {"concept": "Pasang Aksara: Pangangge Tengenan", "errorRate": 20, "primaryMisconception": "Siswa ragu antara Surang dan Adeg-adeg", "affectedStudentsCount": 1}
        ]'::jsonb,
        '{
            "focusConcept": "Anggah-ungguhing Basa Bali: Alus Singgih vs Alus Sor",
            "pedagogicalStrategy": "Roleplay 10 menit percakapan santun di kelas",
            "quickActionableStep": "Latihan 3 pasang kalimat: Titiang nunas (ASO) vs Guru ngandika (ASI)"
        }'::jsonb,
        '[]'::jsonb
    )
    ON CONFLICT DO NOTHING;

END $$;
