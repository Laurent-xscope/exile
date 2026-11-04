"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiUploadCloud2Line,
  RiRefreshLine,
  RiUserSharedLine,
  RiCheckLine,
  RiPlayCircleLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiSparklingLine,
  RiPresentationLine,
  RiNodeTree,
  RiArticleLine,
  RiTableLine,
  RiLayoutGridLine,
  RiUserVoiceLine,
  RiBrainLine,
  RiSendPlane2Line,
  RiFireLine,
  RiLightbulbLine,
  RiCloseLine,
  RiTimeLine,
  RiShieldCheckLine,
  RiFilePdfLine,
  RiImageLine,
  RiFileTextLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { Badge } from "@/components/base/badges/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { soundEffects } from "@/lib/audio/sounds";
import { cx } from "@/utils/cx";
import type {
  DocumentAnalysis,
  SlideItem,
  MindMapNode,
  PedagogicalReport,
  DataTableData,
  InfographicData,
  StudentPovInsight,
  Question,
} from "@/lib/ai/prompts";

interface SampleModuleItem {
  id: "modul-1" | "modul-2" | "modul-3";
  title: string;
  category: string;
  text: string;
}

const SAMPLE_MODULES: SampleModuleItem[] = [
  {
    id: "modul-1",
    title: "Modul Anggah-ungguhing Basa Bali (SMP Fase D)",
    category: "Bahasa Bali",
    text: `Materi pembelajaran Basa Bali SMP Fase D: Anggah-ungguhing Basa.
Prinsip dasar kesantunan berbicara dalam masyarakat Bali adalah 'Singgihang anake lianan, andapang ragane padidi' (hormati orang lain, rendahkan diri sendiri).
Tingkatan kata terbagi menjadi:
1. Alus Singgih (ASI): Digunakan untuk meninggikan dan memuliakan orang yang dihormati seperti guru, orang tua, dan pemuka agama. Contoh: 'ngrayunan' (makan), 'ngandika' (berbicara), 'seda' (wafat). Kata Alus Singgih pantang digunakan untuk menyebut tindakan diri sendiri.
2. Alus Sor (ASO): Digunakan untuk merendahkan diri sendiri di hadapan orang terhormat. Contoh: 'neda' (makan), 'matur' (berbicara/melapor), 'padem' (meninggal).
3. Basa Andap: Bahasa percakapan netral untuk teman sebaya atau sahabat yang sudah akrab (contoh: 'madaar').
4. Basa Kasar: Bahasa yang dihindari dalam komunikasi santun di sekolah formal.`,
  },
  {
    id: "modul-2",
    title: "Pedoman Pasang Aksara Bali Baku & Aturan Adeg-adeg",
    category: "Aksara Bali",
    text: `Pedoman Pasang Aksara Bali Baku hasil Pasamuhan Agung Singaraja.
Aturan penulisan aksara mati dan gantungan:
1. Adeg-adeg (tanda pemati vokal) hanya boleh diletakkan di akhir kata atau akhir kalimat sebelum tanda carik (tanda baca titik atau koma).
2. Pantang meletakkan adeg-adeg di tengah kata atau tengah kalimat yang masih berjalan. Konsonan mati di tengah wajib menggunakan gantungan atau gempelan aksara berikutnya.
3. Pengangge suara meliputi: Tedong (vokal /a/), Ulu (vokal /i/), Suku (vokal /u/), Taleng (vokal /e/), dan Pepet (vokal /e'/).`,
  },
  {
    id: "modul-3",
    title: "Tri Hita Karana & Nilai Musyawarah Subak",
    category: "Kearifan Lokal",
    text: `Nilai-nilai luhur kearifan lokal Bali dalam sistem Subak berlandaskan Tri Hita Karana:
1. Parahyangan: Hubungan harmonis manusia dengan Ida Sang Hyang Widhi Wasa, diwujudkan melalui ritual di Pura Ulun Danu dan Pura Bedugul untuk memohon kesuburan air.
2. Pawongan: Hubungan harmonis antarsesama krama subak, diwujudkan lewat musyawarah mufakat 'sangketan subak' dalam pembagian giliran air tanpa membedakan luas sawah.
3. Palemahan: Hubungan harmonis manusia dengan alam lingkungan, diwujudkan lewat gotong royong merawat saluran irigasi dan menjaga kebersihan mata air suci.`,
  },
];

