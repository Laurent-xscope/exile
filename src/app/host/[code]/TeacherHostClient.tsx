"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiBookOpenLine,
  RiTrophyLine,
  RiGroupLine,
  RiFileCopyLine,
  RiArrowRightLine,
  RiCheckLine,
  RiSparklingLine,
  RiRefreshLine,
  RiCloseLine,
  RiLightbulbLine,
  RiShieldCheckLine,
  RiFlashlightLine,
} from "@remixicon/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { soundEffects } from "@/lib/audio/sounds";

interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
  distractorRationale?: string;
}

interface Question {
  id: string;
  questionOrder: number;
  question: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  conceptTag?: string;
  culturalContext?: string;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
}

interface TeacherRoomState {
  roomId: string;
  roomCode: string;
  quizId: string;
  hostName: string;
  status: "waiting" | "active" | "question_active" | "showing_leaderboard" | "finished";
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  stats: {
    submissionsCount: number;
    totalPlayers: number;
    correctCount: number;
    accuracyPercentage: number;
    optionCounts: Record<string, number>;
  };
  leaderboard: LeaderboardEntry[];
  players: Array<{
    id: string;
    nickname: string;
    avatar: string;
    score: number;
    streak: number;
    isConnected: boolean;
  }>;
}

interface ClusterItem {
  concept: string;
  errorRate: number;
  primaryMisconception: string;
  affectedStudentsCount: number;
}

interface RemedialQuestion {
  question: string;
  options: Array<{
    label: string;
    text: string;
    isCorrect: boolean;
    distractorRationale?: string;
  }>;
  explanation: string;
  conceptTag?: string;
  culturalContext?: string;
}

interface DiagnosticResult {
  topic: string;
  classMasteryRate: number;
  summaryText: string;
  clusterAnalysis: ClusterItem[];
  recommendedReteaching: {
    focusConcept: string;
    pedagogicalStrategy: string;
    quickActionableStep: string;
  };
  adaptiveRemedialQuestions: RemedialQuestion[];
}

