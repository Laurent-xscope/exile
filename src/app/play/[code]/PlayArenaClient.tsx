"use client";

import React, { useEffect, useState } from "react";
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
} from "@remixicon/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { soundEffects } from "@/lib/audio/sounds";
import { loadSettings } from "@/lib/settings/user-settings";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { ButtonLink } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Chip } from "@/components/base/badges/chip";
import { StatusDot } from "@/components/base/badges/status-dot";
import { Badge } from "@/components/base/badges/badge";
import { Avatar } from "@/components/base/avatar/avatar";
import { ProgressTrack } from "@/components/base/progress/progress";
import { Spinner } from "@/components/base/spinner/spinner";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
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

      localStorage.setItem("exile_player_nickname", resolvedNickname);
      sessionStorage.setItem("exile_nickname", resolvedNickname);
      localStorage.setItem("exile_player_avatar", resolvedAvatar);
      sessionStorage.setItem("exile_avatar", resolvedAvatar);

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

        if (isMounted && (joinData?.nickname || joinData?.player?.nickname)) {
          const syncedNick = joinData.nickname || joinData.player.nickname;
          setNickname(syncedNick);
          localStorage.setItem("exile_player_nickname", syncedNick);
          sessionStorage.setItem("exile_nickname", syncedNick);
        }

        if (isMounted && (joinData?.avatar || joinData?.player?.avatar)) {
          const syncedAvatar = joinData.avatar || joinData.player.avatar;
          setAvatar(syncedAvatar);
          localStorage.setItem("exile_player_avatar", syncedAvatar);
          sessionStorage.setItem("exile_avatar", syncedAvatar);
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
      if (res.status === 304) {
        return;
      }
      const data = await res.json();

      if (res.ok && data.success) {
        setRoomState(data);

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
            particleCount: 60,
            spread: 70,
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
            () => {
              fetchState();
            }
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
  }, [roomCode, lastQuestionId]);

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
    if (hasAnsweredCurrentQ || submitting || !roomState?.currentQuestion) return;

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

      if (submitData.player?.id && submitData.player.id !== playerId) {
        setPlayerId(submitData.player.id);
        localStorage.setItem("exile_player_id", submitData.player.id);
        sessionStorage.setItem("exile_player_id", submitData.player.id);
      }

      const isCorrect = Boolean(submitData.submission?.isCorrect);
      const scoreAwarded = Number(submitData.submission?.scoreAwarded ?? 0);
      const correctOpt =
        submitData.correctAnswer ||
        submitData.submission?.correctAnswer ||
        "A";

      setHasAnsweredCurrentQ(true);

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
            "Pilihanmu tepat! Kamu memahami konteks kesantunan dengan benar.",
        });
        toast.success(`+${scoreAwarded} poin diperoleh`);
      } else {
        soundEffects.playIncorrect();
        toast.error("Pilihan belum tepat");
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
              "Perhatikan kembali konteks tingkatan bahasa pada soal.";

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
      <header className="border-b border-separator-border bg-background-primary-default/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
                <Chip variant="caption" color="soft">
                  {avatar}
                </Chip>
                {myStreak > 1 && (
                  <Chip variant="caption" color="orange" className="gap-1">
                    <RiFireLine className="size-3.5 shrink-0" aria-hidden />
                    {myStreak}x beruntun
                  </Chip>
                )}
              </div>
              <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary mt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot color="green" />
                  PIN: <bdi className="font-mono">{roomCode}</bdi>
                </span>
                <span>•</span>
                <span>Peringkat #{myRank}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              <span className="text-caption-2-medium text-text-secondary block">
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
        {roomState?.status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 px-6 bg-background-primary-default border border-border-button-default rounded-3xl shadow-card space-y-5"
          >
            <div className="size-12 mx-auto rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-center text-foreground-icon-primary shadow-xs">
              <RiBookOpenLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-title-2-semibold text-text-primary">
                Kamu sudah bergabung di ruang kuis
              </h2>
              <p className="text-body-regular text-text-secondary max-w-md mx-auto">
                Tunggu Bapak/Ibu Guru{" "}
                <strong className="text-body-semibold text-text-primary">
                  {roomState.hostName || "Pengajar Exile"}
                </strong>{" "}
                memulai pertanyaan dari layar utama.
              </p>
            </div>

            <div className="flex items-center justify-center">
              <Chip variant="subtle" color="lime" className="gap-2 px-3 py-1.5 rounded-full">
                <StatusDot color="green" />
                <span>
                  Terhubung ke ruangan <bdi className="font-mono">{roomCode}</bdi>
                </span>
              </Chip>
            </div>
          </motion.div>
        )}

        {isQuestionActive && roomState?.currentQuestion && (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Chip variant="subtle" color="gray" className="px-2.5 py-1">
                  Pertanyaan {(roomState.currentQuestionIndex || 0) + 1} dari{" "}
                  {roomState.totalQuestions}
                </Chip>

                <Chip
                  variant="subtle"
                  color={timeLeft <= 5 ? "rose" : "neutral"}
                  className="gap-1.5 px-2.5 py-1 tabular-nums"
                >
                  <RiTimeLine className="size-4 shrink-0" aria-hidden />
                  <span>{timeLeft} detik</span>
                </Chip>
              </div>

              <ProgressTrack
                percentage={timerPercent}
                size="md"
                className={cx(
                  timeLeft <= 5 ? "text-status-rose-text" : "text-accent-500"
                )}
              />
            </div>

            <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {roomState.currentQuestion.conceptTag && (
                  <Chip variant="caption" color="blue">
                    {roomState.currentQuestion.conceptTag}
                  </Chip>
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
                            ? "bg-accent-500 text-text-white border-accent-600"
                            : "bg-questionnaire-key-background group-hover:bg-questionnaire-key-hover-background text-text-primary border-border-button-default"
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
                    ? "bg-status-lime-background/40 border-border-button-default"
                    : "bg-status-rose-background/40 border-border-error-default"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cx(
                      "size-10 rounded-xl flex items-center justify-center shrink-0",
                      lastSubmissionResult?.isCorrect
                        ? "bg-status-lime-background text-status-lime-text"
                        : "bg-status-rose-background text-status-rose-text"
                    )}
                  >
                    {lastSubmissionResult?.isCorrect ? (
                      <RiCheckLine className="size-5" aria-hidden />
                    ) : (
                      <RiCloseLine className="size-5" aria-hidden />
                    )}
                  </div>

                  <div>
                    <h3 className="text-headline-semibold text-text-primary">
                      {lastSubmissionResult?.isCorrect
                        ? "Pilihanmu tepat!"
                        : "Pilihan belum tepat"}
                    </h3>
                    <p className="text-caption-1-medium text-text-secondary">
                      {lastSubmissionResult?.isCorrect
                        ? `+${lastSubmissionResult.scoreAwarded} poin bertambah.`
                        : "Simak penjelasan konsep di bawah ini:"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background-primary-default border border-border-button-default text-body-regular text-text-secondary shadow-xs space-y-1">
                  <span className="text-caption-1-semibold text-text-primary block">
                    {lastSubmissionResult?.isCorrect
                      ? "Ulasan materi:"
                      : "Catatan konsep AI:"}
                  </span>
                  <p className="text-body-regular text-text-primary">
                    {lastSubmissionResult?.microFeedback ||
                      lastSubmissionResult?.explanation ||
                      "Jawaban telah tersimpan di sistem pembelajaran."}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-caption-1-medium text-text-secondary pt-1">
                  <StatusDot color="yellow" />
                  <span>Menunggu guru membuka pertanyaan berikutnya...</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {roomState?.status === "showing_leaderboard" && (
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
                    player.nickname.toLowerCase() ===
                      nickname.trim().toLowerCase();
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

                      <Chip variant="caption" color={isMe ? "blue" : "soft"}>
                        {player.score.toLocaleString()} poin
                      </Chip>
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

        {roomState?.status === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-6 bg-background-primary-default border border-border-button-default rounded-3xl shadow-card space-y-6"
          >
            <div className="size-12 mx-auto rounded-2xl bg-status-orange-background text-status-orange-text flex items-center justify-center shadow-xs">
              <RiTrophyLine className="size-6" aria-hidden />
            </div>

            <div className="space-y-1">
              <h2 className="text-title-2-semibold text-text-primary">
                Kuis Telah Selesai
              </h2>
              <p className="text-body-regular text-text-secondary">
                Hasil akhir kuis kamu:{" "}
                <strong className="text-body-semibold text-text-primary">
                  {myScore.toLocaleString()} poin
                </strong>{" "}
                (Peringkat #{myRank}).
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 items-end pt-2 pb-2">
              {roomState.leaderboard[1] && (
                <div className="p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default flex flex-col items-center gap-1.5">
                  <Avatar
                    size="sm"
                    color="neutral"
                    initials={getInitials(roomState.leaderboard[1].nickname)}
                  />
                  <Chip variant="caption" color="neutral">
                    Peringkat 2
                  </Chip>
                  <p className="text-body-medium text-text-primary truncate w-full">
                    {roomState.leaderboard[1].nickname}
                  </p>
                  <span className="text-caption-1-medium text-text-secondary tabular-nums">
                    {roomState.leaderboard[1].score.toLocaleString()} poin
                  </span>
                </div>
              )}

              {roomState.leaderboard[0] && (
                <div className="p-4 rounded-2xl bg-background-secondary-default border-2 border-border-button-hover flex flex-col items-center gap-1.5 shadow-card">
                  <Avatar
                    size="md"
                    color="lime"
                    initials={getInitials(roomState.leaderboard[0].nickname)}
                  />
                  <Chip variant="caption" color="lime">
                    Juara 1
                  </Chip>
                  <p className="text-body-semibold text-text-primary truncate w-full">
                    {roomState.leaderboard[0].nickname}
                  </p>
                  <span className="text-caption-1-semibold text-text-primary tabular-nums">
                    {roomState.leaderboard[0].score.toLocaleString()} poin
                  </span>
                </div>
              )}

              {roomState.leaderboard[2] && (
                <div className="p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default flex flex-col items-center gap-1.5">
                  <Avatar
                    size="sm"
                    color="neutral"
                    initials={getInitials(roomState.leaderboard[2].nickname)}
                  />
                  <Chip variant="caption" color="neutral">
                    Peringkat 3
                  </Chip>
                  <p className="text-body-medium text-text-primary truncate w-full">
                    {roomState.leaderboard[2].nickname}
                  </p>
                  <span className="text-caption-1-medium text-text-secondary tabular-nums">
                    {roomState.leaderboard[2].score.toLocaleString()} poin
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <ButtonLink
                href="/play"
                variant="primary"
                leadingIcon={RiPlayCircleLine}
                className="flex-1"
              >
                Masuk ke Ruang Kuis Lain
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
    </main>
  );
}
