"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  RiSparklingLine,
  RiUploadCloud2Line,
  RiRefreshLine,
  RiUserSharedLine,
  RiCheckLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiShareForwardLine,
} from "@remixicon/react";

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

const SAMPLE_DOCS = [
  {
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
    title: "Pedoman Pasang Aksara Bali Baku & Aturan Adeg-adeg",
    category: "Aksara Bali",
    text: `Pedoman Pasang Aksara Bali Baku hasil Pasamuhan Agung Singaraja.
Aturan penulisan aksara mati dan gantungan:
1. Adeg-adeg (tanda pemati vokal) hanya boleh diletakkan di akhir kata atau akhir kalimat sebelum tanda carik (tanda baca titik atau koma).
2. Pantang meletakkan adeg-adeg di tengah kata atau tengah kalimat yang masih berjalan. Konsonan mati di tengah wajib menggunakan gantungan atau gempelan aksara berikutnya.
3. Pengangge suara meliputi: Tedong (vokal /a/), Ulu (vokal /i/), Suku (vokal /u/), Taleng (vokal /e/), dan Pepet (vokal /e'/).`,
  },
  {
    title: "Tri Hita Karana & Nilai Musyawarah Subak",
    category: "Kearifan Lokal",
    text: `Filosofi Tri Hita Karana dalam tata kelola masyarakat agraris Bali.
Tiga pilar keharmonisan hidup:
1. Parahyangan: Hubungan bakti antara manusia dengan Tuhan (Ida Sang Hyang Widhi Wasa).
2. Pawongan: Hubungan gotong royong dan asah-asih-asuh antar sesama warga di banjar dan komunitas.
3. Palemahan: Hubungan selaras manusia dengan lingkungan alam sekitar.
Penerapan nyata Tri Hita Karana terdapat pada sistem irigasi Subak yang diakui UNESCO, di mana pembagian air sawah diatur secara adil melalui musyawarah di bawah pimpinan Pekaseh.`,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "quiz">("summary");
  const [inputText, setInputText] = useState(SAMPLE_DOCS[0].text);
  const [userContext, setUserContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);

  // Flashcard flip states
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Table sorting & filters
  const [glossarySearch, setGlossarySearch] = useState("");
  const [quizSearch, setQuizSearch] = useState("");
  const [glossarySorting, setGlossarySorting] = useState<SortingState>([]);
  const [quizSorting, setQuizSorting] = useState<SortingState>([]);

  // Process Document API call
  const handleProcessDocument = async (textToProcess?: string) => {
    const content = textToProcess || inputText;
    if (!content.trim()) {
      toast.error("Silakan masukkan teks atau pilih salah satu materi contoh.");
      return;
    }

    setLoading(true);
    toast.loading("Menganalisis materi ajar...", { id: "proc" });

    try {
      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "modul-ajar-bali.pdf",
          fileType: "text",
          extractedText: content,
          userContext: userContext.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses dokumen");

      setProcessedDoc({
        ...data.analysis,
        quizId: data.quizId,
      });

      setCurrentCardIndex(0);
      setIsFlipped(false);
      toast.success("Materi berhasil disiapkan dalam tiga format latihan.", { id: "proc" });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat memproses";
      toast.error(msg, { id: "proc" });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setInputText(sample.text);
    setUserContext(sample.category);
    handleProcessDocument(sample.text);
  };

  // Flip Flashcard
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = () => {
    if (!processedDoc?.flashcards) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % processedDoc.flashcards.length);
  };

  const handlePrevCard = () => {
    if (!processedDoc?.flashcards) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) =>
      prev === 0 ? processedDoc.flashcards.length - 1 : prev - 1
    );
  };

  // TanStack Table setup for Cultural Glossary
  const glossaryColumns = useMemo<ColumnDef<CulturalTerm>[]>(
    () => [
      {
        accessorKey: "term",
        header: "Istilah",
        cell: (info) => (
          <span className="font-semibold text-[#F5E6D3]">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: (info) => (
          <span className="text-xs px-2 py-0.5 rounded bg-[#331F14] border border-[#4A2E1F] text-[#BFA98A]">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "meaning",
        header: "Arti dan penjelasan",
        cell: (info) => (
          <span className="text-sm text-[#D6C5B2] leading-relaxed">
            {info.getValue<string>()}
          </span>
        ),
      },
    ],
    []
  );

  const glossaryData = useMemo(
    () => processedDoc?.summary?.culturalGlossary || [],
    [processedDoc]
  );

  const glossaryTable = useReactTable({
    data: glossaryData,
    columns: glossaryColumns,
    state: {
      sorting: glossarySorting,
      globalFilter: glossarySearch,
    },
    onSortingChange: setGlossarySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // TanStack Table setup for Quiz Questions Bank
  const quizColumns = useMemo<ColumnDef<QuizQuestion>[]>(
    () => [
      {
        id: "index",
        header: "No",
        cell: (info) => (
          <span className="text-xs text-[#BFA98A] font-medium">{info.row.index + 1}</span>
        ),
      },
      {
        accessorKey: "question",
        header: "Pertanyaan",
        cell: (info) => (
          <div className="space-y-1.5 py-1">
            <p className="text-sm font-medium text-[#F5E6D3] leading-snug">
              {info.getValue<string>()}
            </p>
            {info.row.original.conceptTag && (
              <span className="inline-block text-xs text-[#CA8A04] bg-[#24160E] px-2 py-0.5 rounded border border-[#4A2E1F]">
                {info.row.original.conceptTag}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "correctAnswer",
        header: "Kunci",
        cell: (info) => {
          const ansKey = info.getValue<string>();
          const correctOpt = info.row.original.options.find((o) => o.label === ansKey);
          return (
            <div className="text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-[#22C55E] bg-[#14532D]/30 border border-[#16A34A]/30 px-2 py-0.5 rounded">
                <RiCheckLine className="w-3.5 h-3.5" /> Opsi {ansKey}
              </span>
              <p className="text-[12px] text-[#BFA98A] mt-1 line-clamp-2">
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
          <p className="text-xs text-[#BFA98A] italic leading-relaxed">
            {info.getValue<string>()}
          </p>
        ),
      },
    ],
    []
  );

  const quizData = useMemo(() => processedDoc?.quiz || [], [processedDoc]);

  const quizTable = useReactTable({
    data: quizData,
    columns: quizColumns,
    state: {
      sorting: quizSorting,
      globalFilter: quizSearch,
    },
    onSortingChange: setQuizSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <main className="min-h-screen bg-[#140D08] text-[#F5E6D3] flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#331F14] bg-[#1A0F0A]/95 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04] shadow-sm">
              <RiBookOpenLine className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading font-bold text-base tracking-wide text-[#F5E6D3]">
                exile.org
              </span>
              <span className="ml-2 text-xs text-[#BFA98A] border-l border-[#331F14] pl-2 hidden sm:inline">
                Kurikulum Merdeka & Budaya Bali
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/host/849201"
              className="text-xs px-3.5 py-1.5 rounded bg-[#24160E] hover:bg-[#331F14] text-[#D6C5B2] border border-[#4A2E1F] hover:border-[#CA8A04]/60 transition flex items-center gap-1.5 font-medium"
            >
              <RiUserSharedLine className="w-3.5 h-3.5 text-[#CA8A04]" />
              Ruang Guru (PIN 849201)
            </Link>

            <Link
              href="/play"
              className="text-xs px-3.5 py-1.5 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <RiShareForwardLine className="w-3.5 h-3.5" />
              Masuk Siswa (/play)
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* Workspace Intro Header */}
        <div className="border-b border-[#331F14] pb-6">
          <div className="flex items-center gap-2 text-xs text-[#CA8A04] mb-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#CA8A04]" />
            Ruang Kerja Guru & Bahan Evaluasi
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#F5E6D3] leading-snug">
            Media Pembelajaran dan Asesmen Basa Bali
          </h1>
          <p className="text-sm text-[#BFA98A] mt-1 max-w-2xl leading-relaxed">
            Pilih modul contoh atau tempel teks materi ajar. Sistem merapikan bahan menjadi
            ringkasan konsep, kartu hafalan mandiri, dan bank soal kuis yang siap dibuka bersama siswa di kelas.
          </p>
        </div>

        {/* 2-Column Working Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Material Input & Quick Samples (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#331F14] pb-3">
                <h2 className="text-sm font-heading font-semibold text-[#F5E6D3] flex items-center gap-2">
                  <RiUploadCloud2Line className="w-4 h-4 text-[#CA8A04]" />
                  Bahan Ajar & Modul
                </h2>
                <span className="text-xs text-[#BFA98A]">Fase D & E</span>
              </div>

              {/* Sample Topic Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-[#BFA98A]">Pilihan modul siap pakai:</p>
                {SAMPLE_DOCS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadSample(sample)}
                    className="w-full text-left p-3 rounded bg-[#24160E] hover:bg-[#331F14] border border-[#4A2E1F] hover:border-[#CA8A04]/50 transition group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F5E6D3] group-hover:text-[#CA8A04] transition">
                        {sample.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#BFA98A] mt-1 block">
                      Topik: {sample.category}
                    </span>
                  </button>
                ))}
              </div>

              {/* Text Input Area */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs text-[#BFA98A] mb-1 font-medium">
                    Teks modul pembelajaran:
                  </label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tempel materi bacaan, rangkuman LKS, atau catatan pelajaran..."
                    className="w-full bg-[#140D08] border border-[#4A2E1F] focus:border-[#CA8A04] rounded p-3 text-xs text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none transition leading-relaxed font-serif"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#BFA98A] mb-1 font-medium">
                    Catatan penekanan guru (opsional):
                  </label>
                  <input
                    type="text"
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="Contoh: Fokuskan pada pembedaan kruna Alus Singgih dan Alus Sor"
                    className="w-full bg-[#140D08] border border-[#4A2E1F] focus:border-[#CA8A04] rounded px-3 py-2 text-xs text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleProcessDocument()}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <>
                      <RiRefreshLine className="w-4 h-4 animate-spin" />
                      Sedang memproses materi...
                    </>
                  ) : (
                    <>
                      <RiSparklingLine className="w-4 h-4" />
                      Siapkan Ringkasan, Kartu, & Kuis
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Practical Classroom Guide */}
            <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 space-y-3 text-xs text-[#BFA98A]">
              <div className="flex items-center gap-2 font-semibold text-[#F5E6D3]">
                <RiShieldCheckLine className="w-4 h-4 text-[#CA8A04]" />
                Alur praktis di kelas
              </div>
              <ol className="space-y-1.5 list-decimal list-inside text-xs leading-relaxed">
                <li>Guru membagikan PIN ruang kuis ke siswa lewat proyektor atau papan tulis.</li>
                <li>Siswa masuk dari ponsel masing-masing melalui halaman <strong>/play</strong>.</li>
                <li>Kuis dijalankan, jawaban salah siswa langsung diberi catatan penjelasan singkat.</li>
                <li>Guru meninjau laporan miskonsepsi sekelas untuk materi yang perlu diulang.</li>
              </ol>
            </div>
          </div>

          {/* Right Column: Structured Output Workspace (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-6 flex-1 flex flex-col shadow-sm">
              {/* Tab Navigation */}
              <div className="flex border-b border-[#331F14] pb-3 mb-6 gap-6 items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`text-xs sm:text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-1.5 ${
                      activeTab === "summary"
                        ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                        : "text-[#BFA98A] hover:text-[#F5E6D3]"
                    }`}
                  >
                    <RiFileList3Line className="w-4 h-4" />
                    Ringkasan & Glosarium
                  </button>

                  <button
                    onClick={() => setActiveTab("flashcards")}
                    className={`text-xs sm:text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-1.5 ${
                      activeTab === "flashcards"
                        ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                        : "text-[#BFA98A] hover:text-[#F5E6D3]"
                    }`}
                  >
                    <RiBookOpenLine className="w-4 h-4" />
                    Kartu Belajar 3D
                  </button>

                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={`text-xs sm:text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-1.5 ${
                      activeTab === "quiz"
                        ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                        : "text-[#BFA98A] hover:text-[#F5E6D3]"
                    }`}
                  >
                    <RiQuestionnaireLine className="w-4 h-4" />
                    Bank Soal Kuis
                  </button>
                </div>

                {processedDoc && (
                  <span className="text-xs text-[#22C55E] bg-[#14532D]/30 border border-[#16A34A]/30 px-2 py-0.5 rounded font-medium hidden sm:inline-block">
                    Materi aktif
                  </span>
                )}
              </div>

              {/* Tab 1: Summary & Cultural Glossary with TanStack Table */}
              {activeTab === "summary" && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {processedDoc ? (
                    <div className="space-y-6">
                      {/* Document Overview */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-heading font-bold text-[#F5E6D3]">
                            {processedDoc.title}
                          </h3>
                          <span className="text-xs text-[#BFA98A] bg-[#24160E] px-2 py-0.5 rounded border border-[#4A2E1F]">
                            {processedDoc.gradeLevel}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#D6C5B2] leading-relaxed bg-[#24160E] p-4 rounded border border-[#4A2E1F]">
                          {processedDoc.summary.overview}
                        </p>
                      </div>

                      {/* Key Takeaways */}
                      <div>
                        <h4 className="text-xs font-semibold text-[#CA8A04] mb-2 flex items-center gap-1.5">
                          <RiCheckLine className="w-4 h-4" /> Poin kunci pembelajaran
                        </h4>
                        <ul className="space-y-2">
                          {processedDoc.summary.keyTakeaways.map((point, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[#D6C5B2] flex items-start gap-2.5 bg-[#24160E]/60 p-2.5 rounded border border-[#331F14]"
                            >
                              <span className="w-5 h-5 rounded bg-[#331F14] text-[#CA8A04] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-[#4A2E1F]">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* TanStack Table: Cultural Glossary */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-semibold text-[#CA8A04] flex items-center gap-1.5">
                            <RiBookOpenLine className="w-4 h-4" /> Glosarium istilah budaya (TanStack Table)
                          </h4>

                          <div className="relative">
                            <RiSearchLine className="w-3.5 h-3.5 text-[#BFA98A] absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={glossarySearch}
                              onChange={(e) => setGlossarySearch(e.target.value)}
                              placeholder="Cari istilah..."
                              className="bg-[#24160E] border border-[#4A2E1F] focus:border-[#CA8A04] rounded pl-8 pr-3 py-1 text-xs text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="border border-[#331F14] rounded overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#24160E] border-b border-[#331F14] text-[#BFA98A]">
                              {glossaryTable.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                  {headerGroup.headers.map((header) => (
                                    <th
                                      key={header.id}
                                      onClick={header.column.getToggleSortingHandler()}
                                      className="p-3 font-semibold cursor-pointer select-none hover:text-[#CA8A04]"
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                      )}
                                    </th>
                                  ))}
                                </tr>
                              ))}
                            </thead>
                            <tbody className="divide-y divide-[#331F14]">
                              {glossaryTable.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="hover:bg-[#24160E]/50 transition">
                                  {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="p-3 align-top">
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#BFA98A] space-y-2">
                      <RiFileList3Line className="w-10 h-10 mx-auto text-[#4A2E1F]" />
                      <p className="text-xs">
                        Pilih salah satu contoh materi atau klik tombol siapkan bahan ajar di sebelah kiri.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: 3D Flippable Flashcards */}
              {activeTab === "flashcards" && (
                <div className="flex-1 flex flex-col justify-between items-center py-2 space-y-6">
                  {processedDoc?.flashcards && processedDoc.flashcards.length > 0 ? (
                    <div className="w-full flex flex-col items-center gap-6">
                      {/* Card Counter & Tag */}
                      <div className="flex items-center justify-between w-full text-xs text-[#BFA98A]">
                        <span className="px-3 py-1 rounded bg-[#24160E] border border-[#4A2E1F]">
                          Kartu {currentCardIndex + 1} dari {processedDoc.flashcards.length}
                        </span>
                        <span className="text-[#CA8A04] font-medium">
                          {processedDoc.flashcards[currentCardIndex].tag}
                        </span>
                      </div>

                      {/* 3D Flipping Card Container */}
                      <div
                        onClick={handleFlipCard}
                        className="w-full max-w-md h-64 sm:h-72 cursor-pointer perspective-1000 select-none"
                      >
                        <motion.div
                          initial={false}
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="w-full h-full relative preserve-3d"
                        >
                          {/* Card Front */}
                          <div className="absolute inset-0 backface-hidden rounded-lg bg-[#24160E] border border-[#CA8A04]/50 p-6 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between text-xs text-[#CA8A04]">
                              <span className="font-semibold">Pertanyaan atau istilah</span>
                              <span className="flex items-center gap-1 text-[#BFA98A] text-[11px]">
                                <RiRefreshLine className="w-3.5 h-3.5" /> Klik untuk membalik
                              </span>
                            </div>

                            <p className="text-base sm:text-lg font-serif font-medium text-[#F5E6D3] text-center px-4 leading-relaxed">
                              {processedDoc.flashcards[currentCardIndex].front}
                            </p>

                            {processedDoc.flashcards[currentCardIndex].hint ? (
                              <p className="text-xs text-[#BFA98A] italic text-center">
                                Petunjuk: {processedDoc.flashcards[currentCardIndex].hint}
                              </p>
                            ) : (
                              <div />
                            )}
                          </div>

                          {/* Card Back */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg bg-[#2C1A10] border border-[#D97706]/60 p-6 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between text-xs text-[#CA8A04]">
                              <span className="font-semibold">Jawaban dan makna</span>
                              <span className="flex items-center gap-1 text-[#BFA98A] text-[11px]">
                                <RiRefreshLine className="w-3.5 h-3.5" /> Klik untuk membalik
                              </span>
                            </div>

                            <p className="text-base sm:text-lg font-serif font-medium text-[#F5E6D3] text-center px-4 leading-relaxed">
                              {processedDoc.flashcards[currentCardIndex].back}
                            </p>

                            <div className="text-center">
                              <span className="text-xs px-2.5 py-0.5 rounded bg-[#140D08] text-[#BFA98A] border border-[#4A2E1F]">
                                Bahan evaluasi mandiri
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handlePrevCard}
                          className="p-2 rounded bg-[#24160E] border border-[#4A2E1F] hover:border-[#CA8A04] text-[#D6C5B2] hover:text-[#F5E6D3] transition"
                        >
                          <RiArrowLeftLine className="w-4 h-4" />
                        </button>

                        <button
                          onClick={handleFlipCard}
                          className="px-4 py-2 rounded bg-[#331F14] hover:bg-[#422819] text-[#F5E6D3] text-xs font-medium transition flex items-center gap-2 border border-[#4A2E1F]"
                        >
                          <RiRefreshLine className="w-3.5 h-3.5" />
                          Balik kartu
                        </button>

                        <button
                          onClick={handleNextCard}
                          className="p-2 rounded bg-[#24160E] border border-[#4A2E1F] hover:border-[#CA8A04] text-[#D6C5B2] hover:text-[#F5E6D3] transition"
                        >
                          <RiArrowRightLine className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#BFA98A] space-y-2">
                      <RiBookOpenLine className="w-10 h-10 mx-auto text-[#4A2E1F]" />
                      <p className="text-xs">
                        Siapkan materi terlebih dahulu untuk melihat kartu latihan belajar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Quiz Questions Bank with TanStack Table */}
              {activeTab === "quiz" && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {processedDoc?.quiz && processedDoc.quiz.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-heading font-bold text-[#F5E6D3]">
                            Daftar Soal Latihan ({processedDoc.quiz.length} butir)
                          </h3>
                          <p className="text-xs text-[#BFA98A]">
                            Dilengkapi analisis mengapa pilihan pengecoh dipilih siswa.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative hidden sm:block">
                            <RiSearchLine className="w-3.5 h-3.5 text-[#BFA98A] absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={quizSearch}
                              onChange={(e) => setQuizSearch(e.target.value)}
                              placeholder="Cari soal..."
                              className="bg-[#24160E] border border-[#4A2E1F] focus:border-[#CA8A04] rounded pl-8 pr-3 py-1 text-xs text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none"
                            />
                          </div>

                          <Link
                            href="/host/849201"
                            className="px-3.5 py-1.5 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                          >
                            <RiUserSharedLine className="w-3.5 h-3.5" />
                            Buka di Ruang Guru
                          </Link>
                        </div>
                      </div>

                      {/* TanStack Table: Quiz Bank */}
                      <div className="border border-[#331F14] rounded overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#24160E] border-b border-[#331F14] text-[#BFA98A]">
                            {quizTable.getHeaderGroups().map((headerGroup) => (
                              <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                  <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="p-3 font-semibold cursor-pointer select-none hover:text-[#CA8A04]"
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody className="divide-y divide-[#331F14]">
                            {quizTable.getRowModel().rows.map((row) => (
                              <tr key={row.id} className="hover:bg-[#24160E]/50 transition">
                                {row.getVisibleCells().map((cell) => (
                                  <td key={cell.id} className="p-3 align-top">
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#BFA98A] space-y-2">
                      <RiQuestionnaireLine className="w-10 h-10 mx-auto text-[#4A2E1F]" />
                      <p className="text-xs">
                        Siapkan bahan ajar terlebih dahulu untuk menampilkan butir soal latihan.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Learning Cycle Card */}
        <div className="p-6 rounded-lg bg-[#1A0F0A] border border-[#331F14]">
          <h3 className="text-sm font-heading font-semibold text-[#F5E6D3] mb-1">
            Alur evaluasi formatif terarah
          </h3>
          <p className="text-xs text-[#BFA98A] mb-4">
            Membantu pengajar mendeteksi akar miskonsepsi siswa dan memberikan tindak lanjut nyata:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded bg-[#24160E] border border-[#331F14] space-y-1">
              <span className="font-semibold text-[#CA8A04] block">1. Ekstraksi materi</span>
              <p className="text-[#BFA98A]">
                Penyusunan intisari dan glosarium budaya dari modul atau lembar kerja.
              </p>
            </div>
            <div className="p-3.5 rounded bg-[#24160E] border border-[#331F14] space-y-1">
              <span className="font-semibold text-[#CA8A04] block">2. Kuis interaktif kelas</span>
              <p className="text-[#BFA98A]">
                Siswa menjawab soal berbasis kasus kesantunan bahasa dan pasang aksara.
              </p>
            </div>
            <div className="p-3.5 rounded bg-[#24160E] border border-[#331F14] space-y-1">
              <span className="font-semibold text-[#CA8A04] block">3. Catatan kekeliruan</span>
              <p className="text-[#BFA98A]">
                Penjelasan ramah saat siswa keliru, membedakan kata untuk diri sendiri dan orang lain.
              </p>
            </div>
            <div className="p-3.5 rounded bg-[#24160E] border border-[#331F14] space-y-1">
              <span className="font-semibold text-[#CA8A04] block">4. Remedial adaptif</span>
              <p className="text-[#BFA98A]">
                Pengelompokan materi yang paling sering salah dan saran langkah ajar ulang bagi guru.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#331F14] py-6 text-center text-xs text-[#BFA98A]">
        <p>
          exile.org — Media asesmen pembelajaran Basa Bali Kurikulum Merdeka
        </p>
      </footer>
    </main>
  );
}
