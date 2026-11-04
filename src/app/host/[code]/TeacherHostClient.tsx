"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiBookOpenLine,
  RiTrophyLine,
  RiGroupLine,
  RiFileCopyLine,
  RiArrowRightLine,
  RiCheckLine,
  RiBarChartBoxLine,
  RiFileTextLine,
  RiLightbulbLine,
  RiPlayCircleLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth/use-auth";
import { soundEffects } from "@/lib/audio/sounds";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { Button } from "@/components/base/buttons/button";
import { IconLinkButton } from "@/components/base/buttons/icon-button";
import { Chip } from "@/components/base/badges/chip";
import { StatusDot } from "@/components/base/badges/status-dot";
import { Badge } from "@/components/base/badges/badge";
import { Avatar } from "@/components/base/avatar/avatar";
import { ProgressTrack } from "@/components/base/progress/progress";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/base/modal/modal";
import { Spinner } from "@/components/base/spinner/spinner";
import {
  ScrollFade,
  useScrollFade,
} from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";

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
  status:
    | "waiting"
    | "active"
    | "question_active"
    | "showing_leaderboard"
    | "finished";
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "S";
}

function getStatusMeta(status?: TeacherRoomState["status"]): {
  label: string;
  chipColor: "yellow" | "lime" | "blue" | "neutral";
  dotColor: "yellow" | "green" | "indigo";
} {
  switch (status) {
    case "waiting":
      return {
        label: "Menunggu Siswa",
        chipColor: "yellow",
        dotColor: "yellow",
      };
    case "showing_leaderboard":
      return {
        label: "Papan Skor Ditampilkan",
        chipColor: "blue",
        dotColor: "indigo",
      };
    case "finished":
      return {
        label: "Kuis Selesai",
        chipColor: "neutral",
        dotColor: "indigo",
      };
    case "active":
    case "question_active":
    default:
      return {
        label: "Kuis Berlangsung",
        chipColor: "lime",
        dotColor: "green",
      };
  }
}