export default function TeacherHostClient({ roomCode }: { roomCode: string }) {
  const [state, setState] = useState<TeacherRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticResult | null>(null);
  const [activeTab, setActiveTab] = useState<"question" | "leaderboard" | "players">("question");

  const fetchRoomState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_teacher_state" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data);
      }
    } catch (err) {
      console.error("Error fetching room state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 2500);

    // Supabase Realtime subscription for live classroom feedback
    let channel: any = null;
    try {
      const isPlaceholder =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

      if (!isPlaceholder) {
        channel = supabase
          .channel(`teacher-host-${roomCode}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "submissions",
              filter: `room_code=eq.${roomCode}`,
            },
            () => {
              fetchRoomState();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players",
              filter: `room_code=eq.${roomCode}`,
            },
            () => {
              fetchRoomState();
            }
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn("[TeacherHost] Supabase Realtime subscription skipped:", realtimeErr);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode]);

  const handleAction = async (action: string) => {
    soundEffects.playClick();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");

      await fetchRoomState();
      toast.success("Status ruangan diperbarui");

      if (action === "finish_game") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        soundEffects.playVictory();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses aksi";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateAnswer = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate_answer" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data.details);
        toast.info("Simulasi respon siswa ditambahkan");
      }
    } catch {
      toast.error("Gagal melakukan simulasi");
    }
  };

  const handleRunDiagnostic = async () => {
    setDiagnosticLoading(true);
    setShowDiagnosticModal(true);

    try {
      const res = await fetch("/api/ai/class-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          teacherNotes: "Evaluasi pemahaman Basa Bali Alus dan Pasang Aksara.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses diagnostik");

      setDiagnosticData(data.diagnostic);
      toast.success("Laporan diagnostik berhasil disusun");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyusun diagnostik";
      toast.error(msg);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("PIN kuis disalin");
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-[#140D08] flex flex-col items-center justify-center text-[#BFA98A] gap-3">
        <span className="w-5 h-5 border-2 border-[#CA8A04]/30 border-t-[#CA8A04] rounded-full animate-spin" />
        <p className="text-xs">Menyambungkan ke ruang guru...</p>
      </div>
    );
  }

  const currentQ = state?.currentQuestion;
  const stats = state?.stats;
  const submissionsCount = stats?.submissionsCount || 0;
  const totalPlayers = stats?.totalPlayers || 1;
  const progressPercent = Math.min(100, Math.round((submissionsCount / totalPlayers) * 100));

  return (
    <main className="min-h-screen bg-[#140D08] text-[#F5E6D3] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#331F14] bg-[#1A0F0A]/95 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04] hover:border-[#CA8A04] transition"
            >
              <RiBookOpenLine className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-sm sm:text-base text-[#F5E6D3]">
                  Ruang Kontrol Guru
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#14532D]/30 text-[#22C55E] border border-[#16A34A]/30">
                  Kuis berlangsung
                </span>
              </div>
              <p className="text-xs text-[#BFA98A]">
                Pengajar: {state?.hostName || "Guru Sujana"} • Kurikulum Merdeka Bali
              </p>
            </div>
          </div>

          {/* PIN Card */}
          <div className="flex items-center gap-3">
            <div
              onClick={copyPin}
              className="cursor-pointer flex items-center gap-3 px-4 py-1.5 rounded bg-[#24160E] border border-[#CA8A04]/50 hover:border-[#CA8A04] transition"
            >
              <div>
                <span className="text-[10px] text-[#BFA98A] block">PIN ruang kuis</span>
                <span className="font-heading font-bold text-lg text-[#CA8A04] leading-tight">
                  {roomCode}
                </span>
              </div>
              <RiFileCopyLine className="w-3.5 h-3.5 text-[#BFA98A]" />
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-[#24160E] border border-[#331F14] text-xs">
              <RiGroupLine className="w-3.5 h-3.5 text-[#BFA98A]" />
              <span className="text-[#D6C5B2]">
                {state?.players.length || 0} siswa terhubung
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Question & Stats (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Tabs & Controls */}
          <div className="flex items-center justify-between border-b border-[#331F14] pb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("question")}
                className={`text-xs sm:text-sm font-semibold pb-2.5 -mb-2.5 transition relative flex items-center gap-1.5 ${
                  activeTab === "question"
                    ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                    : "text-[#BFA98A] hover:text-[#F5E6D3]"
                }`}
              >
                <RiBookOpenLine className="w-4 h-4" />
                Pertanyaan aktif
              </button>

              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`text-xs sm:text-sm font-semibold pb-2.5 -mb-2.5 transition relative flex items-center gap-1.5 ${
                  activeTab === "leaderboard"
                    ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                    : "text-[#BFA98A] hover:text-[#F5E6D3]"
                }`}
              >
                <RiTrophyLine className="w-4 h-4" />
                Papan skor
              </button>

              <button
                onClick={() => setActiveTab("players")}
                className={`text-xs sm:text-sm font-semibold pb-2.5 -mb-2.5 transition relative flex items-center gap-1.5 ${
                  activeTab === "players"
                    ? "text-[#CA8A04] border-b-2 border-[#CA8A04]"
                    : "text-[#BFA98A] hover:text-[#F5E6D3]"
                }`}
              >
                <RiGroupLine className="w-4 h-4" />
                Daftar siswa ({state?.players.length || 0})
              </button>
            </div>

            <button
              onClick={handleSimulateAnswer}
              className="text-xs px-2.5 py-1 rounded bg-[#24160E] hover:bg-[#331F14] border border-[#4A2E1F] text-[#CA8A04] transition flex items-center gap-1 font-medium"
            >
              <RiFlashlightLine className="w-3.5 h-3.5" />
              Simulasi jawaban murid
            </button>
          </div>

          {/* Tab 1: Current Question Stage */}
          {activeTab === "question" && currentQ && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between text-xs text-[#BFA98A]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#24160E] border border-[#4A2E1F] text-[#CA8A04] font-medium">
                      Soal {(state?.currentQuestionIndex || 0) + 1} dari {state?.totalQuestions || 5}
                    </span>
                    {currentQ.conceptTag && (
                      <span className="text-xs text-[#D6C5B2]">{currentQ.conceptTag}</span>
                    )}
                  </div>

                  <span className="text-xs text-[#BFA98A]">
                    Respon masuk: <strong className="text-[#F5E6D3]">{submissionsCount}</strong>/{totalPlayers} siswa
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-1.5 bg-[#140D08] rounded-full overflow-hidden border border-[#331F14]">
                  <div
                    className="h-full bg-[#CA8A04] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Question Text */}
                <h2 className="text-base sm:text-lg font-medium text-[#F5E6D3] leading-relaxed">
                  {currentQ.question}
                </h2>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {currentQ.options.map((option) => {
                    const optKey = option.label.toUpperCase();
                    const voteCount = stats?.optionCounts?.[optKey] || 0;
                    const votePercent =
                      submissionsCount > 0 ? Math.round((voteCount / submissionsCount) * 100) : 0;

                    return (
                      <div
                        key={option.label}
                        className={`p-3.5 rounded-lg border text-xs transition relative overflow-hidden ${
                          option.isCorrect
                            ? "bg-[#14532D]/15 border-[#16A34A]/50"
                            : "bg-[#24160E] border-[#4A2E1F]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5 relative z-10">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                                option.isCorrect
                                  ? "bg-[#16A34A] text-[#140D08]"
                                  : "bg-[#331F14] text-[#BFA98A] border border-[#4A2E1F]"
                              }`}
                            >
                              {option.label}
                            </span>
                            <span className="font-medium text-[#F5E6D3]">{option.text}</span>
                          </div>

                          <span className="text-[11px] text-[#BFA98A] font-medium shrink-0">
                            {voteCount} ({votePercent}%)
                          </span>
                        </div>

                        {option.distractorRationale && (
                          <p className="text-[11px] text-[#BFA98A] italic border-t border-[#331F14] pt-1.5 mt-1.5">
                            {option.isCorrect ? "Kunci jawaban: " : "Analisis pengecoh: "}
                            {option.distractorRationale}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Explanation Callout */}
                {currentQ.explanation && (
                  <div className="p-3.5 rounded bg-[#24160E] border border-[#4A2E1F] text-xs space-y-1">
                    <span className="font-semibold text-[#CA8A04] flex items-center gap-1">
                      <RiLightbulbLine className="w-3.5 h-3.5" /> Intisari penjelasan
                    </span>
                    <p className="text-[#D6C5B2] leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Leaderboard */}
          {activeTab === "leaderboard" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 shadow-sm space-y-3"
            >
              <h2 className="text-sm font-heading font-semibold text-[#F5E6D3] mb-3">
                Peringkat nilai siswa
              </h2>

              <div className="space-y-2">
                {state?.leaderboard.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded bg-[#24160E] border border-[#331F14] text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-[#140D08] border border-[#4A2E1F] text-[#CA8A04] font-bold flex items-center justify-center">
                        {player.rank}
                      </span>
                      <div>
                        <span className="font-semibold text-[#F5E6D3] block">{player.nickname}</span>
                        <span className="text-[11px] text-[#BFA98A]">Lambang: {player.avatar}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-[#CA8A04]">{player.score}</span>
                      <span className="text-[11px] text-[#BFA98A] ml-1">poin</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Connected Players */}
          {activeTab === "players" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 shadow-sm space-y-3"
            >
              <h2 className="text-sm font-heading font-semibold text-[#F5E6D3] mb-3">
                Daftar siswa yang terhubung
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {state?.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded bg-[#24160E] border border-[#331F14] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      <span className="font-medium text-[#F5E6D3]">{p.nickname}</span>
                    </div>
                    <span className="text-[#CA8A04] font-medium">{p.score} poin</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Host Controls & Diagnostic (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Controls Card */}
          <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#BFA98A] uppercase tracking-wide">
              Kontrol ruang kelas
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleAction("advance_question")}
                disabled={actionLoading}
                className="w-full py-2.5 px-3 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <RiArrowRightLine className="w-4 h-4" />
                Lanjut ke pertanyaan berikutnya
              </button>

              <button
                onClick={() => handleAction("show_leaderboard")}
                disabled={actionLoading}
                className="w-full py-2 px-3 rounded bg-[#24160E] hover:bg-[#331F14] border border-[#4A2E1F] text-[#D6C5B2] text-xs font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RiTrophyLine className="w-4 h-4 text-[#CA8A04]" />
                Tampilkan papan skor di layar
              </button>

              <button
                onClick={() => handleAction("finish_game")}
                disabled={actionLoading}
                className="w-full py-2 px-3 rounded bg-[#140D08] hover:bg-[#24160E] border border-[#331F14] text-[#BFA98A] text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RiCheckLine className="w-4 h-4 text-[#22C55E]" />
                Selesaikan sesi kuis
              </button>
            </div>
          </div>

          {/* AI Misconception Diagnostic Launcher */}
          <div className="bg-[#1A0F0A] border border-[#4A2E1F] rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
                <RiSparklingLine className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-[#F5E6D3]">
                  Diagnostik Miskonsepsi Kelas
                </h3>
                <p className="text-[11px] text-[#BFA98A]">Siklus evaluasi Kurikulum Merdeka</p>
              </div>
            </div>

            <p className="text-xs text-[#BFA98A] leading-relaxed">
              Kaji kekeliruan jawaban siswa sekelas untuk menemukan pola materi yang belum dipahami,
              serta susun tiga butir soal remedial terarah.
            </p>

            <button
              onClick={handleRunDiagnostic}
              disabled={diagnosticLoading}
              className="w-full py-2.5 px-3 rounded bg-[#24160E] hover:bg-[#331F14] border border-[#CA8A04]/60 text-[#CA8A04] hover:text-[#F5E6D3] font-semibold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {diagnosticLoading ? (
                <>
                  <RiRefreshLine className="w-4 h-4 animate-spin" />
                  Menganalisis jawaban murid...
                </>
              ) : (
                <>
                  <RiSparklingLine className="w-4 h-4" />
                  Buka laporan diagnostik kelas
                </>
              )}
            </button>
          </div>

          {/* Quick Guide */}
          <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-4 text-xs text-[#BFA98A] space-y-2">
            <span className="font-semibold text-[#F5E6D3] block">Petunjuk cepat pengajar:</span>
            <ul className="space-y-1 list-disc list-inside text-xs leading-relaxed">
              <li>Siswa masuk dari tautan <Link href="/play" className="text-[#CA8A04] underline">/play</Link> dengan PIN <strong>{roomCode}</strong>.</li>
              <li>Klik tombol simulasi untuk menguji respon sebelum siswa mulai menjawab.</li>
              <li>Selesai kuis, buka laporan diagnostik untuk melihat rekomendasi intervensi.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Diagnostic Modal */}
      <AnimatePresence>
        {showDiagnosticModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#1A0F0A] border border-[#4A2E1F] rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#331F14] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
                    <RiSparklingLine className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-heading font-bold text-[#F5E6D3]">
                    Laporan Diagnostik Miskonsepsi Kelas
                  </h3>
                </div>

                <button
                  onClick={() => setShowDiagnosticModal(false)}
                  className="w-7 h-7 rounded bg-[#24160E] text-[#BFA98A] hover:text-[#F5E6D3] flex items-center justify-center transition border border-[#331F14]"
                >
                  <RiCloseLine className="w-4 h-4" />
                </button>
              </div>

              {diagnosticLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <span className="w-6 h-6 border-2 border-[#CA8A04]/30 border-t-[#CA8A04] rounded-full animate-spin" />
                  <p className="text-xs text-[#D6C5B2]">
                    Menganalisis klaster miskonsepsi siswa sekelas...
                  </p>
                </div>
              ) : diagnosticData ? (
                <div className="space-y-4">
                  {/* Summary Card with Mastery Rate */}
                  <div className="p-4 rounded bg-[#24160E] border border-[#4A2E1F] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#CA8A04]">
                        Rangkuman diagnostik kelas
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#140D08] border border-[#4A2E1F] text-[#F5E6D3] font-medium">
                        Penguasaan materi: {diagnosticData.classMasteryRate}%
                      </span>
                    </div>
                    <p className="text-xs text-[#D6C5B2] leading-relaxed">
                      {diagnosticData.summaryText}
                    </p>
                  </div>

                  {/* Clusters of Misconceptions */}
                  {diagnosticData.clusterAnalysis?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-[#BFA98A]">
                        Pola materi yang sering keliru:
                      </h4>
                      <div className="space-y-2">
                        {diagnosticData.clusterAnalysis.map((cluster, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded bg-[#140D08] border border-[#331F14] space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#F5E6D3]">{cluster.concept}</span>
                              <span className="text-[11px] text-[#F87171] px-1.5 py-0.5 rounded bg-[#451A1A]/30 border border-[#991B1B]/30">
                                Salah: {cluster.errorRate}% ({cluster.affectedStudentsCount} siswa)
                              </span>
                            </div>
                            <p className="text-xs text-[#BFA98A] leading-relaxed">
                              {cluster.primaryMisconception}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation Card */}
                  {diagnosticData.recommendedReteaching && (
                    <div className="p-3.5 rounded bg-[#14532D]/15 border border-[#16A34A]/30 text-xs text-[#D6C5B2] space-y-1.5">
                      <span className="font-semibold text-[#22C55E] block">
                        Rekomendasi langkah ajar ulang:
                      </span>
                      <p className="font-medium text-[#F5E6D3]">
                        {diagnosticData.recommendedReteaching.focusConcept}
                      </p>
                      <p className="text-xs text-[#BFA98A]">
                        {diagnosticData.recommendedReteaching.pedagogicalStrategy}
                      </p>
                      <div className="text-[11px] text-[#22C55E] pt-1">
                        Langkah cepat 10 menit: {diagnosticData.recommendedReteaching.quickActionableStep}
                      </div>
                    </div>
                  )}

                  {/* Remedial Drill Questions */}
                  {diagnosticData.adaptiveRemedialQuestions?.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-semibold text-[#CA8A04] flex items-center gap-1.5">
                        <RiSparklingLine className="w-3.5 h-3.5" /> 3 butir soal remedial yang disarankan:
                      </h4>

                      <div className="space-y-2">
                        {diagnosticData.adaptiveRemedialQuestions.map((rq, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded bg-[#140D08] border border-[#331F14] space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#CA8A04]">
                                Soal remedial #{idx + 1}
                              </span>
                              {rq.conceptTag && (
                                <span className="text-[11px] text-[#BFA98A]">{rq.conceptTag}</span>
                              )}
                            </div>
                            <p className="text-[#F5E6D3] leading-relaxed">{rq.question}</p>
                            <div className="text-[11px] text-[#BFA98A] pt-1 border-t border-[#24160E]">
                              <span className="text-[#22C55E] font-medium">Kunci:</span>{" "}
                              {rq.options.find((o) => o.isCorrect)?.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowDiagnosticModal(false);
                      toast.success("Rekomendasi remedial tersimpan");
                    }}
                    className="w-full py-2 px-4 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold text-xs transition"
                  >
                    Tutup laporan diagnostik
                  </button>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
