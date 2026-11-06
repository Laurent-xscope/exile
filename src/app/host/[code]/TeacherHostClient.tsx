"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiBookOpenLine,
  RiTrophyLine,
  RiGroupLine,
  RiFileCopyLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiBarChartBoxLine,
  RiArrowDownSLine,
  RiLightbulbLine,
  RiPlayCircleLine,
  RiCopilotFill,
  RiSendPlaneLine,
  RiUserSharedLine,
  RiToggleLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
} from "@remixicon/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useAuth } from "@/lib/auth/use-auth";
import {
  clearHostToken,
  getHostToken,
} from "@/lib/rooms/host-token";
import type { QuizDifficultyLevel } from "@/lib/quiz/options";
import { useTranslation } from "@/lib/i18n/use-translation";
import { soundEffects } from "@/lib/audio/sounds";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Chip } from "@/components/base/badges/chip";
import { Badge } from "@/components/base/badges/badge";
import { Avatar } from "@/components/base/avatar/avatar";
import { ProgressTrack } from "@/components/base/progress/progress";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import { Spinner } from "@/components/base/spinner/spinner";
import {
  ScrollFade,
  useScrollFade,
} from "@/components/foundations/scroll-fade/scroll-fade";
import { QuizUpload } from "@/components/rooms/quiz-upload";
import { FormattedMessage } from "@/components/chat/formatted-message";
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
  breakdown: {
    base: number;
    timer: number;
    streak: number;
    total: number;
    correctAnswers: number;
    submissions: number;
  };
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
  settings?: {
    timePerQuestionSec: number;
    streakBonus: boolean;
    shuffleQuestions?: boolean;
    autoApproveStudents: boolean;
    difficulty?: QuizDifficultyLevel;
  };
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "S";
}