const PREHYDRATED_DOCUMENTS: Record<string, DocumentAnalysis & { quizId: string }> = {
  "modul-1": {
    quizId: "quiz-modul-1",
    title: "Modul Anggah-ungguhing Basa Bali (SMP Fase D)",
    subjectArea: "Bahasa & Sastra Bali (Kurikulum Merdeka Mulok)",
    gradeLevel: "SMP Fase D (Kelas 7-9)",
    summary: {
      overview:
        "Anggah-ungguhing Basa Bali mengatur etika berbahasa berdasarkan relasi sosial penutur dan lawan bicara. Kaidah utamanya adalah meninggikan orang yang dihormati dengan Alus Singgih (ASI) serta merendahkan diri sendiri dengan Alus Sor (ASO).",
      keyTakeaways: [
        "Prinsip 'Singgihang anake lianan, andapang ragane padidi' melarang pemakaian kruna Alus Singgih untuk menyebut diri sendiri.",
        "Kruna Alus Singgih (ASI) seperti 'ngrayunan' dan 'ngandika' khusus ditujukan kepada guru, orang tua, atau sulinggih.",
        "Kruna Alus Sor (ASO) seperti 'neda', 'matur', dan 'titiang' wajib digunakan saat merujuk tindakan atau diri sendiri di depan orang terhormat.",
        "Basa Andap digunakan secara wajar untuk percakapan akrab antarteman sebaya.",
      ],
      culturalGlossary: [
        {
          term: "Singgihang",
          meaning: "Meninggikan atau memuliakan kedudukan lawan bicara yang dihormati dengan kosakata Alus Singgih.",
          category: "Anggah-ungguhing Basa",
        },
        {
          term: "Andapang",
          meaning: "Merendahkan posisi diri sendiri secara santun di hadapan orang yang dihormati menggunakan kosakata Alus Sor.",
          category: "Anggah-ungguhing Basa",
        },
        {
          term: "Ngrayunan",
          meaning: "Makan atau bersantap (Kruna Alus Singgih), khusus untuk orang yang dihormati seperti guru atau sulinggih.",
          category: "Alus Singgih (ASI)",
        },
        {
          term: "Neda",
          meaning: "Makan (Kruna Alus Sor), digunakan untuk menyebut aktivitas makan diri sendiri ketika berbicara dengan orang terhormat.",
          category: "Alus Sor (ASO)",
        },
        {
          term: "Ngandika",
          meaning: "Berbicara atau bertitah (Kruna Alus Singgih), digunakan saat merujuk ucapan guru, orang tua, atau pemuka adat.",
          category: "Alus Singgih (ASI)",
        },
        {
          term: "Matur",
          meaning: "Berbicara atau menyampaikan laporan dengan hormat (Kruna Alus Sor), digunakan oleh diri sendiri kepada guru.",
          category: "Alus Sor (ASO)",
        },
      ],
    },
    flashcards: [
      {
        id: "fc-1",
        front: "Apa arti sesanti 'Singgihang anake lianan, andapang ragane padidi'?",
        back: "Tinggikan orang lain dengan kata Alus Singgih, dan rendahkan diri sendiri dengan kata Alus Sor.",
        tag: "Kaidah Inti",
        hint: "Prinsip dasar kesantunan bertutur",
      },
      {
        id: "fc-2",
        front: "Kruna Alus Singgih (ASI) untuk 'makan' yang ditujukan kepada Guru adalah...",
        back: "Ngrayunan",
        tag: "Alus Singgih",
        hint: "Pantang dipakai untuk diri sendiri",
      },
      {
        id: "fc-3",
        front: "Kruna Alus Sor (ASO) untuk 'makan' saat menyebut tindakan diri sendiri di depan Guru adalah...",
        back: "Neda",
        tag: "Alus Sor",
        hint: "Bentuk merendahkan diri dengan santun",
      },
      {
        id: "fc-4",
        front: "Mengapa kalimat 'Titiang sampun ngrayunan' salah dalam tata krama Bali?",
        back: "Karena 'ngrayunan' adalah Alus Singgih (memuliakan), tidak boleh digunakan untuk memuliakan diri sendiri.",
        tag: "Miskonsepsi Siswa",
        hint: "Seharusnya: 'Titiang sampun neda'",
      },
      {
        id: "fc-5",
        front: "Kapan ragam Basa Andap boleh digunakan dalam pergaulan?",
        back: "Saat berbicara dengan teman sebaya yang sudah sangat akrab atau sahabat dekat.",
        tag: "Basa Andap",
        hint: "Basa percakapan akrab",
      },
    ],
    quiz: [
      {
        id: "q-m1-1",
        questionOrder: 1,
        question:
          "Siswa berpapasan dengan Bapak Guru saat jam istirahat. Kalimat santun yang benar untuk mengabarkan bahwa siswa sudah makan adalah...",
        options: [
          {
            label: "A",
            text: "Bapak Guru, titiang sampun neda.",
            isCorrect: true,
            distractorRationale:
              "Tepat: Menggunakan 'titiang' dan kruna Alus Sor 'neda' untuk merendahkan diri sendiri di hadapan guru.",
          },
          {
            label: "B",
            text: "Bapak Guru, titiang sampun ngrayunan.",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi paling umum: 'Ngrayunan' adalah Alus Singgih untuk memuliakan orang lain, pantang dipakai untuk diri sendiri.",
          },
          {
            label: "C",
            text: "Bapak Guru, icang suba madaar.",
            isCorrect: false,
            distractorRationale:
              "Keliru: 'Icang suba madaar' adalah Basa Andap yang hanya pantas untuk teman sebaya akrab.",
          },
          {
            label: "D",
            text: "Bapak Guru, ida sampun neda.",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: 'Ida' adalah kata ganti orang ketiga yang dihormati, bukan kata ganti diri sendiri.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Dalam Anggah-ungguhing Basa Bali, tindakan makan untuk diri sendiri di hadapan guru wajib menggunakan Kruna Alus Sor 'neda', bukan 'ngrayunan'.",
        conceptTag: "Alus Sor (ASO)",
        culturalContext: "Etika Tutur Siswa kepada Guru",
      },
      {
        id: "q-m1-2",
        questionOrder: 2,
        question:
          "Ibu Guru sedek mabaos ring ajeng kelas. Kruna Alus Singgih (ASI) sane patut kaanggen ngentosin kruna 'mabaos' majeng ring Ibu Guru inggih punika...",
        options: [
          {
            label: "A",
            text: "Matur",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: 'Matur' adalah Kruna Alus Sor yang dipakai saat siswa berbicara kepada guru.",
          },
          {
            label: "B",
            text: "Ngandika",
            isCorrect: true,
            distractorRationale:
              "Tepat! 'Ngandika' adalah Kruna Alus Singgih untuk memuliakan tindakan berbicara seorang guru.",
          },
          {
            label: "C",
            text: "Ngorta",
            isCorrect: false,
            distractorRationale:
              "Keliru: 'Ngorta' merupakan Basa Andap yang bermakna mengobrol santai antarteman.",
          },
          {
            label: "D",
            text: "Mapajar",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: 'Mapajar' umumnya merujuk pada ujaran biasa dan kurang tepat dibanding 'ngandika' untuk guru.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "'Ngandika' adalah Kruna Alus Singgih untuk 'berbicara' yang ditujukan kepada sosok yang dihormati seperti guru.",
        conceptTag: "Alus Singgih (ASI)",
        culturalContext: "Komunikasi Formal di Kelas",
      },
      {
        id: "q-m1-3",
        questionOrder: 3,
        question:
          "Napi arti sesanti 'Singgihang anake lianan, andapang ragane padidi' sajeroning anggah-ungguhing basa Bali?",
        options: [
          {
            label: "A",
            text: "Gunakan kruna Alus Singgih untuk diri sendiri dan Alus Sor untuk lawan bicara.",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi terbalik: meninggikan diri sendiri dan merendahkan orang lain melanggar tata krama.",
          },
          {
            label: "B",
            text: "Tinggikan orang lain dengan Alus Singgih, dan rendahkan diri sendiri dengan Alus Sor.",
            isCorrect: true,
            distractorRationale:
              "Tepat! Inilah kaidah inti kesantunan berbahasa Bali.",
          },
          {
            label: "C",
            text: "Gunakan Basa Andap kepada semua orang tanpa membedakan situasi.",
            isCorrect: false,
            distractorRationale:
              "Keliru: situasi formal dan lawan bicara yang dihormati menuntut ragam Basa Alus.",
          },
          {
            label: "D",
            text: "Hindari penggunaan Basa Alus di lingkungan sekolah.",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: sekolah justru menjadi tempat utama pembiasaan Basa Alus.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "Sesanti ini mengingatkan agar penutur senantiasa bersikap rendah hati (andap asor) sembari memuliakan lawan tutur.",
        conceptTag: "Falsafah Anggah-ungguhing Basa",
        culturalContext: "Etika Tradisi Bali",
      },
    ],
    difficultyQuizzes: {
      easy: [
        {
          id: "diff-e-1",
          questionOrder: 1,
          question:
            "[Level 1 - Pemahaman Dasar] Apa fungsi utama kosakata Alus Singgih (ASI) dalam percakapan sehari-hari?",
          options: [
            {
              label: "A",
              text: "Memuliakan dan menghormati lawan bicara yang berstatus lebih tinggi",
              isCorrect: true,
              distractorRationale: "Tepat: Alus Singgih berfungsi memuliakan orang terhormat.",
            },
            {
              label: "B",
              text: "Menceritakan kehebatan diri sendiri di depan kelas",
              isCorrect: false,
              distractorRationale: "Keliru: Alus Singgih dilarang dipakai memuji diri sendiri.",
            },
            {
              label: "C",
              text: "Bercanda bebas dengan kawan sebaya di kantin",
              isCorrect: false,
              distractorRationale: "Keliru: Bercanda dengan teman sebaya menggunakan Basa Andap.",
            },
            {
              label: "D",
              text: "Mengabaikan tata krama formal",
              isCorrect: false,
              distractorRationale: "Pengecoh: Bertentangan dengan tujuan kesantunan.",
            },
          ],
          correctAnswer: "A",
          explanation: "Alus Singgih digunakan khusus untuk menghormati orang tua, guru, dan pemuka agama.",
          conceptTag: "Definisi Alus Singgih",
        },
        {
          id: "diff-e-2",
          questionOrder: 2,
          question:
            "[Level 1 - Kosakata] Manakah pasangan kata yang benar antara Alus Singgih (ASI) dan Alus Sor (ASO) untuk makna 'makan'?",
          options: [
            {
              label: "A",
              text: "ASI: Ngrayunan | ASO: Neda",
              isCorrect: true,
              distractorRationale: "Tepat: Ngrayunan (ASI) dan Neda (ASO).",
            },
            {
              label: "B",
              text: "ASI: Neda | ASO: Ngrayunan",
              isCorrect: false,
              distractorRationale: "Miskonsepsi terbalik: Tertukar antara ASI dan ASO.",
            },
            {
              label: "C",
              text: "ASI: Madaar | ASO: Neda",
              isCorrect: false,
              distractorRationale: "Keliru: Madaar adalah Basa Andap.",
            },
            {
              label: "D",
              text: "ASI: Ngrayunan | ASO: Madaar",
              isCorrect: false,
              distractorRationale: "Pengecoh: Madaar bukan Alus Sor.",
            },
          ],
          correctAnswer: "A",
          explanation: "Ngrayunan adalah ASI (untuk orang lain), sedangkan Neda adalah ASO (untuk diri sendiri).",
          conceptTag: "Pasangan Kruna ASI & ASO",
        },
      ],
      medium: [
        {
          id: "diff-m-1",
          questionOrder: 1,
          question:
            "[Level 2 - Penerapan] Siswa ingin menanyakan apakah Kepala Sekolah sudah hadir di ruang guru. Kalimat yang tepat adalah...",
          options: [
            {
              label: "A",
              text: "Napi Bapak Kepala Sekolah sampun rauh ring kantor?",
              isCorrect: true,
              distractorRationale: "Tepat: 'Rauh' adalah kruna Alus yang santun untuk Kepala Sekolah.",
            },
            {
              label: "B",
              text: "Napi Bapak Kepala Sekolah suba teka?",
              isCorrect: false,
              distractorRationale: "Keliru: 'Suba teka' adalah Basa Andap yang kurang sopan.",
            },
            {
              label: "C",
              text: "Bapak Kepala Sekolah titiang suba teka.",
              isCorrect: false,
              distractorRationale: "Miskonsepsi: Menggabungkan kata santun dan kata kasar secara rancu.",
            },
            {
              label: "D",
              text: "Napi Kepala Sekolah sampun neda?",
              isCorrect: false,
              distractorRationale: "Pengecoh: Salah konteks pertanyaan (neda = makan).",
            },
          ],
          correctAnswer: "A",
          explanation: "Kruna 'rauh' merupakan bentuk Alus yang menghormati kehadiran pejabat sekolah.",
          conceptTag: "Penerapan Kalimat Formal",
        },
      ],
      hard: [
        {
          id: "diff-h-1",
          questionOrder: 1,
          question:
            "[Level 3 - Analisis HOTS] Dalam drama kelas, tokoh Siswa berkata: 'Titiang jagi ngandika majeng ring krama sami'. Analisis kekeliruan fatal kalimat tersebut adalah...",
          options: [
            {
              label: "A",
              text: "Tokoh memuliakan dirinya sendiri dengan kruna ASI 'ngandika', seharusnya memakai kruna ASO 'matur'",
              isCorrect: true,
              distractorRationale:
                "Tepat: Miskonsepsi fatal siswa adalah menggunakan kruna Alus Singgih untuk ucapan diri sendiri.",
            },
            {
              label: "B",
              text: "Tokoh seharusnya tidak menggunakan kata 'titiang'",
              isCorrect: false,
              distractorRationale: "Keliru: 'Titiang' sudah benar sebagai kata ganti orang pertama santun.",
            },
            {
              label: "C",
              text: "Tokoh seharusnya berbicara dengan bahasa kasar agar lebih ekspresif",
              isCorrect: false,
              distractorRationale: "Pengecoh: Tidak relevan dengan tata krama Bali.",
            },
            {
              label: "D",
              text: "Kata 'krama' dilarang dalam pementasan drama",
              isCorrect: false,
              distractorRationale: "Keliru: Kata krama sangat lumrah dalam bahasa Bali.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Kaidah 'Singgihang anake lianan, andapang ragane padidi' melarang penutur memakai kruna ASI (ngandika) untuk perbuatannya sendiri. Kata yang tepat adalah 'matur'.",
          conceptTag: "Analisis Miskonsepsi Kritis",
        },
      ],
    },
    slideDeck: [
      {
        slideNumber: 1,
        title: "Anggah-ungguhing Basa Bali",
        bullets: [
          "Etika kesantunan berbahasa berbasis relasi sosial budaya",
          "Pedoman Kurikulum Merdeka Fase D (SMP Kelas 7-9)",
          "Menghindari jebakan miskonsepsi dalam percakapan formal",
        ],
        presenterNotes:
          "Buka sesi dengan menanyakan bagaimana siswa menyapa guru di pagi hari. Berikan contoh kontras sebelum masuk ke klasifikasi kata.",
        visualConcept: "Visual ilustrasi gapura Candi Bentar dengan tipografi minimalis kontras tinggi.",
      },
      {
        slideNumber: 2,
        title: "Kaidah 'Singgihang & Andapang'",
        bullets: [
          "Alus Singgih (ASI): Khusus meninggikan orang yang dihormati (guru, orang tua, sulinggih)",
          "Alus Sor (ASO): Khusus merendahkan diri sendiri dengan santun di depan orang terhormat",
          "Basa Andap: Bahasa netral wajar antar-sahabat akrab sebaya",
        ],
        presenterNotes:
          "Ingatkan siswa tentang jembatan keledai: 'Singgih meninggikan orang lain, Sor merendahkan diri sendiri'.",
        visualConcept: "Diagram neraca timbangan kesantunan sosial.",
      },
      {
        slideNumber: 3,
        title: "Pola Miskonsepsi Dominan di Kelas",
        bullets: [
          "Kesalahan 1: 'Titiang sampun ngrayunan' (SALAH: Memuliakan diri sendiri)",
          "Koreksi Benar: 'Titiang sampun neda' (BENAR: Merendahkan diri secara santun)",
          "Pencegahan: Cek selalu siapa subjek pelaku perbuatannya",
        ],
        presenterNotes:
          "Minta siswa berpasangan mempraktikkan koreksi ini secara lisan selama 90 detik.",
        visualConcept: "Bagan komparasi berdampingan: Merah (Salah) vs Hijau (Koreksi Sah).",
      },
      {
        slideNumber: 4,
        title: "Simulasi & Tindak Lanjut Kolaboratif",
        bullets: [
          "Uji pemahaman mandiri via Kartu Belajar 3D",
          "Tantangan kuis adaptif multiplayer dengan kode PIN kelas",
          "Diskusi refleksi studi kasus miskonsepsi",
        ],
        presenterNotes:
          "Tampilkan kode PIN ruang kuis di layar proyektor kelas agar seluruh murid bergabung serentak.",
        visualConcept: "Tampilan PIN room interaktif dengan animasi gelombang suara.",
      },
    ],
    mindMap: {
      id: "root-anggah-ungguhing",
      label: "Anggah-ungguhing Basa Bali",
      description: "Sistem tata krama dan etika tutur berbahasa Bali",
      category: "Pusat Konsep",
      children: [
        {
          id: "branch-asi",
          label: "Alus Singgih (ASI)",
          description: "Meninggikan lawan bicara terhormat",
          category: "Tingkatan Tutur",
          children: [
            {
              id: "asi-ex1",
              label: "Ngrayunan (Makan)",
              description: "Khusus untuk guru / orang tua",
              category: "Contoh Kruna",
            },
            {
              id: "asi-ex2",
              label: "Ngandika (Berbicara)",
              description: "Ucapan dari orang yang dihormati",
              category: "Contoh Kruna",
            },
          ],
        },
        {
          id: "branch-aso",
          label: "Alus Sor (ASO)",
          description: "Merendahkan diri sendiri di depan orang terhormat",
          category: "Tingkatan Tutur",
          children: [
            {
              id: "aso-ex1",
              label: "Neda (Makan)",
              description: "Untuk diri sendiri saat berbicara ke guru",
              category: "Contoh Kruna",
            },
            {
              id: "aso-ex2",
              label: "Matur (Berbicara)",
              description: "Menyampaikan laporan secara santun",
              category: "Contoh Kruna",
            },
          ],
        },
        {
          id: "branch-miskonsepsi",
          label: "Pencegahan Miskonsepsi",
          description: "Akar kesalahan yang sering terjadi pada asesmen siswa",
          category: "Diagnostik",
          children: [
            {
              id: "err-1",
              label: "Pujian Diri Sendiri",
              description: "Memakai kruna ASI untuk tindakan pribadi (SALAH)",
              category: "Jebakan Pengecoh",
            },
            {
              id: "err-2",
              label: "Tertukar Konteks Teman",
              description: "Memakai Basa Andap ke guru di ruang formal",
              category: "Jebakan Konteks",
            },
          ],
        },
      ],
    },
    report: {
      executiveSummary:
        "Modul Anggah-ungguhing Basa Bali memiliki signifikansi pedagogis tinggi dalam membangun kecerdasan emosional dan etika budaya siswa SMP. Dari analisis diagnostik, 42% siswa mengalami miskonsepsi pemakaian kata Alus Singgih pada diri sendiri.",
      coreCompetencies: [
        "Membedakan ragam kruna Alus Singgih, Alus Sor, dan Basa Andap.",
        "Menyusun kalimat percakapan santun dalam konteks formal sekolah.",
        "Menganalisis dan meluruskan kekeliruan etika tutur dalam studi kasus.",
      ],
      prerequisiteKnowledge: [
        "Kosakata dasar bahasa Bali sehari-hari.",
        "Pemahaman relasi hierarki sosial dalam adat Bali.",
        "Keterampilan membedakan subjek orang pertama, kedua, dan ketiga.",
      ],
      difficultyHotspots: [
        "Tertukarnya kata kerja makan (ngrayunan vs neda).",
        "Pemilihan kata kerja bicara (ngandika vs matur vs ngorta).",
        "Kecenderungan menerjemahkan langsung dari bahasa Indonesia tanpa mempertimbangkan rasa bahasa.",
      ],
      recommendedAction:
        "Terapkan roleplay aktif 2 menit berpasangan di awal pelajaran, dilanjutkan dengan penguatan formatif menggunakan Kuis Adaptif Exile bergradasi kesulitan.",
    },
    dataTable: {
      columns: [
        "Ragam Tingkatan Bahasa",
        "Target Penggunaan",
        "Contoh Kruna",
        "Tingkat Miskonsepsi Siswa",
        "Strategi Remedial Adaptif",
      ],
      rows: [
        {
          "Ragam Tingkatan Bahasa": "Alus Singgih (ASI)",
          "Target Penggunaan": "Guru, Sulinggih, Tokoh Adat",
          "Contoh Kruna": "Ngrayunan, Ngandika, Seda",
          "Tingkat Miskonsepsi Siswa": "42% (Sering dipakai untuk diri sendiri)",
          "Strategi Remedial Adaptif": "Drill Pembedaan Subjek Mandiri",
        },
        {
          "Ragam Tingkatan Bahasa": "Alus Sor (ASO)",
          "Target Penggunaan": "Diri Sendiri saat bicara ke orang terhormat",
          "Contoh Kruna": "Neda, Matur, Titiang",
          "Tingkat Miskonsepsi Siswa": "36% (Sering terlupakan / diganti Andap)",
          "Strategi Remedial Adaptif": "Roleplay Percakapan Sopan",
        },
        {
          "Ragam Tingkatan Bahasa": "Basa Andap",
          "Target Penggunaan": "Teman sebaya akrab",
          "Contoh Kruna": "Madaar, Ngomong, Suba",
          "Tingkat Miskonsepsi Siswa": "18% (Terbawa ke percakapan dengan guru)",
          "Strategi Remedial Adaptif": "Simulasi Konteks Formal vs Santai",
        },
      ],
    },
    infographic: {
      title: "Anggah-ungguhing Basa Bali",
      subtitle: "Panduan Cepat Kesantunan Tutur Berbasis Kurikulum Merdeka",
      centralConcept:
        "Kaidah Emas: Singgihang anake lianan (muliakan orang lain), andapang ragane padidi (rendahkan diri sendiri).",
      pillars: [
        {
          title: "Alus Singgih (ASI)",
          keyPoints: [
            "Tinggikan kedudukan guru & orang tua.",
            "Contoh: Ngrayunan, Ngandika.",
            "Pantang dipakai menyebut diri sendiri!",
          ],
          quoteOrMnemonic: "ASI = Aturan Santun Idola (Muliakan Orang Lain)",
        },
        {
          title: "Alus Sor (ASO)",
          keyPoints: [
            "Rendahkan diri dengan santun.",
            "Contoh: Neda, Matur, Titiang.",
            "Gunakan saat berbicara kepada sosok terhormat.",
          ],
          quoteOrMnemonic: "ASO = Aku Selalu Rendah Hati",
        },
        {
          title: "Basa Andap",
          keyPoints: [
            "Gunakan hanya dengan kawan akrab sebaya.",
            "Contoh: Madaar, Ngomong.",
            "Hindari dalam forum kelas formal.",
          ],
          quoteOrMnemonic: "Andap = Akrab antarteman",
        },
      ],
    },
    studentPov: {
      studentMentalModel:
        "Bagi siswa, Anggah-ungguhing Basa terasa seperti sistem aturan game yang rumit karena satu kata bahasa Indonesia (seperti 'makan') memiliki 3-4 padanan kata Bali yang berbeda tergantung siapa yang melakukannya. Siswa cemas takut dimarahi jika salah memilih kata.",
      commonPointsOfConfusion: [
        "Kenapa kalau guru yang makan disebut 'ngrayunan', tapi kalau saya yang makan disebut 'neda'?",
        "Kapan batas pasti boleh memakai bahasa santai (Andap) dengan teman sekelas?",
        "Ragu memilih jawaban di soal pilihan ganda karena semua opsi terdengar halus.",
      ],
      empatheticExplanation:
        "Tenang saja, teman-teman! Ini sama seperti aturan memakai seragam sekolah: kita memakai baju rapi saat upacara untuk menunjukkan rasa hormat, dan memakai baju santai saat bermain bola. Memakai kata 'ngrayunan' untuk guru adalah cara kita memberi respek, dan memakai 'neda' untuk diri sendiri adalah tanda kita siswa yang rendah hati dan sopan!",
      relatableAnalogy:
        "Bayangkan fitur chat di game: ada chat publik untuk semua orang (Basa Alus santun), dan ada chat party pribadi untuk teman mabar dekat (Basa Andap). Kamu tidak akan mengirim candaan party ke obrolan pengumuman resmi turnamen, bukan?",
    },
  },
};

type StudioArtifactTab =
  | "summary"
  | "flashcards"
  | "quiz"
  | "slides"
  | "mindmap"
  | "report"
  | "table"
  | "infographic";

export default function StudioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useExileSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Optional user authentication state (guests can explore freely)
  // Signed-in users get their name and persistent account data

  // Main State
  const [selectedModuleId, setSelectedModuleId] = useState<string>("modul-1");
  const [docText, setDocText] = useState(SAMPLE_MODULES[0].text);
  const [customPrompt, setCustomPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [processedDoc, setProcessedDoc] = useState<DocumentAnalysis & { quizId?: string }>(
    PREHYDRATED_DOCUMENTS["modul-1"]
  );

  // NoteBookLM + Wayground Artifact navigation
  const [activeTab, setActiveTab] = useState<StudioArtifactTab>("summary");

  // Student POV Simulator Toggle
  const [studentPovActive, setStudentPovActive] = useState<boolean>(false);

  // Adaptive Quiz Difficulty Slider (1 = Mudah, 2 = Sedang, 3 = Menantang HOTS)
  const [quizDifficulty, setQuizDifficulty] = useState<number>(2);
  const [testedAnswers, setTestedAnswers] = useState<Record<string, string>>({});
  const [showDistractorRationale, setShowDistractorRationale] = useState<boolean>(true);

  // 3D Flashcards State
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showFlashcardHint, setShowFlashcardHint] = useState<boolean>(false);

  // Slides State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"text" | "pdf" | "image">("text");

  // Room Launching State
  const [launchingRoom, setLaunchingRoom] = useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);

  // Copilot Multi-turn Context Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Halo! Saya Exile Studio Copilot. Materi Anda telah digerakkan oleh pipeline reasoning Gemini dan RAG grounded. Tanyakan apa saja tentang dokumen ini, miskonsepsi siswa, atau ide apersepsi mengajar!",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Teacher name resolution
  const teacherName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      settings.defaultNickname ||
      "Pengajar Exile"
    );
  }, [user, settings.defaultNickname]);

  // Handle URL param selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mod = params.get("module");
    if (mod && PREHYDRATED_DOCUMENTS[mod]) {
      const foundSample = SAMPLE_MODULES.find((s) => s.id === mod);
      setSelectedModuleId(mod);
      if (foundSample) setDocText(foundSample.text);
      setProcessedDoc(PREHYDRATED_DOCUMENTS[mod]);
    }
  }, []);

  // Filtered Quiz based on Difficulty Slider
  const displayedQuestions: Question[] = useMemo(() => {
    if (!processedDoc) return [];
    if (quizDifficulty === 1) {
      return (
        processedDoc.difficultyQuizzes?.easy ||
        processedDoc.quiz.slice(0, 2)
      );
    }
    if (quizDifficulty === 3) {
      return (
        processedDoc.difficultyQuizzes?.hard ||
        processedDoc.quiz.slice(0, 3)
      );
    }
    return (
      processedDoc.difficultyQuizzes?.medium ||
      processedDoc.quiz
    );
  }, [processedDoc, quizDifficulty]);

  // Sample picker handler
  const handleSelectSample = (sample: SampleModuleItem) => {
    soundEffects.playClick();
    setSelectedModuleId(sample.id);
    setDocText(sample.text);
    setUploadedFileName("");
    setUploadedFileBase64("");
    setUploadedMimeType("");
    setUploadedFileType("text");

    const pre = PREHYDRATED_DOCUMENTS[sample.id];
    if (pre) {
      setProcessedDoc(pre);
      setFlashcardIndex(0);
      setIsFlipped(false);
      setActiveSlideIndex(0);
      setTestedAnswers({});
      toast.success(`Modul "${sample.title}" dimuat ke Studio.`);
    }
  };

  // Multimodal file upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playClick();
    setUploadedFileName(file.name);
    const mime = file.type || "text/plain";
    setUploadedMimeType(mime);

    const isText =
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      mime.startsWith("text/");

    if (isText) {
      setUploadedFileType("text");
      setUploadedFileBase64("");
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = typeof event.target?.result === "string" ? event.target.result : "";
        setDocText(content);
        toast.success(`Berkas teks "${file.name}" berhasil dimuat.`);
      };
      reader.readAsText(file);
    } else {
      const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const detectedType: "pdf" | "image" = isPdf ? "pdf" : "image";
      setUploadedFileType(detectedType);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);
        if (!docText.trim()) {
          setDocText(`Lampiran ${detectedType.toUpperCase()}: ${file.name}`);
        }
        toast.success(`Berkas "${file.name}" siap dianalisis secara multimodal.`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process Document with Gemini AI Reasoning & RAG
  const handleProcessDocument = async () => {
    if (!docText.trim() && !uploadedFileBase64) {
      toast.error("Silakan masukkan teks materi atau unggah berkas (PDF/Gambar/Teks).");
      return;
    }

    setProcessing(true);
    setProcessingStep("Memeriksa masukan dokumen & konteks RAG...");
    soundEffects.playClick();

    try {
      setTimeout(() => {
        setProcessingStep("Mengaktifkan model penalaran Gemini & grounding kurikulum...");
      }, 700);

      setTimeout(() => {
        setProcessingStep("Menyusun sintesis NoteBookLM & Wayground Artifact Suite...");
      }, 1600);

      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText: docText,
          text: docText,
          userContext: customPrompt || undefined,
          customPrompt: customPrompt || undefined,
          fileName: uploadedFileName || "materi-ajar.txt",
          fileType: uploadedFileType || "text",
          fileBase64: uploadedFileBase64 || undefined,
          mimeType: uploadedMimeType || "text/plain",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses dokumen");

      const docPayload: DocumentAnalysis & { quizId?: string } =
        data.document || data.analysis;

      if (!docPayload) {
        throw new Error("Format hasil analisis dokumen tidak valid.");
      }

      setProcessedDoc(docPayload);
      setFlashcardIndex(0);
      setIsFlipped(false);
      setActiveSlideIndex(0);
      setTestedAnswers({});
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
      toast.success("Materi berhasil diproses! Seluruh artifak studio siap digunakan.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menganalisis dokumen";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setProcessingStep("");
    }
  };

  // Launch live classroom room
  const handleLaunchRoom = async () => {
    setLaunchingRoom(true);
    soundEffects.playClick();
    try {
      const questionsToUse =
        processedDoc?.quiz && processedDoc.quiz.length > 0 ? processedDoc.quiz : undefined;

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: processedDoc?.quizId,
          hostName: teacherName,
          questions: questionsToUse,
          settings: {
            timePerQuestionSec: settings.defaultQuestionTimeSec,
            streakBonus: settings.streakBonusEnabled,
            shuffleQuestions: settings.shuffleQuestions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuka ruang kelas");
      }

      setCreatedRoomCode(data.roomCode);
      confetti({ particleCount: 60, spread: 70 });
      toast.success(`Ruang kuis aktif! PIN: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal meluncurkan ruangan kuis";
      toast.error(msg);
    } finally {
      setLaunchingRoom(false);
    }
  };

  // Send Copilot Chat Message with Multi-turn Context Memory
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessageText = chatInput.trim();
    setChatInput("");
    soundEffects.playClick();

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: userMessageText },
    ];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/studio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          documentContext: docText,
          documentTitle: processedDoc?.title || "Dokumen Studio",
          currentTab: activeTab,
          studentPov: studentPovActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi asisten studio");

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Maaf, respon tidak dapat disusun." },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
      toast.error(msg);
    } finally {
      setChatLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const currentFlashcard = processedDoc?.flashcards?.[flashcardIndex];

  return (
    <div className="min-h-screen bg-background-primary-default text-text-primary selection:bg-accent-700 selection:text-white pb-16">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-border-button-default bg-background-primary-default/90 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ButtonLink
              href="/"
              variant="ghost"
              size="small"
              className="px-2 text-text-secondary hover:text-text-primary"
            >
              <RiArrowLeftLine className="size-4 mr-1" />
              <span>Beranda</span>
            </ButtonLink>
            <div className="h-4 w-px bg-separator-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-body-1-semibold tracking-tight text-text-primary">
                Exile Studio
              </span>
              <Chip variant="caption" color="purple">
                NoteBookLM + Wayground
              </Chip>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick POV Toggle in Top Bar */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                setStudentPovActive(!studentPovActive);
              }}
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption-1-medium transition-all cursor-pointer",
                studentPovActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold shadow-xs"
                  : "bg-background-secondary-default border-border-button-default text-text-secondary hover:text-text-primary"
              )}
              title="Alihkan sudut pandang antara Pengajar dan Siswa"
            >
              {studentPovActive ? (
                <>
                  <RiEyeLine className="size-3.5 text-amber-500" />
                  <span>POV: Siswa Aktif</span>
                </>
              ) : (
                <>
                  <RiUserVoiceLine className="size-3.5 text-text-secondary" />
                  <span>POV: Pengajar</span>
                </>
              )}
            </button>

            {/* Launch Room Button */}
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleLaunchRoom}
              disabled={launchingRoom}
              className="gap-1.5 shadow-sm font-semibold"
            >
              <RiPlayCircleLine className="size-4" />
              <span className="hidden sm:inline">
                {launchingRoom ? "Membuka..." : "Buka Ruang Kuis"}
              </span>
            </Button>

            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Student POV Banner Alert when active */}
        <AnimatePresence>
          {studentPovActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption-1-regular text-text-primary"
            >
              <div className="flex items-start gap-3">
                <RiEyeLine className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-700 dark:text-amber-300">
                    Mode Simulasi Sudut Pandang Siswa (Student POV Simulator)
                  </strong>
                  <span>
                    Anda sedang melihat materi dari kacamata murid: melihat analogi yang masuk akal, titik keraguan umum, dan kunci jawaban disembunyikan untuk simulasi belajar.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentPovActive(false)}
                className="text-caption-2-medium text-amber-700 dark:text-amber-300 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
              >
                Kembali ke Mode Guru
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Source Hub, Document Ingestion & Copilot Assistant           */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            {/* Source & Document Panel */}
            <div className="p-5 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2">
                  <RiUploadCloud2Line className="size-4 text-accent-700" />
                  <h3 className="text-body-1-semibold text-text-primary tracking-tight">
                    Sumber Bahan Ajar
                  </h3>
                </div>
                <Chip variant="caption" color="blue">
                  Multimodal RAG
                </Chip>
              </div>

              {/* Sample Module Chips */}
              <div className="space-y-1.5">
                <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                  Pilih Contoh Modul Kurikulum
                </span>
                <div className="flex flex-col gap-1.5">
                  {SAMPLE_MODULES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className={cx(
                        "text-left p-2.5 rounded-xl border text-caption-1-medium transition-all cursor-pointer flex items-center justify-between gap-2",
                        selectedModuleId === sample.id && !uploadedFileName
                          ? "bg-accent-500/10 border-accent-500/40 text-accent-700 dark:text-accent-300 font-semibold"
                          : "bg-background-secondary-default/50 border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                      )}
                    >
                      <span className="truncate">{sample.title}</span>
                      <span className="text-caption-2-regular text-text-tertiary shrink-0 font-mono">
                        {sample.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multimodal Upload Trigger */}
              <div className="space-y-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-border-button-default hover:border-accent-500/50 bg-background-secondary-default/30 hover:bg-background-secondary-default/60 transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-caption-1-semibold text-text-primary group-hover:text-accent-700 transition-colors">
                    <RiFilePdfLine className="size-4 text-rose-500" />
                    <RiImageLine className="size-4 text-emerald-500" />
                    <RiFileTextLine className="size-4 text-blue-500" />
                    <span>Unggah PDF / Foto Lembar Kerja / Teks</span>
                  </div>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {uploadedFileName ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Berkas terpilih: {uploadedFileName}
                      </span>
                    ) : (
                      "Tarik dan letakkan atau klik untuk memilih berkas dari perangkat"
                    )}
                  </span>
                </button>
              </div>

              {/* Direct Text Editor / Prompt Context */}
              <div className="space-y-1.5">
                <label className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                  Isi Teks Materi / Ekstraksi
                </label>
                <textarea
                  rows={4}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Ketik atau tempel teks modul pelajaran di sini..."
                  className="w-full p-3 rounded-2xl bg-background-secondary-default border border-border-button-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none font-mono text-xs"
                />
              </div>

              {/* Teacher Guidance / Custom Prompt */}
              <div className="space-y-1.5">
                <label className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                  Instruksi Khusus untuk AI (Opsional)
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Contoh: Fokuskan pada miskonsepsi Alus Sor vs Alus Singgih..."
                  className="w-full p-2.5 rounded-xl bg-background-secondary-default border border-border-button-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>

              {/* Process Button with Reasoning Feedback */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  onClick={handleProcessDocument}
                  disabled={processing}
                  className="w-full gap-2 justify-center shadow-xs font-semibold"
                >
                  <RiBrainLine className={cx("size-4", processing && "animate-spin")} />
                  <span>
                    {processing ? "Bernalar & Mengolah..." : "Proses dengan Gemini AI"}
                  </span>
                </Button>
                {processingStep && (
                  <p className="text-caption-2-regular text-text-tertiary text-center mt-2 animate-pulse font-mono">
                    {processingStep}
                  </p>
                )}
              </div>
            </div>

            {/* Studio Copilot Multi-turn Chat Panel */}
            <div className="p-5 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2">
                  <RiSparklingLine className="size-4 text-purple-500" />
                  <h4 className="text-body-2-semibold text-text-primary">
                    Studio Copilot
                  </h4>
                </div>
                <span className="text-caption-2-regular text-text-tertiary">
                  Konteks Bertahan
                </span>
              </div>

              {/* Message History */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-caption-1-regular">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cx(
                      "p-3 rounded-2xl leading-relaxed text-xs",
                      msg.role === "user"
                        ? "bg-accent-500/15 text-text-primary ml-4 border border-accent-500/20"
                        : "bg-background-secondary-default text-text-secondary mr-4 border border-border-button-default"
                    )}
                  >
                    <div className="font-semibold text-caption-2-medium text-text-tertiary mb-1">
                      {msg.role === "user" ? "Anda" : "Copilot"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="p-3 rounded-2xl bg-background-secondary-default text-text-tertiary text-xs animate-pulse">
                    Copilot sedang bernalar merujuk dokumen...
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tanyakan konsep, analogi, atau rencana ajar..."
                  className="flex-1 p-2.5 rounded-xl bg-background-secondary-default border border-border-button-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 rounded-xl bg-accent-700 hover:bg-accent-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
                  title="Kirim pertanyaan"
                >
                  <RiSendPlane2Line className="size-4" />
                </button>
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: NoteBookLM + Wayground Studio Suite (8 Artifacts)           */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* Artifact Navigation Tab Bar */}
            <div className="p-2 rounded-2xl border border-border-button-default bg-background-primary-default shadow-card flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("summary");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "summary"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiBookOpenLine className="size-4" />
                <span>Intisari</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("flashcards");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "flashcards"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiFileCopyLine className="size-4" />
                <span>Kartu 3D</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("quiz");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "quiz"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiQuestionnaireLine className="size-4" />
                <span>Kuis Adaptif</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("slides");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "slides"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiPresentationLine className="size-4" />
                <span>Slide Deck</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("mindmap");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "mindmap"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiNodeTree className="size-4" />
                <span>Mind Map</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("report");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "report"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiArticleLine className="size-4" />
                <span>Laporan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("table");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "table"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiTableLine className="size-4" />
                <span>Tabel Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("infographic");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "infographic"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiLayoutGridLine className="size-4" />
                <span>Infografis</span>
              </button>
            </div>

            {/* Artifact Content Panels with Framer Motion Entrance */}
            <motion.div
              key={activeTab + (studentPovActive ? "-student" : "-teacher")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8 shadow-card space-y-6"
            >
              {/* Document Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-separator-border pb-4">
                <div>
                  <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                    {processedDoc.subjectArea} • {processedDoc.gradeLevel}
                  </span>
                  <h2 className="text-title-2-semibold sm:text-title-1-semibold text-text-primary tracking-tight mt-1">
                    {processedDoc.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Chip variant="caption" color="blue">
                    Kurikulum Merdeka
                  </Chip>
                  {studentPovActive && (
                    <Chip variant="caption" color="yellow">
                      Simulasi Siswa
                    </Chip>
                  )}
                </div>
              </div>

              {/* ========================================================= */}
              {/* TAB 1: SUMMARY (Intisari)                                 */}
              {/* ========================================================= */}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  {/* Overview Paragraph */}
                  <div className="p-5 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-2">
                    <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                      Ringkasan Eksekutif Materi
                    </span>
                    <p className="text-body-1-regular text-text-secondary leading-relaxed">
                      {processedDoc.summary.overview}
                    </p>
                  </div>

                  {/* Student POV Insight Box (if toggled or previewed) */}
                  {processedDoc.studentPov && (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-body-2-semibold">
                        <RiLightbulbLine className="size-4" />
                        <span>Kacamata Siswa: Apa yang Mereka Rasakan?</span>
                      </div>
                      <p className="text-body-2-regular text-text-secondary leading-relaxed">
                        {processedDoc.studentPov.studentMentalModel}
                      </p>
                      <div className="pt-2 border-t border-amber-500/20">
                        <span className="text-caption-2-semibold text-amber-700 dark:text-amber-300 block mb-1">
                          Analogi Mudah Dipahami Siswa:
                        </span>
                        <p className="text-caption-1-regular text-text-secondary italic">
                          &ldquo;{processedDoc.studentPov.relatableAnalogy}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Takeaways */}
                  <div className="space-y-3">
                    <h4 className="text-title-3-semibold text-text-primary">
                      Poin-Poin Kunci (Key Takeaways)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {processedDoc.summary.keyTakeaways.map((point, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 flex items-start gap-2.5"
                        >
                          <span className="inline-flex size-5 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center shrink-0 mt-0.5 font-bold">
                            {i + 1}
                          </span>
                          <span className="text-caption-1-regular text-text-secondary leading-snug">
                            {point}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cultural Glossary */}
                  {processedDoc.summary.culturalGlossary?.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-title-3-semibold text-text-primary">
                        Glosarium Istilah & Kosakata
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {processedDoc.summary.culturalGlossary.map((item, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-body-2-semibold text-text-primary font-medium">
                                {item.term}
                              </span>
                              <Chip variant="caption" color="gray">
                                {item.category}
                              </Chip>
                            </div>
                            <p className="text-caption-2-regular text-text-secondary leading-normal">
                              {item.meaning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: 3D FLASHCARDS                                      */}
              {/* ========================================================= */}
              {activeTab === "flashcards" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-caption-1-medium text-text-secondary">
                    <span>
                      Kartu {flashcardIndex + 1} dari {processedDoc.flashcards.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFlashcardHint(!showFlashcardHint)}
                      className="text-accent-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RiLightbulbLine className="size-3.5" />
                      <span>{showFlashcardHint ? "Tutup Petunjuk" : "Lihat Petunjuk"}</span>
                    </button>
                  </div>

                  {/* 3D Flip Card Container */}
                  <div className="perspective-1000 flex justify-center py-4">
                    <motion.div
                      onClick={() => {
                        soundEffects.playClick();
                        setIsFlipped(!isFlipped);
                      }}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="w-full max-w-lg min-h-[260px] p-8 rounded-3xl border border-border-button-default bg-background-secondary-default shadow-card flex flex-col justify-between cursor-pointer select-none relative [transform-style:preserve-3d]"
                    >
                      {/* Front Side */}
                      <div
                        className={cx(
                          "space-y-4 flex flex-col justify-between h-full",
                          isFlipped && "invisible"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Chip variant="caption" color="purple">
                            {currentFlashcard?.tag || "Konsep"}
                          </Chip>
                          <span className="text-caption-2-regular text-text-tertiary">
                            Klik kartu untuk membalik
                          </span>
                        </div>
                        <h3 className="text-title-2-semibold text-text-primary text-center my-auto leading-snug">
                          {currentFlashcard?.front}
                        </h3>
                        {showFlashcardHint && currentFlashcard?.hint && (
                          <div className="p-2.5 rounded-xl bg-background-primary-default border border-border-button-default text-caption-2-regular text-amber-600 dark:text-amber-400 text-center">
                            💡 Petunjuk: {currentFlashcard.hint}
                          </div>
                        )}
                        <span className="text-caption-2-regular text-center text-text-tertiary">
                          [ Pertanyaan ]
                        </span>
                      </div>

                      {/* Back Side */}
                      <div
                        className={cx(
                          "space-y-4 flex flex-col justify-between h-full absolute inset-0 p-8 [transform:rotateY(180deg)]",
                          !isFlipped && "invisible"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Chip variant="caption" color="lime">
                            Jawaban Sahih
                          </Chip>
                          <span className="text-caption-2-regular text-text-tertiary">
                            Klik kartu untuk kembali
                          </span>
                        </div>
                        <p className="text-body-1-semibold text-text-primary text-center my-auto leading-relaxed">
                          {currentFlashcard?.back}
                        </p>
                        <span className="text-caption-2-regular text-center text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Konsep Terverifikasi
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        soundEffects.playClick();
                        setIsFlipped(false);
                        setShowFlashcardHint(false);
                        setFlashcardIndex((prev) =>
                          prev > 0 ? prev - 1 : processedDoc.flashcards.length - 1
                        );
                      }}
                      className="gap-1"
                    >
                      <RiArrowLeftLine className="size-4" />
                      <span>Sebelumnya</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        soundEffects.playClick();
                        setIsFlipped(false);
                        setShowFlashcardHint(false);
                        setFlashcardIndex((prev) =>
                          prev < processedDoc.flashcards.length - 1 ? prev + 1 : 0
                        );
                      }}
                      className="gap-1"
                    >
                      <span>Selanjutnya</span>
                      <RiArrowRightLine className="size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: QUIZ WITH DIFFICULTY SLIDER                         */}
              {/* ========================================================= */}
              {activeTab === "quiz" && (
                <div className="space-y-6">
                  {/* Interactive Difficulty Slider */}
                  <div className="p-4 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiFireLine className="size-4 text-amber-500" />
                        <span className="text-body-2-semibold text-text-primary">
                          Tingkat Kesulitan Asesmen (Difficulty Slider)
                        </span>
                      </div>
                      <Chip
                        variant="caption"
                        color={quizDifficulty === 1 ? "lime" : quizDifficulty === 2 ? "blue" : "rose"}
                      >
                        {quizDifficulty === 1
                          ? "Level 1: Mudah (Dasar)"
                          : quizDifficulty === 2
                          ? "Level 2: Sedang (Aplikasi)"
                          : "Level 3: Menantang (HOTS)"}
                      </Chip>
                    </div>

                    {/* Step Slider */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={quizDifficulty}
                        onChange={(e) => {
                          soundEffects.playClick();
                          setQuizDifficulty(Number(e.target.value));
                        }}
                        className="w-full accent-accent-700 cursor-pointer h-2 bg-border-button-default rounded-lg"
                      />
                      <div className="flex justify-between items-center gap-2 pt-1 text-caption-2-medium text-text-tertiary">
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setQuizDifficulty(1);
                          }}
                          className={cx(
                            "px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer",
                            quizDifficulty === 1
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                              : "border-border-button-default hover:bg-background-secondary-default text-text-secondary"
                          )}
                        >
                          1: Pemahaman Dasar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setQuizDifficulty(2);
                          }}
                          className={cx(
                            "px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer",
                            quizDifficulty === 2
                              ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                              : "border-border-button-default hover:bg-background-secondary-default text-text-secondary"
                          )}
                        >
                          2: Penerapan Kontekstual
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setQuizDifficulty(3);
                          }}
                          className={cx(
                            "px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer",
                            quizDifficulty === 3
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold shadow-xs"
                              : "border-border-button-default hover:bg-background-secondary-default text-text-secondary"
                          )}
                        >
                          3: Penalaran Kritis HOTS
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-4">
                    {displayedQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-6 rounded-full bg-accent-700 text-white font-mono text-xs items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <h4 className="text-body-1-semibold text-text-primary leading-snug">
                              {q.question}
                            </h4>
                          </div>
                          {q.conceptTag && (
                            <Chip variant="caption" color="gray">
                              {q.conceptTag}
                            </Chip>
                          )}
                        </div>

                        {/* 4 Interactive Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt) => {
                            const isTested = testedAnswers[q.id || String(idx)] === opt.label;
                            const isStudentPov = studentPovActive;

                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => {
                                  soundEffects.playClick();
                                  setTestedAnswers((prev) => ({
                                    ...prev,
                                    [q.id || String(idx)]: opt.label,
                                  }));
                                }}
                                className={cx(
                                  "text-left p-3 rounded-xl border text-caption-1-regular transition-all cursor-pointer flex flex-col justify-between gap-1",
                                  isTested
                                    ? opt.isCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                                      : "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-semibold"
                                    : !isStudentPov && opt.isCorrect
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-text-primary"
                                    : "bg-background-primary-default border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold">{opt.label}.</span>
                                  <span>{opt.text}</span>
                                </div>
                                {!isStudentPov && showDistractorRationale && (
                                  <span className="text-caption-2-regular text-text-tertiary mt-1 border-t border-separator-border pt-1">
                                    {opt.distractorRationale}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation & Misconception Insights */}
                        {!studentPovActive && (
                          <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default text-caption-2-regular text-text-secondary flex items-start gap-2">
                            <RiShieldCheckLine className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-text-primary block">
                                Pembahasan Pedagogis:
                              </strong>
                              <span>{q.explanation}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: SLIDE DECK                                         */}
              {/* ========================================================= */}
              {activeTab === "slides" && processedDoc.slideDeck && (
                <div className="space-y-6">
                  {/* Presentation Preview Card */}
                  <div className="p-8 rounded-3xl bg-background-secondary-default border border-border-button-default shadow-card min-h-[300px] flex flex-col justify-between space-y-6">
                    <div className="flex items-center justify-between border-b border-separator-border pb-3">
                      <span className="text-caption-2-medium text-text-tertiary font-mono">
                        SLIDE {activeSlideIndex + 1} DARI {processedDoc.slideDeck.length}
                      </span>
                      <Chip variant="caption" color="blue">
                        Presentasi Guru
                      </Chip>
                    </div>

                    <div className="space-y-4 my-auto">
                      <h3 className="text-title-1-bold text-text-primary tracking-tight">
                        {processedDoc.slideDeck[activeSlideIndex]?.title}
                      </h3>
                      <ul className="space-y-2 text-body-1-regular text-text-secondary">
                        {processedDoc.slideDeck[activeSlideIndex]?.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-accent-700 font-bold">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Presenter Notes */}
                    <div className="p-3.5 rounded-2xl bg-background-primary-default border border-border-button-default text-caption-1-regular text-text-secondary">
                      <strong className="text-caption-2-semibold text-text-primary block uppercase tracking-wider mb-1">
                        Catatan Pengajar (Presenter Notes):
                      </strong>
                      <p>{processedDoc.slideDeck[activeSlideIndex]?.presenterNotes}</p>
                    </div>
                  </div>

                  {/* Slide Stepper Controls */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      {processedDoc.slideDeck.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setActiveSlideIndex(i);
                          }}
                          className={cx(
                            "size-2.5 rounded-full transition-all cursor-pointer",
                            activeSlideIndex === i ? "bg-accent-700 w-6" : "bg-border-button-default"
                          )}
                          title={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={activeSlideIndex === 0}
                        onClick={() => {
                          soundEffects.playClick();
                          setActiveSlideIndex((prev) => Math.max(0, prev - 1));
                        }}
                      >
                        <RiArrowLeftLine className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={activeSlideIndex === processedDoc.slideDeck.length - 1}
                        onClick={() => {
                          soundEffects.playClick();
                          setActiveSlideIndex((prev) =>
                            Math.min(processedDoc.slideDeck!.length - 1, prev + 1)
                          );
                        }}
                      >
                        <RiArrowRightLine className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: MIND MAP                                           */}
              {/* ========================================================= */}
              {activeTab === "mindmap" && processedDoc.mindMap && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-background-secondary-default/50 border border-border-button-default space-y-6">
                    {/* Root Node */}
                    <div className="p-4 rounded-2xl bg-accent-700 text-white shadow-xs max-w-md mx-auto text-center space-y-1">
                      <span className="text-caption-2-medium uppercase tracking-wider opacity-80">
                        {processedDoc.mindMap.category}
                      </span>
                      <h4 className="text-title-3-bold">{processedDoc.mindMap.label}</h4>
                      <p className="text-caption-1-regular opacity-90">
                        {processedDoc.mindMap.description}
                      </p>
                    </div>

                    {/* Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      {processedDoc.mindMap.children?.map((branch) => (
                        <div
                          key={branch.id}
                          className="p-4 rounded-2xl border border-border-button-default bg-background-primary-default space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-separator-border">
                            <span className="text-body-2-semibold text-text-primary">
                              {branch.label}
                            </span>
                            <Chip variant="caption" color="blue">
                              {branch.category}
                            </Chip>
                          </div>
                          <p className="text-caption-2-regular text-text-secondary leading-relaxed">
                            {branch.description}
                          </p>

                          {/* Leaves */}
                          {branch.children && (
                            <div className="space-y-2 pt-2">
                              {branch.children.map((leaf: MindMapNode) => (
                                <div
                                  key={leaf.id}
                                  className="p-2.5 rounded-xl bg-background-secondary-default text-caption-1-regular space-y-0.5"
                                >
                                  <strong className="text-caption-2-semibold text-text-primary block">
                                    {leaf.label}
                                  </strong>
                                  <span className="text-caption-2-regular text-text-secondary block">
                                    {leaf.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: REPORT                                             */}
              {/* ========================================================= */}
              {activeTab === "report" && processedDoc.report && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-2">
                    <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider block">
                      Analisis Pedagogis Eksekutif
                    </span>
                    <p className="text-body-1-regular text-text-secondary leading-relaxed">
                      {processedDoc.report.executiveSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Core Competencies */}
                    <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
                      <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                        <RiCheckLine className="size-4 text-emerald-500" />
                        <span>Kompetensi Sasaran</span>
                      </h4>
                      <ul className="space-y-2 text-caption-1-regular text-text-secondary">
                        {processedDoc.report.coreCompetencies.map((comp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{comp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Difficulty Hotspots */}
                    <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
                      <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                        <RiFireLine className="size-4 text-rose-500" />
                        <span>Titik Kesulitan Siswa (Hotspots)</span>
                      </h4>
                      <ul className="space-y-2 text-caption-1-regular text-text-secondary">
                        {processedDoc.report.difficultyHotspots.map((spot, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{spot}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-caption-1-regular text-text-primary space-y-1">
                    <strong className="text-blue-600 dark:text-blue-400 font-semibold block">
                      Rekomendasi Tindakan di Kelas:
                    </strong>
                    <p className="text-text-secondary">{processedDoc.report.recommendedAction}</p>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 7: DATA TABLE                                         */}
              {/* ========================================================= */}
              {activeTab === "table" && processedDoc.dataTable && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border-button-default overflow-hidden bg-background-secondary-default/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-caption-1-regular">
                        <thead className="bg-background-primary-default border-b border-separator-border text-text-secondary">
                          <tr>
                            {processedDoc.dataTable.columns.map((col, i) => (
                              <th key={i} className="py-3 px-4 font-semibold text-xs">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-separator-border">
                          {processedDoc.dataTable.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-background-secondary-default/80">
                              {processedDoc.dataTable!.columns.map((col, j) => (
                                <td key={j} className="py-3 px-4 text-text-primary text-xs">
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 8: INFOGRAPHIC                                        */}
              {/* ========================================================= */}
              {activeTab === "infographic" && processedDoc.infographic && (
                <div className="space-y-6">
                  {/* Central Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-accent-700 to-accent-900 text-white shadow-card space-y-2 text-center">
                    <span className="text-caption-2-medium uppercase tracking-wider opacity-80">
                      Rangkuman Visual Esensial
                    </span>
                    <h3 className="text-title-1-bold">{processedDoc.infographic.title}</h3>
                    <p className="text-body-2-regular opacity-90 max-w-xl mx-auto">
                      {processedDoc.infographic.centralConcept}
                    </p>
                  </div>

                  {/* 3 Pillars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {processedDoc.infographic.pillars.map((pillar, i) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <h4 className="text-body-1-semibold text-text-primary">
                            {pillar.title}
                          </h4>
                          <ul className="space-y-1.5 text-caption-1-regular text-text-secondary">
                            {pillar.keyPoints.map((pt, j) => (
                              <li key={j} className="flex items-start gap-1.5">
                                <span className="text-accent-700 font-bold">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-3 border-t border-separator-border text-caption-2-semibold text-accent-700 dark:text-accent-300 italic">
                          &ldquo;{pillar.quoteOrMnemonic}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
