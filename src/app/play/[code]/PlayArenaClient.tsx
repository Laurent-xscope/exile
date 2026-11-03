"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiBookOpenLine,
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
  RiTrophyLine,
  RiFireLine,
} from "@remixicon/react";
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

    // Auto-register to room if opened directly
    fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        nickname: storedNick || "Siswa",
        avatar: storedAvatar || "garuda",
      }),
    }).catch(() => {});
  }, [roomCode]);

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
            particleCount: 60,
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

  // Countdown timer effect
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

      if (isCorrect) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
        setLastSubmissionResult({
          isCorrect: true,
          scoreAwarded,
          explanation: "Pilihanmu tepat! Kamu memahami konteks kesantunan dengan benar.",
        });
        toast.success(`+${scoreAwarded} poin diperoleh`);
      } else {
        toast.error("Pilihan belum tepat");
        try {
          const explainRes = await fetch("/api/ai/explain-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: currentQ.question,
              selectedOption: optionLabel,
              correctOption: "A",
              options: currentQ.options,
              conceptTag: currentQ.conceptTag,
            }),
          });
          const explainData = await explainRes.json();
          const feedback =
            explainData.explanation?.explanation ||
            "Pilihan ini kurang pas karena kata untuk diri sendiri berbeda dengan kata untuk orang yang dihormati.";

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
              "Ingat kaidah: Alus Singgih digunakan memuliakan orang lain, Alus Sor untuk merendahkan diri sendiri.",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim jawaban";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const myEntry = roomState?.leaderboard.find((p) => p.id === playerId);
  const myScore = myEntry?.score || 0;
  const myStreak = myEntry?.streak || 0;
  const myRank = myEntry?.rank || "-";

  const optionStyles = [
    {
      card: "bg-[#24160E] hover:bg-[#331F14] border-[#4A2E1F] hover:border-[#CA8A04]",
      badge: "bg-[#331F14] text-[#CA8A04] border border-[#4A2E1F]",
    },
    {
      card: "bg-[#24160E] hover:bg-[#331F14] border-[#4A2E1F] hover:border-[#CA8A04]",
      badge: "bg-[#331F14] text-[#CA8A04] border border-[#4A2E1F]",
    },
    {
      card: "bg-[#24160E] hover:bg-[#331F14] border-[#4A2E1F] hover:border-[#CA8A04]",
      badge: "bg-[#331F14] text-[#CA8A04] border border-[#4A2E1F]",
    },
    {
      card: "bg-[#24160E] hover:bg-[#331F14] border-[#4A2E1F] hover:border-[#CA8A04]",
      badge: "bg-[#331F14] text-[#CA8A04] border border-[#4A2E1F]",
    },
  ];

  if (loading && !roomState) {
    return (
      <div className="min-h-screen bg-[#140D08] flex flex-col items-center justify-center text-[#BFA98A] gap-3">
        <span className="w-5 h-5 border-2 border-[#CA8A04]/30 border-t-[#CA8A04] rounded-full animate-spin" />
        <p className="text-xs">Menyambungkan ke ruang kuis...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#140D08] text-[#F5E6D3] flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="border-b border-[#331F14] bg-[#1A0F0A]/95 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
              <RiBookOpenLine className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-[#F5E6D3] flex items-center gap-2">
                {nickname}
                {myStreak > 1 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#CA8A04]/15 text-[#CA8A04] border border-[#CA8A04]/30 flex items-center gap-0.5">
                    <RiFireLine className="w-3 h-3" /> {myStreak}x berturut-turut
                  </span>
                )}
              </p>
              <p className="text-[11px] text-[#BFA98A]">
                PIN: {roomCode} • Peringkat #{myRank}
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded bg-[#24160E] border border-[#4A2E1F] text-right">
            <span className="text-[10px] text-[#BFA98A] block">Total nilai</span>
            <span className="text-sm font-semibold text-[#CA8A04]">
              {myScore.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <div className="max-w-2xl mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center">
        {/* State 1: Room Waiting */}
        {roomState?.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-[#1A0F0A] border border-[#331F14] rounded-lg shadow-sm space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
              <RiBookOpenLine className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-heading font-bold text-[#F5E6D3] mb-1">
                Kamu sudah bergabung di ruang kuis
              </h2>
              <p className="text-xs text-[#BFA98A] max-w-sm mx-auto leading-relaxed">
                Tunggu Bapak/Ibu Guru <strong className="text-[#F5E6D3]">{roomState.hostName}</strong> memulai pertanyaan dari layar utama.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#140D08] border border-[#331F14] text-xs text-[#BFA98A]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              Terhubung ke room {roomCode}
            </div>
          </motion.div>
        )}

        {/* State 2: Active Question Playing */}
        {roomState?.status === "active" && roomState.currentQuestion && (
          <div className="space-y-5">
            {/* Question Progress & Timer */}
            <div className="flex items-center justify-between text-xs text-[#BFA98A]">
              <span className="px-2.5 py-1 rounded bg-[#1A0F0A] border border-[#331F14]">
                Pertanyaan {(roomState.currentQuestionIndex || 0) + 1} dari {roomState.totalQuestions}
              </span>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A0F0A] border border-[#331F14]">
                <RiTimeLine className="w-3.5 h-3.5 text-[#CA8A04]" />
                <span className={timeLeft <= 5 ? "text-[#F87171] font-semibold" : "text-[#D6C5B2]"}>
                  {timeLeft} detik
                </span>
              </div>
            </div>

            {/* Question Box */}
            <div className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-5 sm:p-6 shadow-sm space-y-2">
              {roomState.currentQuestion.conceptTag && (
                <span className="inline-block text-xs text-[#CA8A04] px-2 py-0.5 rounded bg-[#24160E] border border-[#4A2E1F]">
                  {roomState.currentQuestion.conceptTag}
                </span>
              )}

              <h2 className="text-base sm:text-lg font-medium text-[#F5E6D3] leading-relaxed">
                {roomState.currentQuestion.question}
              </h2>
            </div>

            {/* 4 Interactive Option Buttons or Feedback Result */}
            {!hasAnsweredCurrentQ ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roomState.currentQuestion.options.map((option, idx) => {
                  const style = optionStyles[idx % optionStyles.length];
                  return (
                    <button
                      key={option.label}
                      onClick={() => handleSelectOption(option.label)}
                      disabled={submitting}
                      className={`p-4 rounded-lg border text-left transition flex items-start gap-3 disabled:opacity-50 ${style.card}`}
                    >
                      <span
                        className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shrink-0 ${style.badge}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-[#F5E6D3] text-sm leading-snug pt-0.5 font-medium">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Instant Feedback Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 rounded-lg border shadow-sm ${
                  lastSubmissionResult?.isCorrect
                    ? "bg-[#14532D]/15 border-[#16A34A]/40"
                    : "bg-[#451A1A]/20 border-[#991B1B]/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {lastSubmissionResult?.isCorrect ? (
                    <div className="w-9 h-9 rounded bg-[#16A34A]/20 border border-[#16A34A]/40 flex items-center justify-center text-[#22C55E]">
                      <RiCheckLine className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded bg-[#991B1B]/20 border border-[#991B1B]/40 flex items-center justify-center text-[#F87171]">
                      <RiCloseLine className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-heading font-bold text-[#F5E6D3]">
                      {lastSubmissionResult?.isCorrect
                        ? "Pilihanmu tepat!"
                        : "Pilihan belum tepat"}
                    </h3>
                    <p className="text-xs text-[#BFA98A]">
                      {lastSubmissionResult?.isCorrect
                        ? `+${lastSubmissionResult.scoreAwarded} poin bertambah.`
                        : "Simak penjelasan konsep di bawah ini:"}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-[#140D08] border border-[#331F14] text-xs text-[#D6C5B2] leading-relaxed mb-3">
                  <span className="font-semibold text-[#CA8A04] block mb-1">
                    {lastSubmissionResult?.isCorrect ? "Ulasan materi:" : "Catatan konsep:"}
                  </span>
                  {lastSubmissionResult?.microFeedback ||
                    lastSubmissionResult?.explanation ||
                    "Jawaban telah tersimpan di sistem pembelajaran."}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#BFA98A] pt-1">
                  <span className="w-2 h-2 rounded-full bg-[#CA8A04]" />
                  Menunggu guru membuka pertanyaan berikutnya...
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* State 3: Showing Leaderboard */}
        {roomState?.status === "showing_leaderboard" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1A0F0A] border border-[#331F14] rounded-lg p-6 shadow-sm space-y-4"
          >
            <div className="text-center pb-2 border-b border-[#331F14]">
              <h2 className="text-lg font-heading font-bold text-[#F5E6D3]">Papan skor sementara</h2>
              <p className="text-xs text-[#BFA98A]">
                Peringkat kamu saat ini: <strong>#{myRank}</strong> ({myScore} poin)
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {roomState.leaderboard.map((player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded border flex items-center justify-between text-xs transition ${
                    player.id === playerId
                      ? "bg-[#24160E] border-[#CA8A04]"
                      : "bg-[#140D08] border-[#331F14]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[#24160E] border border-[#4A2E1F] text-[#BFA98A] font-medium text-xs flex items-center justify-center">
                      {player.rank}
                    </span>
                    <span className="font-medium text-[#F5E6D3]">
                      {player.nickname} {player.id === playerId && "(Kamu)"}
                    </span>
                  </div>

                  <span className="font-medium text-[#CA8A04]">
                    {player.score} poin
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* State 4: Finished Game Podium */}
        {roomState?.status === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-6 bg-[#1A0F0A] border border-[#331F14] rounded-lg shadow-sm space-y-5"
          >
            <div className="w-12 h-12 mx-auto rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
              <RiTrophyLine className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-heading font-bold text-[#F5E6D3] mb-1">Kuis telah selesai</h2>
              <p className="text-xs text-[#BFA98A]">
                Hasil akhir kuis kamu: <strong className="text-[#CA8A04]">{myScore.toLocaleString()} poin</strong> (Peringkat #{myRank}).
              </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-2">
              {roomState.leaderboard[1] && (
                <div className="p-3 rounded bg-[#24160E] border border-[#4A2E1F] flex flex-col items-center">
                  <span className="text-xs font-semibold text-[#BFA98A]">Peringkat 2</span>
                  <p className="text-xs font-medium text-[#F5E6D3] truncate w-full mt-1">
                    {roomState.leaderboard[1].nickname}
                  </p>
                  <span className="text-[11px] text-[#BFA98A]">
                    {roomState.leaderboard[1].score} poin
                  </span>
                </div>
              )}

              {roomState.leaderboard[0] && (
                <div className="p-3.5 rounded bg-[#2C1A10] border border-[#CA8A04] flex flex-col items-center">
                  <span className="text-xs font-semibold text-[#CA8A04]">Juara 1</span>
                  <p className="text-xs font-bold text-[#F5E6D3] truncate w-full mt-1">
                    {roomState.leaderboard[0].nickname}
                  </p>
                  <span className="text-xs font-semibold text-[#CA8A04]">
                    {roomState.leaderboard[0].score} poin
                  </span>
                </div>
              )}

              {roomState.leaderboard[2] && (
                <div className="p-3 rounded bg-[#24160E] border border-[#4A2E1F] flex flex-col items-center">
                  <span className="text-xs font-semibold text-[#BFA98A]">Peringkat 3</span>
                  <p className="text-xs font-medium text-[#F5E6D3] truncate w-full mt-1">
                    {roomState.leaderboard[2].nickname}
                  </p>
                  <span className="text-[11px] text-[#BFA98A]">
                    {roomState.leaderboard[2].score} poin
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                href="/play"
                className="flex-1 py-2 px-4 rounded bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] font-bold text-xs transition text-center"
              >
                Masuk ke ruang kuis lain
              </Link>
              <Link
                href="/"
                className="flex-1 py-2 px-4 rounded bg-[#24160E] hover:bg-[#331F14] text-[#D6C5B2] border border-[#4A2E1F] text-xs font-medium transition text-center"
              >
                Kembali ke beranda
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
