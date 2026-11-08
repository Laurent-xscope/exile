"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  RiAlertLine,
} from "@remixicon/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { soundEffects } from "@/lib/audio/sounds";
import { useExileSettings } from "@/lib/settings/user-settings";
import { useTranslation } from "@/lib/i18n/use-translation";
import { markStudentTabForRoom } from "@/lib/rooms/host-token";
import { TelegramSpoilerPin } from "@/components/rooms/telegram-spoiler-pin";
import { RoomChatWidget } from "@/components/rooms/room-chat-drawer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { InputBase } from "@/components/base/input/input";
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

const nowMs = () => Date.now();

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
  isAbandoned?: boolean;
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
  chatMessages?: Array<{
    id: string;
    roomCode: string;
    senderId: string;
    senderName: string;
    senderRole: "teacher" | "student";
    avatar?: string;
    text: string;
    createdAt: string;
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
  const { settings, updateSetting } = useExileSettings();
  const isMuted = !settings.soundEnabled;
  const finishedCelebrated = useRef(false);
  const [isClassroomAbandoned, setIsClassroomAbandoned] = useState(false);

  const [showCopilot, setShowCopilot] = useState(true);
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

  const [answeredHistory, setAnsweredHistory] = useState<
    Array<{ questionOrder: number; concept: string; isCorrect: boolean; score: number }>
  >([]);

  const leaderboardFade = useScrollFade();

  const toggleSound = () => {
    updateSetting("soundEnabled", !settings.soundEnabled);
  };

  useEffect(() => {
    markStudentTabForRoom(roomCode);
  }, [roomCode]);

  const fetchState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/state`);
      if (res.status === 304) return;
      const data = await res.json().catch(() => ({}));

      if (res.status === 404 || data?.isAbandoned) {
        setIsClassroomAbandoned(true);
        setShowCopilot(false);
        finishedCelebrated.current = true;
        setLoading(false);
        return;
      }

      if (res.ok && data.success) {
        if (data.isAbandoned) {
          setIsClassroomAbandoned(true);
          setShowCopilot(false);
          finishedCelebrated.current = true;
          setLoading(false);
          return;
        }

        setRoomState(data);

        if (data.players && playerId) {
          const me = data.players.find((p: { id: string }) => p.id === playerId);
          if (me?.status) {
            setMyStatus((prevStatus) => {
              if (prevStatus === "pending" && me.status === "approved") {
                toast.success(
                  isEn ? "Approved by teacher!" : "Disetujui oleh pengajar!"
                );
                soundEffects.playCorrect();
              } else if (prevStatus === "pending" && me.status === "rejected") {
                toast.error(
                  isEn ? "Admission denied by teacher" : "Akses ditolak oleh pengajar"
                );
                soundEffects.playIncorrect();
              }
              return me.status;
            });
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

        if (data.status === "finished" && !data.isAbandoned && !finishedCelebrated.current) {
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
    if (isClassroomAbandoned) return;
    // First poll runs after mount; subsequent polls are the realtime mechanism.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
    // Polling is the real-time mechanism; state is fetched by room code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, lastQuestionId, lastQuestionStartedAt, playerId, isClassroomAbandoned]);

  const isQuestionActive =
    !isClassroomAbandoned &&
    (roomState?.status === "active" || roomState?.status === "question_active");
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
      const correctOpt = submitData.correctAnswer || "A";

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
        const streak = Number(submitData.player?.streak) || 0;
        if (streak >= 3) {
          soundEffects.playStreak(streak);
        } else {
          soundEffects.playCorrect();
        }
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
            (isEn
              ? "Great job! Your analysis and understanding of this concept is spot on."
              : "Pilihanmu tepat! Analisis dan pemahamanmu terhadap materi ini sangat baik."),
        });
        toast.success(
          isEn
            ? `Correct! +${scoreAwarded} points awarded`
            : `Benar! +${scoreAwarded} poin diperoleh`
        );
      } else {
        soundEffects.playIncorrect();
        toast.error(isEn ? "Incorrect answer" : "Jawaban salah");
        setLastSubmissionResult({
          isCorrect: false,
          scoreAwarded,
          correctOption: correctOpt,
          microFeedback:
            submitData.explanation ||
            (isEn
              ? "Review the answer options for this topic."
              : "Perhatikan kembali analisis opsi jawaban pada materi ini."),
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
          const explanationText =
            explainData.feedback ||
            submitData.explanation ||
            (isEn
              ? "Review the answer options for this topic."
              : "Perhatikan kembali analisis opsi jawaban pada materi ini.");

          setLastSubmissionResult({
            isCorrect: false,
            scoreAwarded,
            correctOption: correctOpt,
            microFeedback: explanationText,
          });
        } catch {
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
            ? "Failed to submit answer"
            : "Gagal mengirim jawaban";
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
        throw new Error(
          data.error ||
            (isEn ? "Failed to contact copilot" : "Gagal menghubungi copilot")
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
            ? "Copilot is busy"
            : "Copilot sedang sibuk";
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
      <header className="bg-background-primary-default/95 sticky top-0 z-30 backdrop-blur-md border-b border-separator-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          {/* Row 1 on mobile / Left section on desktop */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
            <Link
              href="/"
              className="shrink-0 size-9 sm:size-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isEn ? "Back to home" : "Kembali ke beranda"}
            >
              <RiArrowLeftLine className="size-5" />
            </Link>

            <Avatar
              size="md"
              color="neutral"
              initials={getInitials(nickname)}
              aria-label={nickname}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <span className="text-body-semibold text-text-primary truncate">
                  {nickname}
                </span>

                {/* Admission Status Indicator */}
                {myStatus === "pending" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-default text-text-secondary">
                    <RiTimeLine className="size-3" />
                    <span>{isEn ? "Awaiting approval" : "Menunggu persetujuan"}</span>
                  </span>
                )}

                {myStatus === "rejected" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-error text-text-error-primary">
                    <RiCloseLine className="size-3" />
                    <span>{isEn ? "Admission denied" : "Akses ditolak"}</span>
                  </span>
                )}

                {myStreak > 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-default text-text-primary border border-border-button-default">
                    <RiFireLine className="size-3 shrink-0" aria-hidden />
                    <span>{isEn ? `${myStreak}x streak` : `${myStreak}x beruntun`}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 text-caption-1-medium text-text-secondary mt-0.5 truncate">
                <span>Pin:</span>
                <TelegramSpoilerPin pin={roomCode} size="sm" isEn={isEn} copyable={false} />
                <span>•</span>
                <span>{isEn ? `Rank #${myRank}` : `Peringkat #${myRank}`}</span>
              </div>
            </div>
          </div>

          {/* Row 2 on mobile / Right section on desktop */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 min-w-0">
            <RoomChatWidget
              role="student"
              roomCode={roomCode}
              senderId={playerId}
              senderName={nickname}
              playerToken={playerToken}
              messages={roomState?.chatMessages}
              isEn={isEn}
            />

            <button
              type="button"
              onClick={() => setShowCopilot((prev) => !prev)}
              className="cursor-pointer px-2.5 sm:px-3 py-1.5 rounded-xl text-caption-1-medium flex items-center gap-1.5 transition outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary border border-border-button-default"
              aria-label={
                showCopilot
                  ? (isEn ? "Hide copilot" : "Sembunyikan copilot")
                  : (isEn ? "Open copilot" : "Buka copilot")
              }
            >
              <RiCopilotFill className="size-4" />
              <span className="hidden sm:inline">
                {showCopilot
                  ? (isEn ? "Hide" : "Sembunyikan")
                  : (isEn ? "Open copilot" : "Buka copilot")}
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <IconButton
              icon={isMuted ? RiVolumeMuteLine : RiVolumeUpLine}
              size="medium"
              onClick={toggleSound}
              aria-label={isMuted ? (isEn ? "Unmute audio" : "Aktifkan suara") : (isEn ? "Mute audio" : "Matikan suara")}
              title={isMuted ? (isEn ? "Unmute audio" : "Aktifkan suara") : (isEn ? "Mute audio" : "Matikan suara")}
            />
            {/* Redesigned Total Score Stat Badge */}
            <div
              className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-xl bg-background-secondary-default text-text-primary border border-border-button-default select-none transition-colors shrink-0"
              title={
                isEn
                  ? `Total score: ${myScore.toLocaleString()} points`
                  : `Total skor: ${myScore.toLocaleString()} poin`
              }
            >
              <div className="size-6 rounded-lg bg-background-tertiary-default text-text-primary flex items-center justify-center shrink-0">
                <RiTrophyLine className="size-3.5" aria-hidden="true" />
              </div>
              <div className="flex flex-col text-start justify-center min-w-0">
                <span className="text-caption-2-medium text-text-secondary leading-none hidden sm:block">
                  {isEn ? "Total score" : "Total skor"}
                </span>
                <span className="font-mono text-caption-1-semibold text-text-primary tabular-nums leading-tight sm:mt-0.5">
                  {myScore.toLocaleString()}{" "}
                  <span className="font-sans text-caption-2-regular text-text-tertiary">
                    {isEn ? "pts" : "poin"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cx(
          "mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center transition-all",
          showCopilot && myStatus === "approved" && !isClassroomAbandoned
            ? "max-w-6xl"
            : "max-w-2xl"
        )}
      >
        {/* ABANDONED CLASSROOM NOTICE */}
        {isClassroomAbandoned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default rounded-2xl shadow-sm border border-border-button-default space-y-5"
          >
            <div className="size-14 mx-auto rounded-2xl bg-background-tertiary-error text-text-error-primary flex items-center justify-center">
              <RiAlertLine className="size-7" aria-hidden />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption-1-medium bg-background-tertiary-error text-text-error-primary">
                <RiAlertLine className="size-3.5" aria-hidden />
                <span>{isEn ? "Room closed" : "Ruangan ditutup"}</span>
              </span>

              <h2 className="text-title-2-semibold text-text-primary">
                {isEn ? "Classroom was closed by the teacher" : "Ruang kelas telah ditutup oleh pengajar"}
              </h2>

              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                {isEn
                  ? "The teacher has left and ended this classroom session. All waiting and participating students have been disconnected. Please check with your teacher for a new room pin."
                  : "Guru telah meninggalkan ruangan dan menutup sesi kelas ini. Seluruh siswa yang sedang menunggu atau bergabung telah dikeluarkan. Silakan hubungi pengajar Anda untuk kode pin yang baru."}
              </p>
            </div>

            <div className="pt-2">
              <ButtonLink
                href="/play"
                variant="secondary"
                size="medium"
                leadingIcon={RiArrowLeftLine}
                className="border border-border-button-default"
              >
                {isEn ? "Back to enter pin" : "Kembali ke beranda kuis"}
              </ButtonLink>
            </div>
          </motion.div>
        )}

        {/* PENDING APPROVAL WAITING SCREEN */}
        {!isClassroomAbandoned && myStatus === "pending" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default rounded-3xl shadow-card border border-border-button-default space-y-5"
          >
            <div className="relative size-14 mx-auto flex items-center justify-center">
              <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-background-tertiary-default opacity-40" />
              <div className="relative size-12 rounded-2xl bg-background-secondary-default text-text-primary border border-border-button-default flex items-center justify-center">
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

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-background-secondary-default text-text-secondary border border-border-button-default">
              <RiTimeLine className="size-4 shrink-0" />
              <span>{isEn ? "Status: guest verification queue" : "Status: antrean verifikasi tamu"}</span>
            </div>
          </motion.div>
        )}

        {/* REJECTED ADMISSION SCREEN */}
        {!isClassroomAbandoned && myStatus === "rejected" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default rounded-3xl shadow-card border border-border-button-default space-y-5"
          >
            <div className="size-14 mx-auto rounded-2xl bg-background-tertiary-error text-text-error-primary flex items-center justify-center shadow-card">
              <RiCloseLine className="size-7" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption-1-medium bg-background-tertiary-error text-text-error-primary">
                <RiCloseLine className="size-3.5" aria-hidden="true" />
                <span>{isEn ? "Admission denied" : "Akses ditolak"}</span>
              </span>

              <h2 className="text-title-2-semibold text-text-primary">
                {isEn ? "Admission denied by teacher" : "Akses masuk ditolak oleh pengajar"}
              </h2>

              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                {isEn
                  ? "The educator did not approve your request to join this classroom. Please check with your teacher if this was in error."
                  : "Pengajar tidak menyetujui permintaan kamu untuk bergabung ke ruang kelas ini. Silakan hubungi pengajar jika ini merupakan kekeliruan."}
              </p>
            </div>

            <div className="pt-2">
              <ButtonLink
                href="/play"
                variant="secondary"
                size="medium"
                leadingIcon={RiArrowLeftLine}
                className="border border-border-button-default"
              >
                {isEn ? "Back to enter pin" : "Kembali ke beranda kuis"}
              </ButtonLink>
            </div>
          </motion.div>
        )}

        {/* LOBBY / ACTIVE QUESTION / LEADERBOARD / FINISHED VIEW */}
        {!isClassroomAbandoned && myStatus === "approved" && (
          <div className={cx(showCopilot ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full" : "w-full")}>
            <div className={cx(showCopilot ? "lg:col-span-8 space-y-5" : "w-full space-y-5")}>
              {/* LOBBY: WAITING FOR TEACHER TO START */}
              {roomState?.status === "waiting" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10 px-6 bg-background-primary-default rounded-3xl shadow-card border border-border-button-default space-y-5"
                >
                  <div className="size-12 mx-auto rounded-2xl bg-background-secondary-default text-text-primary border border-border-button-default flex items-center justify-center shadow-xs">
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
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-caption-1-medium bg-background-secondary-default text-text-secondary border border-border-button-default">
                      <span className="relative flex size-2">
                        <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-text-secondary opacity-50" />
                        <span className="relative inline-flex rounded-full size-2 bg-text-secondary" />
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
              {isQuestionActive && roomState?.currentQuestion && (
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
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums border border-border-button-default",
                          timeLeft <= 5
                            ? "bg-background-tertiary-error text-text-error-primary"
                            : "bg-background-primary-default text-text-secondary"
                        )}
                      >
                        <RiTimeLine className="size-4 shrink-0" aria-hidden />
                        <span>{timeLeft} {isEn ? "sec" : "detik"}</span>
                      </span>
                    </div>

                    <ProgressTrack
                      percentage={timerPercent}
                      size="md"
                      className={timeLeft <= 5 ? "text-text-error-primary" : "text-text-primary"}
                    />
                  </div>

                  <div className="bg-background-primary-default rounded-3xl p-6 shadow-card border border-border-button-default space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {roomState.currentQuestion.conceptTag && (
                        <span className="px-2.5 py-0.5 rounded-full text-caption-2-medium bg-background-secondary-default text-text-primary border border-border-button-default">
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
                      className="flex items-start gap-3 rounded-2xl bg-background-tertiary-error border border-border-error-default p-4 text-caption-1-medium text-text-error-primary"
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
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background-primary-default p-3 shadow-card border border-border-button-default">
                      <span className="text-caption-2-semibold text-text-secondary">
                        {isEn ? "Powerups (1x per session):" : "Powerup siswa (1x pakai):"}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={usedPowerups.includes("time_freeze")}
                          onClick={() => handleTogglePowerup("time_freeze")}
                          className={cx(
                            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40 border border-border-button-default",
                            activePowerup === "time_freeze"
                              ? "bg-background-tertiary-default text-text-primary font-bold shadow-xs"
                              : "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                          )}
                        >
                          <RiSnowflakeLine className="size-4" />
                          <span>{isEn ? "Freeze time" : "Bekukan waktu"}</span>
                        </button>
                        <button
                          type="button"
                          disabled={usedPowerups.includes("double_jeopardy")}
                          onClick={() => handleTogglePowerup("double_jeopardy")}
                          className={cx(
                            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40 border border-border-button-default",
                            activePowerup === "double_jeopardy"
                              ? "bg-background-tertiary-default text-text-primary font-bold shadow-xs"
                              : "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                          )}
                        >
                          <RiFlashlightLine className="size-4" />
                          <span>{isEn ? "2x score" : "Skor 2x"}</span>
                        </button>
                        <button
                          type="button"
                          disabled={usedPowerups.includes("immunity")}
                          onClick={() => handleTogglePowerup("immunity")}
                          className={cx(
                            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-caption-2-semibold transition disabled:cursor-not-allowed disabled:opacity-40 border border-border-button-default",
                            activePowerup === "immunity"
                              ? "bg-background-tertiary-default text-text-primary font-bold shadow-xs"
                              : "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover"
                          )}
                        >
                          <RiShieldFlashLine className="size-4" />
                          <span>{isEn ? "Streak shield" : "Perisai beruntun"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4 OPTION CARDS */}
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
                            "group p-4 rounded-2xl text-start transition flex items-start justify-between gap-3 cursor-pointer shadow-card border",
                            "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                            "disabled:cursor-default",
                            isCorrectCard
                              ? "bg-background-secondary-default border-border-focus-ring text-text-primary"
                              : isWrongSelectedCard
                                ? "bg-background-tertiary-error border-border-error-default text-text-error-primary"
                                : isRevealed
                                  ? "bg-background-primary-default border-border-button-default opacity-65 text-text-secondary"
                                  : isSelected
                                    ? "bg-background-secondary-default border-border-button-hover text-text-primary"
                                    : "bg-background-primary-default border-border-button-default hover:bg-background-secondary-default text-text-primary"
                          )}
                        >
                          <span className="flex items-start gap-3 min-w-0">
                            <span
                              className={cx(
                                "size-7 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0 transition-colors border",
                                isCorrectCard
                                  ? "bg-background-tertiary-default border-border-focus-ring text-text-primary"
                                  : isWrongSelectedCard
                                    ? "bg-background-tertiary-error border-border-error-default text-text-error-primary"
                                    : isSelected
                                      ? "bg-background-tertiary-default border-border-button-hover text-text-primary font-bold"
                                      : "bg-background-secondary-default border-border-button-default text-text-secondary"
                              )}
                            >
                              {option.label}
                            </span>
                            <span className="text-body-medium text-text-primary pt-0.5">
                              {option.text}
                            </span>
                          </span>
                          {isCorrectCard ? (
                            <RiCheckLine className="size-5 shrink-0 text-text-primary mt-1" />
                          ) : isWrongSelectedCard ? (
                            <RiCloseLine className="size-5 shrink-0 text-text-error-primary mt-1" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {hasAnsweredCurrentQ && (
                    <motion.div
                      role="status"
                      aria-live="polite"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cx(
                        "p-6 rounded-3xl shadow-card border space-y-4",
                        lastSubmissionResult?.isCorrect
                          ? "bg-background-secondary-default border-border-button-default"
                          : "bg-background-tertiary-error border-border-error-default text-text-error-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            "size-10 rounded-xl flex items-center justify-center shrink-0 border border-border-button-default",
                            lastSubmissionResult?.isCorrect
                              ? "bg-background-tertiary-default text-text-primary"
                              : "bg-background-secondary-default text-text-error-primary"
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
                        <span className="size-2 rounded-full bg-text-tertiary" />
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
              {roomState?.status === "showing_leaderboard" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-background-primary-default rounded-3xl p-6 shadow-card border border-border-button-default space-y-4"
                >
                  <div className="text-center pb-3 space-y-1">
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
                              "p-3 rounded-2xl flex items-center justify-between transition border border-border-button-default",
                              isMe
                                ? "bg-background-secondary-default shadow-xs"
                                : "bg-background-primary-default"
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
              {roomState?.status === "finished" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 px-6 bg-background-primary-default rounded-3xl shadow-card border border-border-button-default space-y-6"
                >
                  <div className="size-12 mx-auto rounded-2xl bg-background-secondary-default text-text-primary border border-border-button-default flex items-center justify-center shadow-xs">
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
                        <RiBarChartBoxLine className="size-4 text-text-primary" />
                        {isEn ? "Your learning performance summary" : "Rangkuman hasil belajarmu"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-default text-text-primary border border-border-button-default">
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
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption-2-medium shrink-0 border border-border-button-default",
                              item.isCorrect
                                ? "bg-background-tertiary-default text-text-primary"
                                : "bg-background-tertiary-error text-text-error-primary border-border-error-default"
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
                      variant="secondary"
                      leadingIcon={RiPlayCircleLine}
                      className="flex-1 border border-border-button-default"
                    >
                      {isEn ? "Join another room" : "Masuk ke ruang lain"}
                    </ButtonLink>
                    <ButtonLink
                      href="/"
                      variant="secondary"
                      leadingIcon={RiArrowLeftLine}
                      className="flex-1 border border-border-button-default"
                    >
                      {isEn ? "Back to home" : "Kembali ke beranda"}
                    </ButtonLink>
                  </div>
                </motion.div>
              )}
            </div>

            {/* RESPONSIVE INLINE STUDENT COPILOT PANEL */}
            {showCopilot && (
              <aside
                aria-label={isEn ? "Study copilot" : "Copilot belajar"}
                className="lg:col-span-4 w-full bg-background-primary-default rounded-3xl p-5 shadow-card border border-border-button-default space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-separator-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-8 rounded-xl bg-background-secondary-default text-text-primary flex items-center justify-center border border-border-button-default shrink-0">
                      <RiCopilotFill className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body-semibold text-text-primary truncate">
                        {isEn ? "Study copilot" : "Copilot belajar"}
                      </h3>
                      <span className="text-caption-2-medium text-text-secondary block">
                        {isEn ? "AI learning assistant" : "Asisten belajar ai"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCopilot(false)}
                    className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption-1-medium bg-background-secondary-default hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary border border-border-button-default transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                    aria-label={isEn ? "Hide copilot" : "Sembunyikan copilot"}
                  >
                    <RiCloseLine className="size-4" aria-hidden="true" />
                    <span>{isEn ? "Hide" : "Sembunyikan"}</span>
                  </button>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1.5">
                  <span className="text-caption-2-semibold text-text-secondary block">
                    {isEn ? "Quick prompts:" : "Pertanyaan cepat:"}
                  </span>
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
                      className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover text-caption-2-medium text-text-primary border border-border-button-default transition-colors text-start"
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
                      className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover text-caption-2-medium text-text-primary border border-border-button-default transition-colors text-start"
                    >
                      {isEn ? "Hint for active question" : "Beri petunjuk soal ini"}
                    </button>
                  </div>
                </div>

                {/* Message History */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto p-3 rounded-2xl bg-background-secondary-default border border-border-button-default text-body-2-regular">
                  {copilotMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cx(
                        "p-3 rounded-2xl whitespace-pre-wrap leading-relaxed max-w-[90%] border border-border-button-default",
                        msg.role === "user"
                          ? "ms-auto bg-background-primary-default text-text-primary rounded-tr-sm"
                          : "me-auto bg-background-primary-default text-text-primary rounded-tl-sm shadow-2xs"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <span className="text-[10px] font-semibold text-text-secondary block mb-1">
                          Copilot
                        </span>
                      )}
                      <FormattedMessage content={msg.content} />
                    </div>
                  ))}
                  {copilotLoading && (
                    <div className="p-2.5 rounded-2xl me-auto bg-background-primary-default flex items-center gap-2 text-caption-2-medium text-text-secondary border border-border-button-default">
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
                  <InputBase
                    aria-label={isEn ? "Ask copilot" : "Tanya copilot"}
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    placeholder={
                      isEn
                        ? "Ask about concepts you need help with..."
                        : "Tanyakan materi yang belum kamu pahami..."
                    }
                    size="small"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="small"
                    disabled={copilotLoading || !copilotInput.trim()}
                    leadingIcon={RiSendPlaneLine}
                    className="border border-border-button-default shrink-0 text-text-primary"
                  >
                    {isEn ? "Send" : "Kirim"}
                  </Button>
                </form>
              </aside>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