export default function TeacherHostClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const [state, setState] = useState<TeacherRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostVerified, setHostVerified] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [replacingMaterial, setReplacingMaterial] = useState(false);

  const hostToken = useSyncExternalStore(
    () => () => {},
    () => getHostToken(roomCode),
    () => null
  );

  const [activeTab, setActiveTab] = useState<"question" | "leaderboard" | "players" | "copilot">("question");
  const [expandedLeaderboardPlayer, setExpandedLeaderboardPlayer] = useState<string | null>(null);
  const [selectedHostAnswers, setSelectedHostAnswers] = useState<Record<number, string>>({});

  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Saya bisa membaca daftar siswa, skor, dan soal di ruang ini. Tanyakan apa saja.",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const leaderboardFade = useScrollFade();
  const playersFade = useScrollFade();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    soundEffects.playClick();
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    // Check localStorage hostToken to avoid false-positive student tab lockout
    const hasValidHostToken = Boolean(hostToken || getHostToken(roomCode));
    if (!hasValidHostToken) {
      toast.error(
        isEn
          ? "Access denied: students cannot open the teacher host control room."
          : "Akses ditolak: sesi siswa tidak diizinkan membuka ruang kontrol pengajar."
      );
      router.replace(`/play/${roomCode}`);
    }
  }, [authLoading, hostToken, roomCode, router, isEn]);

  const hostHeaders = () => {
    const token = getHostToken(roomCode);
    return {
      "Content-Type": "application/json",
      ...(token ? { "x-host-token": token } : {}),
    };
  };

  const fetchRoomState = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: hostHeaders(),
        body: JSON.stringify({ action: "get_teacher_state" }),
      });
      if (res.status === 401 || res.status === 403) {
        clearHostToken(roomCode);
        setHostVerified(false);
        toast.error(
          isEn
            ? "Invalid host session. Redirecting to student arena."
            : "Sesi pengajar tidak valid. Mengalihkan ke halaman siswa."
        );
        router.replace(`/play/${roomCode}`);
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setHostVerified(true);
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

  const handleUpdateSettings = async (partial: {
    difficulty?: QuizDifficultyLevel;
    timePerQuestionSec?: number;
    streakBonus?: boolean;
  }) => {
    soundEffects.playClick();
    try {
      const res = await fetch(`/api/rooms/${roomCode}/action`, {
        method: "POST",
        headers: hostHeaders(),
        body: JSON.stringify({
          action: "update_room_settings",
          settings: partial,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isEn ? "Quiz settings updated" : "Pengaturan kuis diperbarui");
        await fetchRoomState();
      } else {
        throw new Error(data.error || "Gagal memperbarui pengaturan");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui pengaturan");
    }
  };

  useEffect(() => {
    if (!hostToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial poll before the interval starts
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 2500);
    return () => clearInterval(interval);
    // Polling is the real-time mechanism; host token is read from storage per call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, hostToken]);

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
        headers: hostHeaders(),
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
        headers: hostHeaders(),
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
        headers: hostHeaders(),
        body: JSON.stringify({ action: "reject_player", playerId }),
      });
      await res.json();
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
        headers: hostHeaders(),
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
        headers: hostHeaders(),
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
        headers: hostHeaders(),
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

  const copyPin = () => {
    navigator.clipboard.writeText(roomCode);
    soundEffects.playClick();
    toast.success("Pin disalin ke papan klip");
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/play/${roomCode}`;
      navigator.clipboard.writeText(url);
      soundEffects.playClick();
      toast.success("Tautan gabung cepat disalin!");
    }
  };

  if (loading || !hostToken || !hostVerified) {
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
  const hasQuestions = (state?.totalQuestions ?? 0) > 0;
  const totalPending = pendingPlayersList.length;
  const progressPercent =
    totalApproved > 0
      ? Math.min(100, Math.round((submissionsCount / totalApproved) * 100))
      : 0;
  const isAutoApprove = state?.autoApproveStudents ?? true;
  const currentDifficulty: QuizDifficultyLevel = state?.settings?.difficulty || "sedang";
  const currentTimeSec = state?.settings?.timePerQuestionSec || 20;
  const currentStreakBonus = state?.settings?.streakBonus ?? true;

  return (
    <main className="min-h-screen bg-background-secondary-default text-text-primary flex flex-col transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/95 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring rounded-xl p-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={isEn ? "Back to home" : "Kembali ke beranda"}
            >
              <RiArrowLeftLine className="size-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge shown once the quiz is running or finished */}
                {state?.status === "waiting" ? null : state?.status === "finished" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption-2-medium bg-background-tertiary-default text-text-tertiary border border-border-button-default">
                    <RiCheckboxCircleLine className="size-3.5" aria-hidden />
                    <span>{isEn ? "Quiz finished" : "Kuis selesai"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
                    <span className="relative flex size-2">
                      <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-accent-700 opacity-50" />
                      <span className="relative inline-flex rounded-full size-2 bg-accent-700" />
                    </span>
                    <RiCheckLine className="size-3.5" aria-hidden />
                    <span>{isEn ? "Quiz active" : "Kuis aktif"}</span>
                  </span>
                )}
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyShareLink}
              className="cursor-pointer hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-primary-default hover:bg-background-primary-hover border border-border-button-default text-caption-1-medium text-text-primary shadow-card transition"
              title={isEn ? "Copy direct invitation link for students" : "Salin tautan langsung untuk siswa"}
            >
              <RiUserSharedLine className="size-4 text-accent-700" aria-hidden />
              <span>{isEn ? "Share link" : "Bagikan link"}</span>
            </button>

            <button
              type="button"
              onClick={copyPin}
              className="cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-background-primary-default hover:bg-background-primary-hover border border-border-button-default shadow-card transition outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              title={isEn ? "Copy room pin" : "Salin pin ruangan"}
            >
              <div className="text-start">
                <span className="text-[10px] text-text-secondary block leading-none">{isEn ? "Room pin" : "Pin ruang"}</span>
                <bdi className="font-mono text-body-bold text-text-primary">{roomCode}</bdi>
              </div>
              <RiFileCopyLine className="size-4 text-foreground-icon-secondary shrink-0" aria-hidden />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-background-primary-default border border-border-button-default shadow-card">
              <RiGroupLine className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-caption-1-medium text-text-primary tabular-nums">
                {totalApproved} {isEn ? "students" : "siswa"}
              </span>
            </div>

            <IconButton
              icon={isFullscreen ? RiFullscreenExitLine : RiFullscreenLine}
              size="medium"
              onClick={toggleFullscreen}
              aria-label={isEn ? "Toggle fullscreen projector mode" : "Buka mode proyektor layar penuh"}
              title={isEn ? "Classroom projector mode" : "Mode proyektor layar penuh"}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-5">
          {state?.status === "waiting" && !quizStarted && (!hasQuestions || replacingMaterial) && (
            <div className="space-y-3">
              <QuizUpload
                roomCode={roomCode}
                hostToken={hostToken}
                isEn={isEn}
                initialDifficulty={currentDifficulty}
                initialTimeSec={currentTimeSec}
                initialStreakBonus={currentStreakBonus}
                onSettingsChange={(partial) => handleUpdateSettings(partial)}
                onCreated={async () => {
                  setReplacingMaterial(false);
                  await fetchRoomState();
                }}
              />
              {replacingMaterial && (
                <Button variant="ghost" size="small" onClick={() => setReplacingMaterial(false)}>
                  {isEn ? "Cancel" : "Batal"}
                </Button>
              )}
            </div>
          )}

          {/* Lobby Start Card for Teacher (shown only after quiz questions are ready) */}
          {state?.status === "waiting" && !quizStarted && hasQuestions && !replacingMaterial && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="relative flex size-2.5">
                      <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-50" />
                      <span className="relative inline-flex rounded-full size-2.5 bg-amber-500" />
                    </span>
                    <span className="text-body-semibold text-text-primary">
                      {isEn ? "Classroom lobby waiting for students" : "Lobi ruangan menunggu siswa"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
                      {totalApproved} {isEn ? "students ready" : "siswa siap"}
                    </span>
                  </div>
                  <p className="text-caption-1-regular text-text-secondary">
                    {isEn
                      ? `Share pin ${roomCode} with students. Click start quiz to begin question 1.`
                      : `Bagikan pin ${roomCode} kepada siswa. Klik mulai kuis untuk membuka pertanyaan 1.`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="small" onClick={() => setReplacingMaterial(true)} disabled={actionLoading}>
                    {isEn ? "Change material" : "Ganti materi"}
                  </Button>
                  <Button
                    variant="primary"
                    leadingIcon={RiPlayCircleLine}
                    onClick={() => handleAction("resume_quiz")}
                    disabled={actionLoading || quizStarted || !hasQuestions}
                    className="shrink-0"
                  >
                    {isEn ? "Start quiz now (q1)" : "Mulai kuis sekarang (soal 1)"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Admission Verification Banner (if manual approval is active and students are waiting) */}
          {totalPending > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RiTimeLine className="size-5" aria-hidden />
                </div>
                <div>
                  <h4 className="text-body-semibold text-text-primary">
                    {totalPending} siswa menunggu persetujuan
                  </h4>
                  <p className="text-caption-1-regular text-text-secondary">
                    Periksa nama siswa di tab daftar siswa atau klik setujui semua untuk memasukkan mereka sekaligus.
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
                  Setujui semua ({totalPending})
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
            <TabList aria-label="Navigasi ruang guru">
              <Tab id="question" icon={RiBookOpenLine}>
                Pertanyaan aktif
              </Tab>
              <Tab id="leaderboard" icon={RiTrophyLine} count={state?.leaderboard?.length ?? 0}>
                Papan skor
              </Tab>
              <Tab id="players" icon={RiGroupLine} count={totalApproved}>
                Daftar siswa {totalPending > 0 ? `(${totalPending} tertunda)` : ""}
              </Tab>
              <Tab id="copilot" icon={RiCopilotFill}>
                Copilot ruang
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
                        <span className="px-2.5 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
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
                      const qOrder = currentQ.questionOrder || 1;
                      const selectedOnHost = selectedHostAnswers[qOrder] === option.label;
                      const hasChosenOnHost = Boolean(selectedHostAnswers[qOrder]);
                      const rawVoteCount = stats?.optionCounts?.[optKey] || 0;
                      const voteCount =
                        submissionsCount > 0
                          ? rawVoteCount
                          : hasChosenOnHost && selectedOnHost
                            ? 1
                            : 0;
                      const effectiveTotal =
                        submissionsCount > 0
                          ? submissionsCount
                          : hasChosenOnHost
                            ? 1
                            : 0;
                      const votePercent =
                        effectiveTotal > 0
                          ? Math.round((voteCount / effectiveTotal) * 100)
                          : 0;

                      const rationalesMap = (currentQ as unknown as { distractorRationales?: Record<string, string> }).distractorRationales;
                      const optRationale =
                        (option as { distractorRationale?: string }).distractorRationale ||
                        rationalesMap?.[optKey] ||
                        rationalesMap?.[option.label];

                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setSelectedHostAnswers((prev) => ({
                              ...prev,
                              [qOrder]: option.label,
                            }));
                          }}
                          className={cx(
                            "p-4 rounded-2xl border transition relative overflow-hidden space-y-2 text-start cursor-pointer",
                            selectedOnHost
                              ? option.isCorrect
                                ? "bg-emerald-500/15 border-emerald-500"
                                : "bg-rose-500/10 border-border-error-default"
                              : "bg-background-secondary-default border-border-button-default hover:border-border-button-hover"
                          )}
                        >
                          {/* Percentage visual bar */}
                          {votePercent > 0 && (
                            <div
                              aria-hidden
                              style={{ width: `${votePercent}%` }}
                              className={cx(
                                "pointer-events-none absolute inset-y-0 start-0 transition-all duration-300",
                                selectedOnHost
                                  ? option.isCorrect
                                    ? "bg-emerald-500/15"
                                    : "bg-rose-500/15"
                                  : "bg-text-primary/5"
                              )}
                            />
                          )}

                          <div className="flex items-start justify-between gap-2 relative z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cx(
                                  "size-6 rounded-lg flex items-center justify-center text-caption-1-semibold shrink-0",
                                  selectedOnHost
                                    ? option.isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-rose-600 text-white"
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
                                selectedOnHost
                                  ? option.isCorrect
                                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-text-error-primary border border-border-error-default"
                                  : "bg-background-tertiary-default text-text-secondary"
                              )}
                            >
                              {voteCount} ({votePercent}%)
                            </span>
                          </div>

                          {!option.isCorrect && optRationale && (voteCount > 0 || selectedOnHost) && (
                            <p className="text-caption-2-regular text-text-secondary pt-1.5 ps-8 border-t border-border-button-default/50 relative z-10">
                              <span className="font-semibold text-text-primary">
                                {isEn ? "Weak point: " : "Titik lemah: "}
                              </span>
                              {optRationale}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedHostAnswers[currentQ.questionOrder || 1] && currentQ.explanation && (
                    <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-1.5">
                      <span className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                        <RiLightbulbLine
                          className="size-4 text-text-error-primary shrink-0"
                          aria-hidden
                        />
                        Penjelasan
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
                      : hasQuestions
                        ? "Belum ada soal yang aktif. Klik Mulai Kuis untuk mengaktifkan soal pertama."
                        : "Belum ada soal. Unggah materi untuk membuat kuis."}
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
                    Peringkat nilai siswa
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
                      {state.leaderboard.map((player) => {
                        const expanded = expandedLeaderboardPlayer === player.id;
                        const breakdown = player.breakdown;
                        const parts = [
                          {
                            label: isEn ? "Question base" : "Dasar soal",
                            value: breakdown?.base ?? 0,
                          },
                          {
                            label: isEn ? "Speed bonus" : "Bonus kecepatan",
                            value: breakdown?.timer ?? 0,
                          },
                          {
                            label: "Streak",
                            value: breakdown?.streak ?? 0,
                          },
                        ];

                        return (
                          <div
                            key={player.id}
                            className="overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playClick();
                                setExpandedLeaderboardPlayer(expanded ? null : player.id);
                              }}
                              aria-expanded={expanded}
                              aria-controls={`leaderboard-breakdown-${player.id}`}
                              className="flex w-full cursor-pointer items-center justify-between gap-3 p-3.5 text-start outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Badge color={player.rank === 1 ? "primary" : "neutral"}>
                                  #{player.rank}
                                </Badge>
                                <Avatar
                                  size="sm"
                                  color={player.rank === 1 ? "lime" : "neutral"}
                                  initials={getInitials(player.nickname)}
                                />
                                <div className="min-w-0">
                                  <span className="block truncate text-body-medium text-text-primary">
                                    {player.nickname}
                                  </span>
                                  <span className="text-caption-1-regular text-text-secondary">
                                    Ikon: {player.avatar}
                                  </span>
                                </div>
                              </div>

                              <span className="flex shrink-0 items-center gap-2">
                                <span className="inline-flex items-center rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-1-medium tabular-nums">
                                  {player.score.toLocaleString()} poin
                                </span>
                                <RiArrowDownSLine
                                  aria-hidden
                                  className={cx(
                                    "size-4 text-text-tertiary transition-transform",
                                    expanded && "rotate-180"
                                  )}
                                />
                              </span>
                            </button>

                            {expanded && (
                              <div
                                id={`leaderboard-breakdown-${player.id}`}
                                className="border-t border-separator-border px-3.5 pb-3.5 pt-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <span className="text-caption-2-semibold tracking-wide text-text-tertiary">
                                    {isEn ? "Score breakdown" : "Rincian skor"}
                                  </span>
                                  <span className="text-caption-2-regular text-text-secondary">
                                    {breakdown?.correctAnswers ?? 0}/
                                    {breakdown?.submissions ?? 0}{" "}
                                    {isEn ? "correct" : "benar"}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  {parts.map((part) => (
                                    <div
                                      key={part.label}
                                      className="rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2"
                                    >
                                      <span className="block text-caption-2-regular text-text-tertiary">
                                        {part.label}
                                      </span>
                                      <span className="mt-0.5 block font-mono text-caption-1-semibold tabular-nums text-text-primary">
                                        +{part.value.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                      Kontrol penerimaan siswa
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
                        ? "bg-accent-700/10 text-accent-700 border-accent-700/30"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    <RiToggleLine className="size-4" aria-hidden />
                    <span>{isAutoApprove ? "Mode: masuk otomatis" : "Mode: verifikasi manual"}</span>
                  </button>
                </div>

                {/* Pending Approval Section */}
                {totalPending > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-body-semibold text-text-primary">
                          Menunggu persetujuan
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          {totalPending} siswa
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        leadingIcon={RiCheckDoubleLine}
                        onClick={handleApproveAllPlayers}
                      >
                        Setujui semua
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {pendingPlayersList.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/25 flex items-center justify-between gap-3"
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
                              className="cursor-pointer size-8 rounded-lg flex items-center justify-center bg-background-primary-default border border-border-button-default text-text-tertiary hover:text-text-error-primary transition"
                              title="Tolak siswa"
                            >
                              <RiCloseLine className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprovePlayer(p.id)}
                              className="cursor-pointer px-3 py-1 rounded-lg bg-accent-700 text-white text-caption-2-medium flex items-center gap-1 hover:bg-accent-700/90 transition shadow-2xs"
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
                      Siswa terhubung & disetujui
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-caption-2-medium bg-accent-700/10 text-accent-700 border border-accent-700/20">
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
                              <span className="size-2 rounded-full bg-accent-700" />
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
                      Belum ada siswa yang masuk. Bagikan pin{" "}
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
                    <div className="size-9 rounded-xl bg-accent-700/10 text-accent-700 border border-accent-700/20 flex items-center justify-center">
                      <RiCopilotFill className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-body-semibold text-text-primary">
                        Copilot ruang
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
                    <RiUserSharedLine className="size-3.5 text-accent-700" />
                    <span>Pilih siswa presentasi acak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskCopilot("Bagaimana ringkasan performa dan pemahaman materi kelas saat ini?")}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-caption-1-medium text-text-primary flex items-center gap-1.5 transition"
                  >
                    <RiBarChartBoxLine className="size-3.5 text-text-error-primary" />
                    <span>Evaluasi performa kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAskCopilot("Berikan 2 pertanyaan pemantik lisan untuk mendiskusikan soal ini.")}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default text-caption-1-medium text-text-primary flex items-center gap-1.5 transition"
                  >
                    <RiLightbulbLine className="size-3.5 text-accent-700" />
                    <span>Pertanyaan pemantik diskusi</span>
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
                          : "me-auto bg-background-primary-default border border-accent-700/20 text-text-primary shadow-2xs"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <span className="text-[11px] font-semibold text-accent-700 block mb-1">
                          Exile copilot
                        </span>
                      )}
                      <FormattedMessage content={msg.content} />
                    </div>
                  ))}
                  {copilotLoading && (
                    <div className="p-3 rounded-2xl me-auto bg-background-primary-default border border-accent-700/20 flex items-center gap-2 text-caption-1-medium text-text-secondary">
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
                    placeholder="Tanyakan ke copilot (misal: 'Pilihkan 1 siswa untuk menjelaskan...')"
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
            <h3 className="text-caption-1-semibold text-text-secondary">
              Kontrol ruang kelas
            </h3>

            <div className="flex flex-col gap-2.5">
              {/* Start Quiz button: hidden permanently once started */}
              {state?.status === "waiting" && !quizStarted && (
                <Button
                  variant="primary"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => handleAction("resume_quiz")}
                  disabled={actionLoading || quizStarted || !hasQuestions}
                  className="w-full"
                >
                  Mulai kuis sekarang (soal 1)
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
                  Kembali ke soal aktif
                </Button>
              )}

              {state?.status !== "finished" && (
                <>
                  <Button
                    variant={state?.status === "waiting" ? "secondary" : "primary"}
                    leadingIcon={RiArrowRightLine}
                    onClick={() => handleAction("advance_question")}
                    disabled={actionLoading || !hasQuestions}
                    className="w-full"
                  >
                    Lanjut ke pertanyaan berikutnya
                  </Button>

                  <Button
                    variant="secondary"
                    leadingIcon={RiTrophyLine}
                    onClick={() => handleAction("show_leaderboard")}
                    disabled={actionLoading || !hasQuestions}
                    className="w-full"
                  >
                    Tampilkan papan skor di layar
                  </Button>
                </>
              )}

              {/* End Session Button: disappears or permanently disables once finished */}
              {!gameFinished && state?.status !== "finished" ? (
                <Button
                  variant="ghost"
                  leadingIcon={RiCheckLine}
                  onClick={() => handleAction("finish_game")}
                  disabled={actionLoading || gameFinished || !hasQuestions}
                  className="w-full text-text-secondary hover:text-text-primary"
                >
                  Selesaikan sesi kuis
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-background-secondary-default border border-border-button-default text-center text-caption-1-medium text-text-secondary">
                  Sesi kuis telah diselesaikan
                </div>
              )}
            </div>
          </div>

          <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-5 shadow-card space-y-2">
            <span className="text-caption-1-semibold text-text-primary block">
              Petunjuk cepat pengajar:
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-caption-1-regular text-text-secondary">
              <li>
                Siswa dapat langsung masuk melalui tautan undangan atau memasukkan pin{" "}
                <bdi className="font-mono font-semibold text-text-primary">{roomCode}</bdi> di{" "}
                <Link href="/play" className="underline font-medium text-text-primary">
                  /play
                </Link>
                .
              </li>
              <li>
                Bila verifikasi manual aktif, setujui siswa di tab daftar siswa agar mereka dapat berpartisipasi.
              </li>
              <li>
                Gunakan tab copilot ruang untuk menunjuk siswa presentasi secara acak atau menganalisis pemahaman kelas.
              </li>
            </ul>
          </div>
        </div>
      </div>

    </main>
  );
}
