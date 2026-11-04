"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  RiBookOpenLine,
  RiFileList3Line,
  RiQuestionnaireLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiQuillPenLine,
  RiUploadCloud2Line,
  RiRefreshLine,
  RiUserSharedLine,
  RiCheckLine,
  RiSearchLine,
  RiPlayCircleLine,
  RiEyeLine,
  RiEyeOffLine,
  RiAddLine,
  RiEditLine,
  RiFileTextLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input, InputBase } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { Badge } from "@/components/base/badges/badge";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/base/table/table";
import { Spinner } from "@/components/base/spinner/spinner";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { soundEffects } from "@/lib/audio/sounds";
import { cx } from "@/utils/cx";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  tag: string;
  hint?: string;
}

interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
  distractorRationale?: string;
}

interface QuizQuestion {
  id?: string;
  questionOrder?: number;
  question: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  conceptTag?: string;
  culturalContext?: string;
}

interface CulturalTerm {
  term: string;
  meaning: string;
  category: string;
}

interface ProcessedDocument {
  title: string;
  subjectArea: string;
  gradeLevel: string;
  summary: {
    overview: string;
    keyTakeaways: string[];
    culturalGlossary: CulturalTerm[];
  };
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizId?: string;
}

interface SampleModuleItem {
  id: "modul-1" | "modul-2" | "modul-3";
  title: string;
  category: string;
  text: string;
}

