"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiBookOpenLine,
  RiTrophyLine,
  RiGroupLine,
  RiFileCopyLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiBarChartBoxLine,
  RiFileTextLine,
  RiLightbulbLine,
  RiPlayCircleLine,
  RiSparklingLine,
  RiSendPlaneLine,
  RiUserSharedLine,
  RiRestartLine,
  RiToggleLine,
  RiCheckboxCircleLine,
  RiTimeLine,
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
import { ExileLogo } from "@/components/brand/exile-logo";
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

interface PlayerItem {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  isConnected: boolean;
  status?: "approved" | "pending" | "rejected";
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
  autoApproveStudents?: boolean;
  stats: {
    submissionsCount: number;
    totalPlayers: number;
    pendingCount?: number;
    correctCount: number;
    accuracyPercentage: number;
    optionCounts: Record<string, number>;
  };
  leaderboard: LeaderboardEntry[];
  players: PlayerItem[];
  pendingPlayers?: PlayerItem[];
  approvedPlayers?: PlayerItem[];
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

export default function TeacherHostClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<TeacherRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Diagnostic modal
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticResult | null>(null);
  const [selectedRemedialOption, setSelectedRemedialOption] = useState<Record<number, string>>({});
  const [creatingRemedialRoom, setCreatingRemedialRoom] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"question" | "leaderboard" | "players" | "copilot">("question");

