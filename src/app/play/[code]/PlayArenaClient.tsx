"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiBookOpenLine,
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
  RiTrophyLine,
  RiFireLine,
  RiVolumeUpLine,
  RiVolumeMuteLine,
  RiArrowLeftLine,
  RiPlayCircleLine,
  RiSparklingLine,
  RiSendPlaneLine,
  RiBarChartBoxLine,
  RiRestartLine,
  RiQuestionLine,
} from "@remixicon/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { soundEffects } from "@/lib/audio/sounds";
import { loadSettings } from "@/lib/settings/user-settings";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Chip } from "@/components/base/badges/chip";
import { Badge } from "@/components/base/badges/badge";
import { Avatar } from "@/components/base/avatar/avatar";
import { ProgressTrack } from "@/components/base/progress/progress";
import { Spinner } from "@/components/base/spinner/spinner";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { ExileLogo } from "@/components/brand/exile-logo";
import { cx } from "@/utils/cx";

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
  players?: Array<{
    id: string;
    nickname: string;
    avatar: string;
    score: number;
    streak: number;
    status?: "approved" | "pending" | "rejected";
  }>;
  settings: {
    timePerQuestionSec: number;
    streakBonus: boolean;
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "S";
}

export default function PlayArenaClient({ roomCode }: { roomCode: string }) {
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("Siswa");
  const [avatar, setAvatar] = useState<string>("garuda");
  const [myStatus, setMyStatus] = useState<"approved" | "pending" | "rejected">("approved");

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<{
    isCorrect: boolean;
    scoreAwarded: number;
    explanation?: string;
    microFeedback?: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Student Copilot Drawer
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Halo! Saya Exile Student Copilot. Jika ada materi atau pertanyaan yang belum kamu pahami dari penjelasan guru, tanyakan saja di sini!",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Telemetry breakdown for student
  const [answeredHistory, setAnsweredHistory] = useState<
    Array<{ questionOrder: number; concept: string; isCorrect: boolean; score: number }>
  >([]);

  const leaderboardFade = useScrollFade();

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEffects.setMuted(nextMuted);
  };

  useEffect(() => {
    let isMounted = true;

    const registerAndSyncPlayer = async () => {
      const settings = loadSettings();
      setIsMuted(!settings.soundEnabled);
      soundEffects.setMuted(!settings.soundEnabled);

      const storedId =
        sessionStorage.getItem("exile_player_id") ||
        localStorage.getItem("exile_player_id") ||
        "";

      const rawNickname =
        sessionStorage.getItem("exile_nickname") ||
        localStorage.getItem("exile_player_nickname") ||
        settings.defaultNickname;

      const resolvedNickname =
        rawNickname && rawNickname.trim().length > 0
          ? rawNickname.trim()
          : `Siswa ${Math.floor(100 + Math.random() * 900)}`;

      const resolvedAvatar =
        sessionStorage.getItem("exile_avatar") ||
        localStorage.getItem("exile_player_avatar") ||
        settings.defaultAvatar ||
        "garuda";

      if (storedId) {
        setPlayerId(storedId);
      }
      setNickname(resolvedNickname);
      setAvatar(resolvedAvatar);

      try {
        const res = await fetch("/api/rooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode,
            nickname: resolvedNickname,
            avatar: resolvedAvatar,
          }),
        });
        const joinData = await res.json();
        const assignedId = joinData?.playerId || joinData?.player?.id;

        if (isMounted && assignedId) {
          setPlayerId(assignedId);
          localStorage.setItem("exile_player_id", assignedId);
          sessionStorage.setItem("exile_player_id", assignedId);
        }

        if (isMounted && joinData?.playerStatus) {
          setMyStatus(joinData.playerStatus);
        }
      } catch (err) {
        console.warn("[PlayArena] Failed to sync player registration:", err);
      }
    };

    registerAndSyncPlayer();

    return () => {
      isMounted = false;
    };
  }, [roomCode]);

  const fetchState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/state`);
      if (res.status === 304) return;
      const data = await res.json();

      if (res.ok && data.success) {
        setRoomState(data);

        // Check our player's status
        if (data.players && playerId) {
          const me = data.players.find((p: any) => p.id === playerId);
          if (me?.status) {
            setMyStatus(me.status);
          }
        }

        if (data.currentQuestion && data.currentQuestion.id !== lastQuestionId) {
          setLastQuestionId(data.currentQuestion.id);
          setHasAnsweredCurrentQ(false);
          setSelectedOption(null);
          setLastSubmissionResult(null);
          setTimeLeft(data.settings?.timePerQuestionSec || 20);
          setQuestionStartTime(Date.now());
        }

        if (data.status === "finished") {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
          soundEffects.playVictory();
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

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const isPlaceholder =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

      if (!isPlaceholder) {
        channel = supabase
          .channel(`play-room-${roomCode}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "game_rooms",
              filter: `room_code=eq.${roomCode}`,
            },
            () => fetchState()
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn("[PlayArena] Realtime skipped:", realtimeErr);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode, lastQuestionId, playerId]);

  const isQuestionActive =
    roomState?.status === "active" || roomState?.status === "question_active";

  useEffect(() => {
    if (!roomState?.currentQuestion || hasAnsweredCurrentQ || !isQuestionActive) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 6 && prev > 1) {
          soundEffects.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roomState?.currentQuestion?.id, hasAnsweredCurrentQ, isQuestionActive]);

  const handleSelectOption = async (optionLabel: string) => {
    if (hasAnsweredCurrentQ || submitting || !roomState?.currentQuestion || myStatus === "pending") {
      return;
    }

    soundEffects.playClick();
    setSelectedOption(optionLabel);
    setSubmitting(true);

    const responseTimeMs = Date.now() - questionStartTime;
    const currentQ = roomState.currentQuestion;
    const activePlayerId =
      playerId ||
      sessionStorage.getItem("exile_player_id") ||
      localStorage.getItem("exile_player_id") ||
      "";

    try {
      const res = await fetch("/api/rooms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          playerId: activePlayerId,
          questionId: currentQ.id,
          selectedOption: optionLabel,
          responseTimeMs,
        }),
      });

      const submitData = await res.json();
      if (!res.ok) throw new Error(submitData.error || "Gagal mengirim jawaban");

      const isCorrect = Boolean(submitData.submission?.isCorrect);
      const scoreAwarded = Number(submitData.submission?.scoreAwarded ?? 0);
      const correctOpt =
        submitData.correctAnswer || submitData.submission?.correctAnswer || "A";

      setHasAnsweredCurrentQ(true);

      setAnsweredHistory((prev) => [
        ...prev,
        {
          questionOrder: currentQ.questionOrder,
          concept: currentQ.conceptTag || "Materi Umum",
          isCorrect,
          score: scoreAwarded,
        },
      ]);

      if (isCorrect) {
        soundEffects.playCorrect();
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
        setLastSubmissionResult({
          isCorrect: true,
          scoreAwarded,
          explanation:
            submitData.explanation ||
            "Pilihanmu tepat! Analisis dan pemahamanmu terhadap materi ini sangat baik.",
        });
        toast.success(`Benar! +${scoreAwarded} poin diperoleh`);
      } else {
        soundEffects.playIncorrect();
        toast.error("Perlu diulang");
        try {
          const explainRes = await fetch("/api/ai/explain-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: currentQ.question,
              selectedOption: optionLabel,
              correctOption: correctOpt,
              options: currentQ.options,
              conceptTag: currentQ.conceptTag,
            }),
          });
          const explainData = await explainRes.json();
          const explanationText = explainData.feedback
            ? `${explainData.feedback}${explainData.quickTip ? ` Tips: ${explainData.quickTip}` : ""}`
            : explainData.explanation?.explanation ||
              submitData.explanation ||
              "Perhatikan kembali analisis opsi jawaban pada materi ini.";

          setLastSubmissionResult({
            isCorrect: false,
            scoreAwarded: 0,
            microFeedback: explanationText,
          });
        } catch {
          setLastSubmissionResult({
            isCorrect: false,
            scoreAwarded: 0,
            microFeedback:
              submitData.explanation ||
              "Perhatikan konsep inti materi untuk menemukan hubungan yang tepat.",
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

  const handleAskStudentCopilot = async (promptQuery?: string) => {
    const text = promptQuery || copilotInput.trim();
    if (!text || copilotLoading) return;
    soundEffects.playClick();

    const nextMessages = [...copilotMessages, { role: "user" as const, content: text }];
    setCopilotMessages(nextMessages);
    setCopilotInput("");
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/ai/student-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          playerId,
          messages: nextMessages,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setCopilotMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error(data.error || "Gagal menghubungi Copilot");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Copilot sedang sibuk";
      toast.error(msg);
    } finally {
      setCopilotLoading(false);
    }
  };

  const myEntry =
    roomState?.leaderboard.find((p) => p.id === playerId) ||
    roomState?.leaderboard.find(
      (p) => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
    );
  const myScore = myEntry?.score || 0;
  const myStreak = myEntry?.streak || 0;
  const myRank = myEntry?.rank || "-";

  const totalQuestionTime = roomState?.settings?.timePerQuestionSec || 20;
  const timerPercent = Math.min(
    100,
    Math.max(0, Math.round((timeLeft / totalQuestionTime) * 100))
  );

  const correctAnswersCount = answeredHistory.filter((h) => h.isCorrect).length;
  const accuracyPercent =
    answeredHistory.length > 0
      ? Math.round((correctAnswersCount / answeredHistory.length) * 100)
      : 0;

  if (loading && !roomState) {
    return (
      <div className="min-h-screen bg-background-full flex flex-col items-center justify-center text-text-secondary gap-3">
        <Spinner size="md" aria-label="Menyambungkan ke ruang kuis" />
        <p className="text-caption-1-medium text-text-secondary">
          Menyambungkan ke ruang kuis...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background-secondary-default text-text-primary flex flex-col justify-between transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/95 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0 p-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
              <ExileLogo size={32} showText={false} />
            </Link>

            <Avatar
              size="md"
              color="blue"
              initials={getInitials(nickname)}
              aria-label={nickname}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-semibold text-text-primary truncate">
                  {nickname}
                </span>

                {/* Admission Status Indicator */}
                {myStatus === "pending" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                    <RiTimeLine className="size-3" />
                    <span>Menunggu Persetujuan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                    <RiCheckLine className="size-3" />
                    <span>Terverifikasi</span>
                  </span>
                )}

                {myStreak > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                    <RiFireLine className="size-3 shrink-0" aria-hidden />
                    <span>{myStreak}x beruntun</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary mt-0.5">
                <span>PIN: <bdi className="font-mono">{roomCode}</bdi></span>
                <span>•</span>
                <span>Peringkat #{myRank}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCopilot((prev) => !prev)}
              className={cx(
                "cursor-pointer px-3 py-1.5 rounded-xl border text-caption-1-medium flex items-center gap-1.5 transition shadow-card",
                showCopilot
                  ? "bg-[#0F766E] text-white border-[#0F766E]"
                  : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default text-text-primary"
              )}
            >
              <RiSparklingLine className="size-4" />
              <span className="hidden sm:inline">Copilot Siswa</span>
            </button>

            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <IconButton
              icon={isMuted ? RiVolumeMuteLine : RiVolumeUpLine}
              size="medium"
              onClick={toggleSound}
              aria-label={isMuted ? "Aktifkan suara" : "Matikan suara"}
              title={isMuted ? "Aktifkan suara" : "Matikan suara"}
            />
            <div className="px-3 py-1.5 rounded-xl bg-background-secondary-default border border-border-button-default text-end shadow-card">
              <span className="text-[10px] text-text-secondary block leading-none">
                Total Nilai
              </span>
              <span className="text-body-semibold text-text-primary tabular-nums">
                {myScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center">
        {/* PENDING APPROVAL WAITING SCREEN */}
        {myStatus === "pending" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default border border-[#D97706]/30 rounded-3xl shadow-card space-y-5"
          >
            <div className="relative size-14 mx-auto flex items-center justify-center">
              {/* Single expanding ripple ring (scale 1 -> 1.6, opacity 0.5 -> 0) */}
              <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-30" />
              <div className="relative size-12 rounded-2xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center border border-[#D97706]/30">
                <RiTimeLine className="size-6" aria-hidden />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-title-2-semibold text-text-primary">
                Menunggu Persetujuan Pengajar
              </h2>
              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                Pengajar{" "}
                <strong className="text-body-semibold text-text-primary">
                  {roomState?.hostName || "Guru"}
                </strong>{" "}
                sedang memverifikasi daftar siswa di ruangan kuis ini. Kamu akan otomatis masuk setelah disetujui.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
              <RiTimeLine className="size-4 shrink-0" />
              <span>Status: Antrean Verifikasi Tamu</span>
            </div>
          </motion.div>
        )}

        {/* LOBBY: WAITING FOR TEACHER TO START */}
        {myStatus !== "pending" && roomState?.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default border border-border-button-default rounded-3xl shadow-card space-y-5"
          >
            <div className="size-12 mx-auto rounded-2xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center shadow-xs">
              <RiBookOpenLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-title-2-semibold text-text-primary">
                Kamu sudah berada di dalam ruangan
              </h2>
              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                Tunggu Bapak/Ibu Guru{" "}
                <strong className="text-body-semibold text-text-primary">
                  {roomState.hostName || "Pengajar Exile"}
                </strong>{" "}
                memulai kuis dari layar utama.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                <span className="relative flex size-2">
                  <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-[#0F766E] opacity-50" />
                  <span className="relative inline-flex rounded-full size-2 bg-[#0F766E]" />
                </span>
                <span>Terhubung ke Ruangan <bdi className="font-mono font-semibold">{roomCode}</bdi></span>
              </span>
            </div>
          </motion.div>
        )}

        {/* ACTIVE QUESTION SCREEN */}
        {myStatus !== "pending" && isQuestionActive && roomState?.currentQuestion && (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Chip variant="subtle" color="gray" className="px-2.5 py-1">
                  Pertanyaan {(roomState.currentQuestionIndex || 0) + 1} dari{" "}
                  {roomState.totalQuestions}
                </Chip>

                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums border",
                    timeLeft <= 5
                      ? "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30"
                      : "bg-background-primary-default text-text-secondary border-border-button-default"
                  )}
                >
                  <RiTimeLine className="size-4 shrink-0" aria-hidden />
                  <span>{timeLeft} detik</span>
                </span>
              </div>

              <ProgressTrack
                percentage={timerPercent}
                size="md"
                className={timeLeft <= 5 ? "text-[#D97706]" : "text-[#0F766E]"}
              />
            </div>

            <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {roomState.currentQuestion.conceptTag && (
                  <span className="px-2.5 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                    {roomState.currentQuestion.conceptTag}
                  </span>
                )}
                {roomState.currentQuestion.culturalContext && (
                  <Chip variant="caption" color="soft">
                    {roomState.currentQuestion.culturalContext}
                  </Chip>
                )}
              </div>

              <h2 className="text-title-3-semibold text-text-primary">
                {roomState.currentQuestion.question}
              </h2>
            </div>

            {!hasAnsweredCurrentQ ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roomState.currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleSelectOption(option.label)}
                      disabled={submitting}
                      className={cx(
                        "group p-4 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer shadow-card",
                        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        isSelected
                          ? "bg-background-primary-active border-border-button-active"
                          : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default hover:border-border-button-hover"
                      )}
                    >
                      <span
                        className={cx(
                          "size-7 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0 border transition-colors",
                          isSelected
                            ? "bg-[#0F766E] text-white border-[#0F766E]"
                            : "bg-questionnaire-key-background text-text-primary border-border-button-default"
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="text-body-medium text-text-primary pt-0.5">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cx(
                  "p-6 rounded-3xl border shadow-card space-y-4",
                  lastSubmissionResult?.isCorrect
                    ? "bg-[#0F766E]/5 border-[#0F766E]/30"
                    : "bg-[#D97706]/5 border-[#D97706]/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cx(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                      lastSubmissionResult?.isCorrect
                        ? "bg-[#0F766E] text-white border-[#0F766E]"
                        : "bg-[#D97706] text-white border-[#D97706]"
                    )}
                  >
                    {lastSubmissionResult?.isCorrect ? (
                      <RiCheckLine className="size-5" aria-hidden />
                    ) : (
                      <RiRestartLine className="size-5" aria-hidden />
                    )}
                  </div>

                  <div>
                    <h3 className="text-headline-semibold text-text-primary flex items-center gap-2">
                      {lastSubmissionResult?.isCorrect ? "Benar" : "Perlu diulang"}
                    </h3>
                    <p className="text-caption-1-medium text-text-secondary">
                      {lastSubmissionResult?.isCorrect
                        ? `+${lastSubmissionResult.scoreAwarded} poin diperoleh.`
                        : "Perhatikan ulasan konsep di bawah ini:"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background-primary-default border border-border-button-default text-body-regular text-text-secondary shadow-xs space-y-1">
                  <span className="text-caption-1-semibold text-text-primary block">
                    {lastSubmissionResult?.isCorrect ? "Ulasan Kunci Jawaban:" : "Ulasan Pemahaman Konsep:"}
                  </span>
                  <p className="text-body-regular text-text-primary">
                    {lastSubmissionResult?.microFeedback ||
                      lastSubmissionResult?.explanation ||
                      "Jawaban telah tersimpan di sistem."}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-caption-1-medium text-text-secondary pt-1">
                  <span className="size-2 rounded-full bg-[#9CA3AF]" />
                  <span>Menunggu guru membuka pertanyaan berikutnya...</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* LEADERBOARD VIEW */}
        {myStatus !== "pending" && roomState?.status === "showing_leaderboard" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-4"
          >
            <div className="text-center pb-3 border-b border-separator-border space-y-1">
              <h2 className="text-title-3-semibold text-text-primary">
                Papan Skor Sementara
              </h2>
              <p className="text-caption-1-medium text-text-secondary">
                Peringkat kamu saat ini:{" "}
                <strong className="text-text-primary">#{myRank}</strong> (
                {myScore.toLocaleString()} poin)
              </p>
            </div>

            <div className="relative min-h-0">
              <div
                onScroll={leaderboardFade.onScroll}
                className="space-y-2 max-h-72 overflow-y-auto pe-1"
              >
                {roomState.leaderboard.map((player) => {
                  const isMe =
                    player.id === playerId ||
                    player.nickname.toLowerCase() === nickname.trim().toLowerCase();
                  return (
                    <div
                      key={player.id}
                      className={cx(
                        "p-3 rounded-2xl border flex items-center justify-between transition",
                        isMe
                          ? "bg-background-secondary-default border-border-button-hover shadow-xs"
                          : "bg-background-primary-default border-border-button-default"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge color={player.rank === 1 ? "primary" : "neutral"}>
                          #{player.rank}
                        </Badge>
                        <Avatar
                          size="sm"
                          color={isMe ? "blue" : "neutral"}
                          initials={getInitials(player.nickname)}
                        />
                        <span className="text-body-medium text-text-primary truncate">
                          {player.nickname} {isMe && "(Kamu)"}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums bg-background-primary-default border border-border-button-default">
                        {player.score.toLocaleString()} poin
                      </span>
                    </div>
                  );
                })}
              </div>
              <ScrollFade
                progress={leaderboardFade.progress}
                surfaceClassName="from-background-primary-default"
              />
            </div>
          </motion.div>
        )}

        {/* FINISHED TELEMETRY & RESULTS VIEW */}
        {myStatus !== "pending" && roomState?.status === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-6 bg-background-primary-default border border-border-button-default rounded-3xl shadow-card space-y-6"
          >
            <div className="size-12 mx-auto rounded-2xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center shadow-xs">
              <RiTrophyLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1">
              <h2 className="text-title-2-semibold text-text-primary">
                Sesi Kuis Selesai!
              </h2>
              <p className="text-body-regular text-text-secondary">
                Total perolehan kamu:{" "}
                <strong className="text-body-semibold text-text-primary">
                  {myScore.toLocaleString()} poin
                </strong>{" "}
                (Peringkat #{myRank}).
              </p>
            </div>

            {/* Student Telemetry Breakdown Card */}
            <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-3 text-start">
              <div className="flex items-center justify-between">
                <span className="text-body-semibold text-text-primary flex items-center gap-1.5">
                  <RiBarChartBoxLine className="size-4 text-[#0F766E]" />
                  Telemetri Hasil Belajarmu
                </span>
                <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                  Akurasi: {accuracyPercent}%
                </span>
              </div>

              <div className="space-y-1.5">
                {answeredHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background-primary-default border border-border-button-default flex items-center justify-between text-caption-1-medium"
                  >
                    <span className="truncate">
                      Soal #{item.questionOrder}: {item.concept}
                    </span>
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-caption-2-medium shrink-0",
                        item.isCorrect
                          ? "bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20"
                          : "bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20"
                      )}
                    >
                      {item.isCorrect ? <RiCheckLine className="size-3" /> : <RiRestartLine className="size-3" />}
                      <span>{item.isCorrect ? "Benar" : "Perlu diulang"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <ButtonLink
                href="/play"
                variant="primary"
                leadingIcon={RiPlayCircleLine}
                className="flex-1"
              >
                Masuk ke Ruang Lain
              </ButtonLink>
              <ButtonLink
                href="/"
                variant="secondary"
                leadingIcon={RiArrowLeftLine}
                className="flex-1"
              >
                Kembali ke Beranda
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </div>

      {/* STUDENT COPILOT DRAWER / MODAL */}
      <AnimatePresence>
        {showCopilot && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 bottom-4 max-w-xl mx-auto z-50 bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-separator-border">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center">
                  <RiSparklingLine className="size-4" />
                </div>
                <h4 className="text-body-semibold text-text-primary">
                  Exile Student Copilot
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCopilot(false)}
                className="cursor-pointer size-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <RiCloseLine className="size-5" />
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAskStudentCopilot("Rangkumkan penjelasan materi pembelajaran saat ini.")}
                className="cursor-pointer px-2.5 py-1 rounded-lg bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-[11px] text-text-primary"
              >
                Rangkum Penjelasan Guru
              </button>
              <button
                type="button"
                onClick={() => handleAskStudentCopilot("Saya belum mengerti maksud soal aktif ini, beri petunjuk.")}
                className="cursor-pointer px-2.5 py-1 rounded-lg bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-[11px] text-text-primary"
              >
                Beri Petunjuk Soal Ini
              </button>
            </div>

            {/* Message History */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto p-2.5 rounded-2xl bg-background-secondary-default border border-border-button-default text-body-2-regular">
              {copilotMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cx(
                    "p-3 rounded-2xl whitespace-pre-wrap leading-relaxed max-w-[90%]",
                    msg.role === "user"
                      ? "ms-auto bg-background-primary-default text-text-primary border border-border-button-default"
                      : "me-auto bg-background-primary-default border border-[#0F766E]/20 text-text-primary shadow-2xs"
                  )}
                >
                  {msg.role === "assistant" && (
                    <span className="text-[10px] font-semibold text-[#0F766E] uppercase block mb-1">
                      Copilot
                    </span>
                  )}
                  {msg.content}
                </div>
              ))}
              {copilotLoading && (
                <div className="p-2.5 rounded-2xl me-auto bg-background-primary-default border border-[#0F766E]/20 flex items-center gap-2 text-caption-2-medium text-text-secondary">
                  <Spinner size="xs" />
                  <span>Copilot sedang mengetik...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskStudentCopilot();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Tanyakan konsep yang belum kamu mengerti..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-background-secondary-default border border-border-button-default text-caption-1-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
              />
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={copilotLoading || !copilotInput.trim()}
                leadingIcon={RiSendPlaneLine}
              >
                Kirim
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