export default function TeacherHostClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<TeacherRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticResult | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    "question" | "leaderboard" | "players"
  >("question");
  const [selectedRemedialOption, setSelectedRemedialOption] = useState<
    Record<number, string>
  >({});
  const [creatingRemedialRoom, setCreatingRemedialRoom] = useState(false);

  const leaderboardFade = useScrollFade();
  const playersFade = useScrollFade();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(`/host/${roomCode}`)}`);
    }
  }, [authLoading, user, roomCode, router]);

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

    let channel: ReturnType<typeof supabase.channel> | null = null;
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
      console.warn(
        "[TeacherHost] Realtime subscription skipped:",
        realtimeErr
      );
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

  const handleRunDiagnostic = async () => {
    setDiagnosticLoading(true);
    setShowDiagnosticModal(true);

    try {
      const res = await fetch("/api/ai/class-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          quizId: state?.quizId,
          teacherNotes:
            "Evaluasi pemahaman Basa Bali Alus dan Pasang Aksara.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses diagnostik");

      setDiagnosticData(data.diagnostic);
      // Pre-select the correct option on each remedial question by default so rationale is visible immediately
      if (Array.isArray(data.diagnostic?.adaptiveRemedialQuestions)) {
        const defaults: Record<number, string> = {};
        data.diagnostic.adaptiveRemedialQuestions.forEach(
          (rq: RemedialQuestion, idx: number) => {
            const correctOpt = rq.options.find((o) => o.isCorrect);
            defaults[idx] =
              correctOpt?.label || rq.options[0]?.label || "A";
          }
        );
        setSelectedRemedialOption(defaults);
      }
      toast.success("Laporan diagnostik berhasil disusun");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyusun diagnostik";
      toast.error(msg);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleCreateRemedialRoom = async () => {
    if (!diagnosticData?.adaptiveRemedialQuestions?.length) return;
    soundEffects.playClick();
    setCreatingRemedialRoom(true);

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: state?.quizId,
          hostName: state?.hostName || "Pengajar Exile",
          questions: diagnosticData.adaptiveRemedialQuestions.map(
            (rq, idx) => ({
              id: `remedial-${Date.now()}-${idx + 1}`,
              questionOrder: idx + 1,
              question: rq.question,
              options: rq.options,
              correctAnswer:
                rq.options.find((o) => o.isCorrect)?.label || "A",
              explanation: rq.explanation,
              conceptTag: rq.conceptTag || diagnosticData.topic,
              culturalContext:
                rq.culturalContext || "Remedial Adaptif Kurikulum Merdeka",
            })
          ),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.roomCode) {
        throw new Error(data.error || "Gagal membuat ruang remedial");
      }

      setShowDiagnosticModal(false);
      toast.success(`Ruang remedial berhasil dibuat (PIN: ${data.roomCode})`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal membuat ruang remedial";
      toast.error(msg);
    } finally {
      setCreatingRemedialRoom(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("PIN kuis disalin");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background-full flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-background-primary-default border border-border-button-default rounded-3xl p-8 flex flex-col items-center gap-4 shadow-card">
          <div className="size-12 rounded-2xl bg-background-secondary-default border border-border-button-default text-foreground-icon-primary flex items-center justify-center shadow-sm">
            <RiShieldKeyholeLine className="size-6 text-accent-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-title-2-semibold text-text-primary">
              Autentikasi Pengajar Diperlukan
            </h1>
            <p className="text-body-regular text-text-secondary">
              Akses ke Ruang Kontrol Guru #{roomCode} memerlukan izin akun pengajar terdaftar. Mengalihkan ke laman masuk...
            </p>
          </div>
          <div className="flex items-center gap-2 text-text-tertiary">
            <Spinner size="sm" aria-label="Memverifikasi sesi pengajar" />
            <span className="text-caption-1-regular">Memverifikasi kredensial pengajar...</span>
          </div>
          <Button
            type="button"
            size="medium"
            variant="primary"
            onClick={() => {
              router.push(`/login?next=${encodeURIComponent(`/host/${roomCode}`)}`);
            }}
            className="w-full mt-2"
          >
            Masuk Akun Pengajar
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-background-full flex flex-col items-center justify-center text-text-secondary gap-3">
        <Spinner size="md" aria-label="Menyambungkan ke ruang guru" />
        <p className="text-caption-1-medium text-text-secondary">
          Menyambungkan ke ruang guru...
        </p>
      </div>
    );
  }

  const currentQ = state?.currentQuestion;
  const stats = state?.stats;
  const submissionsCount = stats?.submissionsCount || 0;
  const totalPlayers = stats?.totalPlayers ?? state?.players?.length ?? 0;
  const progressPercent =
    totalPlayers > 0
      ? Math.min(100, Math.round((submissionsCount / totalPlayers) * 100))
      : 0;
  const denom = Math.max(stats?.submissionsCount || 0, 1);
  const statusMeta = getStatusMeta(state?.status);

  return (
    <main className="min-h-screen bg-background-secondary-default text-text-primary flex flex-col transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <IconLinkButton
              href="/"
              icon={RiBookOpenLine}
              size="medium"
              aria-label="Kembali ke Beranda"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-headline-semibold text-text-primary">
                  Ruang Kontrol Guru
                </h1>
                <Chip
                  variant="caption"
                  color={statusMeta.chipColor}
                  className="gap-1.5"
                >
                  <StatusDot color={statusMeta.dotColor} />
                  <span>{statusMeta.label}</span>
                </Chip>
              </div>
              <p className="text-caption-1-regular text-text-secondary truncate">
                Pengajar: {state?.hostName || "Pengajar Exile"} • Kurikulum
                Merdeka Bali
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />

            <button
              type="button"
              onClick={copyPin}
              className={cx(
                "cursor-pointer flex items-center gap-3 px-3.5 py-1.5 rounded-xl",
                "bg-background-primary-default hover:bg-background-primary-hover",
                "border border-border-button-default hover:border-border-button-hover",
                "transition shadow-card outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              )}
              title="Klik untuk menyalin PIN"
            >
              <div className="text-start">
                <span className="text-caption-2-medium text-text-secondary block">
                  PIN Ruang Kuis
                </span>
                <bdi className="font-mono text-body-bold text-text-primary">
                  {roomCode}
                </bdi>
              </div>
              <RiFileCopyLine
                className="size-4 text-foreground-icon-secondary shrink-0"
                aria-hidden
              />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-background-primary-default border border-border-button-default shadow-card">
              <RiGroupLine
                className="size-4 text-foreground-icon-secondary"
                aria-hidden
              />
              <span className="text-caption-1-medium text-text-primary tabular-nums">
                {totalPlayers} siswa terhubung
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-5">
          {state?.status === "waiting" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusDot color="yellow" />
                  <span className="text-body-semibold text-text-primary">
                    Lobi Ruang Kuis Menunggu Siswa
                  </span>
                  <Chip variant="caption" color="yellow">
                    {totalPlayers} siswa siap
                  </Chip>
                </div>
                <p className="text-caption-1-regular text-text-secondary">
                  Bagikan PIN <bdi className="font-mono font-semibold text-text-primary">{roomCode}</bdi> kepada siswa. Klik tombol di samping untuk mengaktifkan Soal 1 tanpa melompati pertanyaan pertama.
                </p>
              </div>

              <Button
                variant="primary"
                leadingIcon={RiPlayCircleLine}
                onClick={() => handleAction("resume_quiz")}
                disabled={actionLoading}
                className="shrink-0"
              >
                Mulai Kuis Sekarang (Soal 1)
              </Button>
            </motion.div>
          )}

          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) =>
              setActiveTab(
                String(key) as "question" | "leaderboard" | "players"
              )
            }
          >
            <TabList aria-label="Navigasi Ruang Guru">
              <Tab id="question" icon={RiBookOpenLine}>
                Pertanyaan Aktif
              </Tab>
              <Tab
                id="leaderboard"
                icon={RiTrophyLine}
                count={state?.leaderboard?.length ?? 0}
              >
                Papan Skor
              </Tab>
              <Tab id="players" icon={RiGroupLine} count={totalPlayers}>
                Daftar Siswa
              </Tab>
            </TabList>

            <TabPanel id="question">
              {currentQ ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip variant="subtle" color="gray">
                        Soal {(state?.currentQuestionIndex || 0) + 1} dari{" "}
                        {state?.totalQuestions || 5}
                      </Chip>
                      {currentQ.conceptTag && (
                        <Chip variant="caption" color="blue">
                          {currentQ.conceptTag}
                        </Chip>
                      )}
                    </div>

                    <span className="text-caption-1-medium text-text-secondary tabular-nums">
                      Respon masuk:{" "}
                      <strong className="text-text-primary">
                        {submissionsCount}
                      </strong>
                      /{totalPlayers} siswa
                    </span>
                  </div>

                  <ProgressTrack percentage={progressPercent} size="md" />

                  <h2 className="text-title-3-semibold text-text-primary">
                    {currentQ.question}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {currentQ.options.map((option) => {
                      const optKey = option.label.toUpperCase();
                      const voteCount = stats?.optionCounts?.[optKey] || 0;
                      const votePercent =
                        (stats?.submissionsCount || 0) > 0
                          ? Math.round((voteCount / denom) * 100)
                          : 0;

                      return (
                        <div
                          key={option.label}
                          className={cx(
                            "p-4 rounded-2xl border transition relative overflow-hidden space-y-2",
                            option.isCorrect
                              ? "bg-status-lime-background/35 border-border-button-hover"
                              : "bg-background-secondary-default border-border-button-default"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 relative z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cx(
                                  "size-6 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0",
                                  option.isCorrect
                                    ? "bg-status-lime-background text-status-lime-text"
                                    : "bg-background-tertiary-default text-text-primary"
                                )}
                              >
                                {option.label}
                              </span>
                              <span className="text-body-medium text-text-primary">
                                {option.text}
                              </span>
                            </div>

                            <Chip
                              variant="caption"
                              color={option.isCorrect ? "lime" : "neutral"}
                              className="shrink-0 tabular-nums"
                            >
                              {voteCount} ({votePercent}%)
                            </Chip>
                          </div>

                          {option.distractorRationale && (
                            <p className="text-caption-1-regular text-text-secondary border-t border-separator-border pt-2">
                              <strong className="text-caption-1-semibold text-text-primary">
                                {option.isCorrect
                                  ? "Kunci jawaban: "
                                  : "Analisis pengecoh: "}
                              </strong>
                              {option.distractorRationale}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {currentQ.explanation && (
                    <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-1.5">
                      <span className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                        <RiLightbulbLine
                          className="size-4 text-status-orange-text shrink-0"
                          aria-hidden
                        />
                        Intisari Penjelasan Pedagogis
                      </span>
                      <p className="text-body-regular text-text-secondary">
                        {currentQ.explanation}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-8 text-center shadow-card">
                  <p className="text-body-regular text-text-secondary">
                    Belum ada soal yang aktif.
                  </p>
                </div>
              )}
            </TabPanel>

            <TabPanel id="leaderboard">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-headline-semibold text-text-primary">
                    Peringkat Nilai Siswa
                  </h2>
                  <Chip variant="caption" color="soft">
                    {state?.leaderboard?.length ?? 0} peserta
                  </Chip>
                </div>

                {state?.leaderboard && state.leaderboard.length > 0 ? (
                  <div className="relative min-h-0">
                    <div
                      onScroll={leaderboardFade.onScroll}
                      className="space-y-2 max-h-96 overflow-y-auto pe-1"
                    >
                      {state.leaderboard.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge
                              color={player.rank === 1 ? "primary" : "neutral"}
                            >
                              #{player.rank}
                            </Badge>
                            <Avatar
                              size="sm"
                              color={player.rank === 1 ? "lime" : "neutral"}
                              initials={getInitials(player.nickname)}
                            />
                            <div className="min-w-0">
                              <span className="text-body-medium text-text-primary block truncate">
                                {player.nickname}
                              </span>
                              <span className="text-caption-1-regular text-text-secondary">
                                Lambang: {player.avatar}
                              </span>
                            </div>
                          </div>

                          <Chip
                            variant="subtle"
                            color={player.rank === 1 ? "lime" : "gray"}
                            className="tabular-nums"
                          >
                            {player.score.toLocaleString()} poin
                          </Chip>
                        </div>
                      ))}
                    </div>
                    <ScrollFade
                      progress={leaderboardFade.progress}
                      surfaceClassName="from-background-primary-default"
                    />
                  </div>
                ) : (
                  <p className="text-body-regular text-text-secondary py-6 text-center">
                    Belum ada siswa yang bergabung ke ruangan ini.
                  </p>
                )}
              </motion.div>
            </TabPanel>

            <TabPanel id="players">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-headline-semibold text-text-primary">
                    Daftar Siswa yang Terhubung
                  </h2>
                  <Chip variant="caption" color="lime">
                    {totalPlayers} terhubung
                  </Chip>
                </div>

                {state?.players && state.players.length > 0 ? (
                  <div className="relative min-h-0">
                    <div
                      onScroll={playersFade.onScroll}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pe-1"
                    >
                      {state.players.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StatusDot
                              color={p.isConnected ? "green" : "yellow"}
                            />
                            <Avatar
                              size="xs"
                              color="blue"
                              initials={getInitials(p.nickname)}
                            />
                            <span className="text-body-medium text-text-primary truncate">
                              {p.nickname}
                            </span>
                          </div>
                          <Chip
                            variant="caption"
                            color="soft"
                            className="tabular-nums shrink-0"
                          >
                            {p.score.toLocaleString()} poin
                          </Chip>
                        </div>
                      ))}
                    </div>
                    <ScrollFade
                      progress={playersFade.progress}
                      surfaceClassName="from-background-primary-default"
                    />
                  </div>
                ) : (
                  <p className="text-body-regular text-text-secondary py-6 text-center">
                    Menunggu siswa bergabung melalui halaman{" "}
                    <bdi className="font-mono">/play</bdi> dengan PIN{" "}
                    <bdi className="font-mono font-semibold text-text-primary">
                      {roomCode}
                    </bdi>
                    .
                  </p>
                )}
              </motion.div>
            </TabPanel>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-4">
            <h3 className="text-caption-1-semibold text-text-secondary uppercase">
              Kontrol Ruang Kelas
            </h3>

            <div className="flex flex-col gap-2.5">
              {state?.status === "waiting" && (
                <Button
                  variant="primary"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => handleAction("resume_quiz")}
                  disabled={actionLoading}
                  className="w-full"
                >
                  Mulai Kuis Sekarang (Soal 1)
                </Button>
              )}

              {state?.status === "showing_leaderboard" && (
                <Button
                  variant="secondary"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => handleAction("resume_quiz")}
                  disabled={actionLoading}
                  className="w-full"
                >
                  Kembali ke Soal Aktif
                </Button>
              )}

              <Button
                variant={state?.status === "waiting" ? "secondary" : "primary"}
                leadingIcon={RiArrowRightLine}
                onClick={() => handleAction("advance_question")}
                disabled={actionLoading}
                className="w-full"
              >
                Lanjut ke Pertanyaan Berikutnya
              </Button>

              <Button
                variant="secondary"
                leadingIcon={RiTrophyLine}
                onClick={() => handleAction("show_leaderboard")}
                disabled={actionLoading}
                className="w-full"
              >
                Tampilkan Papan Skor di Layar
              </Button>

              <Button
                variant="ghost"
                leadingIcon={RiCheckLine}
                onClick={() => handleAction("finish_game")}
                disabled={actionLoading}
                className="w-full"
              >
                Selesaikan Sesi Kuis
              </Button>
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-status-lime-background text-status-lime-text flex items-center justify-center shrink-0">
                <RiBarChartBoxLine className="size-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-body-semibold text-text-primary">
                  Diagnostik Miskonsepsi Kelas
                </h3>
                <p className="text-caption-1-regular text-text-secondary">
                  Siklus Evaluasi Kurikulum Merdeka
                </p>
              </div>
            </div>

            <p className="text-body-2-regular text-text-secondary">
              Kaji kekeliruan jawaban siswa sekelas untuk menemukan pola materi
              yang belum dipahami, serta susun butir soal remedial terarah.
            </p>

            <Button
              variant="primary"
              leadingIcon={diagnosticLoading ? undefined : RiBarChartBoxLine}
              onClick={handleRunDiagnostic}
              disabled={diagnosticLoading}
              className="w-full"
            >
              {diagnosticLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner
                    size="xs"
                    className="text-text-white"
                    aria-hidden
                  />
                  <span>Menganalisis jawaban murid...</span>
                </span>
              ) : (
                "Buka Laporan Diagnostik Kelas"
              )}
            </Button>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-2">
            <span className="text-caption-1-semibold text-text-primary block">
              Petunjuk cepat pengajar:
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-caption-1-regular text-text-secondary">
              <li>
                Siswa masuk dari tautan{" "}
                <Link
                  href="/play"
                  className="text-text-primary underline font-medium"
                >
                  /play
                </Link>{" "}
                dengan PIN{" "}
                <bdi className="font-mono font-semibold text-text-primary">
                  {roomCode}
                </bdi>
                .
              </li>
              <li>
                Gunakan tombol Mulai Kuis pada lobi agar Soal 1 langsung aktif
                di perangkat siswa.
              </li>
              <li>
                Selesai kuis, buka laporan diagnostik untuk melihat rekomendasi
                intervensi dan membuat ruang remedial adaptif.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDiagnosticModal}
        onOpenChange={setShowDiagnosticModal}
        size="xl"
      >
        <ModalHeader
          title="Laporan Diagnostik Miskonsepsi Kelas"
          description={
            diagnosticData?.topic ||
            "Evaluasi Penguasaan Kompetensi & Rekomendasi Remedial Adaptif"
          }
          icon={RiBarChartBoxLine}
        />

        <ModalBody className="space-y-5 py-2">
          {diagnosticLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <Spinner
                size="lg"
                aria-label="Menganalisis klaster miskonsepsi siswa"
              />
              <p className="text-body-regular text-text-secondary">
                Menganalisis klaster miskonsepsi siswa sekelas...
              </p>
            </div>
          ) : diagnosticData ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-body-semibold text-text-primary">
                    Rangkuman Diagnostik Kelas
                  </span>
                  <Chip
                    variant="subtle"
                    color={
                      diagnosticData.classMasteryRate >= 70 ? "lime" : "orange"
                    }
                  >
                    Penguasaan Materi: {diagnosticData.classMasteryRate}%
                  </Chip>
                </div>
                <p className="text-body-regular text-text-secondary">
                  {diagnosticData.summaryText}
                </p>
              </div>

              {diagnosticData.clusterAnalysis?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-caption-1-semibold text-text-secondary uppercase">
                    Pola Materi yang Sering Keliru
                  </h4>
                  <div className="space-y-2.5">
                    {diagnosticData.clusterAnalysis.map((cluster, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-body-semibold text-text-primary">
                            {cluster.concept}
                          </span>
                          <Chip variant="caption" color="rose">
                            Salah: {cluster.errorRate}% (
                            {cluster.affectedStudentsCount} siswa)
                          </Chip>
                        </div>
                        <p className="text-body-2-regular text-text-secondary">
                          {cluster.primaryMisconception}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diagnosticData.recommendedReteaching && (
                <div className="p-4 rounded-2xl bg-status-lime-background/35 border border-border-button-default space-y-2">
                  <span className="text-caption-1-semibold text-status-lime-text uppercase block">
                    Rekomendasi Langkah Ajar Ulang
                  </span>
                  <p className="text-body-semibold text-text-primary">
                    {diagnosticData.recommendedReteaching.focusConcept}
                  </p>
                  <p className="text-body-2-regular text-text-secondary">
                    {diagnosticData.recommendedReteaching.pedagogicalStrategy}
                  </p>
                  <div className="pt-1">
                    <Chip variant="subtle" color="lime">
                      Langkah cepat 10 menit:{" "}
                      {diagnosticData.recommendedReteaching.quickActionableStep}
                    </Chip>
                  </div>
                </div>
              )}

              {diagnosticData.adaptiveRemedialQuestions?.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-body-semibold text-text-primary flex items-center gap-1.5">
                      <RiFileTextLine
                        className="size-4 text-status-lime-text"
                        aria-hidden
                      />
                      Soal Remedial Adaptif (Klik Opsi untuk Inspeksi Rasional)
                    </h4>
                    <Chip variant="caption" color="blue">
                      {diagnosticData.adaptiveRemedialQuestions.length} butir
                      soal
                    </Chip>
                  </div>

                  <div className="space-y-3">
                    {diagnosticData.adaptiveRemedialQuestions.map((rq, idx) => {
                      const activeOptLabel =
                        selectedRemedialOption[idx] ||
                        rq.options.find((o) => o.isCorrect)?.label ||
                        rq.options[0]?.label ||
                        "A";
                      const inspectedOption = rq.options.find(
                        (o) => o.label === activeOptLabel
                      );

                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-body-semibold text-text-primary">
                              Soal Remedial #{idx + 1}
                            </span>
                            {rq.conceptTag && (
                              <Chip variant="caption" color="soft">
                                {rq.conceptTag}
                              </Chip>
                            )}
                          </div>

                          <p className="text-body-medium text-text-primary">
                            {rq.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rq.options.map((opt) => {
                              const isSelected = activeOptLabel === opt.label;
                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() =>
                                    setSelectedRemedialOption((prev) => ({
                                      ...prev,
                                      [idx]: opt.label,
                                    }))
                                  }
                                  className={cx(
                                    "p-2.5 rounded-xl border text-start transition flex items-center justify-between gap-2 cursor-pointer",
                                    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                                    isSelected
                                      ? opt.isCorrect
                                        ? "bg-status-lime-background/50 border-border-button-hover"
                                        : "bg-status-rose-background/40 border-border-error-default"
                                      : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={cx(
                                        "size-6 rounded-md flex items-center justify-center text-caption-1-semibold shrink-0",
                                        opt.isCorrect
                                          ? "bg-status-lime-background text-status-lime-text"
                                          : "bg-background-tertiary-default text-text-primary"
                                      )}
                                    >
                                      {opt.label}
                                    </span>
                                    <span className="text-body-2-medium text-text-primary truncate">
                                      {opt.text}
                                    </span>
                                  </div>
                                  {opt.isCorrect && (
                                    <Chip
                                      variant="caption"
                                      color="lime"
                                      className="shrink-0"
                                    >
                                      Kunci
                                    </Chip>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default space-y-1">
                            <span className="text-caption-1-semibold text-text-primary block">
                              {inspectedOption?.isCorrect
                                ? `Rasional Kunci Jawaban (${inspectedOption.label}):`
                                : `Rasional Pengecoh (${inspectedOption?.label || activeOptLabel}):`}
                            </span>
                            <p className="text-caption-1-regular text-text-secondary">
                              {inspectedOption?.distractorRationale ||
                                rq.explanation}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDiagnosticModal(false)}
          >
            Tutup Laporan Diagnostik
          </Button>
          {diagnosticData?.adaptiveRemedialQuestions &&
            diagnosticData.adaptiveRemedialQuestions.length > 0 && (
              <Button
                variant="primary"
                leadingIcon={RiPlayCircleLine}
                onClick={handleCreateRemedialRoom}
                disabled={creatingRemedialRoom}
              >
                {creatingRemedialRoom
                  ? "Membuat Ruang Remedial..."
                  : "Buka Ruang Remedial dari Soal Ini"}
              </Button>
            )}
        </ModalFooter>
      </Modal>
    </main>
  );
}