  // Host Copilot
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Halo Guru! Saya Exile Host Copilot. Saya membaca seluruh data di ruang kelas ini: daftar siswa, materi, dan pola respon mereka. Anda dapat meminta saya memilih siswa untuk presentasi secara objektif atau mengevaluasi capaian materi.",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

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
        if (data.status === "finished") {
          setGameFinished(true);
        } else if (data.status !== "waiting") {
          setQuizStarted(true);
        }
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
            () => fetchRoomState()
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players",
              filter: `room_code=eq.${roomCode}`,
            },
            () => fetchRoomState()
          )
          .subscribe();
      }
    } catch (realtimeErr) {
      console.warn("[TeacherHost] Realtime subscription skipped:", realtimeErr);
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

    if (action === "start_quiz" || action === "resume_quiz") {
      setQuizStarted(true);
    }
    if (action === "finish_game") {
      setGameFinished(true);
    }

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

  const handleApprovePlayer = async (playerId: string) => {
    soundEffects.playClick();
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_player", playerId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Siswa disetujui bergabung ke ruangan");
        await fetchRoomState();
      } else {
        throw new Error(data.error || "Gagal menyetujui siswa");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyetujui";
      toast.error(msg);
    }
  };

  const handleRejectPlayer = async (playerId: string) => {
    soundEffects.playClick();
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject_player", playerId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.info("Akses siswa ditolak");
        await fetchRoomState();
      }
    } catch {
      toast.error("Gagal menolak akses");
    }
  };

  const handleApproveAllPlayers = async () => {
    soundEffects.playClick();
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all_players" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Berhasil menyetujui ${data.approvedCount || 0} siswa`);
        await fetchRoomState();
      }
    } catch {
      toast.error("Gagal menyetujui semua siswa");
    }
  };

  const handleToggleAutoApprove = async () => {
    soundEffects.playClick();
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_auto_approve",
          autoApprove: !(state?.autoApproveStudents ?? true),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const modeLabel = data.autoApprove
          ? "Siswa otomatis masuk tanpa verifikasi"
          : "Verifikasi manual diaktifkan";
        toast.success(modeLabel);
        await fetchRoomState();
      }
    } catch {
      toast.error("Gagal mengubah pengaturan persetujuan");
    }
  };

  const handleAskCopilot = async (promptQuery?: string) => {
    const text = promptQuery || copilotInput.trim();
    if (!text || copilotLoading) return;
    soundEffects.playClick();

    const nextMessages = [...copilotMessages, { role: "user" as const, content: text }];
    setCopilotMessages(nextMessages);
    setCopilotInput("");
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/ai/host-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
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
      const msg = err instanceof Error ? err.message : "Copilot tidak dapat merespons";
      toast.error(msg);
    } finally {
      setCopilotLoading(false);
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
          topic: "Evaluasi Formatif Materi Kelas",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses diagnostik");

      setDiagnosticData(data.diagnostic);
      if (Array.isArray(data.diagnostic?.adaptiveRemedialQuestions)) {
        const defaults: Record<number, string> = {};
        data.diagnostic.adaptiveRemedialQuestions.forEach(
          (rq: RemedialQuestion, idx: number) => {
            const correctOpt = rq.options.find((o) => o.isCorrect);
            defaults[idx] = correctOpt?.label || rq.options[0]?.label || "A";
          }
        );
        setSelectedRemedialOption(defaults);
      }
      toast.success("Laporan diagnostik kelas siap");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyusun diagnostik";
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
          questions: diagnosticData.adaptiveRemedialQuestions.map((rq, idx) => ({
            id: `remedial-${Date.now()}-${idx + 1}`,
            questionOrder: idx + 1,
            question: rq.question,
            options: rq.options,
            correctAnswer: rq.options.find((o) => o.isCorrect)?.label || "A",
            explanation: rq.explanation,
            conceptTag: rq.conceptTag || diagnosticData.topic,
            culturalContext: rq.culturalContext || "Remedial Terarah",
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.roomCode) {
        throw new Error(data.error || "Gagal membuat ruang remedial");
      }

      setShowDiagnosticModal(false);
      toast.success(`Ruang remedial dibuat (PIN: ${data.roomCode})`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat ruang remedial";
      toast.error(msg);
    } finally {
      setCreatingRemedialRoom(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(roomCode);
    soundEffects.playClick();
    toast.success("PIN disalin ke papan klip");
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/play?code=${roomCode}`;
      navigator.clipboard.writeText(url);
      soundEffects.playClick();
      toast.success("Tautan gabung cepat disalin!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-secondary-default flex items-center justify-center">
        <Spinner size="lg" aria-label="Memuat ruang kontrol guru" />
      </div>
    );
  }

  const currentQ = state?.currentQuestion;
  const stats = state?.stats;
  const submissionsCount = stats?.submissionsCount || 0;
  const approvedPlayersList = state?.approvedPlayers || state?.players || [];
  const pendingPlayersList = state?.pendingPlayers || [];
  const totalApproved = approvedPlayersList.length;
  const totalPending = pendingPlayersList.length;
  const progressPercent =
    totalApproved > 0
      ? Math.min(100, Math.round((submissionsCount / totalApproved) * 100))
      : 0;
  const denom = Math.max(stats?.submissionsCount || 0, 1);
  const isAutoApprove = state?.autoApproveStudents ?? true;

  return (
    <main className="min-h-screen bg-background-secondary-default text-text-primary flex flex-col transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring rounded-xl p-1"
              aria-label="Kembali ke Beranda"
            >
              <ExileLogo size={32} showText={false} />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-headline-semibold text-text-primary tracking-tight">
                  Ruang Kontrol Guru
                </h1>

                {/* Feedback status badge: Teal for Active/Finished, Amber for Waiting */}
                {state?.status === "waiting" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                    <RiTimeLine className="size-3.5" aria-hidden />
                    <span>Lobi Menunggu</span>
                  </span>
                ) : state?.status === "finished" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption-2-medium bg-[#9CA3AF]/10 text-[#9CA3AF] border border-[#9CA3AF]/20">
                    <RiCheckboxCircleLine className="size-3.5" aria-hidden />
                    <span>Kuis Selesai</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                    <span className="relative flex size-2">
                      <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-[#0F766E] opacity-50" />
                      <span className="relative inline-flex rounded-full size-2 bg-[#0F766E]" />
                    </span>
                    <RiCheckLine className="size-3.5" aria-hidden />
                    <span>Kuis Aktif</span>
                  </span>
                )}
              </div>

              <p className="text-caption-1-regular text-text-secondary truncate">
                Pengajar: {state?.hostName || "Pengajar Exile"} • Evaluasi Formatif Interaktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyShareLink}
              className="cursor-pointer hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-primary-default hover:bg-background-primary-hover border border-border-button-default text-caption-1-medium text-text-primary shadow-card transition"
              title="Salin tautan langsung untuk siswa"
            >
              <RiUserSharedLine className="size-4 text-[#0F766E]" aria-hidden />
              <span>Bagikan Link</span>
            </button>

            <button
              type="button"
              onClick={copyPin}
              className="cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-background-primary-default hover:bg-background-primary-hover border border-border-button-default shadow-card transition outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              title="Salin PIN Ruangan"
            >
              <div className="text-start">
                <span className="text-[10px] text-text-secondary block leading-none">PIN Ruang</span>
                <bdi className="font-mono text-body-bold text-text-primary">{roomCode}</bdi>
              </div>
              <RiFileCopyLine className="size-4 text-foreground-icon-secondary shrink-0" aria-hidden />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-background-primary-default border border-border-button-default shadow-card">
              <RiGroupLine className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-caption-1-medium text-text-primary tabular-nums">
                {totalApproved} siswa
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Lobi card before start */}
          {state?.status === "waiting" && !quizStarted && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-50" />
                    <span className="relative inline-flex rounded-full size-2.5 bg-[#D97706]" />
                  </span>
                  <span className="text-body-semibold text-text-primary">
                    Lobi Ruangan Menunggu Siswa
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                    {totalApproved} siswa siap
                  </span>
                </div>
                <p className="text-caption-1-regular text-text-secondary">
                  Bagikan PIN <bdi className="font-mono font-semibold text-text-primary">{roomCode}</bdi> kepada siswa. Klik Mulai Kuis untuk membuka Pertanyaan 1.
                </p>
              </div>

              {/* Start Quiz button: locks and disappears permanently when clicked */}
              <Button
                variant="primary"
                leadingIcon={RiPlayCircleLine}
                onClick={() => handleAction("resume_quiz")}
                disabled={actionLoading || quizStarted}
                className="shrink-0"
              >
                Mulai Kuis Sekarang (Soal 1)
              </Button>
            </motion.div>
          )}

          {/* Admission Verification Banner (if manual approval is active and students are waiting) */}
          {totalPending > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-3xl bg-[#D97706]/10 border border-[#D97706]/30 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#D97706]/20 text-[#D97706] flex items-center justify-center shrink-0">
                  <RiTimeLine className="size-5" aria-hidden />
                </div>
                <div>
                  <h4 className="text-body-semibold text-text-primary">
                    {totalPending} Siswa Menunggu Persetujuan
                  </h4>
                  <p className="text-caption-1-regular text-text-secondary">
                    Periksa nama siswa di tab Daftar Siswa atau klik setujui semua untuk memasukkan mereka sekaligus.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="small"
                  leadingIcon={RiCheckDoubleLine}
                  onClick={handleApproveAllPlayers}
                >
                  Setujui Semua ({totalPending})
                </Button>
              </div>
            </motion.div>
          )}

          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) =>
              setActiveTab(String(key) as "question" | "leaderboard" | "players" | "copilot")
            }
          >
            <TabList aria-label="Navigasi Ruang Guru">
              <Tab id="question" icon={RiBookOpenLine}>
                Pertanyaan Aktif
              </Tab>
              <Tab id="leaderboard" icon={RiTrophyLine} count={state?.leaderboard?.length ?? 0}>
                Papan Skor
              </Tab>
              <Tab id="players" icon={RiGroupLine} count={totalApproved}>
                Daftar Siswa {totalPending > 0 ? `(${totalPending} tertunda)` : ""}
              </Tab>
              <Tab id="copilot" icon={RiSparklingLine}>
                Host Copilot
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
                        <span className="px-2.5 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                          {currentQ.conceptTag}
                        </span>
                      )}
                    </div>

                    <span className="text-caption-1-medium text-text-secondary tabular-nums">
                      Respon masuk:{" "}
                      <strong className="text-text-primary">{submissionsCount}</strong>/
                      {totalApproved} siswa
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
                              ? "bg-[#0F766E]/5 border-[#0F766E]/30"
                              : "bg-background-secondary-default border-border-button-default"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 relative z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cx(
                                  "size-6 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0",
                                  option.isCorrect
                                    ? "bg-[#0F766E] text-white"
                                    : "bg-background-tertiary-default text-text-primary"
                                )}
                              >
                                {option.label}
                              </span>
                              <span className="text-body-medium text-text-primary">
                                {option.text}
                              </span>
                            </div>

                            <span
                              className={cx(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-caption-2-medium tabular-nums shrink-0",
                                option.isCorrect
                                  ? "bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20"
                                  : "bg-background-tertiary-default text-text-secondary"
                              )}
                            >
                              {voteCount} ({votePercent}%)
                            </span>
                          </div>

                          {option.distractorRationale && (
                            <p className="text-caption-1-regular text-text-secondary border-t border-separator-border pt-2">
                              <strong className="text-caption-1-semibold text-text-primary">
                                {option.isCorrect ? "Kunci jawaban: " : "Analisis pengecoh: "}
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
                          className="size-4 text-[#D97706] shrink-0"
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
                <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-8 text-center shadow-card space-y-2">
                  <p className="text-body-regular text-text-secondary">
                    {state?.status === "finished"
                      ? "Sesi kuis telah diselesaikan. Anda dapat membuka Laporan Kelas di panel kanan."
                      : "Belum ada soal yang aktif. Klik Mulai Kuis untuk mengaktifkan soal pertama."}
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
                            <Badge color={player.rank === 1 ? "primary" : "neutral"}>
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
                                Ikon: {player.avatar}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-caption-1-medium tabular-nums bg-background-primary-default border border-border-button-default">
                            {player.score.toLocaleString()} poin
                          </span>
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
                    Belum ada skor yang dicatat di ruangan ini.
                  </p>
                )}
              </motion.div>
            </TabPanel>

            <TabPanel id="players">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-6"
              >
                {/* Admission Control Mode Bar */}
                <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-body-semibold text-text-primary block">
                      Kontrol Penerimaan Siswa
                    </span>
                    <p className="text-caption-1-regular text-text-secondary">
                      {isAutoApprove
                        ? "Siswa langsung masuk secara otomatis tanpa persetujuan."
                        : "Siswa yang bergabung harus diverifikasi dan disetujui satu per satu oleh guru."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAutoApprove}
                    className={cx(
                      "cursor-pointer px-3.5 py-1.5 rounded-xl border text-caption-1-medium flex items-center gap-2 transition outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring shrink-0",
                      isAutoApprove
                        ? "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30"
                        : "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30"
                    )}
                  >
                    <RiToggleLine className="size-4" aria-hidden />
                    <span>{isAutoApprove ? "Mode: Masuk Otomatis" : "Mode: Verifikasi Manual"}</span>
                  </button>
                </div>

                {/* Pending Approval Section */}
                {totalPending > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-body-semibold text-text-primary">
                          Menunggu Persetujuan
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                          {totalPending} siswa
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiCheckDoubleLine}
                        onClick={handleApproveAllPlayers}
                      >
                        Setujui Semua
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {pendingPlayersList.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-[#D97706]/5 border border-[#D97706]/25 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar size="xs" color="neutral" initials={getInitials(p.nickname)} />
                            <div className="min-w-0">
                              <span className="text-body-medium text-text-primary font-medium block truncate">
                                {p.nickname}
                              </span>
                              <span className="text-caption-2-regular text-text-secondary">
                                Tamu ruangan kuis
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRejectPlayer(p.id)}
                              className="cursor-pointer size-8 rounded-lg flex items-center justify-center bg-background-primary-default border border-border-button-default text-[#9CA3AF] hover:text-[#D97706] transition"
                              title="Tolak siswa"
                            >
                              <RiCloseLine className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprovePlayer(p.id)}
                              className="cursor-pointer px-3 py-1 rounded-lg bg-[#0F766E] text-white text-caption-2-medium flex items-center gap-1 hover:bg-[#0F766E]/90 transition shadow-2xs"
                              title="Setujui siswa"
                            >
                              <RiCheckLine className="size-3.5" />
                              <span>Setujui</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approved Students List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-body-semibold text-text-primary">
                      Siswa Terhubung & Disetujui
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                      {totalApproved} siswa
                    </span>
                  </div>

                  {approvedPlayersList.length > 0 ? (
                    <div className="relative min-h-0">
                      <div
                        onScroll={playersFade.onScroll}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pe-1"
                      >
                        {approvedPlayersList.map((p) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="size-2 rounded-full bg-[#0F766E]" />
                              <Avatar size="xs" color="blue" initials={getInitials(p.nickname)} />
                              <span className="text-body-medium text-text-primary truncate">
                                {p.nickname}
                              </span>
                            </div>
                            <span className="text-caption-2-medium px-2 py-0.5 rounded-md bg-background-primary-default border border-border-button-default tabular-nums shrink-0">
                              {p.score.toLocaleString()} poin
                            </span>
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
                      Belum ada siswa yang masuk. Bagikan PIN{" "}
                      <bdi className="font-mono font-semibold text-text-primary">{roomCode}</bdi>{" "}
                      ke siswa.
                    </p>
                  )}
                </div>
              </motion.div>
            </TabPanel>

            <TabPanel id="copilot">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-separator-border">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center">
                      <RiSparklingLine className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-body-semibold text-text-primary">
                        Exile Host Copilot
                      </h3>
                      <p className="text-caption-1-regular text-text-secondary">
                        Membaca materi kuis, daftar siswa ({totalApproved} orang), dan hasil respon kelas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Action Prompt Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAskCopilot("Siapa siswa yang cocok untuk presentasi materi saat ini?")}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-caption-1-medium text-text-primary flex items-center gap-1.5 transition"
                  >
                    <RiUserSharedLine className="size-3.5 text-[#0F766E]" />
                    <span>Pilih Siswa Presentasi Acak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskCopilot("Bagaimana ringkasan performa dan pemahaman materi kelas saat ini?")}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-caption-1-medium text-text-primary flex items-center gap-1.5 transition"
                  >
                    <RiBarChartBoxLine className="size-3.5 text-[#D97706]" />
                    <span>Evaluasi Performa Kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskCopilot("Berikan 2 pertanyaan pemantik lisan untuk mendiskusikan soal ini.")}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-caption-1-medium text-text-primary flex items-center gap-1.5 transition"
                  >
                    <RiLightbulbLine className="size-3.5 text-[#0F766E]" />
                    <span>Pertanyaan Pemantik Diskusi</span>
                  </button>
                </div>

                {/* Copilot Chat Log */}
                <div className="space-y-3 max-h-80 overflow-y-auto p-3 rounded-2xl bg-background-secondary-default border border-border-button-default">
                  {copilotMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cx(
                        "p-3.5 rounded-2xl text-body-2-regular max-w-[85%] whitespace-pre-wrap leading-relaxed",
                        msg.role === "user"
                          ? "ms-auto bg-background-primary-default border border-border-button-default text-text-primary"
                          : "me-auto bg-background-primary-default border border-[#0F766E]/20 text-text-primary shadow-2xs"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <span className="text-[11px] font-semibold text-[#0F766E] uppercase block mb-1">
                          Exile Copilot
                        </span>
                      )}
                      {msg.content}
                    </div>
                  ))}
                  {copilotLoading && (
                    <div className="p-3 rounded-2xl me-auto bg-background-primary-default border border-[#0F766E]/20 flex items-center gap-2 text-caption-1-medium text-text-secondary">
                      <Spinner size="xs" />
                      <span>Copilot sedang menganalisis kelas...</span>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskCopilot();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    placeholder="Tanyakan ke Copilot (misal: 'Pilihkan 1 siswa untuk menjelaskan...')"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-background-secondary-default border border-border-button-default text-body-regular text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-border-focus-ring transition"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={copilotLoading || !copilotInput.trim()}
                    leadingIcon={RiSendPlaneLine}
                  >
                    Kirim
                  </Button>
                </form>
              </motion.div>
            </TabPanel>
          </Tabs>
        </div>

        {/* Right column: Action Controls & Diagnostic */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-4">
            <h3 className="text-caption-1-semibold text-text-secondary uppercase">
              Kontrol Ruang Kelas
            </h3>

            <div className="flex flex-col gap-2.5">
              {/* Start Quiz button: hidden permanently once started */}
              {state?.status === "waiting" && !quizStarted && (
                <Button
                  variant="primary"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => handleAction("resume_quiz")}
                  disabled={actionLoading || quizStarted}
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

              {state?.status !== "finished" && (
                <>
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
                </>
              )}

              {/* End Session Button: disappears or permanently disables once finished */}
              {!gameFinished && state?.status !== "finished" ? (
                <Button
                  variant="ghost"
                  leadingIcon={RiCheckLine}
                  onClick={() => handleAction("finish_game")}
                  disabled={actionLoading || gameFinished}
                  className="w-full text-text-secondary hover:text-text-primary"
                >
                  Selesaikan Sesi Kuis
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-background-secondary-default border border-border-button-default text-center text-caption-1-medium text-text-secondary">
                  Sesi Kuis Telah Diselesaikan
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Card: Universal class diagnostic */}
          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20 flex items-center justify-center shrink-0">
                <RiBarChartBoxLine className="size-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-body-semibold text-text-primary">
                  Laporan Kelas & Diagnostik
                </h3>
                <p className="text-caption-1-regular text-text-secondary">
                  Evaluasi Miskonsepsi & Intervensi
                </p>
              </div>
            </div>

            <p className="text-body-2-regular text-text-secondary">
              Kaji kekeliruan jawaban siswa sekelas untuk menemukan pola materi yang belum dipahami serta susun butir remedial terarah.
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
                  <Spinner size="xs" className="text-text-white" aria-hidden />
                  <span>Menganalisis jawaban murid...</span>
                </span>
              ) : (
                "Buka Laporan Kelas & Diagnostik"
              )}
            </Button>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-2">
            <span className="text-caption-1-semibold text-text-primary block">
              Petunjuk cepat pengajar:
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-caption-1-regular text-text-secondary">
              <li>
                Siswa dapat langsung masuk melalui tautan undangan atau memasukkan PIN{" "}
                <bdi className="font-mono font-semibold text-text-primary">{roomCode}</bdi> di{" "}
                <Link href="/play" className="underline font-medium text-text-primary">
                  /play
                </Link>
                .
              </li>
              <li>
                Bila verifikasi manual aktif, setujui siswa di tab Daftar Siswa agar mereka dapat berpartisipasi.
              </li>
              <li>
                Gunakan tab Host Copilot untuk menunjuk siswa presentasi secara acak atau menganalisis pemahaman kelas.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Laporan Kelas & Diagnostik */}
      <Modal
        isOpen={showDiagnosticModal}
        onOpenChange={setShowDiagnosticModal}
        size="xl"
      >
        <ModalHeader
          title="Laporan Kelas & Diagnostik Miskonsepsi"
          description={
            diagnosticData?.topic ||
            "Evaluasi Penguasaan Kompetensi & Rekomendasi Remedial Adaptif"
          }
          icon={RiBarChartBoxLine}
        />

        <ModalBody className="space-y-5 py-2">
          {diagnosticLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <Spinner size="lg" aria-label="Menganalisis klaster miskonsepsi siswa" />
              <p className="text-body-regular text-text-secondary">
                Menganalisis respon dan capaian siswa sekelas...
              </p>
            </div>
          ) : diagnosticData ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-body-semibold text-text-primary">
                    Rangkuman Diagnostik Kelas
                  </span>
                  <span
                    className={cx(
                      "px-2.5 py-1 rounded-full text-caption-2-medium border",
                      diagnosticData.classMasteryRate >= 70
                        ? "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20"
                        : "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20"
                    )}
                  >
                    Penguasaan Materi: {diagnosticData.classMasteryRate}%
                  </span>
                </div>
                <p className="text-body-regular text-text-secondary">
                  {diagnosticData.summaryText}
                </p>
              </div>

              {diagnosticData.clusterAnalysis?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-caption-1-semibold text-text-secondary uppercase">
                    Pola Materi yang Perlu Penguatan
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
                          <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
                            Perlu Perhatian: {cluster.errorRate}% ({cluster.affectedStudentsCount} siswa)
                          </span>
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
                <div className="p-4 rounded-2xl bg-[#0F766E]/5 border border-[#0F766E]/20 space-y-2">
                  <span className="text-caption-1-semibold text-[#0F766E] uppercase block">
                    Rekomendasi Langkah Ajar Ulang
                  </span>
                  <p className="text-body-semibold text-text-primary">
                    {diagnosticData.recommendedReteaching.focusConcept}
                  </p>
                  <p className="text-body-2-regular text-text-secondary">
                    {diagnosticData.recommendedReteaching.pedagogicalStrategy}
                  </p>
                  <div className="pt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-caption-1-medium bg-[#0F766E]/10 text-[#0F766E]">
                      Langkah cepat 10 menit:{" "}
                      {diagnosticData.recommendedReteaching.quickActionableStep}
                    </span>
                  </div>
                </div>
              )}

              {diagnosticData.adaptiveRemedialQuestions?.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-body-semibold text-text-primary flex items-center gap-1.5">
                      <RiFileTextLine className="size-4 text-[#0F766E]" aria-hidden />
                      Soal Remedial Adaptif
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-default text-text-secondary">
                      {diagnosticData.adaptiveRemedialQuestions.length} butir soal
                    </span>
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
                                        ? "bg-[#0F766E]/10 border-[#0F766E]/40"
                                        : "bg-[#D97706]/10 border-[#D97706]/40"
                                      : "bg-background-primary-default hover:bg-background-primary-hover border-border-button-default"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={cx(
                                        "size-6 rounded-md flex items-center justify-center text-caption-1-semibold shrink-0",
                                        opt.isCorrect
                                          ? "bg-[#0F766E] text-white"
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
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#0F766E]/15 text-[#0F766E]">
                                      Kunci
                                    </span>
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
                              {inspectedOption?.distractorRationale || rq.explanation}
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
          <Button variant="secondary" onClick={() => setShowDiagnosticModal(false)}>
            Tutup
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
