-- Exile Seed Data
-- Provides baseline local development seed for biology & formative assessment simulations.

INSERT INTO public.quizzes (id, title, description, grade_level, category, cultural_theme)
VALUES (
    'e1a84f3c-5026-4d2c-9749-34b865fa7b21',
    'Struktur Sel & Metabolisme Biologi',
    'Simulasi asesmen Kurikulum Merdeka Biologi Sel & Fisiologi Fase E/F',
    'Fase E (SMA)',
    'Biologi / Sains',
    'Struktur Organel & Respirasi Seluler'
) ON CONFLICT (id) DO NOTHING;
