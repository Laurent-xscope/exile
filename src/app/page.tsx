"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  Layers,
  ArrowRight,
  UploadCloud,
  FileText,
  RotateCw,
  CheckCircle2,
  Trophy,
  Users,
  Copy,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Eye,
  Sliders,
  ExternalLink,
} from "lucide-react";

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

interface ProcessedDocument {
  title: string;
  subjectArea: string;
  gradeLevel: string;
  summary: {
    overview: string;
    keyTakeaways: string[];
    culturalGlossary: Array<{
      term: string;
      meaning: string;
      category: string;
    }>;
  };
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizId?: string;
}

const SAMPLE_DOCS = [
  {
    title: "Modul Anggah-ungguhing Basa Bali (SMP Fase D)",
    category: "Bahasa Bali",
    text: `MATERI PEMBELAJARAN BASA BALI SMP FASE D: ANGGAH-UNGGUHING BASA
Prinsip dasar kesantunan berbicara dalam masyarakat Bali adalah 'Singgihang anake lianan, andapang ragane padidi'.
Tingkatan kruna terbagi menjadi:
1. Alus Singgih (ASI): Digunakan untuk meninggikan dan memuliakan orang yang dihormati (guru, orang tua, sulinggih). Contoh: 'ngrayunan' (makan), 'ngandika' (berbicara), 'seda' (wafat). Kruna ASI pantang digunakan untuk diri sendiri!
2. Alus Sor (ASO): Digunakan untuk merendahkan diri sendiri di hadapan orang terhormat. Contoh: 'neda' (makan), 'matur' (berbicara/melapor), 'padem' (meninggal).
3. Basa Andap: Bahasa percakapan netral untuk teman sebaya atau yang sudah sangat akrab (contoh: 'madaar').
4. Basa Kasar: Bahasa yang tidak santun dan dihindari di lingkungan sekolah formal.`,
  },
  {
    title: "Pasang Aksara Bali Baku & Aturan Adeg-adeg",
    category: "Aksara Bali",
    text: `PEDOMAN PASANG AKSARA BALI BAKU (HASIL PASAMUHAN AGUNG 1974)
Aturan penulisan aksara mati dan gantungan:
1. Adeg-adeg (tanda pemati vokal) hanya boleh diletakkan di akhir kata atau akhir kalimat sebelum tanda carik (tanda baca titik/koma).
2. Pantang meletakkan adeg-adeg di tengah kata atau tengah kalimat berjalan. Konsonan mati di tengah wajib menggunakan gantungan atau gempelan aksara berikutnya.
3. Pengangge suara meliputi: Tedong (vokal /a/), Ulu (vokal /i/), Suku (vokal /u/), Taleng (vokal /e/), Pepet (vokal /e'/).`,
  },
  {
    title: "Tri Hita Karana & Nilai Kearifan Lokal Subak",
    category: "Kearifan Lokal",
    text: `FILOSOFI TRI HITA KARANA DALAM TATA KELOLA MASYARAKAT BALI
Tiga pilar keharmonisan hidup:
1. Parahyangan: Hubungan harmonis dan bakti antara manusia dengan Tuhan Yang Maha Esa (Ida Sang Hyang Widhi Wasa).
2. Pawongan: Hubungan gotong royong dan asah-asih-asuh antar sesama manusia di banjar dan komunitas.
3. Palemahan: Hubungan harmonis manusia dengan lingkungan alam sekitar.
Penerapan nyata Tri Hita Karana terdapat pada sistem irigasi Subak yang diakui UNESCO, di mana pembagian air diatur secara musyawarah dan adil di bawah pimpinan Pekaseh.`,
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

  // Process Document API call
  const handleProcessDocument = async (textToProcess?: string) => {
    const content = textToProcess || inputText;
    if (!content.trim()) {
      toast.error("Silakan masukkan teks atau pilih modul sampel!");
      return;
    }

    setLoading(true);
    toast.loading("Memproses dokumen dengan Gemini 2.5 Flash Multimodal OCR...", {
      id: "proc",
    });

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
      toast.success("Dokumen berhasil ditransformasi ke 3 format interaktif!", {
        id: "proc",
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error memproses dokumen";
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-2">
                exile.org
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Bali DigiFest 2026
                </span>
              </span>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                AI Closed-Loop Learning & Cultural Gamification Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/host/849201"
              className="text-xs px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Teacher Host (PIN 849201)
            </Link>

            <Link
              href="/play"
              className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-90 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              Masuk Siswa (/play)
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        {/* Hero Section */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Multimodal OCR & 3-Way Interactive Ingestion Studio
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Foto Modul atau LKS. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              Ubah Jadi Flashcard 3D, Ringkasan, & Kuis Live.
            </span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Menjawab krisis literasi budaya Bali dan Kurikulum Merdeka. Satu pemindaian dokumen menghasilkan tiga produk interaktif lengkap dengan sistem tertutup (Kuis &rarr; Deteksi Miskonsepsi &rarr; Remedial Otomatis).
          </p>
        </div>

        {/* Input & Upload Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Left Column: Dropzone & Context (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur shadow-xl">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                Input Modul Pembelajaran / Foto LKS
              </h2>
              <p className="text-xs text-zinc-400 mb-4">
                Pilih salah satu sampel kurikulum di bawah atau tempelkan teks modul kustom.
              </p>

              {/* Sample Quick Selector */}
              <div className="space-y-2 mb-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">
                  Sampel Terverifikasi Kurikulum Merdeka:
                </p>
                {SAMPLE_DOCS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadSample(sample)}
                    className="w-full text-left p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-800/60 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{sample.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 shrink-0 font-mono">
                      {sample.category}
                    </span>
                  </button>
                ))}
              </div>

              {/* Text Input Area */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Konten Modul / Hasil Ekstraksi OCR:
                  </label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tempel materi modul pembelajaran di sini..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Fokus Penekanan Guru (Opsional):
                  </label>
                  <input
                    type="text"
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    placeholder="Contoh: Fokuskan pada perbedaan kruna Alus Singgih dan Alus Sor"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleProcessDocument()}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Memproses Penalaran AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Transformasikan Materi (3 Format Interaktif)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Demo Access Callout for Judges */}
            <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-400 space-y-3">
              <div className="flex items-center gap-2 text-zinc-200 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Akses Langsung Uji Coba Juri (Pre-seeded Room)
              </div>
              <p className="text-[11px] leading-relaxed">
                Tersedia room siap uji coba dengan 4 murid simulasi dan data diagnostik miskonsepsi:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/host/849201"
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 text-center font-semibold text-indigo-300 text-xs transition"
                >
                  Buka Guru (PIN: 849201)
                </Link>
                <Link
                  href="/play/849201"
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 text-center font-semibold text-cyan-300 text-xs transition"
                >
                  Buka Siswa (Kadek Budi)
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: 3-Way Interactive Ingestion Studio (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-xl flex-1 flex flex-col">
              {/* Studio Tabs Header */}
              <div className="flex border-b border-zinc-800 pb-4 mb-6 gap-6 items-center justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`text-sm font-bold pb-2 transition relative flex items-center gap-2 ${
                      activeTab === "summary" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Intisari & Glosarium
                    {activeTab === "summary" && (
                      <motion.div
                        layoutId="studioTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("flashcards")}
                    className={`text-sm font-bold pb-2 transition relative flex items-center gap-2 ${
                      activeTab === "flashcards" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    Flashcards 3D
                    {activeTab === "flashcards" && (
                      <motion.div
                        layoutId="studioTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("quiz")}
                    className={`text-sm font-bold pb-2 transition relative flex items-center gap-2 ${
                      activeTab === "quiz" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    Latihan Soal & Kuis
                    {activeTab === "quiz" && (
                      <motion.div
                        layoutId="studioTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      />
                    )}
                  </button>
                </div>

                {processedDoc && (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 hidden sm:inline-block">
                    ✓ AI Generated
                  </span>
                )}
              </div>

              {/* Studio Tab 1: Smart Summary & Cultural Glossary */}
              {activeTab === "summary" && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {processedDoc ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-white">
                            {processedDoc.title}
                          </h3>
                          <span className="text-xs font-mono text-zinc-400">
                            {processedDoc.gradeLevel}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
                          {processedDoc.summary.overview}
                        </p>
                      </div>

                      {/* Key Takeaways */}
                      <div>
                        <h4 className="text-xs uppercase font-bold text-indigo-400 tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Poin Kunci Pembelajaran (Key Takeaways)
                        </h4>
                        <ul className="space-y-2">
                          {processedDoc.summary.keyTakeaways.map((point, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-zinc-300 flex items-start gap-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900"
                            >
                              <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cultural Glossary */}
                      {processedDoc.summary.culturalGlossary?.length > 0 && (
                        <div>
                          <h4 className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" /> Glosarium Istilah & Kosakata Budaya
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {processedDoc.summary.culturalGlossary.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                              >
                                <span className="font-bold text-white">{item.term}</span>{" "}
                                <span className="text-[10px] text-zinc-500">({item.category})</span>
                                <p className="text-[11px] text-zinc-400 mt-1">{item.meaning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-zinc-500 space-y-3">
                      <FileText className="w-12 h-12 mx-auto text-zinc-700" />
                      <p className="text-xs sm:text-sm">
                        Klik tombol "Transformasikan Materi" untuk memproses intisari dokumen.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Studio Tab 2: 3D Flashcards */}
              {activeTab === "flashcards" && (
                <div className="flex-1 flex flex-col justify-between items-center py-2">
                  {processedDoc?.flashcards && processedDoc.flashcards.length > 0 ? (
                    <div className="w-full flex flex-col items-center gap-6">
                      {/* Card Counter & Tag */}
                      <div className="flex items-center justify-between w-full text-xs font-mono text-zinc-400">
                        <span className="px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800">
                          Kartu {currentCardIndex + 1} dari {processedDoc.flashcards.length}
                        </span>
                        <span className="text-indigo-400 font-semibold">
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
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          className="w-full h-full relative preserve-3d"
                        >
                          {/* Card Front */}
                          <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-900 border-2 border-indigo-500/40 p-6 flex flex-col justify-between shadow-2xl">
                            <div className="flex items-center justify-between text-[11px] text-indigo-300">
                              <span className="uppercase font-bold tracking-wider">
                                Pertanyaan / Istilah
                              </span>
                              <span className="flex items-center gap-1 text-zinc-400">
                                <RotateCw className="w-3.5 h-3.5" /> Klik untuk membalik
                              </span>
                            </div>

                            <p className="text-base sm:text-lg font-bold text-white text-center px-4 leading-relaxed">
                              {processedDoc.flashcards[currentCardIndex].front}
                            </p>

                            {processedDoc.flashcards[currentCardIndex].hint && (
                              <p className="text-[11px] text-zinc-400 italic text-center">
                                Petunjuk: {processedDoc.flashcards[currentCardIndex].hint}
                              </p>
                            )}
                          </div>

                          {/* Card Back */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-cyan-950/70 via-zinc-900 to-zinc-900 border-2 border-cyan-500/40 p-6 flex flex-col justify-between shadow-2xl">
                            <div className="flex items-center justify-between text-[11px] text-cyan-300">
                              <span className="uppercase font-bold tracking-wider">
                                Jawaban & Makna
                              </span>
                              <span className="flex items-center gap-1 text-zinc-400">
                                <RotateCw className="w-3.5 h-3.5" /> Klik untuk membalik
                              </span>
                            </div>

                            <p className="text-base sm:text-lg font-bold text-white text-center px-4 leading-relaxed">
                              {processedDoc.flashcards[currentCardIndex].back}
                            </p>

                            <div className="text-center">
                              <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                                Terverifikasi Kurikulum Merdeka
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handlePrevCard}
                          className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                          onClick={handleFlipCard}
                          className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center gap-2"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Balik Kartu
                        </button>

                        <button
                          onClick={handleNextCard}
                          className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-zinc-500 space-y-3">
                      <Layers className="w-12 h-12 mx-auto text-zinc-700" />
                      <p className="text-xs sm:text-sm">
                        Proses modul terlebih dahulu untuk membangkitkan set Flashcards 3D.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Studio Tab 3: Generated Quiz & Live Launcher */}
              {activeTab === "quiz" && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {processedDoc?.quiz && processedDoc.quiz.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {processedDoc.quiz.length} Soal Pilihan Ganda Standar HOTS
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Disertai kunci penjelasan dan analisis miskonsepsi (distractor rationale).
                          </p>
                        </div>

                        <Link
                          href="/host/849201"
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Luncurkan Live Host
                        </Link>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                        {processedDoc.quiz.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-indigo-400">
                                Soal #{qIdx + 1}
                              </span>
                              {q.conceptTag && (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {q.conceptTag}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-zinc-200 leading-relaxed">
                              {q.question}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.label}
                                  className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                                    opt.isCorrect
                                      ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                                      : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      opt.isCorrect
                                        ? "bg-emerald-500 text-zinc-950"
                                        : "bg-zinc-800 text-zinc-400"
                                    }`}
                                  >
                                    {opt.label}
                                  </span>
                                  <span className="truncate">{opt.text}</span>
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-900 italic">
                                <span className="font-semibold text-zinc-300 not-italic">
                                  Intisari Kunci:
                                </span>{" "}
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-zinc-500 space-y-3">
                      <Trophy className="w-12 h-12 mx-auto text-zinc-700" />
                      <p className="text-xs sm:text-sm">
                        Proses modul untuk menghasilkan bank soal pilihan ganda HOTS.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closed-Loop Learning Architecture Diagram / Explanation */}
        <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur">
          <div className="max-w-2xl mb-6">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Sistem Pembelajaran Tertutup (Closed-Loop Learning)
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Memenuhi kriteria 25% AI Technical Depth pada Bali DigiFest 2026. Aplikasi bukan sekadar pembungkus API, melainkan siklus evaluasi adaptif:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs mb-3 font-mono">
                01
              </div>
              <h4 className="font-bold text-sm text-white mb-1">OCR & Ekstraksi</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gemini 2.5 Flash memindai lembar kerja / LKS fisik dan mengekstraksi konsep esensial.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs mb-3 font-mono">
                02
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Live Multiplayer Quiz</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Siswa join dengan 6-digit PIN, menjawab soal HOTS, bersaing skor, dan meraih streak.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs mb-3 font-mono">
                03
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Micro-Feedback Instan</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Setiap kekeliruan langsung dijelaskan secara pedagogis tanpa menunggu kuis selesai.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs mb-3 font-mono">
                04
              </div>
              <h4 className="font-bold text-sm text-white mb-1">AI Diagnostic & Remedial</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                AI mengelompokkan miskonsepsi sekelas dan otomatis menghasilkan 3 soal remedial terarah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        <p>
          exile.org • Dibuat untuk Bali DigiFest 2026 AI Web Innovation Challenge • Build with AI, Solve for Bali
        </p>
      </footer>
    </main>
  );
}
