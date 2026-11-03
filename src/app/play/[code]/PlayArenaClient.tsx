"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Flame,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  Clock,
  ArrowRight,
  HelpCircle,
  Loader2,
  Share2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface Option {
  label: string;
  text: string;
}

interface Question {
  id: string;
  questionOrder: number;
  question: string;
  options: Option[];
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

interface RoomState {
  roomId: string;
  roomCode: string;
  hostName: string;
  status: "waiting" | "active" | "question_active" | "showing_leaderboard" | "finished";
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  leaderboard: LeaderboardEntry[];
  settings: {
    timePerQuestionSec: number;
    streakBonus: boolean;
  };
}

export default function PlayArenaClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();

  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("Siswa");
  const [avatar, setAvatar] = useState<string>("garuda");

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  // Question answering state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<{
    isCorrect: boolean;
    scoreAwarded: number;
    explanation?: string;
    microFeedback?: string;
  } | null>(null);

  // Question countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);

  // Initialize player info from localStorage
  useEffect(() => {
    let storedId = localStorage.getItem("exile_player_id");
    let storedNick = localStorage.getItem("exile_player_nickname");
    let storedAvatar = localStorage.getItem("exile_player_avatar");

    if (!storedId) {
      storedId = "player-" + Math.floor(1000 + Math.random() * 9000);
      storedNick = "Siswa " + storedId.slice(-3);
      storedAvatar = "garuda";
      localStorage.setItem("exile_player_id", storedId);
      localStorage.setItem("exile_player_nickname", storedNick);
      localStorage.setItem("exile_player_avatar", storedAvatar);
    }

    setPlayerId(storedId);
    setNickname(storedNick || "Siswa");
    setAvatar(storedAvatar || "garuda");
  }, []);

  // Poll room state
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/state`);
      const data = await res.json();

      if (res.ok && data.success) {
        setRoomState(data);

        // Detect if question changed
        if (data.currentQuestion && data.currentQuestion.id !== lastQuestionId) {
          setLastQuestionId(data.currentQuestion.id);
          setHasAnsweredCurrentQ(false);
          setSelectedOption(null);
          setLastSubmissionResult(null);
          setTimeLeft(data.settings?.timePerQuestionSec || 20);
          setQuestionStartTime(Date.now());
        }

        // Trigger finish confetti
        if (data.status === "finished") {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }
    } catch (err) {
      console.error("Error polling room state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [roomCode, lastQuestionId]);

  // Countdown timer effect for active question
  useEffect(() => {
    if (
      !roomState?.currentQuestion ||
      hasAnsweredCurrentQ ||
      roomState.status !== "active"
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roomState?.currentQuestion?.id, hasAnsweredCurrentQ, roomState?.status]);

  // Submit Answer
  const handleSelectOption = async (optionLabel: string) => {
    if (hasAnsweredCurrentQ || submitting || !roomState?.currentQuestion) return;

    setSelectedOption(optionLabel);
    setSubmitting(true);

    const responseTimeMs = Date.now() - questionStartTime;
    const currentQ = roomState.currentQuestion;

    try {
      const res = await fetch("/api/rooms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          playerId,
          questionId: currentQ.id,
          selectedOption: optionLabel,
          responseTimeMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim jawaban");

      const isCorrect = data.submission.isCorrect;
      const scoreAwarded = data.submission.scoreAwarded;

      setHasAnsweredCurrentQ(true);

      // If correct, trigger instant celebratory confetti
      if (isCorrect) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        setLastSubmissionResult({
          isCorrect: true,
          scoreAwarded,
          explanation: "Jawabanmu tepat! Kamu memahami konsep dengan sangat baik.",
        });
        toast.success(`+${scoreAwarded} Poin! Benar!`);
      } else {
        // If wrong, request instant AI micro-explanation for closed-loop learning
        toast.error("Waduh, belum tepat!");
        try {
          const explainRes = await fetch("/api/ai/explain-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: currentQ.question,
              selectedOption: optionLabel,
              correctOption: "A", // Backend validates actual key
              options: currentQ.options,
              conceptTag: currentQ.conceptTag,
            }),
          });
          const explainData = await explainRes.json();
          const feedback =
            explainData.explanation?.explanation ||
            "Pilihan ini keliru karena aturan kesantunan bahasa membedakan kata untuk diri sendiri dan orang terhormat.";

          setLastSubmissionResult({
            isCorrect: false,
            scoreAwarded: 0,
            microFeedback: feedback,
          });
        } catch {
          setLastSubmissionResult({
            isCorrect: false,
            scoreAwarded: 0,
            microFeedback:
              "Perhatikan tingkatan kata: Alus Singgih (ASI) meninggikan orang lain, Alus Sor (ASO) merendahkan diri sendiri.",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal submit jawaban";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const myEntry = roomState?.leaderboard.find((p) => p.id === playerId);
  const myScore = myEntry?.score || 0;
  const myStreak = myEntry?.streak || 0;
  const myRank = myEntry?.rank || "-";

  const optionColorStyles = [
    {
      bg: "from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500",
      border: "border-red-500/50",
      letterBg: "bg-red-800/80 text-white",
    },
    {
      bg: "from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
      border: "border-blue-500/50",
      letterBg: "bg-blue-800/80 text-white",
    },
    {
      bg: "from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500",
      border: "border-amber-500/50",
      letterBg: "bg-amber-800/80 text-white",
    },
    {
      bg: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
      border: "border-emerald-500/50",
      letterBg: "bg-emerald-800/80 text-white",
    },
  ];

  if (loading && !roomState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Menghubungkan ke Game Arena exile.org...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top HUD Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white flex items-center gap-2">
                {nickname}
                {myStreak > 1 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {myStreak}x
                  </span>
                )}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono">
                PIN: <span className="text-zinc-200">{roomCode}</span> • Peringkat #{myRank}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-right">
              <p className="text-[10px] uppercase font-bold text-zinc-400">Poin</p>
              <p className="text-base font-black font-mono text-indigo-400 leading-none">
                {myScore.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Arena Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 w-full flex-1 flex flex-col justify-center">
        {/* State 1: Room Waiting */}
        {roomState?.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 px-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mb-2">Kamu Sudah Masuk!</h2>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                Tunggu Guru <strong className="text-zinc-200">{roomState.hostName}</strong> memulai kuis di layar utama.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Tersambung ke Room {roomCode}
            </div>
          </motion.div>
        )}

        {/* State 2: Active Question Playing */}
        {roomState?.status === "active" && roomState.currentQuestion && (
          <div className="space-y-6">
            {/* Question Progress & Timer */}
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 font-mono">
                Soal {(roomState.currentQuestionIndex || 0) + 1} dari {roomState.totalQuestions}
              </span>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className={timeLeft <= 5 ? "text-red-400 font-bold" : "text-zinc-200"}>
                  {timeLeft} detik
                </span>
              </div>
            </div>

            {/* Question Box */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
              {roomState.currentQuestion.conceptTag && (
                <span className="inline-block text-[11px] font-semibold text-indigo-400 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3">
                  {roomState.currentQuestion.conceptTag}
                </span>
              )}

              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {roomState.currentQuestion.question}
              </h2>
            </div>

            {/* 4 Interactive Option Buttons or Feedback Result */}
            {!hasAnsweredCurrentQ ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roomState.currentQuestion.options.map((option, idx) => {
                  const style = optionColorStyles[idx % optionColorStyles.length];
                  return (
                    <motion.button
                      key={option.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectOption(option.label)}
                      disabled={submitting}
                      className={`p-5 rounded-2xl bg-gradient-to-r ${style.bg} ${style.border} border shadow-lg text-left transition relative flex items-start gap-4 disabled:opacity-50`}
                    >
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow ${style.letterBg}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-white font-bold text-sm sm:text-base leading-snug mt-1">
                        {option.text}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              /* Instant Feedback Screen with AI Micro-Explanation */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 sm:p-8 rounded-3xl border backdrop-blur shadow-2xl ${
                  lastSubmissionResult?.isCorrect
                    ? "bg-emerald-950/30 border-emerald-500/40"
                    : "bg-rose-950/30 border-rose-500/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {lastSubmissionResult?.isCorrect ? (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-black text-white">
                      {lastSubmissionResult?.isCorrect
                        ? "Luar Biasa! Jawaban Tepat!"
                        : "Waduh, Belum Tepat!"}
                    </h3>
                    <p className="text-xs text-zinc-300 font-mono">
                      {lastSubmissionResult?.isCorrect
                        ? `+${lastSubmissionResult.scoreAwarded} Poin bertambah!`
                        : "0 Poin. Simak penjelasan di bawah:"}
                    </p>
                  </div>
                </div>

                {/* Instant AI Micro-Feedback */}
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs sm:text-sm text-zinc-200 leading-relaxed mb-4">
                  <strong className="block text-indigo-400 uppercase text-[11px] mb-1">
                    {lastSubmissionResult?.isCorrect ? "Ulasan Konsep:" : "Intisari Miskonsepsi:"}
                  </strong>
                  {lastSubmissionResult?.microFeedback ||
                    lastSubmissionResult?.explanation ||
                    "Jawaban telah direkam oleh sistem pembelajaran exile.org."}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 pt-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  Menunggu Guru membuka soal berikutnya...
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* State 3: Showing Leaderboard */}
        {roomState?.status === "showing_leaderboard" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-6"
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Papan Skor Sementara</h2>
              <p className="text-xs text-zinc-400">
                Peringkat kamu saat ini: <strong>#{myRank}</strong> ({myScore} pts)
              </p>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {roomState.leaderboard.map((player) => (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    player.id === playerId
                      ? "bg-indigo-950/40 border-indigo-500/50"
                      : "bg-zinc-950 border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center justify-center">
                      {player.rank}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {player.nickname} {player.id === playerId && "(Kamu)"}
                    </span>
                  </div>

                  <span className="font-mono text-sm font-bold text-indigo-400">
                    {player.score} pts
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* State 4: Finished Game Podium */}
        {roomState?.status === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-6 bg-zinc-900/90 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white mb-2">Kuis Telah Selesai!</h2>
              <p className="text-sm text-zinc-400">
                Selamat! Kamu menyelesaikan kuis dengan total{" "}
                <strong className="text-indigo-400">{myScore.toLocaleString()} Poin</strong> (Peringkat #{myRank}).
              </p>
            </div>

            {/* Podium top 3 */}
            <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
              {/* 2nd place */}
              {roomState.leaderboard[1] && (
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center">
                  <span className="text-xl">🥈</span>
                  <p className="text-xs font-bold text-white truncate w-full">
                    {roomState.leaderboard[1].nickname}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {roomState.leaderboard[1].score} pts
                  </span>
                </div>
              )}

              {/* 1st place */}
              {roomState.leaderboard[0] && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col items-center scale-105 shadow-xl">
                  <span className="text-2xl">👑</span>
                  <p className="text-sm font-black text-amber-300 truncate w-full">
                    {roomState.leaderboard[0].nickname}
                  </p>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {roomState.leaderboard[0].score} pts
                  </span>
                </div>
              )}

              {/* 3rd place */}
              {roomState.leaderboard[2] && (
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center">
                  <span className="text-xl">🥉</span>
                  <p className="text-xs font-bold text-white truncate w-full">
                    {roomState.leaderboard[2].nickname}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {roomState.leaderboard[2].score} pts
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/play"
                className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition text-center"
              >
                Masuk Room Lain
              </Link>
              <Link
                href="/"
                className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition text-center"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
