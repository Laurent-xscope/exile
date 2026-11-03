# exile.org — Closed-Loop Localized Gamified Learning & AI Diagnostic Platform

> **Bali DigiFest 2026 | AI Web Innovation Challenge**  
> *Theme: BUILD WITH AI, SOLVE FOR BALI*  
> Scope: Education & Smart Information Systems + Bali Smart Society

---

## Description
**exile.org** adalah platform evaluasi formatif interaktif berbasis web yang memadukan gamifikasi real-time (seperti Wayground / Quizizz) dengan kecerdasan buatan untuk kurikulum lokal Indonesia (Kurikulum Merdeka) dan muatan budaya Bali. exile.org menutup siklus belajar (*closed-loop learning*) dengan mendeteksi miskonsepsi siswa secara otomatis dan menyajikan remedial adaptif instan.

## Problem & Target User
* **Masalah**: Sebagian besar platform asesmen modern hanya berhenti pada pemberian skor angka tanpa memberikan tindak lanjut diagnostik. Di Bali, guru menghadapi tantangan ekstra dalam membuat materi evaluasi muatan lokal (Bahasa Bali, Aksara Bali, dan Adat Budaya) yang relevan dan menarik bagi generasi digital tanpa kelelahan administratif.
* **Target User**: Guru, siswa SMP/SMA di Bali, dan komunitas pembelajar budaya lokal.

## Key Features
1. **AI Question & Distractor Generator**: Pembuatan soal otomatis berbasis kompetensi Kurikulum Merdeka dan muatan lokal Bali dengan kunci penjelasan pedagogis.
2. **Real-time Gamified Arena**: Ruang kuis multi-pemain dengan PIN 6-digit tanpa perlu login bagi siswa, animasi berbasis fisika, dan leaderboard langsung.
3. **Instant Misconception Feedback**: Penjelasan mikro instan ketika siswa salah menjawab soal agar mereka langsung memahami kekeliruannya.
4. **Automated Diagnostic & Remedial Engine**: Analisis agregat kelas untuk guru serta rekomendasi 3 soal remedial otomatis per siswa.

## Tech Stack
* **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Sonner Toaster, Canvas Confetti.
* **Backend & API**: Next.js Server Actions & Route Handlers, Zod Validation.
* **Database & Realtime**: Supabase (PostgreSQL 16, Supabase Realtime Channels, Row-Level Security).
* **AI Engine**: Google Gemini API (Official AI Studio Key) via isolated backend gateway (`callAI`) dengan fallback handling.
* **Deployment**: Vercel (Edge Network).

## AI Implementation
* **Model**: Gemini 2.5 Flash via official API.
* **Input**: Tema kurikulum, jenjang pendidikan, bahasa/aksara Bali, dan parameter jumlah soal.
* **Output**: Objek JSON terstruktur (soal, opsi pengecoh, kunci jawaban, dan panduan miskonsepsi).
* **Peran**: Generator konten pembelajaran, penganalisis miskonsepsi agregat siswa, dan perancang drill remedial personal.

## Architecture / Data Flow
```
[Siswa (Mobile PIN Join)] <───► [Supabase Realtime Channel] <───► [Guru (Desktop Cockpit)]
                                           ▲
                                           │
                         [Next.js 15 App Router / Server Actions]
                                 ├──► [PostgreSQL Database]
                                 └──► [callAI() Resilient Gateway] ──► [Gemini 2.5 Flash]
```

## Installation / Run Instructions

```bash
# Clone repository
git clone https://github.com/Laurent-xscope/exile.git
cd exile

# Install dependencies (disarankan menggunakan Bun)
bun install

# Konfigurasi environment variables
cp .env.example .env.local

# Jalankan server pengembangan
bun run dev
```

Buka `http://localhost:3000` pada peramban Anda.

## Deployment URL
* **Production URL**: [https://exile-org.vercel.app](https://exile-org.vercel.app) (atau [https://hakacthon.vercel.app](https://hakacthon.vercel.app))
* **GitHub Repository**: [https://github.com/Laurent-xscope/exile](https://github.com/Laurent-xscope/exile)

## Demo Account
* Akses demo juri telah disiapkan untuk pengujian langsung tanpa perlu registrasi ulang:
  * **Role**: Penguji / Juri
  * **Room PIN Demo**: `849201` (tersedia pada live demo)

## Known Limitations
* Pada tahap MVP v1.0, pemindaian soal dari foto buku fisik (OCR multimodal) dialokasikan untuk tahap pengembangan lanjutan (Tahap 2 / Final).
* Integrasi audio pengucapan Basa Bali Alus masih menggunakan sintesis teks standar peramban.

## Third-party Resources / Credits
* Next.js by Vercel
* Framer Motion by Motion Division
* Lucide React Icons
* Canvas Confetti by Kiril Vatev
* Sonner by Emil Kowalski
* Supabase Client SDK

## Team Members
* Bali DigiFest 2026 Innovation Team