const SAMPLE_DOCS: SampleModuleItem[] = [
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

const SAMPLE_PROCESSED_DOCS: Record<string, ProcessedDocument> = {
  "modul-1": {
    title: "Modul Anggah-ungguhing Basa Bali (SMP Fase D)",
    subjectArea: "Bahasa Bali",
    gradeLevel: "SMP Fase D",
    summary: {
      overview:
        "Anggah-ungguhing Basa Bali mengatur etika berbahasa berdasarkan relasi sosial penutur dan lawan bicara. Kaidah utamanya adalah meninggikan orang yang dihormati dengan Alus Singgih (ASI) serta merendahkan diri sendiri dengan Alus Sor (ASO).",
      keyTakeaways: [
        "Prinsip 'Singgihang anake lianan, andapang ragane padidi' melarang pemakaian kruna Alus Singgih untuk menyebut diri sendiri.",
        "Kruna Alus Singgih (ASI) seperti 'ngrayunan' dan 'ngandika' khusus ditujukan kepada guru, orang tua, atau sulinggih.",
        "Kruna Alus Sor (ASO) seperti 'neda', 'matur', dan 'titiang' wajib digunakan saat merujuk tindakan atau diri sendiri di depan tokoh yang dihormati.",
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
        id: "fc-m1-1",
        front: "Apa arti sesanti 'Singgihang anake lianan, andapang ragane padidi'?",
        back: "Hormati atau tinggikan orang lain (dengan Alus Singgih), dan rendahkan diri sendiri (dengan Alus Sor).",
        tag: "Prinsip Kesantunan",
        hint: "Pedoman utama memilih kruna ASI dan ASO.",
      },
      {
        id: "fc-m1-2",
        front: "Mengapa kalimat 'Titiang sampun ngrayunan' dianggap keliru secara tata krama?",
        back: "Karena 'ngrayunan' adalah Kruna Alus Singgih. Untuk diri sendiri ('titiang') seharusnya menggunakan Kruna Alus Sor yaitu 'neda'.",
        tag: "Deteksi Miskonsepsi",
        hint: "Perhatikan kesesuaian subjek 'titiang' dengan predikatnya.",
      },
      {
        id: "fc-m1-3",
        front: "Kruna apa yang tepat untuk menyatakan 'berbicara' saat siswa melapor kepada Bapak Guru?",
        back: "Matur (Alus Sor). Sedangkan ucapan Bapak Guru disebut 'Ngandika' (Alus Singgih).",
        tag: "Alus Sor vs Alus Singgih",
        hint: "Bedakan tindakan siswa dan tindakan guru.",
      },
      {
        id: "fc-m1-4",
        front: "Kapan tingkatan Basa Andap tepat digunakan dalam pergaulan sehari-hari?",
        back: "Saat berbicara dengan teman sebaya yang sudah akrab dalam suasana non-formal.",
        tag: "Basa Andap",
        hint: "Percakapan setara antarteman.",
      },
      {
        id: "fc-m1-5",
        front: "Apa perbedaan pemakaian kata 'Seda' dan 'Padem'?",
        back: "'Seda' (Alus Singgih) digunakan untuk wafatnya tokoh yang dimuliakan, sedangkan 'Padem' (Alus Sor) untuk kalangan biasa.",
        tag: "Kosakata Krama",
        hint: "Tingkatan penghormatan atas orang yang wafat.",
      },
    ],
    quiz: [
      {
        id: "11111111-1111-4111-8111-111111111101",
        questionOrder: 1,
        question:
          "Rikala mabaos majeng ring Bapak Guru ring sekolah, lengkara sane patut kaanggen nyihnayang raga sampun madaar inggih punika...",
        options: [
          {
            label: "A",
            text: "Bapak Guru, titiang sampun neda.",
            isCorrect: true,
            distractorRationale:
              "Tepat! 'Titiang' dan 'neda' sama-sama Kruna Alus Sor (ASO) untuk merendahkan diri secara santun di hadapan guru.",
          },
          {
            label: "B",
            text: "Bapak Guru, titiang sampun ngrayunan.",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: 'Ngrayunan' adalah Alus Singgih untuk memuliakan orang lain, pantang dipakai untuk diri sendiri.",
          },
          {
            label: "C",
            text: "Bapak Guru, icang suba madaar.",
            isCorrect: false,
            distractorRationale:
              "Keliru: 'Icang suba madaar' adalah Basa Andap yang hanya pantas untuk teman sebaya.",
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
        id: "11111111-1111-4111-8111-111111111102",
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
              "Pengecoh: 'Mapajar' umumnya merujuk pada ujaran biasa dan kurang tepat dibanding 'ngandika' untuk memuliakan guru.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "'Ngandika' adalah Kruna Alus Singgih untuk 'berbicara' yang ditujukan kepada sosok yang dihormati seperti guru.",
        conceptTag: "Alus Singgih (ASI)",
        culturalContext: "Komunikasi Formal di Kelas",
      },
      {
        id: "11111111-1111-4111-8111-111111111103",
        questionOrder: 3,
        question:
          " napi arti sesanti 'Singgihang anake lianan, andapang ragane padidi' sajeroning anggah-ungguhing basa Bali?",
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
          "Sesanti tersebut mengajarkan sikap rendah hati: memuliakan orang lain dengan Alus Singgih dan merendahkan diri dengan Alus Sor.",
        conceptTag: "Prinsip Kesantunan",
        culturalContext: "Etika Pergaulan Masyarakat Bali",
      },
      {
        id: "11111111-1111-4111-8111-111111111104",
        questionOrder: 4,
        question:
          "Rikala Wayan mataken majeng ring Made sane dados timpal raket ring kelas, soroh basa sane pinih lumrah kaanggen inggih punika...",
        options: [
          {
            label: "A",
            text: "Basa Andap",
            isCorrect: true,
            distractorRationale:
              "Tepat! Basa Andap digunakan untuk percakapan akrab antarteman sebaya.",
          },
          {
            label: "B",
            text: "Basa Kasar Pisan",
            isCorrect: false,
            distractorRationale:
              "Keliru: Basa Kasar mengandung makian yang tidak patut dipakai dalam pergaulan sekolah.",
          },
          {
            label: "C",
            text: "Kruna Alus Singgih khusus sulinggih",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: percakapan santai antarteman sebaya tidak menuntut kosakata khusus sulinggih.",
          },
          {
            label: "D",
            text: "Basa Kawi Kuna",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Basa Kawi digunakan dalam tembang dan sastra klasik, bukan obrolan harian teman sebaya.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Antarteman sebaya yang sudah akrab, Basa Andap menjadi ragam bahasa yang hangat, sopan, dan tidak kaku.",
        conceptTag: "Basa Andap",
        culturalContext: "Interaksi Sebaya di Sekolah",
      },
    ],
  },
  "modul-2": {
    title: "Pedoman Pasang Aksara Bali Baku & Aturan Adeg-adeg",
    subjectArea: "Aksara Bali",
    gradeLevel: "SMP Fase D",
    summary: {
      overview:
        "Pedoman Pasang Aksara Bali Baku menetapkan aturan penulisan konsonan mati (tengenan), gantungan, gempelan, dan tanda baca. Kaidah terpenting adalah larangan menempatkan adeg-adeg di tengah kata atau tengah kalimat.",
      keyTakeaways: [
        "Adeg-adeg hanya boleh ditulis di akhir kata atau akhir kalimat sebelum Carik Siki maupun Carik Pareren.",
        "Konsonan mati di tengah kata atau antarkata dalam kalimat wajib ditulis menggunakan gantungan atau gempelan aksara berikutnya.",
        "Gempelan digunakan khusus untuk aksara Pa, Sa, dan Pa Kapal yang diletakkan di sebelah kanan aksara yang dimatikan.",
        "Carik Siki berfungsi sebagai tanda koma, sedangkan Carik Pareren berfungsi sebagai tanda titik akhir kalimat.",
      ],
      culturalGlossary: [
        {
          term: "Adeg-adeg",
          meaning: "Tanda pemati vokal pada aksara wianjana yang hanya boleh ditempatkan di akhir kata atau sebelum tanda carik.",
          category: "Pasang Aksara",
        },
        {
          term: "Gantungan",
          meaning: "Bentuk aksara konsonan yang ditulis di bawah aksara wianjana untuk mematikan vokal aksara di atasnya di tengah kata.",
          category: "Pasang Aksara",
        },
        {
          term: "Gempelan",
          meaning: "Pasangan aksara yang ditulis menempel di sebelah kanan aksara yang dimatikan (khusus aksara Pa, Sa, dan Pa Kapal).",
          category: "Pasang Aksara",
        },
        {
          term: "Carik Siki",
          meaning: "Tanda baca satu garis miring tegak dalam Aksara Bali yang berfungsi setara dengan tanda koma (,).",
          category: "Ceciren Pepaosan",
        },
        {
          term: "Carik Pareren",
          meaning: "Tanda baca dua garis miring tegak dalam Aksara Bali yang berfungsi sebagai tanda titik (.) pengakhir kalimat.",
          category: "Ceciren Pepaosan",
        },
        {
          term: "Wianjana",
          meaning: "Kelompok aksara konsonan dasar dalam Aksara Bali (Ha, Na, Ca, Ra, Ka, dan seterusnya) yang secara bawaan mengandung vokal /a/.",
          category: "Warga Aksara",
        },
      ],
    },
    flashcards: [
      {
        id: "fc-m2-1",
        front: "Di mana letak penulisan Adeg-adeg yang dibenarkan menurut Pasang Aksara Bali Baku?",
        back: "Hanya di akhir kata tunggal atau di akhir kalimat tepat sebelum Carik Siki / Carik Pareren (serta untuk menghindari tumpukan tiga gantungan).",
        tag: "Aturan Adeg-adeg",
        hint: "Pantang diletakkan di tengah kata biasa.",
      },
      {
        id: "fc-m2-2",
        front: "Bagaimana cara menulis kata 'Sampun' agar tidak memakai adeg-adeg pada aksara 'm' di tengah kata?",
        back: "Menggunakan aksara Sa + Ma yang diberi Gempelan Pa + Suku + Na + Adeg-adeg.",
        tag: "Gempelan Pa",
        hint: "Pasangan aksara Pa ditulis di sebelah kanan Ma.",
      },
      {
        id: "fc-m2-3",
        front: "Apa perbedaan posisi penulisan Gantungan dan Gempelan?",
        back: "Gantungan ditulis di bawah aksara yang dimatikan, sedangkan Gempelan ditulis menempel di sebelah kanan aksara yang dimatikan.",
        tag: "Gantungan & Gempelan",
        hint: "Perhatikan posisi bawah versus samping kanan.",
      },
      {
        id: "fc-m2-4",
        front: "Apa fungsi Carik Siki dan Carik Pareren dalam penulisan kalimat Aksara Bali?",
        back: "Carik Siki berfungsi sebagai jeda koma (,), sedangkan Carik Pareren berfungsi sebagai titik akhir kalimat (.).",
        tag: "Tanda Baca",
        hint: "Satu garis versus dua garis.",
      },
      {
        id: "fc-m2-5",
        front: "Mengapa aksara Wianjana tanpa pengangge selalu terbaca berakhiran vokal /a/?",
        back: "Karena Aksara Bali bersifat silabis (abugida); setiap aksara Wianjana dasar melekat vokal /a/ kecuali diberi pengangge suara atau dimatikan.",
        tag: "Wianjana",
        hint: "Sifat dasar aksara Ha-Na-Ca-Ra-Ka.",
      },
    ],
    quiz: [
      {
        id: "22222222-2222-4222-8222-222222222201",
        questionOrder: 1,
        question:
          "Manut ring uger-uger Pasang Aksara Bali Baku, panganggen adeg-adeg sane patut inggih punika...",
        options: [
          {
            label: "A",
            text: "Ring panguntat kruna utawi panguntat lengkara sadurung carik.",
            isCorrect: true,
            distractorRationale:
              "Tepat! Adeg-adeg digunakan untuk mematikan vokal pada aksara terakhir sebelum tanda carik.",
          },
          {
            label: "B",
            text: "Ring tengahing kruna anggen ngentosin gantungan.",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi umum: menaruh adeg-adeg di tengah kata melanggar kaidah karena wajib memakai gantungan/gempelan.",
          },
          {
            label: "C",
            text: "Ring ajeng aksara suara ring pangawit lengkara.",
            isCorrect: false,
            distractorRationale:
              "Keliru: adeg-adeg tidak pernah diletakkan di awal kalimat.",
          },
          {
            label: "D",
            text: "Sabilang wenten aksara wianjana sane madaging ulu.",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: ulu adalah pengangge suara /i/, bukan konsonan mati.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Aturan baku Pasamuhan Agung Singaraja menetapkan adeg-adeg hanya di akhir kata atau akhir kalimat sebelum carik, kecuali menghindari tumpukan tiga gantungan.",
        conceptTag: "Aturan Adeg-adeg",
        culturalContext: "Pedoman Pasang Aksara Singaraja",
      },
      {
        id: "22222222-2222-4222-8222-222222222202",
        questionOrder: 2,
        question:
          "Rikala nyurat kruna 'Bakti' antuk aksara Bali, aksara 'ka' ring tengahing kruna patut kasurat...",
        options: [
          {
            label: "A",
            text: "Dagingin adeg-adeg ring tengah kruna.",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: adeg-adeg pantang dipakai di tengah kata 'bakti'.",
          },
          {
            label: "B",
            text: "Dagingin gantungan Ta miwah pangangge suara Ulu.",
            isCorrect: true,
            distractorRationale:
              "Tepat! Aksara Ka dimatikan dengan gantungan Ta di bawahnya lalu diberi Ulu (vokal /i/).",
          },
          {
            label: "C",
            text: "Kagentosin antuk pangangge tengenan cecek.",
            isCorrect: false,
            distractorRationale:
              "Keliru: cecek khusus untuk bunyi /-ng/, bukan bunyi /-k/.",
          },
          {
            label: "D",
            text: "Dagingin pangangge tengenan bisah.",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: bisah digunakan untuk bunyi /-h/ di akhir suku kata.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "Kata 'Bakti' memiliki konsonan mati /k/ di tengah kata yang diikuti /ti/, sehingga aksara Ka wajib diberi gantungan Ta dan ulu.",
        conceptTag: "Gantungan Wianjana",
        culturalContext: "Literasi Lontar & Aksara Bali",
      },
      {
        id: "22222222-2222-4222-8222-222222222203",
        questionOrder: 3,
        question:
          "Aksara wianjana sane pasanganipun kasurat majajar ring tengen (gempelan) inggih punika...",
        options: [
          {
            label: "A",
            text: "Pa, Sa, miwah Pa Kapal",
            isCorrect: true,
            distractorRationale:
              "Tepat! Pasangan Pa, Sa, dan Pa Kapal berbentuk gempelan yang ditulis di sebelah kanan aksara yang dimatikan.",
          },
          {
            label: "B",
            text: "Ha, Na, Ca, miwah Ra",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Ha, Na, Ca, dan Ra semuanya memiliki pasangan berbentuk gantungan di bawah aksara.",
          },
          {
            label: "C",
            text: "Ka, Da, Ta, miwah La",
            isCorrect: false,
            distractorRationale:
              "Keliru: keempat aksara tersebut menggunakan gantungan di bawah aksara.",
          },
          {
            label: "D",
            text: "Ma, Ga, Ba, miwah Nga",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Ma, Ga, Ba, dan Nga semuanya ditulis menggantung di bawah aksara.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Dalam Aksara Bali, hanya pasangan Pa, Sa (Sapa), dan Pa Kapal yang ditulis menempel di sebelah kanan (gempelan).",
        conceptTag: "Gempelan",
        culturalContext: "Tata Tulis Aksara Bali",
      },
      {
        id: "22222222-2222-4222-8222-222222222204",
        questionOrder: 4,
        question:
          "Ceciren pepaosan (tanda baca) ring Aksara Bali sane mawiguna pinaka tanda titik (.) ring panguntat lengkara inggih punika...",
        options: [
          {
            label: "A",
            text: "Carik Siki",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Carik Siki hanya satu garis dan berfungsi sebagai tanda koma (,).",
          },
          {
            label: "B",
            text: "Carik Pareren",
            isCorrect: true,
            distractorRationale:
              "Tepat! Carik Pareren (carik kalih) menandai pemberhentian penuh atau titik di akhir kalimat.",
          },
          {
            label: "C",
            text: "Panten",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Panten digunakan sebagai pembuka karangan atau surat.",
          },
          {
            label: "D",
            text: "Pamada",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Pamada digunakan pada pembuka tembang atau kekawin.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "Carik Pareren terdiri atas dua garis tegak miring yang mengakhiri kalimat, setara dengan tanda titik.",
        conceptTag: "Ceciren Pepaosan",
        culturalContext: "Penulisan Wacana Beraksara Bali",
      },
    ],
  },
  "modul-3": {
    title: "Tri Hita Karana & Nilai Musyawarah Subak",
    subjectArea: "Kearifan Lokal",
    gradeLevel: "SMP Fase D",
    summary: {
      overview:
        "Sistem irigasi tradisional Subak di Bali merupakan manifestasi nyata falsafah Tri Hita Karana: keselarasan hubungan manusia dengan Tuhan (Parahyangan), sesama warga subak (Pawongan), dan kelestarian ekosistem sawah (Palemahan).",
      keyTakeaways: [
        "Parahyangan diwujudkan melalui upacara di Pura Ulun Danu dan Pura Bedugul sebagai ungkapan syukur atas sumber air.",
        "Pawongan tercermin dalam musyawarah 'sangketan subak' yang dipimpin Pekaseh berdasarkan aturan adat Awig-awig.",
        "Palemahan dilaksanakan lewat kerja bakti menjaga saluran irigasi, bendungan (empelan), dan kelestarian mata air.",
        "Pembagian air dilakukan secara adil menggunakan tektek (alat bagi air) sesuai kesepakatan krama subak.",
      ],
      culturalGlossary: [
        {
          term: "Parahyangan",
          meaning: "Unsur Tri Hita Karana yang menjaga keharmonisan hubungan manusia dengan Ida Sang Hyang Widhi Wasa melalui upacara keagamaan.",
          category: "Tri Hita Karana",
        },
        {
          term: "Pawongan",
          meaning: "Unsur Tri Hita Karana yang mengatur keharmonisan hubungan sosial antarsesama manusia melalui musyawarah dan gotong royong.",
          category: "Tri Hita Karana",
        },
        {
          term: "Palemahan",
          meaning: "Unsur Tri Hita Karana yang mewajibkan manusia merawat kelestarian alam, tanah pertanian, dan sumber air.",
          category: "Tri Hita Karana",
        },
        {
          term: "Subak",
          meaning: "Organisasi kemasyarakatan tradisional petani di Bali yang khusus mengatur sistem pengairan sawah secara religius dan demokratis.",
          category: "Kelembagaan Adat",
        },
        {
          term: "Awig-awig",
          meaning: "Aturan hukum adat tertulis maupun tidak tertulis yang disepakati bersama oleh krama subak atau desa adat beserta sanksinya.",
          category: "Hukum Adat",
        },
        {
          term: "Pekaseh",
          meaning: "Pemimpin atau ketua pengurus Subak yang dipilih secara demokratis untuk mengatur distribusi air dan memediasi musyawarah.",
          category: "Kepemimpinan Subak",
        },
      ],
    },
    flashcards: [
      {
        id: "fc-m3-1",
        front: "Bagaimana penerapan aspek Pawongan dalam organisasi Subak di Bali?",
        back: "Melalui musyawarah mufakat (sangketan subak) dan gotong royong antarpetani dalam membagi giliran air secara adil.",
        tag: "Pawongan",
        hint: "Hubungan harmonis antarsesama anggota subak.",
      },
      {
        id: "fc-m3-2",
        front: "Apa peran seorang Pekaseh dalam sistem pengairan Subak?",
        back: "Memimpin koordinasi anggota subak, mengawasi pembagian air pada temuku/tektek, dan menegakkan awig-awig subak.",
        tag: "Kepemimpinan Adat",
        hint: "Ketua pengurus organisasi Subak.",
      },
      {
        id: "fc-m3-3",
        front: "Contoh kegiatan nyata yang mencerminkan aspek Palemahan di lingkungan Subak adalah...",
        back: "Kerja bakti membersihkan saluran irigasi (telabah), menjaga kelestarian hutan hulu, dan tidak mencemari air sungai.",
        tag: "Palemahan",
        hint: "Hubungan manusia dengan lingkungan alam.",
      },
      {
        id: "fc-m3-4",
        front: "Apa fungsi Awig-awig bagi krama Subak?",
        back: "Sebagai pedoman aturan bersama yang mengatur hak perolehan air, kewajiban ngayah, serta sanksi bagi pelanggar.",
        tag: "Awig-awig",
        hint: "Aturan adat yang disepakati melalui paruman.",
      },
      {
        id: "fc-m3-5",
        front: "Mengapa di setiap kawasan Subak terdapat Pura Bedugul atau Pura Ulun Carik?",
        back: "Sebagai wujud aspek Parahyangan untuk memohon kesuburan dan bersyukur kepada Ida Sang Hyang Widhi Wasa (Dewi Sri).",
        tag: "Parahyangan",
        hint: "Dimensi spiritual pertanian Bali.",
      },
    ],
    quiz: [
      {
        id: "33333333-3333-4333-8333-333333333301",
        questionOrder: 1,
        question:
          "Krama subak melaksanakan paruman (sangketan) untuk menyepakati jadwal giliran pengairan sawah secara adil. Kegiatan ini merupakan wujud nyata bagian Tri Hita Karana yaitu...",
        options: [
          {
            label: "A",
            text: "Parahyangan",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Parahyangan berfokus pada hubungan manusia dengan Tuhan (upacara di pura).",
          },
          {
            label: "B",
            text: "Pawongan",
            isCorrect: true,
            distractorRationale:
              "Tepat! Musyawarah antaranggota subak mencerminkan keharmonisan hubungan sesama manusia (Pawongan).",
          },
          {
            label: "C",
            text: "Palemahan",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Palemahan berfokus pada pelestarian fisik lingkungan alam dan saluran air.",
          },
          {
            label: "D",
            text: "Panca Yadnya",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Panca Yadnya adalah lima jenis korban suci, bukan tiga unsur Tri Hita Karana.",
          },
        ],
        correctAnswer: "B",
        explanation:
          "Musyawarah mufakat antarpetani dalam sangketan subak adalah implementasi Pawongan (hubungan harmonis antarsesama manusia).",
        conceptTag: "Tri Hita Karana: Pawongan",
        culturalContext: "Demokrasi Adat Subak",
      },
      {
        id: "33333333-3333-4333-8333-333333333302",
        questionOrder: 2,
        question:
          "Pamucuk utawi panglingsir sane ngenterang organisasi Subak miwah ngawasin pembagian toya ring carik kawastanin...",
        options: [
          {
            label: "A",
            text: "Pekaseh",
            isCorrect: true,
            distractorRationale:
              "Tepat! Pekaseh adalah ketua yang memimpin dan mengoordinasikan krama subak.",
          },
          {
            label: "B",
            text: "Perbekel",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Perbekel adalah kepala desa dinas (pemerintahan administratif), bukan ketua subak.",
          },
          {
            label: "C",
            text: "Undagi",
            isCorrect: false,
            distractorRationale:
              "Keliru: Undagi adalah ahli arsitektur tradisional Bali.",
          },
          {
            label: "D",
            text: "Pande",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Pande adalah keahlian menempa logam dan peralatan pertanian.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Pekaseh dipilih oleh krama subak untuk memimpin pengelolaan irigasi, paruman, dan pelaksanaan awig-awig subak.",
        conceptTag: "Kelembagaan Subak",
        culturalContext: "Kepemimpinan Pertanian Tradisional",
      },
      {
        id: "33333333-3333-4333-8333-333333333303",
        questionOrder: 3,
        question:
          "Uger-uger utawi aturan adat sane kasungkemin sareng sami olih krama subak pinaka dasar disiplin ngelola toya kawastanin...",
        options: [
          {
            label: "A",
            text: "Awig-awig",
            isCorrect: true,
            distractorRationale:
              "Tepat! Awig-awig memuat ketentuan hak, kewajiban, dan sanksi adat yang disepakati krama subak.",
          },
          {
            label: "B",
            text: "wariga",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Wariga adalah sistem kalender dan perhitungan hari baik (dewasa ayu).",
          },
          {
            label: "C",
            text: "Usada",
            isCorrect: false,
            distractorRationale:
              "Keliru: Usada adalah naskah pengobatan tradisional Bali.",
          },
          {
            label: "D",
            text: "Dharmagita",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: Dharmagita adalah nyanyian suci keagamaan.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Awig-awig merupakan hukum adat hasil kesepakatan paruman yang mengikat seluruh anggota subak.",
        conceptTag: "Awig-awig Adat",
        culturalContext: "Tata Hukum Komunitas Bali",
      },
      {
        id: "33333333-3333-4333-8333-333333333304",
        questionOrder: 4,
        question:
          "Krama subak rutin ngامargiang gotong royong mersihin telabah (saluran irigasi) miwah nandur taru ring hulu tukad. Parikrama puniki nyihnayang aspek...",
        options: [
          {
            label: "A",
            text: "Palemahan",
            isCorrect: true,
            distractorRationale:
              "Tepat! Merawat saluran air dan kelestarian hutan hulu merupakan wujud keharmonisan dengan alam (Palemahan).",
          },
          {
            label: "B",
            text: "Parahyangan",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Parahyangan berfokus pada bhakti dan ritual keagamaan kepada Tuhan.",
          },
          {
            label: "C",
            text: "Pawongan",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: meskipun dikerjakan bersama, objek pelestarian saluran irigasi dan pohon hulu adalah wujud langsung Palemahan.",
          },
          {
            label: "D",
            text: "widyadharma",
            isCorrect: false,
            distractorRationale:
              "Pengecoh: bukan bagian dari tiga unsur Tri Hita Karana.",
          },
        ],
        correctAnswer: "A",
        explanation:
          "Menjaga kebersihan saluran air dan kelestarian ekosistem hulu adalah penerapan langsung Palemahan dalam sistem Subak.",
        conceptTag: "Tri Hita Karana: Palemahan",
        culturalContext: "Konservasi Ekosistem Subak",
      },
    ],
  },
};

export default function StudioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useExileSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      const currentQuery = typeof window !== "undefined" ? window.location.search : "";
      const returnTo = `/studio${currentQuery}`;
      router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
    }
  }, [authLoading, user, router]);

  const [selectedModuleId, setSelectedModuleId] = useState<string>("modul-1");
  const [teacherName, setTeacherName] = useState("Pengajar Exile");
  const [docText, setDocText] = useState(SAMPLE_DOCS[0].text);
  const [customPrompt, setCustomPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(
    SAMPLE_PROCESSED_DOCS["modul-1"],
  );
  const [activeTab, setActiveTab] = useState<string>("summary");

  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"text" | "pdf" | "image">("text");

  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [launchingRoom, setLaunchingRoom] = useState(false);

  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState<CulturalTerm | null>(
    SAMPLE_PROCESSED_DOCS["modul-1"].summary.culturalGlossary[0],
  );

  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [testedAnswers, setTestedAnswers] = useState<Record<number, string>>({});
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptionA, setNewOptionA] = useState("");
  const [newOptionB, setNewOptionB] = useState("");
  const [newOptionC, setNewOptionC] = useState("");
  const [newOptionD, setNewOptionD] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<"A" | "B" | "C" | "D">("A");
  const [newExplanation, setNewExplanation] = useState("");
  const [newConceptTag, setNewConceptTag] = useState("");

  const [glossarySorting, setGlossarySorting] = useState<SortingState>([]);
  const [glossaryFilter, setGlossaryFilter] = useState("");
  const [quizSorting, setQuizSorting] = useState<SortingState>([]);
  const [quizFilter, setQuizFilter] = useState("");

  useEffect(() => {
    const resolvedName =
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      settings.defaultNickname ||
      "Pengajar Exile";
    setTeacherName(resolvedName);
  }, [user, settings.defaultNickname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const moduleParam = params.get("module");
    if (moduleParam && SAMPLE_PROCESSED_DOCS[moduleParam]) {
      const sampleMeta = SAMPLE_DOCS.find((item) => item.id === moduleParam);
      const targetDoc = SAMPLE_PROCESSED_DOCS[moduleParam];
      setSelectedModuleId(moduleParam);
      if (sampleMeta) {
        setDocText(sampleMeta.text);
      }
      setProcessedDoc(targetDoc);
      setSelectedGlossaryTerm(targetDoc.summary.culturalGlossary[0] ?? null);
      setActiveFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setExpandedQuestionIndex(0);
    }
  }, []);

  const handleSelectSample = (sample: SampleModuleItem) => {
    const prehydrated = SAMPLE_PROCESSED_DOCS[sample.id];
    soundEffects.playClick();
    setSelectedModuleId(sample.id);
    setDocText(sample.text);
    setUploadedFileName("");
    setUploadedFileBase64("");
    setUploadedMimeType("");
    setUploadedFileType("text");
    if (prehydrated) {
      setProcessedDoc(prehydrated);
      setSelectedGlossaryTerm(prehydrated.summary.culturalGlossary[0] ?? null);
      setActiveFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setExpandedQuestionIndex(0);
      setTestedAnswers({});
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const mime = file.type || "text/plain";
    setUploadedMimeType(mime);

    const isTextFile =
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      mime.startsWith("text/");

    if (isTextFile) {
      setUploadedFileType("text");
      setUploadedFileBase64("");
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = typeof event.target?.result === "string" ? event.target.result : "";
        setDocText(content);
        toast.success(`Berkas teks "${file.name}" berhasil dimuat.`);
      };
      reader.onerror = () => {
        toast.error("Gagal membaca berkas teks.");
      };
      reader.readAsText(file);
    } else {
      const detectedType: "pdf" | "image" =
        mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : "image";
      setUploadedFileType(detectedType);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);
        if (!docText.trim()) {
          setDocText(`Lampiran dokumen (${detectedType.toUpperCase()}): ${file.name}`);
        }
        toast.success(`Berkas "${file.name}" siap dianalisis secara multimodal.`);
      };
      reader.onerror = () => {
        toast.error("Gagal membaca berkas lampiran.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!docText.trim() && !uploadedFileBase64) {
      toast.error("Silakan masukkan teks, unggah berkas, atau pilih contoh materi pelajaran.");
      return;
    }

    setProcessing(true);
    soundEffects.playClick();
    try {
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

      const docPayload: ProcessedDocument | null =
        data.document ||
        (data.analysis
          ? {
              quizId: data.quizId,
              title: data.analysis.title,
              subjectArea: data.analysis.subjectArea,
              gradeLevel: data.analysis.gradeLevel,
              summary: data.analysis.summary,
              flashcards: data.analysis.flashcards,
              quiz: data.analysis.quiz,
            }
          : null);

      if (!docPayload) {
        throw new Error("Format hasil analisis dokumen tidak ditemukan");
      }

      setProcessedDoc(docPayload);
      setActiveFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setExpandedQuestionIndex(0);
      setSelectedGlossaryTerm(docPayload.summary.culturalGlossary?.[0] ?? null);
      setTestedAnswers({});
      toast.success("Materi berhasil dianalisis!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses dokumen";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleLaunchRoom = async () => {
    setLaunchingRoom(true);
    soundEffects.playClick();
    try {
      const questionsToUse =
        processedDoc?.quiz && processedDoc.quiz.length > 0 ? processedDoc.quiz : undefined;

      const resolvedHostName =
        teacherName.trim() ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "Pengajar Exile";

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: processedDoc?.quizId,
          hostName: resolvedHostName,
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
        throw new Error(data.error || "Gagal membuat ruangan kuis");
      }

      toast.success(`Ruang kuis berhasil dibuka! PIN: ${data.roomCode}`);
      confetti({ particleCount: 50, spread: 60 });
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuka sesi kuis";
      toast.error(msg);
    } finally {
      setLaunchingRoom(false);
    }
  };

  const handleConvertTermToFlashcard = (termItem: CulturalTerm) => {
    if (!processedDoc) return;
    const newCard: Flashcard = {
      id: `fc-glossary-${Date.now()}`,
      front: `Apa makna dan konteks penggunaan istilah "${termItem.term}" dalam ${termItem.category}?`,
      back: termItem.meaning,
      tag: termItem.category,
      hint: `Istilah penting dari glosarium ${processedDoc.title}`,
    };

    setProcessedDoc((prev) =>
      prev
        ? {
            ...prev,
            flashcards: [...prev.flashcards, newCard],
          }
        : prev,
    );
    soundEffects.playCorrect();
    toast.success(`Istilah "${termItem.term}" berhasil ditambahkan ke Kartu Belajar 3D!`);
  };

  const handleCopyGlossaryTerm = (termItem: CulturalTerm) => {
    navigator.clipboard.writeText(`${termItem.term}: ${termItem.meaning}`);
    soundEffects.playClick();
    toast.success(`Istilah "${termItem.term}" berhasil disalin!`);
  };

  const handleStartEditQuestion = (index: number) => {
    if (!processedDoc || !processedDoc.quiz[index]) return;
    const q = processedDoc.quiz[index];
    setEditingQuestionIndex(index);
    setNewQuestionText(q.question);
    setNewOptionA(q.options?.find((o) => o.label === "A")?.text || q.options?.[0]?.text || "");
    setNewOptionB(q.options?.find((o) => o.label === "B")?.text || q.options?.[1]?.text || "");
    setNewOptionC(q.options?.find((o) => o.label === "C")?.text || q.options?.[2]?.text || "");
    setNewOptionD(q.options?.find((o) => o.label === "D")?.text || q.options?.[3]?.text || "");
    setNewCorrectAnswer(
      (["A", "B", "C", "D"].includes(q.correctAnswer)
        ? q.correctAnswer
        : "A") as "A" | "B" | "C" | "D",
    );
    setNewExplanation(q.explanation || "");
    setNewConceptTag(q.conceptTag || "");
    setShowAddQuestionForm(true);
    soundEffects.playClick();
  };

  const handleDeleteQuestion = (index: number) => {
    if (!processedDoc || processedDoc.quiz.length <= 1) return;
    const updatedQuiz = processedDoc.quiz
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({
        ...item,
        questionOrder: idx + 1,
      }));
    setProcessedDoc({
      ...processedDoc,
      quiz: updatedQuiz,
    });
    setExpandedQuestionIndex(Math.max(0, Math.min(index, updatedQuiz.length - 1)));
    soundEffects.playClick();
    toast.success("Butir soal berhasil dihapus dari Bank Soal.");
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newQuestionText.trim() ||
      !newOptionA.trim() ||
      !newOptionB.trim() ||
      !newOptionC.trim() ||
      !newOptionD.trim()
    ) {
      toast.error("Mohon lengkapi pertanyaan dan keempat opsi jawaban (A–D).");
      return;
    }

    const existingQuestion =
      editingQuestionIndex !== null && processedDoc?.quiz[editingQuestionIndex]
        ? processedDoc.quiz[editingQuestionIndex]
        : null;

    const customQuestion: QuizQuestion = {
      id: existingQuestion?.id || crypto.randomUUID(),
      questionOrder:
        existingQuestion?.questionOrder ??
        (editingQuestionIndex !== null
          ? editingQuestionIndex + 1
          : (processedDoc?.quiz.length || 0) + 1),
      question: newQuestionText.trim(),
      options: [
        {
          label: "A",
          text: newOptionA.trim(),
          isCorrect: newCorrectAnswer === "A",
          distractorRationale:
            newCorrectAnswer === "A"
              ? "Jawaban tepat sesuai kunci pengajar."
              : "Pengecoh yang perlu dicermati kembali oleh siswa.",
        },
        {
          label: "B",
          text: newOptionB.trim(),
          isCorrect: newCorrectAnswer === "B",
          distractorRationale:
            newCorrectAnswer === "B"
              ? "Jawaban tepat sesuai kunci pengajar."
              : "Pengecoh yang perlu dicermati kembali oleh siswa.",
        },
        {
          label: "C",
          text: newOptionC.trim(),
          isCorrect: newCorrectAnswer === "C",
          distractorRationale:
            newCorrectAnswer === "C"
              ? "Jawaban tepat sesuai kunci pengajar."
              : "Pengecoh yang perlu dicermati kembali oleh siswa.",
        },
        {
          label: "D",
          text: newOptionD.trim(),
          isCorrect: newCorrectAnswer === "D",
          distractorRationale:
            newCorrectAnswer === "D"
              ? "Jawaban tepat sesuai kunci pengajar."
              : "Pengecoh yang perlu dicermati kembali oleh siswa.",
        },
      ],
      correctAnswer: newCorrectAnswer,
      explanation:
        newExplanation.trim() ||
        `Opsi ${newCorrectAnswer} merupakan jawaban yang paling tepat berdasarkan kaidah materi ajar.`,
      conceptTag: newConceptTag.trim() || "Evaluasi Mandiri Guru",
      culturalContext:
        existingQuestion?.culturalContext || "Penyusunan Soal Kontekstual Guru",
    };

    if (processedDoc) {
      if (editingQuestionIndex !== null) {
        const updatedQuiz = processedDoc.quiz.map((item, idx) =>
          idx === editingQuestionIndex ? customQuestion : item,
        );
        setProcessedDoc({
          ...processedDoc,
          quiz: updatedQuiz,
        });
        setExpandedQuestionIndex(editingQuestionIndex);
      } else {
        const nextIndex = processedDoc.quiz.length;
        setProcessedDoc({
          ...processedDoc,
          quiz: [...processedDoc.quiz, customQuestion],
        });
        setExpandedQuestionIndex(nextIndex);
      }
    } else {
      setProcessedDoc({
        title: "Modul Kuis Kustom Pengajar",
        subjectArea: "Bahasa & Budaya Bali",
        gradeLevel: "SMP Fase D",
        summary: {
          overview: "Kumpulan butir soal yang disusun langsung oleh pengajar.",
          keyTakeaways: ["Evaluasi formatif terarah berdasarkan soal kustom pengajar."],
          culturalGlossary: [],
        },
        flashcards: [],
        quiz: [customQuestion],
      });
      setExpandedQuestionIndex(0);
    }

    const wasEditing = editingQuestionIndex !== null;
    setEditingQuestionIndex(null);
    setNewQuestionText("");
    setNewOptionA("");
    setNewOptionB("");
    setNewOptionC("");
    setNewOptionD("");
    setNewExplanation("");
    setNewConceptTag("");
    setShowAddQuestionForm(false);
    soundEffects.playCorrect();
    toast.success(
      wasEditing
        ? "Perubahan butir soal berhasil disimpan!"
        : "Soal baru berhasil ditambahkan ke Bank Soal Kuis!",
    );
  };

  const glossaryColumns = useMemo<ColumnDef<CulturalTerm>[]>(
    () => [
      {
        accessorKey: "term",
        header: "Istilah",
        cell: (info) => (
          <span className="text-body-medium text-text-primary">{String(info.getValue())}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: (info) => (
          <Chip variant="caption" color="blue">
            {String(info.getValue())}
          </Chip>
        ),
      },
      {
        accessorKey: "meaning",
        header: "Arti dan Penjelasan",
        cell: (info) => (
          <span className="text-body-regular text-text-secondary">{String(info.getValue())}</span>
        ),
      },
    ],
    [],
  );

  const glossaryData = useMemo(
    () => processedDoc?.summary.culturalGlossary || [],
    [processedDoc],
  );

  const glossaryTable = useReactTable({
    data: glossaryData,
    columns: glossaryColumns,
    state: {
      sorting: glossarySorting,
      globalFilter: glossaryFilter,
    },
    onSortingChange: setGlossarySorting,
    onGlobalFilterChange: setGlossaryFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const quizColumns = useMemo<ColumnDef<QuizQuestion>[]>(
    () => [
      {
        accessorKey: "questionOrder",
        header: "No",
        cell: (info) => (
          <Badge color="neutral">{(info.row.index + 1).toString()}</Badge>
        ),
      },
      {
        accessorKey: "question",
        header: "Pertanyaan",
        cell: (info) => {
          const q = info.row.original;
          const isExpanded = expandedQuestionIndex === info.row.index;
          return (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-body-medium text-text-primary">
                  {q.question}
                </p>
                <Chip variant="caption" color={isExpanded ? "blue" : "neutral"} className="shrink-0 gap-1">
                  {isExpanded ? <RiEyeOffLine className="size-3.5" /> : <RiEyeLine className="size-3.5" />}
                  <span>{isExpanded ? "Tutup" : "Rincian"}</span>
                </Chip>
              </div>
              {q.conceptTag && (
                <Chip variant="caption" color="gray">
                  {q.conceptTag}
                </Chip>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "correctAnswer",
        header: "Kunci",
        cell: (info) => {
          const q = info.row.original;
          const correctOpt = q.options?.find((o) => o.label === q.correctAnswer || o.isCorrect);
          return (
            <div className="space-y-1">
              <Chip variant="caption" color="lime">
                Opsi {q.correctAnswer}
              </Chip>
              <p className="text-caption-1-medium text-text-secondary line-clamp-1">
                {correctOpt?.text}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "explanation",
        header: "Penjelasan",
        cell: (info) => (
          <p className="text-body-2-medium text-text-secondary line-clamp-2">
            {String(info.getValue())}
          </p>
        ),
      },
    ],
    [expandedQuestionIndex],
  );

  const quizData = useMemo(() => processedDoc?.quiz || [], [processedDoc]);

  const quizTable = useReactTable({
    data: quizData,
    columns: quizColumns,
    state: {
      sorting: quizSorting,
      globalFilter: quizFilter,
    },
    onSortingChange: setQuizSorting,
    onGlobalFilterChange: setQuizFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const currentFlashcard = processedDoc?.flashcards[activeFlashcardIndex];

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background-full flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-background-primary-default border border-border-button-default rounded-3xl p-8 flex flex-col items-center gap-4 shadow-card">
          <div className="size-12 rounded-2xl bg-background-secondary-default border border-border-button-default text-foreground-icon-primary flex items-center justify-center shadow-sm">
            <RiShieldKeyholeLine className="size-6 text-accent-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-title-2-semibold text-text-primary">
              Autentikasi Pengajar Diperlukan
            </h1>
            <p className="text-body-regular text-text-secondary">
              Akses Studio Exile khusus untuk guru dan pendidik terdaftar. Mengalihkan ke laman masuk...
            </p>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <Spinner size="sm" aria-label="Memverifikasi sesi" />
            <span className="text-caption-1-regular">Memverifikasi kredensial...</span>
          </div>
          <Button
            type="button"
            size="medium"
            variant="primary"
            onClick={() => {
              const currentQuery = typeof window !== "undefined" ? window.location.search : "";
              router.push(`/login?next=${encodeURIComponent(`/studio${currentQuery}`)}`);
            }}
            className="w-full mt-2"
          >
            Masuk Akun Pengajar
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-full text-text-primary flex flex-col justify-between transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ButtonLink
              href="/"
              variant="ghost"
              size="small"
              leadingIcon={RiArrowLeftLine}
            >
              Beranda
            </ButtonLink>
            <span className="text-text-tertiary">/</span>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-background-secondary-default border border-border-button-default flex items-center justify-center text-foreground-icon-primary shadow-card">
                <RiBookOpenLine className="size-4" />
              </div>
              <span className="text-headline-semibold text-text-primary">
                Exile Studio Ajar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />

            <ButtonLink
              href="/play"
              variant="secondary"
              size="small"
              leadingIcon={RiUserSharedLine}
            >
              Masuk Siswa
            </ButtonLink>

            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleLaunchRoom}
              disabled={launchingRoom}
              leadingIcon={launchingRoom ? undefined : RiPlayCircleLine}
            >
              {launchingRoom ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size="xs" className="text-text-white" aria-hidden />
                  <span>Membuka...</span>
                </span>
              ) : (
                "Buka Ruang Kuis Kelas"
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-title-2-semibold sm:text-title-1-semibold text-text-primary">
              Studio Penyiapan Bahan Ajar & Asesmen
            </h1>
            <p className="text-body-regular text-text-secondary mt-1 max-w-2xl">
              Pilih modul kurikulum siap pakai atau unggah lembar kerja Anda untuk menyusun glosarium, kartu belajar 3D, dan bank soal beserta analisis pengecoh.
            </p>
          </div>

          <div className="w-full md:w-72">
            <Input
              label="Nama Pengajar"
              value={teacherName}
              onChange={setTeacherName}
              placeholder="Nama Pengajar"
              size="small"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-background-primary-default border border-border-button-default rounded-3xl p-6 space-y-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-title-3-semibold text-text-primary">
                  Sumber Materi Ajar
                </h2>
                <p className="text-caption-1-medium text-text-secondary">
                  Pilih modul contoh atau unggah dokumen Anda
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leadingIcon={RiUploadCloud2Line}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Unggah Berkas
                </Button>
              </div>
            </div>

            {uploadedFileName && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-background-secondary-default border border-separator-border">
                <div className="flex items-center gap-2 min-w-0">
                  <RiFileTextLine className="size-4 shrink-0 text-foreground-icon-secondary" />
                  <Chip variant="caption" color="blue" className="truncate">
                    {uploadedFileName} ({uploadedFileType.toUpperCase()})
                  </Chip>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setUploadedFileName("");
                    setUploadedFileBase64("");
                    setUploadedMimeType("");
                    setUploadedFileType("text");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Hapus
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-body-2-medium text-text-primary block">
                Modul Kurikulum Siap Pakai
              </span>
              <div className="flex flex-col gap-2">
                {SAMPLE_DOCS.map((doc) => {
                  const isActiveSample = selectedModuleId === doc.id && !uploadedFileName;
                  return (
                    <Button
                      key={doc.id}
                      type="button"
                      variant="secondary"
                      onClick={() => handleSelectSample(doc)}
                      className={cx(
                        "h-auto w-full flex-col items-start justify-start p-3.5 rounded-2xl text-start whitespace-normal transition-colors",
                        isActiveSample
                          ? "bg-background-secondary-default border-accent-500 shadow-xs"
                          : "bg-background-secondary-default border-separator-border",
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-body-medium text-text-primary block">
                          {doc.title}
                        </span>
                        {isActiveSample && (
                          <Chip variant="caption" color="lime">
                            Aktif
                          </Chip>
                        )}
                      </div>
                      <span className="text-caption-1-medium text-text-secondary mt-0.5 block">
                        Topik: {doc.category}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="studio-doc-textarea"
                className="text-body-2-medium text-text-primary block"
              >
                Teks Bahan Ajar
              </label>
              <textarea
                id="studio-doc-textarea"
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                rows={8}
                className="w-full text-body-regular p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring transition resize-none"
                placeholder="Tempel materi bacaan, rangkuman LKS, atau catatan pelajaran..."
              />
            </div>

            <div>
              <Input
                label="Fokus Asesmen Tambahan (Opsional)"
                value={customPrompt}
                onChange={setCustomPrompt}
                placeholder="Contoh: Fokuskan pada pembedaan kruna Alus Singgih dan Alus Sor"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={handleProcess}
              disabled={processing}
              leadingIcon={processing ? undefined : RiQuillPenLine}
              className="w-full"
            >
              {processing ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" className="text-text-white" aria-hidden />
                  <span>Menganalisis Materi...</span>
                </span>
              ) : (
                "Susun dari Teks & Arahan"
              )}
            </Button>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 min-h-[520px] shadow-card">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(String(key))}
              >
                <TabList aria-label="Tahapan Hasil Analisis Studio">
                  <Tab
                    id="summary"
                    icon={RiFileList3Line}
                    count={processedDoc ? processedDoc.summary.culturalGlossary.length : undefined}
                  >
                    Ringkasan & Glosarium
                  </Tab>
                  <Tab
                    id="flashcards"
                    icon={RiBookOpenLine}
                    count={processedDoc ? processedDoc.flashcards.length : undefined}
                  >
                    Kartu Belajar 3D
                  </Tab>
                  <Tab
                    id="quiz"
                    icon={RiQuestionnaireLine}
                    count={processedDoc ? processedDoc.quiz.length : undefined}
                  >
                    Bank Soal Kuis
                  </Tab>
                </TabList>

                <TabPanel id="summary" className="pt-4">
                  <div className="space-y-6">
                    {processedDoc && (
                      <>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip variant="caption" color="blue">
                              {processedDoc.subjectArea}
                            </Chip>
                            <Chip variant="caption" color="neutral">
                              {processedDoc.gradeLevel}
                            </Chip>
                          </div>
                          <h3 className="text-title-2-semibold text-text-primary">
                            {processedDoc.title}
                          </h3>
                          <p className="text-body-regular text-text-secondary">
                            {processedDoc.summary.overview}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-background-secondary-default border border-separator-border space-y-2.5">
                          <h4 className="text-headline-semibold text-text-primary">
                            Poin Kunci Pembelajaran
                          </h4>
                          <ul className="space-y-2 text-body-regular text-text-secondary">
                            {processedDoc.summary.keyTakeaways.map((point, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <Badge color="primary" className="mt-0.5 shrink-0">
                                  {i + 1}
                                </Badge>
                                <span className="text-text-primary">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-separator-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="text-headline-semibold text-text-primary">
                                Glosarium Istilah Budaya
                              </h4>
                              <p className="text-caption-1-medium text-text-secondary">
                                Klik baris istilah untuk melihat catatan pemakaian, menyalin definisi, atau menjadikannya Kartu Belajar 3D.
                              </p>
                            </div>
                            <div className="w-full sm:w-56">
                              <InputBase
                                aria-label="Cari istilah budaya"
                                leadingIcon={RiSearchLine}
                                value={glossaryFilter}
                                onChange={(e) => setGlossaryFilter(e.target.value)}
                                placeholder="Cari istilah..."
                                size="small"
                              />
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border-table overflow-hidden">
                            <Table
                              className="bui-table"
                              aria-label="Tabel Glosarium Budaya"
                              size="sm"
                            >
                              <TableHeader>
                                {glossaryTable.getHeaderGroups()[0].headers.map((header) => (
                                  <TableColumn
                                    key={header.id}
                                    id={header.id}
                                    isRowHeader={header.id === "term"}
                                  >
                                    <button
                                      type="button"
                                      onClick={header.column.getToggleSortingHandler()}
                                      className="inline-flex items-center gap-1 cursor-pointer text-caption-1-medium text-text-tertiary hover:text-text-primary"
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                      <ChevronSortDown
                                        className={cx(
                                          "size-4 shrink-0 transition-transform",
                                          header.column.getIsSorted() === "asc" && "rotate-180",
                                        )}
                                      />
                                    </button>
                                  </TableColumn>
                                ))}
                              </TableHeader>
                              <TableBody
                                renderEmptyState={() => (
                                  <div className="py-8 text-center text-body-2-medium text-text-tertiary">
                                    Tidak ada istilah yang cocok dengan pencarian.
                                  </div>
                                )}
                              >
                                {glossaryTable.getRowModel().rows.map((row) => {
                                  const termObj = row.original;
                                  const isSelected = selectedGlossaryTerm?.term === termObj.term;
                                  return (
                                    <TableRow
                                      key={row.id}
                                      id={row.id}
                                      onAction={() => setSelectedGlossaryTerm(termObj)}
                                      onClick={() => setSelectedGlossaryTerm(termObj)}
                                      className={cx(
                                        "cursor-pointer transition-colors",
                                        isSelected
                                          ? "bg-background-secondary-default"
                                          : "hover:bg-background-primary-hover",
                                      )}
                                    >
                                      {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                          {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                          )}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <AnimatePresence>
                            {selectedGlossaryTerm && (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-headline-semibold text-text-primary">
                                      {selectedGlossaryTerm.term}
                                    </span>
                                    <Chip variant="caption" color="blue">
                                      {selectedGlossaryTerm.category}
                                    </Chip>
                                  </div>
                                  <p className="text-body-2-medium text-text-secondary">
                                    {selectedGlossaryTerm.meaning}
                                  </p>
                                  <p className="text-caption-1-medium text-text-tertiary">
                                    Catatan Kontekstual: Gunakan istilah ini dalam latihan percakapan kelas sesuai kaidah {selectedGlossaryTerm.category}.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    leadingIcon={RiFileCopyLine}
                                    onClick={() => handleCopyGlossaryTerm(selectedGlossaryTerm)}
                                  >
                                    Salin Istilah
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="secondary"
                                    leadingIcon={RiAddLine}
                                    onClick={() => handleConvertTermToFlashcard(selectedGlossaryTerm)}
                                  >
                                    Jadikan Kartu Belajar
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </div>
                </TabPanel>

                <TabPanel id="flashcards" className="pt-4">
                  <div className="space-y-5">
                    {processedDoc && currentFlashcard && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-body-2-medium text-text-secondary">
                            Kartu {activeFlashcardIndex + 1} dari {processedDoc.flashcards.length}
                          </span>
                          <Chip variant="caption" color="blue">
                            {currentFlashcard.tag}
                          </Chip>
                        </div>

                        <div
                          className="relative min-h-[260px] w-full perspective-1000 cursor-pointer select-none"
                          style={{ perspective: "1000px" }}
                          onClick={() => setIsFlashcardFlipped((prev) => !prev)}
                        >
                          <div
                            className="relative min-h-[260px] w-full transition-transform duration-500 preserve-3d"
                            style={{
                              transformStyle: "preserve-3d",
                              transform: isFlashcardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                            }}
                          >
                            <div
                              className="absolute inset-0 backface-hidden rounded-3xl border border-border-button-default bg-background-secondary-default p-6 flex flex-col justify-between shadow-card"
                              style={{ backfaceVisibility: "hidden" }}
                            >
                              <div className="flex items-center justify-between">
                                <Chip variant="caption" color="blue">
                                  Sisi Depan (Pertanyaan / Konsep)
                                </Chip>
                                <RiRefreshLine className="size-4 text-text-tertiary" />
                              </div>
                              <div className="my-auto text-center px-4 space-y-2">
                                <p className="text-title-3-semibold text-text-primary">
                                  {currentFlashcard.front}
                                </p>
                                {currentFlashcard.hint && (
                                  <p className="text-caption-1-medium text-text-secondary">
                                    Petunjuk: {currentFlashcard.hint}
                                  </p>
                                )}
                              </div>
                              <span className="text-caption-1-medium text-text-tertiary text-center">
                                Klik kartu untuk membalik ke jawaban
                              </span>
                            </div>

                            <div
                              className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl border border-border-button-default bg-background-secondary-default p-6 flex flex-col justify-between shadow-card"
                              style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)",
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <Chip variant="caption" color="lime">
                                  Sisi Belakang (Jawaban & Penjelasan)
                                </Chip>
                                <RiRefreshLine className="size-4 text-text-tertiary" />
                              </div>
                              <div className="my-auto text-center px-4">
                                <p className="text-headline-semibold text-text-primary">
                                  {currentFlashcard.back}
                                </p>
                              </div>
                              <span className="text-caption-1-medium text-text-tertiary text-center">
                                Klik untuk membalik kembali
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            leadingIcon={RiArrowLeftLine}
                            onClick={() => {
                              setIsFlashcardFlipped(false);
                              setActiveFlashcardIndex((prev) => Math.max(0, prev - 1));
                            }}
                            disabled={activeFlashcardIndex === 0}
                          >
                            Sebelumnya
                          </Button>

                          <Button
                            type="button"
                            variant="primary"
                            size="small"
                            leadingIcon={RiRefreshLine}
                            onClick={() => setIsFlashcardFlipped((prev) => !prev)}
                          >
                            Balik Kartu
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            trailingIcon={RiArrowRightLine}
                            onClick={() => {
                              setIsFlashcardFlipped(false);
                              setActiveFlashcardIndex((prev) =>
                                Math.min(processedDoc.flashcards.length - 1, prev + 1),
                              );
                            }}
                            disabled={activeFlashcardIndex === processedDoc.flashcards.length - 1}
                          >
                            Berikutnya
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabPanel>

                <TabPanel id="quiz" className="pt-4">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-headline-semibold text-text-primary">
                          Daftar Soal Latihan ({processedDoc ? processedDoc.quiz.length : 0} butir)
                        </h3>
                        <p className="text-caption-1-medium text-text-secondary">
                          Klik di mana saja pada baris soal untuk membuka analisis pengecoh, mengedit, atau menghapus soal.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          leadingIcon={RiAddLine}
                          onClick={() => {
                            setEditingQuestionIndex(null);
                            setNewQuestionText("");
                            setNewOptionA("");
                            setNewOptionB("");
                            setNewOptionC("");
                            setNewOptionD("");
                            setNewExplanation("");
                            setNewConceptTag("");
                            setShowAddQuestionForm((prev) => !prev);
                          }}
                        >
                          Tambah Soal Baru
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="small"
                          leadingIcon={RiPlayCircleLine}
                          onClick={handleLaunchRoom}
                          disabled={launchingRoom}
                        >
                          Luncurkan Kuis
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showAddQuestionForm && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleAddCustomQuestion}
                          className="p-5 rounded-3xl bg-background-secondary-default border border-border-button-default space-y-4 shadow-card"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-headline-semibold text-text-primary">
                              {editingQuestionIndex !== null
                                ? `Edit Butir Soal #${editingQuestionIndex + 1}`
                                : "Tambah Butir Soal Baru"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setEditingQuestionIndex(null);
                                setShowAddQuestionForm(false);
                              }}
                            >
                              Batal
                            </Button>
                          </div>

                          <Input
                            label="Pertanyaan Kuis"
                            value={newQuestionText}
                            onChange={setNewQuestionText}
                            placeholder="Tulis pertanyaan Basa Bali atau Pasang Aksara..."
                            size="small"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Opsi A"
                              value={newOptionA}
                              onChange={setNewOptionA}
                              placeholder="Teks pilihan A"
                              size="small"
                            />
                            <Input
                              label="Opsi B"
                              value={newOptionB}
                              onChange={setNewOptionB}
                              placeholder="Teks pilihan B"
                              size="small"
                            />
                            <Input
                              label="Opsi C"
                              value={newOptionC}
                              onChange={setNewOptionC}
                              placeholder="Teks pilihan C"
                              size="small"
                            />
                            <Input
                              label="Opsi D"
                              value={newOptionD}
                              onChange={setNewOptionD}
                              placeholder="Teks pilihan D"
                              size="small"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-body-2-medium text-text-primary block">
                              Pilih Kunci Jawaban Benar
                            </span>
                            <div className="flex items-center gap-2">
                              {(["A", "B", "C", "D"] as const).map((letter) => (
                                <Button
                                  key={letter}
                                  type="button"
                                  size="small"
                                  variant={newCorrectAnswer === letter ? "primary" : "secondary"}
                                  onClick={() => setNewCorrectAnswer(letter)}
                                >
                                  Opsi {letter}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Tag Konsep / Kompetensi"
                              value={newConceptTag}
                              onChange={setNewConceptTag}
                              placeholder="Contoh: Anggah-ungguhing Basa"
                              size="small"
                            />
                            <Input
                              label="Penjelasan Pedagogis"
                              value={newExplanation}
                              onChange={setNewExplanation}
                              placeholder="Alasan mengapa kunci jawaban tersebut tepat..."
                              size="small"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              type="submit"
                              variant="primary"
                              size="small"
                              leadingIcon={RiCheckLine}
                            >
                              Simpan ke Bank Soal
                            </Button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {processedDoc && (
                      <div className="space-y-4">
                        <div className="w-full sm:w-64">
                          <InputBase
                            aria-label="Cari butir soal"
                            leadingIcon={RiSearchLine}
                            value={quizFilter}
                            onChange={(e) => setQuizFilter(e.target.value)}
                            placeholder="Cari pertanyaan atau konsep..."
                            size="small"
                          />
                        </div>

                        <div className="rounded-2xl border border-border-table overflow-hidden">
                          <Table
                            className="bui-table"
                            aria-label="Tabel Bank Soal Kuis"
                            size="sm"
                          >
                            <TableHeader>
                              {quizTable.getHeaderGroups()[0].headers.map((header) => (
                                <TableColumn
                                  key={header.id}
                                  id={header.id}
                                  isRowHeader={header.id === "question"}
                                >
                                  <button
                                    type="button"
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="inline-flex items-center gap-1 cursor-pointer text-caption-1-medium text-text-tertiary hover:text-text-primary"
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                                    <ChevronSortDown
                                      className={cx(
                                        "size-4 shrink-0 transition-transform",
                                        header.column.getIsSorted() === "asc" && "rotate-180",
                                      )}
                                    />
                                  </button>
                                </TableColumn>
                              ))}
                            </TableHeader>
                            <TableBody
                              renderEmptyState={() => (
                                <div className="py-8 text-center text-body-2-medium text-text-tertiary">
                                  Tidak ada butir soal yang cocok.
                                </div>
                              )}
                            >
                              {quizTable.getRowModel().rows.map((row) => {
                                const isExpanded = expandedQuestionIndex === row.index;
                                return (
                                  <TableRow
                                    key={row.id}
                                    id={row.id}
                                    onAction={() =>
                                      setExpandedQuestionIndex(isExpanded ? null : row.index)
                                    }
                                    onClick={() =>
                                      setExpandedQuestionIndex(isExpanded ? null : row.index)
                                    }
                                    className={cx(
                                      "cursor-pointer transition-colors",
                                      isExpanded
                                        ? "bg-background-secondary-default"
                                        : "hover:bg-background-primary-hover",
                                    )}
                                  >
                                    {row.getVisibleCells().map((cell) => (
                                      <TableCell key={cell.id}>
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext(),
                                        )}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        <AnimatePresence>
                          {expandedQuestionIndex !== null &&
                            processedDoc.quiz[expandedQuestionIndex] && (() => {
                              const q = processedDoc.quiz[expandedQuestionIndex];
                              const selectedTestOpt = testedAnswers[expandedQuestionIndex];

                              return (
                                <motion.div
                                  key={`expanded-q-${expandedQuestionIndex}`}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 6 }}
                                  className="p-5 rounded-3xl bg-background-secondary-default border border-border-button-default space-y-4 shadow-card"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Badge color="primary">
                                        Soal #{expandedQuestionIndex + 1}
                                      </Badge>
                                      <span className="text-headline-semibold text-text-primary">
                                        Uji Coba Jawaban & Analisis Pengecoh
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="xs"
                                        leadingIcon={RiEditLine}
                                        onClick={() => handleStartEditQuestion(expandedQuestionIndex)}
                                      >
                                        Edit Soal
                                      </Button>
                                      {processedDoc.quiz.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="xs"
                                          leadingIcon={RiDeleteBinLine}
                                          onClick={() => handleDeleteQuestion(expandedQuestionIndex)}
                                        >
                                          Hapus Soal
                                        </Button>
                                      )}
                                      <Chip variant="caption" color="lime">
                                        Kunci Benar: Opsi {q.correctAnswer}
                                      </Chip>
                                    </div>
                                  </div>

                                  <p className="text-body-medium text-text-primary">
                                    {q.question}
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {q.options?.map((opt) => {
                                      const isTested = selectedTestOpt === opt.label;
                                      const isCorrect =
                                        opt.label === q.correctAnswer || opt.isCorrect;

                                      return (
                                        <Button
                                          key={opt.label}
                                          type="button"
                                          variant="secondary"
                                          onClick={() => {
                                            setTestedAnswers((prev) => ({
                                              ...prev,
                                              [expandedQuestionIndex]: opt.label,
                                            }));
                                            if (isCorrect) {
                                              soundEffects.playCorrect();
                                            } else {
                                              soundEffects.playIncorrect();
                                            }
                                          }}
                                          className={cx(
                                            "h-auto w-full flex-col items-stretch justify-between gap-2 p-4 rounded-2xl text-start whitespace-normal",
                                            isTested
                                              ? isCorrect
                                                ? "bg-notification-success-background border-border-button-active text-text-primary"
                                                : "bg-notification-error-background border-border-error-default text-text-primary"
                                              : "bg-background-primary-default border-border-button-default text-text-primary",
                                          )}
                                        >
                                          <div className="flex w-full items-center justify-between gap-2">
                                            <Badge color={isTested ? "primary" : "neutral"}>
                                              Opsi {opt.label}
                                            </Badge>
                                            {isTested && (
                                              <Chip
                                                variant="caption"
                                                color={isCorrect ? "lime" : "rose"}
                                              >
                                                {isCorrect ? "Benar ✓" : "Keliru ✗"}
                                              </Chip>
                                            )}
                                          </div>
                                          <p className="text-body-medium text-text-primary">
                                            {opt.text}
                                          </p>
                                          {opt.distractorRationale && (
                                            <p className="text-caption-1-medium text-text-secondary pt-1.5 border-t border-separator-border">
                                              {opt.distractorRationale}
                                            </p>
                                          )}
                                        </Button>
                                      );
                                    })}
                                  </div>

                                  <div className="p-4 rounded-2xl bg-background-primary-default border border-border-button-default space-y-1.5">
                                    <span className="text-body-2-medium text-text-primary block">
                                      Penjelasan Lengkap:
                                    </span>
                                    <p className="text-body-regular text-text-secondary">
                                      {q.explanation}
                                    </p>
                                    {q.culturalContext && (
                                      <p className="text-caption-1-medium text-text-tertiary pt-1.5 border-t border-separator-border">
                                        Konteks Budaya: {q.culturalContext}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })()}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </TabPanel>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-separator-border py-6 text-center bg-background-primary-default">
        <p className="text-body-2-medium text-text-secondary">
          Exile — Platform Asesmen Formatif Budaya Bali & Kurikulum Merdeka
        </p>
      </footer>
    </main>
  );
}
