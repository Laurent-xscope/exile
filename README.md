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
1. **Multimodal OCR & Document Ingestion**: Unggah foto buku/LKS atau lembar modul teks untuk ditransformasi secara instan menjadi 3 produk interaktif: Ringkasan & Glosarium Budaya, Flashcard 3D flippable, dan Bank Soal HOTS.
2. **AI Question & Distractor Generator**: Pembuatan soal otomatis berbasis kompetensi Kurikulum Merdeka dan muatan lokal Bali dengan kunci penjelasan pedagogis dan distractor rationale.
3. **Real-time Gamified Arena**: Ruang kuis multi-pemain (`/play/[code]`) dengan PIN 6-digit tanpa perlu login bagi siswa, tombol taktil 4-warna, countdown timer, dan leaderboard langsung.
4. **Teacher Cockpit Live Host**: Dasbor guru (`/host/[code]`) dengan kontrol pemutaran soal, visualisasi distribusi jawaban murid secara real-time, dan unmasked distractor analysis.
5. **Instant Misconception Micro-Feedback**: Penjelasan mikro instan dari model penalaran AI ketika siswa salah menjawab soal agar mereka langsung memahami kekeliruannya secara real-time.
6. **Automated Diagnostic & Remedial Engine**: Analisis agregat kelas untuk guru serta rekomendasi 3 soal remedial otomatis per siswa untuk menutup siklus belajar (*closed-loop learning*).

## Tech Stack
* **Frontend**: Next.js 16 (App Router with Partial Prerendering & Turbopack), React 19, TypeScript, Tailwind CSS v4, Framer Motion v14, Lucide Icons, Sonner Toaster, Canvas Confetti.
* **Backend & API**: Next.js Server Actions & Route Handlers, Zod Validation, In-Memory Game Room State Machine.
* **Database & Realtime**: Supabase (PostgreSQL 16, Supabase Realtime Channels, Row-Level Security).
* **AI Engine**: Google Gemini 2.5 Flash via isolated backend gateway (`callAI`) dengan in-memory LRU cache dan pedagogical deterministic fallback.
* **Deployment**: Vercel (Edge Network).

## AI Implementation
* **Model**: Gemini 2.5 Flash Multimodal via official API.
* **Input**: Foto buku ajar/LKS/PDF, tema kurikulum, jenjang pendidikan, tingkatan Basa Bali (Alus Singgih vs Alus Sor), aturan Pasang Aksara Bali, dan parameter jumlah soal.
* **Output**: Objek JSON terstruktur (Ringkasan, Glosarium Budaya, 3D Flashcards, soal pilihan ganda HOTS, opsi pengecoh, kunci jawaban, dan panduan miskonsepsi).
* **Peran**: Generator konten pembelajaran multimodal, penganalisis miskonsepsi agregat siswa, dan perancang drill remedial personal.

## Architecture / Data Flow
```
[Dokumen / Foto LKS] ──► [Gemini 2.5 Flash OCR] ──► [3-Way Output: Summary / 3D Flashcards / Quiz]
                                                                        │
[Siswa (Mobile /play)] <───► [Game Room Store / Supabase] <───► [Guru Host (/host)]
          │                                                               │
          └──► [Salah: AI Micro-Feedback]            [AI Class Diagnostic & Remedial] ◄──┘
```

## Installation / Run Instructions

```bash
# Clone repository
git clone https://github.com/Laurent-xscope/exile.git
cd exile

# Install dependencies (menggunakan Bun)
bun install

# Konfigurasi environment variables
cp .env.example .env.local

# Jalankan server pengembangan
bun run dev
```

Buka `http://localhost:3000` pada peramban Anda.

## Deployment URL
* **Production URL**: [https://exile-org.vercel.app](https://exile-org.vercel.app)
* **Mirror Domain**: [https://exile-bali.vercel.app](https://exile-bali.vercel.app)
* **GitHub Repository**: [https://github.com/Laurent-xscope/exile](https://github.com/Laurent-xscope/exile)

## Demo Account & Quick Links
* Akses demo juri telah disiapkan untuk pengujian langsung tanpa perlu registrasi ulang:
  * **Teacher Host Cockpit**: [https://exile-org.vercel.app/host/849201](https://exile-org.vercel.app/host/849201) (PIN: `849201`)
  * **Student Game Arena**: [https://exile-org.vercel.app/play](https://exile-org.vercel.app/play) (masukkan PIN `849201`)
  * **Role**: Penguji / Juri & Guru
  * **Room PIN Demo**: `849201` (dilengkapi 4 siswa simulasi dan data riwayat jawaban)

## Known Limitations & Roadmap
* Integrasi audio pengucapan Basa Bali Alus berbasis Text-to-Speech Web Audio API dialokasikan untuk tahap final.
* Sinkronisasi data ke Supabase berjalan mode asinkron hibrid (in-memory fast response + Postgres sync).

## Third-party Resources / Credits
* Next.js by Vercel
* Framer Motion by Motion Division
* Lucide React Icons
* Canvas Confetti by Kiril Vatev
* Sonner by Emil Kowalski
* Supabase Client SDK

## Team Members
* Bali DigiFest 2026 Innovation Team
