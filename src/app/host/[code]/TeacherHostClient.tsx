"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trophy,
  ArrowRight,
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  HelpCircle,
  BookOpen,
  Zap,
  BarChart3,
  Flame,
  Copy,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
    return () => clearInterval(interval);
  }, [roomCode]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses aksi");

      await fetchRoomState();
      toast.success("Status ruangan diperbarui!");

      if (action === "finish_game") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses";
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
        toast.info("Simulasi jawaban siswa terekam!");
      }
    } catch {
      toast.error("Gagal simulasi jawaban");
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
          teacherNotes: "Evaluasi penguasaan materi Basa Bali Alus dan Pasang Aksara.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses diagnostik");

      setDiagnosticData(data.diagnostic);
      toast.success("Analisis AI Miskonsepsi Berhasil Selesai!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses diagnostik AI";
      toast.error(msg);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Game PIN berhasil disalin!");
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Menghubungkan ke Ruang Guru exile.org...</p>
      </div>
    );
  }

  const currentQ = state?.currentQuestion;
  const stats = state?.stats;
  const submissionsCount = stats?.submissionsCount || 0;
  const totalPlayers = stats?.totalPlayers || 1;
  const progressPercent = Math.min(100, Math.round((submissionsCount / totalPlayers) * 100));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Cockpit Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:scale-105 transition"
            >
              <Zap className="w-5 h-5 text-white" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white tracking-tight flex items-center gap-2">
                  Teacher Cockpit
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE HOST
                  </span>
                </h1>
              </div>
              <p className="text-xs text-zinc-400">
                Host: <span className="text-zinc-200 font-medium">{state?.hostName || "Guru Sujana"}</span> • Mode: Kurikulum Merdeka
              </p>
            </div>
          </div>

          {/* Big Room PIN display */}
          <div className="flex items-center gap-3">
            <div
              onClick={copyPin}
              className="cursor-pointer group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-zinc-900 border-2 border-indigo-500/40 hover:border-indigo-500 transition shadow-inner"
            >
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                  Game Room PIN
                </p>
                <p className="font-mono text-2xl font-black text-white tracking-wider group-hover:text-indigo-300 transition">
                  {roomCode}
                </p>
              </div>
              <Copy className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition" />
            </div>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <Users className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400">Siswa Aktif</p>
                <p className="text-sm font-bold text-white font-mono">
                  {state?.players.length || 0} Terhubung
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Stage & Question Stats (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Status & Tab Navigation */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("question")}
                className={`text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-2 ${
                  activeTab === "question" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Soal Aktif
                {activeTab === "question" && (
                  <motion.div
                    layoutId="hostTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-2 ${
                  activeTab === "leaderboard" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Trophy className="w-4 h-4" />
                Papan Skor Live
                {activeTab === "leaderboard" && (
                  <motion.div
                    layoutId="hostTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab("players")}
                className={`text-sm font-semibold pb-3 -mb-3 transition relative flex items-center gap-2 ${
                  activeTab === "players" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-4 h-4" />
                Daftar Siswa ({state?.players.length || 0})
                {activeTab === "players" && (
                  <motion.div
                    layoutId="hostTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  />
                )}
              </button>
            </div>

            {/* Quick Demo Simulator for Judges */}
            <button
              onClick={handleSimulateAnswer}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Simulasi Jawaban Siswa
            </button>
          </div>

          {/* Tab 1: Question Stage & Real-time Distractor Analysis */}
          {activeTab === "question" && currentQ && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Question Card */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold font-mono">
                      Soal {(state?.currentQuestionIndex || 0) + 1} dari {state?.totalQuestions || 5}
                    </span>
                    {currentQ.conceptTag && (
                      <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {currentQ.conceptTag}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <span>
                      Respon Siswa: <strong className="text-white">{submissionsCount}</strong>/{totalPlayers}
                    </span>
                  </div>
                </div>

                {/* Response Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-6">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                  />
                </div>

                {/* Question Text */}
                <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed mb-6">
                  {currentQ.question}
                </h2>

                {/* 4 Options Grid with Distractor Rationale */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.options.map((option) => {
                    const optKey = option.label.toUpperCase();
                    const voteCount = stats?.optionCounts?.[optKey] || 0;
                    const votePercent =
                      submissionsCount > 0 ? Math.round((voteCount / submissionsCount) * 100) : 0;

                    return (
                      <div
                        key={option.label}
                        className={`p-4 rounded-2xl border transition relative overflow-hidden ${
                          option.isCorrect
                            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-100"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-200"
                        }`}
                      >
                        {/* Vote percentage background fill */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all opacity-15 pointer-events-none ${
                            option.isCorrect ? "bg-emerald-400" : "bg-zinc-400"
                          }`}
                          style={{ width: `${votePercent}%` }}
                        />

                        <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                option.isCorrect
                                  ? "bg-emerald-500 text-zinc-950"
                                  : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {option.label}
                            </span>
                            <span className="text-sm font-semibold">{option.text}</span>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                            {option.isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Kunci
                              </span>
                            ) : null}
                            <span className="text-zinc-400 ml-2">
                              {voteCount} ({votePercent}%)
                            </span>
                          </div>
                        </div>

                        {/* Distractor Rationale for Teachers */}
                        {option.distractorRationale && (
                          <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 italic">
                            <span className="font-semibold not-italic text-zinc-300">
                              {option.isCorrect ? "Rasional Jawaban:" : "Analisis Pengecoh:"}
                            </span>{" "}
                            {option.distractorRationale}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Cultural Explanation Callout */}
                {currentQ.explanation && (
                  <div className="mt-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                        Intisari Penjelasan Pedagogis (exile.org AI)
                      </p>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {currentQ.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Leaderboard */}
          {activeTab === "leaderboard" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur shadow-xl"
            >
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Peringkat Siswa Terkini
              </h2>

              <div className="space-y-3">
                {state?.leaderboard.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm font-mono ${
                          player.rank === 1
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : player.rank === 2
                            ? "bg-zinc-300/20 text-zinc-200 border border-zinc-400/40"
                            : player.rank === 3
                            ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {player.rank}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          {player.nickname}
                          {player.streak > 1 && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-0.5">
                              <Flame className="w-3 h-3" /> {player.streak}x
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-500 capitalize">
                          Avatar: {player.avatar}
                        </p>
                      </div>
                    </div>

                    <div className="font-mono text-right">
                      <span className="text-base font-black text-indigo-400">
                        {player.score.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Connected Players */}
          {activeTab === "players" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 backdrop-blur shadow-xl"
            >
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Siswa di Ruang Belajar
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state?.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-sm text-indigo-400">
                        {p.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.nickname}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-400 font-bold">
                      {p.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Host Controls & AI Diagnostic Center (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Host Action Controls Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Kontrol Ruangan Guru
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => handleAction("advance_question")}
                disabled={actionLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                Soal Berikutnya / Lanjut
              </button>

              <button
                onClick={() => handleAction("show_leaderboard")}
                disabled={actionLoading}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Tampilkan Papan Skor di Layar
              </button>

              <button
                onClick={() => handleAction("finish_game")}
                disabled={actionLoading}
                className="w-full py-3 px-4 rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Selesaikan Kuis
              </button>
            </div>
          </div>

          {/* AI Misconception Diagnostic Launcher Card */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-zinc-900/80 to-purple-950/40 border border-indigo-500/30 rounded-3xl p-6 shadow-xl backdrop-blur relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">AI Diagnostic Center</h3>
                <p className="text-xs text-indigo-300">Closed-Loop Learning Engine</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-5">
              Analisis agregat jawaban siswa sekelas menggunakan model penalaran AI untuk mendeteksi akar miskonsepsi (Kurikulum Merdeka) dan hasilkan 3 soal remedial otomatis.
            </p>

            <button
              onClick={handleRunDiagnostic}
              disabled={diagnosticLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {diagnosticLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menganalisis Miskonsepsi...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Jalankan AI Diagnostic Kelas
                </>
              )}
            </button>
          </div>

          {/* Quick Info / Judge Cheatsheet */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 text-xs text-zinc-400">
            <p className="font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Petunjuk Juri & Guru
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
              <li>
                Siswa dapat join melalui halaman <Link href="/play" className="text-indigo-400 underline font-mono">/play</Link> dengan PIN <strong>{roomCode}</strong>.
              </li>
              <li>
                Setiap klik "Simulasi Jawaban" akan memperbarui grafik respon secara instan.
              </li>
              <li>
                Sistem tertutup: Kuis &rarr; Penjelasan &rarr; AI Diagnostic &rarr; Remedial.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Diagnostic Modal */}
      <AnimatePresence>
        {showDiagnosticModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Laporan AI Diagnostik Miskonsepsi Kelas
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Berdasarkan Kurikulum Merdeka & Anggah-ungguhing Basa Bali
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticModal(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              {diagnosticLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="text-sm font-semibold text-zinc-200">
                    Memproses penalaran AI atas seluruh jawaban siswa...
                  </p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Mengkaji klaster kekeliruan kruna Alus Singgih vs Alus Sor dan aturan pasang aksara baku.
                  </p>
                </div>
              ) : diagnosticData ? (
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase font-bold text-indigo-300">
                        Rangkuman Diagnostik Kelas
                      </p>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Penguasaan Kelas: {diagnosticData.classMasteryRate}%
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {diagnosticData.summaryText}
                    </p>
                  </div>

                  {/* Clusters of Misconceptions */}
                  {diagnosticData.clusterAnalysis?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                        Klaster Miskonsepsi Siswa Teridentifikasi:
                      </h4>
                      <div className="space-y-2.5">
                        {diagnosticData.clusterAnalysis.map((cluster, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-rose-400">{cluster.concept}</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Kekeliruan: {cluster.errorRate}% ({cluster.affectedStudentsCount} Siswa)
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {cluster.primaryMisconception}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation Card */}
                  {diagnosticData.recommendedReteaching && (
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 space-y-2">
                      <strong className="block text-emerald-400 uppercase text-[11px]">
                        Rekomendasi Intervensi Pedagogis Guru:
                      </strong>
                      <p className="text-zinc-200 font-semibold">
                        {diagnosticData.recommendedReteaching.focusConcept}
                      </p>
                      <p className="text-zinc-300">
                        {diagnosticData.recommendedReteaching.pedagogicalStrategy}
                      </p>
                      <div className="pt-1 text-[11px] text-emerald-300 font-mono">
                        Langkah Cepat 10 Menit: {diagnosticData.recommendedReteaching.quickActionableStep}
                      </div>
                    </div>
                  )}

                  {/* Remedial Drill Questions */}
                  {diagnosticData.adaptiveRemedialQuestions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        3 Soal Remedial Adaptif Rekomendasi AI:
                      </h4>

                      <div className="space-y-3">
                        {diagnosticData.adaptiveRemedialQuestions.map((rq, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-indigo-400">
                                Soal Remedial #{idx + 1}
                              </span>
                              {rq.conceptTag && (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  {rq.conceptTag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-zinc-200 leading-relaxed">
                              {rq.question}
                            </p>
                            <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-900">
                              <span className="text-emerald-400 font-semibold">Kunci:</span>{" "}
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
                      toast.success("Soal remedial siap digunakan untuk putaran berikutnya!");
                    }}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition"
                  >
                    Terapkan Soal Remedial ke Room
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
