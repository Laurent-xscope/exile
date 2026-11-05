"use client";

import React, { useEffect, useRef, useState } from "react";
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
  RiCopilotFill,
  RiSendPlaneLine,
  RiBarChartBoxLine,
  RiRestartLine,
  RiShieldFlashLine,
  RiFlashlightLine,
  RiSnowflakeLine,
} from "@remixicon/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const nowMs = () => Date.now();
import { soundEffects } from "@/lib/audio/sounds";
import { loadSettings } from "@/lib/settings/user-settings";
import { useTranslation } from "@/lib/i18n/use-translation";
import { markStudentTabForRoom } from "@/lib/rooms/host-token";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Chip } from "@/components/base/badges/chip";
import { Badge } from "@/components/base/badges/badge";
import { Avatar } from "@/components/base/avatar/avatar";
import { ProgressTrack } from "@/components/base/progress/progress";
import { Spinner } from "@/components/base/spinner/spinner";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { FormattedMessage } from "@/components/chat/formatted-message";
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
  questionStartedAt?: string;
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

export default function PlayArenaClient({
  roomCode,
  playerId,
  playerToken,
  nickname,
  initialStatus,
}: {
  roomCode: string;
  playerId: string;
  playerToken: string;
  nickname: string;
  initialStatus: "approved" | "pending" | "rejected";
}) {
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const [myStatus, setMyStatus] = useState<"approved" | "pending" | "rejected">(
    initialStatus
  );

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<{
    isCorrect: boolean;
    scoreAwarded: number;
    correctOption?: string;
    explanation?: string;
    microFeedback?: string;
  } | null>(null);

  const [activePowerup, setActivePowerup] = useState<
    "time_freeze" | "double_jeopardy" | "immunity" | null
  >(null);
  const [usedPowerups, setUsedPowerups] = useState<string[]>([]);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const [lastQuestionStartedAt, setLastQuestionStartedAt] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const finishedCelebrated = useRef(false);

  // Student Copilot Drawer
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content: isEn
        ? "Hello! I am your Exile Student Copilot. If there are concepts or questions you need clarification on, feel free to ask here!"
        : "Halo! Saya Exile Student Copilot. Jika ada materi atau pertanyaan yang belum kamu pahami dari penjelasan guru, tanyakan saja di sini!",
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
    markStudentTabForRoom(roomCode);
    const settings = loadSettings();
    /* eslint-disable react-hooks/set-state-in-effect -- sound preference is client-only */
    setIsMuted(!settings.soundEnabled);
    soundEffects.setMuted(!settings.soundEnabled);
    /* eslint-enable react-hooks/set-state-in-effect */
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
          const me = data.players.find((p: { id: string }) => p.id === playerId);
          if (me?.status) {
            setMyStatus(me.status);
          }
        }

        if (data.currentQuestion && data.currentQuestion.id !== lastQuestionId) {
          setLastQuestionId(data.currentQuestion.id);
          setHasAnsweredCurrentQ(false);
          setSelectedOption(null);
          setLastSubmissionResult(null);
          setActivePowerup(null);
          setIsTimerFrozen(false);
        }

        const questionStartChanged =
          Boolean(data.currentQuestion) &&
          Boolean(data.questionStartedAt) &&
          data.questionStartedAt !== lastQuestionStartedAt;

        if (
          data.currentQuestion &&
          (data.currentQuestion.id !== lastQuestionId || questionStartChanged)
        ) {
          const limitSec = data.settings?.timePerQuestionSec || 20;
          const startedAt = data.questionStartedAt
            ? Date.parse(data.questionStartedAt)
            : nowMs();
          const safeStartedAt = Number.isFinite(startedAt) ? startedAt : nowMs();
          setQuestionStartTime(safeStartedAt);
          setTimeLeft(
            Math.max(
              0,
              Math.ceil((safeStartedAt + limitSec * 1000 - nowMs()) / 1000)
            )
          );
          setLastQuestionStartedAt(data.questionStartedAt || null);
        }

        if (data.status === "finished" && !finishedCelebrated.current) {
          finishedCelebrated.current = true;
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
    // First poll runs after mount; subsequent polls are the realtime mechanism.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
    // Polling is the real-time mechanism; state is fetched by room code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, lastQuestionId, lastQuestionStartedAt, playerId]);

  const isQuestionActive =
    roomState?.status === "active" || roomState?.status === "question_active";
  const isTimeUp = isQuestionActive && !hasAnsweredCurrentQ && timeLeft <= 0;

  useEffect(() => {
    if (
      !roomState?.currentQuestion ||
      hasAnsweredCurrentQ ||
      !isQuestionActive ||
      isTimerFrozen
    ) {
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
    // Question object identity changes every poll; the id is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomState?.currentQuestion?.id,
    hasAnsweredCurrentQ,
    isQuestionActive,
    isTimerFrozen,
  ]);

  const handleTogglePowerup = (
    type: "time_freeze" | "double_jeopardy" | "immunity"
  ) => {
    if (hasAnsweredCurrentQ || submitting || usedPowerups.includes(type)) return;
    soundEffects.playClick();
    if (activePowerup === type) {
      setActivePowerup(null);
      if (type === "time_freeze") setIsTimerFrozen(false);
      return;
    }
    setActivePowerup(type);
    if (type === "time_freeze") {
      setIsTimerFrozen(true);
      toast.info(isEn ? "Timer frozen for this question!" : "Waktu dibekukan untuk soal ini!");
    } else {
      setIsTimerFrozen(false);
    }
  };

  const handleSelectOption = async (optionLabel: string) => {
    if (
      hasAnsweredCurrentQ ||
      submitting ||
      (timeLeft <= 0 && !isTimerFrozen) ||
      !roomState?.currentQuestion ||
      myStatus === "pending"
    ) {
      return;
    }

    soundEffects.playClick();
    setSelectedOption(optionLabel);
    setSubmitting(true);

    const responseTimeMs =
      activePowerup === "time_freeze"
        ? 0
        : Math.max(0, nowMs() - questionStartTime);
    const currentQ = roomState.currentQuestion;
    const chosenPowerup = activePowerup;

    try {
      const res = await fetch("/api/rooms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          playerId,
          playerToken,
          questionId: currentQ.id,
          selectedOption: optionLabel,
          responseTimeMs,
          powerup: chosenPowerup || undefined,
        }),
      });

      const submitData = await res.json();
      if (!res.ok) throw new Error(submitData.error || "Gagal mengirim jawaban");

      const isCorrect = Boolean(submitData.submission?.isCorrect);
      const scoreAwarded = Number(submitData.submission?.scoreAwarded ?? 0);
      const correctOpt =
        submitData.correctAnswer || submitData.submission?.correctAnswer || "A";

      if (chosenPowerup) {
        setUsedPowerups((prev) =>
          prev.includes(chosenPowerup) ? prev : [...prev, chosenPowerup]
        );
        setActivePowerup(null);
      }
      if (Array.isArray(submitData.player?.usedPowerups)) {
        setUsedPowerups(submitData.player.usedPowerups);
      }

      if (submitData.player) {
        setRoomState((prev) => {
          if (!prev) return prev;
          const nextPlayers = (prev.players || []).map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  score: submitData.player.score,
                  streak: submitData.player.streak,
                }
              : p
          );
          const nextLb = prev.leaderboard
            .map((entry) =>
              entry.id === playerId
                ? {
                    ...entry,
                    score: submitData.player.score,
                    streak: submitData.player.streak,
                  }
                : entry
            )
            .sort((a, b) => b.score - a.score)
            .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
          return { ...prev, players: nextPlayers, leaderboard: nextLb };
        });
      }

      setHasAnsweredCurrentQ(true);
      void fetchState();

      setAnsweredHistory((prev) => [
        ...prev,
        {
          questionOrder: currentQ.questionOrder,
          concept: currentQ.conceptTag || "Materi umum",
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
          correctOption: correctOpt,
          explanation:
            submitData.explanation ||
            "Pilihanmu tepat! Analisis dan pemahamanmu terhadap materi ini sangat baik.",
        });
        toast.success(`Benar! +${scoreAwarded} poin diperoleh`);
      } else {
        soundEffects.playIncorrect();
        toast.error("Jawaban salah");
        setLastSubmissionResult({
          isCorrect: false,
          scoreAwarded,
          correctOption: correctOpt,
          microFeedback:
            submitData.explanation ||
            "Perhatikan kembali analisis opsi jawaban pada materi ini.",
        });
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
            scoreAwarded,
            correctOption: correctOpt,
            microFeedback: explanationText,
          });
        } catch {
          // keep initial microFeedback
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
          playerToken,
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
        <Spinner size="md" aria-label={isEn ? "Connecting to quiz room" : "Menyambungkan ke ruang kuis"} />
        <p className="text-caption-1-medium text-text-secondary">
          {isEn ? "Connecting to quiz room..." : "Menyambungkan ke ruang kuis..."}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background-secondary-default text-text-primary flex flex-col justify-between transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/95 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="shrink-0 p-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isEn ? "Back to Home" : "Kembali ke Beranda"}
            >
              <RiArrowLeftLine className="size-5" />
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
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-text-error-primary border border-[#D97706]/20">
                    <RiTimeLine className="size-3" />
                    <span>{isEn ? "Awaiting approval" : "Menunggu persetujuan"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
                    <RiCheckLine className="size-3" />
                    <span>{isEn ? "Verified" : "Terverifikasi"}</span>
                  </span>
                )}

                {myStreak > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-text-error-primary border border-[#D97706]/20">
                    <RiFireLine className="size-3 shrink-0" aria-hidden />
                    <span>{isEn ? `${myStreak}x streak` : `${myStreak}x beruntun`}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary mt-0.5">
                <span>Pin: <bdi className="font-mono">{roomCode}</bdi></span>
                <span>•</span>
                <span>{isEn ? `Rank #${myRank}` : `Peringkat #${myRank}`}</span>
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
                  ? "bg-accent-700 text-white border-accent-700"
                  : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default text-text-primary"
              )}
            >
              <RiCopilotFill className="size-4" />
              <span className="hidden sm:inline">{isEn ? "Student copilot" : "Copilot siswa"}</span>
            </button>

            <LanguageToggle />
            <ThemeToggle />
            <IconButton
              icon={isMuted ? RiVolumeMuteLine : RiVolumeUpLine}
              size="medium"
              onClick={toggleSound}
              aria-label={isMuted ? (isEn ? "Unmute audio" : "Aktifkan suara") : (isEn ? "Mute audio" : "Matikan suara")}
              title={isMuted ? (isEn ? "Unmute audio" : "Aktifkan suara") : (isEn ? "Mute audio" : "Matikan suara")}
            />
            <div className="px-3 py-1.5 rounded-xl bg-background-secondary-default border border-border-button-default text-end shadow-card">
              <span className="text-[10px] text-text-secondary block leading-none">
                {isEn ? "Total score" : "Total nilai"}
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
              <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-30" />
              <div className="relative size-12 rounded-2xl bg-[#D97706]/15 text-text-error-primary flex items-center justify-center border border-[#D97706]/30">
                <RiTimeLine className="size-6" aria-hidden />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-title-2-semibold text-text-primary">
                {isEn ? "Awaiting teacher approval" : "Menunggu persetujuan pengajar"}
              </h2>
              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                {isEn ? (
                  <>
                    Educator{" "}
                    <strong className="text-body-semibold text-text-primary">
                      {roomState?.hostName || "Teacher"}
                    </strong>{" "}
                    is verifying the classroom roster. You will automatically enter once approved.
                  </>
                ) : (
                  <>
                    Pengajar{" "}
                    <strong className="text-body-semibold text-text-primary">
                      {roomState?.hostName || "Guru"}
                    </strong>{" "}
                    sedang memverifikasi daftar siswa di ruangan kuis ini. Kamu akan otomatis masuk setelah disetujui.
                  </>
                )}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-[#D97706]/10 text-text-error-primary border border-[#D97706]/20">
              <RiTimeLine className="size-4 shrink-0" />
              <span>{isEn ? "Status: guest verification queue" : "Status: antrean verifikasi tamu"}</span>
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
            <div className="size-12 mx-auto rounded-2xl bg-accent-700/10 text-accent-700 border border-accent-700/20 flex items-center justify-center shadow-xs">
              <RiBookOpenLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-title-2-semibold text-text-primary">
                {isEn ? "You are inside the room" : "Kamu sudah berada di dalam ruangan"}
              </h2>
              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                {isEn ? (
                  <>
                    Please wait for educator{" "}
                    <strong className="text-body-semibold text-text-primary">
                      {roomState.hostName || "Exile educator"}
                    </strong>{" "}
                    to start the quiz from the main display.
                  </>
                ) : (
                  <>
                    Tunggu pengajar{" "}
                    <strong className="text-body-semibold text-text-primary">
                      {roomState.hostName || "Pengajar exile"}
                    </strong>{" "}
                    memulai kuis dari layar utama.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
                <span className="relative flex size-2">
                  <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-accent-700 opacity-50" />
                  <span className="relative inline-flex rounded-full size-2 bg-accent-700" />
                </span>
                <span>
                  {isEn ? `Connected to room ` : `Terhubung ke ruangan `}
                  <bdi className="font-mono font-semibold">{roomCode}</bdi>
                </span>
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
                  {isEn
                    ? `Question ${(roomState.currentQuestionIndex || 0) + 1} of ${roomState.totalQuestions}`
                    : `Pertanyaan ${(roomState.currentQuestionIndex || 0) + 1} dari ${roomState.totalQuestions}`}
                </Chip>

                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums border",
                    timeLeft <= 5
                      ? "bg-[#D97706]/10 text-text-error-primary border-[#D97706]/30"
                      : "bg-background-primary-default text-text-secondary border-border-button-default"
                  )}
                >
                  <RiTimeLine className="size-4 shrink-0" aria-hidden />
                  <span>{timeLeft} {isEn ? "sec" : "detik"}</span>
                </span>
              </div>

              <ProgressTrack
                percentage={timerPercent}
                size="md"
                className={timeLeft <= 5 ? "text-text-error-primary" : "text-accent-700"}
              />
            </div>

            <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {roomState.currentQuestion.conceptTag && (
                  <span className="px-2.5 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
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

            {isTimeUp && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-2xl border border-border-error-default bg-background-tertiary-error p-4 text-caption-1-medium text-text-error-primary"
              >
                <RiTimeLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <span className="block text-body-2-semibold">
                    {isEn ? "Time is up" : "Waktu habis"}
                  </span>
                  <span>
                    {isEn
                      ? "This question is locked. Wait for your teacher to open the next one."
                      : "Soal ini sudah dikunci. Tunggu pengajar membuka soal berikutnya."}
                  </span>
                </div>
              </div>
            )}

            {/* STUDENT POWERUPS BAR (One-time use per session) */}
            {!hasAnsweredCurrentQ && !isTimeUp && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-card">
                <span className="text-caption-2-semibold text-text-secondary">
                  {isEn ? "Powerups (1x per session):" : "Powerup siswa (1x pakai):"}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={usedPowerups.includes("time_freeze")}
                    onClick={() => handleTogglePowerup("time_freeze")}
                    className={cx(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                      activePowerup === "time_freeze"
                        ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : "border-border-button-default bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                    )}
                  >
                    <RiSnowflakeLine className="size-3.5" />
                    <span>{isEn ? "Freeze time" : "Bekukan waktu"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={usedPowerups.includes("double_jeopardy")}
                    onClick={() => handleTogglePowerup("double_jeopardy")}
                    className={cx(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                      activePowerup === "double_jeopardy"
                        ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "border-border-button-default bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                    )}
                  >
                    <RiFlashlightLine className="size-3.5" />
                    <span>{isEn ? "2x score" : "Skor 2x"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={usedPowerups.includes("immunity")}
                    onClick={() => handleTogglePowerup("immunity")}
                    className={cx(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                      activePowerup === "immunity"
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border-border-button-default bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                    )}
                  >
                    <RiShieldFlashLine className="size-3.5" />
                    <span>{isEn ? "Streak shield" : "Perisai beruntun"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4 OPTION CARDS (Remain visible after answering with Green for correct and Red for wrong) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomState.currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.label;
                const isRevealed = hasAnsweredCurrentQ && Boolean(lastSubmissionResult);
                const isCorrectCard =
                  isRevealed && lastSubmissionResult?.correctOption === option.label;
                const isWrongSelectedCard =
                  isRevealed && isSelected && !lastSubmissionResult?.isCorrect;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleSelectOption(option.label)}
                    disabled={submitting || isTimeUp || hasAnsweredCurrentQ}
                    className={cx(
                      "group p-4 rounded-2xl border text-start transition flex items-start justify-between gap-3 cursor-pointer shadow-card",
                      "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      "disabled:cursor-default",
                      isCorrectCard
                        ? "bg-emerald-500/15 border-emerald-500 text-text-primary"
                        : isWrongSelectedCard
                          ? "bg-rose-500/10 border-border-error-default text-text-primary"
                          : isRevealed
                            ? "bg-background-primary-default border-border-button-default opacity-65"
                            : isSelected
                              ? "bg-background-primary-active border-border-button-active"
                              : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default hover:border-border-button-hover"
                    )}
                  >
                    <span className="flex items-start gap-3 min-w-0">
                      <span
                        className={cx(
                          "size-7 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0 border transition-colors",
                          isCorrectCard
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : isWrongSelectedCard
                              ? "bg-rose-600 text-white border-rose-600"
                              : isSelected
                                ? "bg-accent-700 text-white border-accent-700"
                                : "bg-questionnaire-key-background text-text-primary border-border-button-default"
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="text-body-medium text-text-primary pt-0.5">
                        {option.text}
                      </span>
                    </span>
                    {isCorrectCard ? (
                      <RiCheckLine className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-1" />
                    ) : isWrongSelectedCard ? (
                      <RiCloseLine className="size-5 shrink-0 text-text-error-primary mt-1" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {hasAnsweredCurrentQ && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cx(
                  "p-6 rounded-3xl border shadow-card space-y-4",
                  lastSubmissionResult?.isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-rose-500/10 border-border-error-default"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cx(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                      lastSubmissionResult?.isCorrect
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-rose-600 text-white border-rose-600"
                    )}
                  >
                    {lastSubmissionResult?.isCorrect ? (
                      <RiCheckLine className="size-5" aria-hidden />
                    ) : (
                      <RiCloseLine className="size-5" aria-hidden />
                    )}
                  </div>

                  <div>
                    <h3 className="text-headline-semibold text-text-primary flex items-center gap-2">
                      {lastSubmissionResult?.isCorrect
                        ? (isEn ? "Correct" : "Benar")
                        : (isEn ? "Incorrect" : "Salah")}
                    </h3>
                    <p className="text-caption-1-medium text-text-secondary">
                      {lastSubmissionResult?.isCorrect
                        ? (isEn
                            ? `+${lastSubmissionResult.scoreAwarded} points awarded.`
                            : `+${lastSubmissionResult.scoreAwarded} poin diperoleh.`)
                        : (isEn
                            ? "Review concept explanation below:"
                            : "Perhatikan ulasan konsep di bawah ini:")}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background-primary-default border border-border-button-default text-body-regular text-text-secondary shadow-xs space-y-1">
                  <span className="text-caption-1-semibold text-text-primary block">
                    {lastSubmissionResult?.isCorrect
                      ? (isEn ? "Answer key review:" : "Ulasan kunci jawaban:")
                      : (isEn ? "Conceptual understanding review:" : "Ulasan pemahaman konsep:")}
                  </span>
                  <p className="text-body-regular text-text-primary">
                    {lastSubmissionResult?.microFeedback ||
                      lastSubmissionResult?.explanation ||
                      (isEn ? "Answer recorded in session." : "Jawaban telah tersimpan di sistem.")}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-caption-1-medium text-text-secondary pt-1">
                  <span className="size-2 rounded-full bg-[#9CA3AF]" />
                  <span>
                    {isEn
                      ? "Waiting for educator to open next question..."
                      : "Menunggu guru membuka pertanyaan berikutnya..."}
                  </span>
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
                {isEn ? "Interim scoreboard" : "Papan skor sementara"}
              </h2>
              <p className="text-caption-1-medium text-text-secondary">
                {isEn
                  ? `Your current rank: #${myRank} (${myScore.toLocaleString()} pts)`
                  : `Peringkat kamu saat ini: #${myRank} (${myScore.toLocaleString()} poin)`}
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
                          {player.nickname} {isMe && (isEn ? "(you)" : "(kamu)")}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums bg-background-primary-default border border-border-button-default">
                        {player.score.toLocaleString()} {isEn ? "pts" : "poin"}
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
            <div className="size-12 mx-auto rounded-2xl bg-accent-700/10 text-accent-700 border border-accent-700/20 flex items-center justify-center shadow-xs">
              <RiTrophyLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1">
              <h2 className="text-title-2-semibold text-text-primary">
                {isEn ? "Quiz session completed!" : "Sesi kuis selesai!"}
              </h2>
              <p className="text-body-regular text-text-secondary">
                {isEn ? "Your total score: " : "Total perolehan kamu: "}
                <strong className="text-body-semibold text-text-primary">
                  {myScore.toLocaleString()} {isEn ? "pts" : "poin"}
                </strong>{" "}
                ({isEn ? `rank #${myRank}` : `peringkat #${myRank}`}).
              </p>
            </div>

            {/* Student Telemetry Breakdown Card */}
            <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-3 text-start">
              <div className="flex items-center justify-between">
                <span className="text-body-semibold text-text-primary flex items-center gap-1.5">
                  <RiBarChartBoxLine className="size-4 text-accent-700" />
                  {isEn ? "Your learning performance summary" : "Rangkuman hasil belajarmu"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
                  {isEn ? "Accuracy: " : "Akurasi: "}{accuracyPercent}%
                </span>
              </div>

              <div className="space-y-1.5">
                {answeredHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-background-primary-default border border-border-button-default flex items-center justify-between text-caption-1-medium"
                  >
                    <span className="truncate">
                      {isEn ? `Question #${item.questionOrder}: ` : `Soal #${item.questionOrder}: `}
                      {item.concept}
                    </span>
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption-2-medium shrink-0",
                        item.isCorrect
                          ? "bg-accent-700/10 text-accent-700 border border-accent-700/20"
                          : "bg-[#D97706]/10 text-text-error-primary border border-[#D97706]/20"
                      )}
                    >
                      {item.isCorrect ? <RiCheckLine className="size-3" /> : <RiRestartLine className="size-3" />}
                      <span>
                        {item.isCorrect
                          ? (isEn ? "Correct" : "Benar")
                          : (isEn ? "Needs review" : "Perlu diulang")}
                      </span>
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
                {isEn ? "Join another room" : "Masuk ke ruang lain"}
              </ButtonLink>
              <ButtonLink
                href="/"
                variant="secondary"
                leadingIcon={RiArrowLeftLine}
                className="flex-1"
              >
                {isEn ? "Back to home" : "Kembali ke beranda"}
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
                <div className="size-8 rounded-xl bg-accent-700/10 text-accent-700 border border-accent-700/20 flex items-center justify-center">
                  <RiCopilotFill className="size-4" />
                </div>
                <h4 className="text-body-semibold text-text-primary">
                  {isEn ? "Exile student copilot" : "Copilot siswa exile"}
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
                onClick={() =>
                  handleAskStudentCopilot(
                    isEn
                      ? "Summarize the current lesson material."
                      : "Rangkumkan penjelasan materi pembelajaran saat ini."
                  )
                }
                className="cursor-pointer px-2.5 py-1 rounded-lg bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-[11px] text-text-primary"
              >
                {isEn ? "Summarize lesson" : "Rangkum penjelasan guru"}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskStudentCopilot(
                    isEn
                      ? "Give me a hint on this active question."
                      : "Saya belum mengerti maksud soal aktif ini, beri petunjuk."
                  )
                }
                className="cursor-pointer px-2.5 py-1 rounded-lg bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-[11px] text-text-primary"
              >
                {isEn ? "Hint for current question" : "Beri petunjuk soal ini"}
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
                      : "me-auto bg-background-primary-default border border-accent-700/20 text-text-primary shadow-2xs"
                  )}
                >
                  {msg.role === "assistant" && (
                    <span className="text-[10px] font-semibold text-accent-700 block mb-1">
                      Copilot
                    </span>
                  )}
                  <FormattedMessage content={msg.content} />
                </div>
              ))}
              {copilotLoading && (
                <div className="p-2.5 rounded-2xl me-auto bg-background-primary-default border border-accent-700/20 flex items-center gap-2 text-caption-2-medium text-text-secondary">
                  <Spinner size="xs" />
                  <span>{isEn ? "Copilot is typing..." : "Copilot sedang mengetik..."}</span>
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
                placeholder={
                  isEn
                    ? "Ask any concept you don't understand..."
                    : "Tanyakan konsep yang belum kamu mengerti..."
                }
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
