"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiUploadCloud2Line,
  RiRefreshLine,
  RiPlayCircleLine,
  RiEyeLine,
  RiFileCopyLine,
  RiSparklingLine,
  RiPresentationLine,
  RiNodeTree,
  RiArticleLine,
  RiTableLine,
  RiLayoutGridLine,
  RiUserVoiceLine,
  RiSendPlane2Line,
  RiFireLine,
  RiLightbulbLine,
  RiShieldCheckLine,
  RiFilePdfLine,
  RiImageLine,
  RiFileTextLine,
  RiImageAddLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiCompass3Line,
  RiInformationLine,
} from "@remixicon/react";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { soundEffects } from "@/lib/audio/sounds";
import { ExileLogo } from "@/components/brand/exile-logo";
import { cx } from "@/utils/cx";
import type {
  DocumentAnalysis,
  SlideItem,
  MindMapNode,
  PedagogicalReport,
  DataTableData,
  InfographicData,
  StudentPovInsight,
  Question,
} from "@/lib/ai/prompts";

type StudioArtifactTab =
  | "summary"
  | "flashcards"
  | "quiz"
  | "slides"
  | "mindmap"
  | "report"
  | "table"
  | "infographic";

export default function StudioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useExileSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copilotImageInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const docTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial state starts completely empty — no forced template
  const [docText, setDocText] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [processedDoc, setProcessedDoc] = useState<
    (DocumentAnalysis & { quizId?: string }) | null
  >(null);

  // Studio Artifact Tab Navigation
  const [activeTab, setActiveTab] = useState<StudioArtifactTab>("summary");

  // Student POV Simulator Toggle
  const [studentPovActive, setStudentPovActive] = useState<boolean>(false);

  // Adaptive Quiz Difficulty Slider (1 = Dasar, 2 = Sedang, 3 = Menantang HOTS)
  const [quizDifficulty, setQuizDifficulty] = useState<number>(2);
  const [testedAnswers, setTestedAnswers] = useState<Record<string, string>>({});
  const [showDistractorRationale, setShowDistractorRationale] = useState<boolean>(true);

  // 3D Flashcards State
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showFlashcardHint, setShowFlashcardHint] = useState<boolean>(false);

  // Slides State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"text" | "pdf" | "image">("text");

  // Room Launching State
  const [launchingRoom, setLaunchingRoom] = useState<boolean>(false);

  // Copilot Multi-turn Context Chat & Multimodal Screenshot State
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      imagePreview?: string;
    }>
  >([
    {
      role: "assistant",
      content:
        "Halo! Saya Exile Copilot. Saya siap mendampingi Anda menyiapkan materi ajar, menyusun kuis bergradasi kesulitan, slide presentasi, atau memandu cara kerja setiap fitur di Exile Studio.\n\nJika ada tampilan atau fitur yang ingin Anda tanyakan, Anda juga dapat mengunggah tangkapan layar (screenshot) langsung ke chat ini!",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [copilotAttachedImage, setCopilotAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);

  // Teacher name resolution
  const teacherName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      settings.defaultNickname ||
      "Pengajar Exile"
    );
  }, [user, settings.defaultNickname]);

  // Filtered Quiz based on Difficulty Slider
  const displayedQuestions: Question[] = useMemo(() => {
    if (!processedDoc) return [];
    if (quizDifficulty === 1) {
      return (
        processedDoc.difficultyQuizzes?.easy ||
        processedDoc.quiz.slice(0, 3)
      );
    }
    if (quizDifficulty === 3) {
      return (
        processedDoc.difficultyQuizzes?.hard ||
        processedDoc.quiz.slice(0, 3)
      );
    }
    return (
      processedDoc.difficultyQuizzes?.medium ||
      processedDoc.quiz
    );
  }, [processedDoc, quizDifficulty]);

  // Multimodal file upload handler for Source Document
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playClick();
    setUploadedFileName(file.name);
    const mime = file.type || "text/plain";
    setUploadedMimeType(mime);

    const isText =
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      mime.startsWith("text/");

    if (isText) {
      setUploadedFileType("text");
      setUploadedFileBase64("");
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = typeof event.target?.result === "string" ? event.target.result : "";
        setDocText(content);
        toast.success(`Berkas teks "${file.name}" berhasil dimuat.`);
      };
      reader.readAsText(file);
    } else {
      const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const detectedType: "pdf" | "image" = isPdf ? "pdf" : "image";
      setUploadedFileType(detectedType);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);
        if (!docText.trim()) {
          setDocText(`Lampiran berkas: ${file.name}`);
        }
        toast.success(`Berkas "${file.name}" siap diolah.`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copilot Image Screenshot Handler
  const handleCopilotImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type || "image/png";
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = typeof event.target?.result === "string" ? event.target.result : "";
      setCopilotAttachedImage({
        base64: dataUrl,
        mimeType: mime,
        name: file.name,
      });
      toast.success(`Tangkapan layar "${file.name}" terlampir di Exile Copilot.`);
    };
    reader.readAsDataURL(file);
  };

  // Process Document with AI Reasoning & On-Demand Synthesis
  const handleProcessDocument = async () => {
    if (!docText.trim() && !uploadedFileBase64) {
      toast.error("Silakan masukkan teks materi atau unggah berkas terlebih dahulu.");
      docTextareaRef.current?.focus();
      return;
    }

    setProcessing(true);
    setProcessingStep("Memeriksa masukan dokumen materi...");
    soundEffects.playClick();

    try {
      setTimeout(() => {
        setProcessingStep("Menganalisis konsep dan struktur pedagogis...");
      }, 700);

      setTimeout(() => {
        setProcessingStep("Menghasilkan artifak ajar interaktif...");
      }, 1600);

      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText: docText,
          text: docText,
          fileName: uploadedFileName || "materi-ajar.txt",
          fileType: uploadedFileType || "text",
          fileBase64: uploadedFileBase64 || undefined,
          mimeType: uploadedMimeType || "text/plain",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses dokumen");

      const docPayload: DocumentAnalysis & { quizId?: string } =
        data.document || data.analysis;

      if (!docPayload) {
        throw new Error("Format hasil analisis dokumen tidak valid.");
      }

      setProcessedDoc(docPayload);
      setFlashcardIndex(0);
      setIsFlipped(false);
      setActiveSlideIndex(0);
      setTestedAnswers({});
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      toast.success("Artifak berhasil dibuat! Seluruh modul ajar siap digunakan.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menganalisis dokumen";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setProcessingStep("");
    }
  };

  // Launch live classroom room
  const handleLaunchRoom = async () => {
    setLaunchingRoom(true);
    soundEffects.playClick();
    try {
      const questionsToUse =
        processedDoc?.quiz && processedDoc.quiz.length > 0 ? processedDoc.quiz : undefined;

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: processedDoc?.quizId,
          hostName: teacherName,
          questions: questionsToUse,
          settings: {
            timePerQuestionSec: settings.defaultQuestionTimeSec,
            streakBonus: settings.streakBonusEnabled,
            shuffleQuestions: settings.shuffleQuestions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuka ruang kelas");
      }

      confetti({ particleCount: 60, spread: 70 });
      toast.success(`Ruang kuis aktif! PIN: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal meluncurkan ruangan kuis";
      toast.error(msg);
    } finally {
      setLaunchingRoom(false);
    }
  };

  // Send Copilot Chat Message with Multimodal Screenshot Support
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && !copilotAttachedImage) || chatLoading) return;

    const userMessageText = chatInput.trim() || "Mohon jelaskan tampilan pada gambar terlampir ini.";
    const attachedImagePayload = copilotAttachedImage;

    setChatInput("");
    setCopilotAttachedImage(null);
    soundEffects.playClick();

    const newMessages = [
      ...chatMessages,
      {
        role: "user" as const,
        content: userMessageText,
        imagePreview: attachedImagePayload?.base64,
      },
    ];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/studio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          documentContext: docText || undefined,
          documentTitle: processedDoc?.title || undefined,
          currentTab: activeTab,
          studentPov: studentPovActive,
          image: attachedImagePayload
            ? {
                base64: attachedImagePayload.base64,
                mimeType: attachedImagePayload.mimeType,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi Exile Copilot");

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Maaf, respon tidak dapat disusun." },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
      toast.error(msg);
    } finally {
      setChatLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const currentFlashcard = processedDoc?.flashcards?.[flashcardIndex];

  return (
    <div className="min-h-screen bg-background-primary-default text-text-primary selection:bg-accent-700 selection:text-white pb-16">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-border-button-default bg-background-primary-default/90 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ButtonLink
              href="/"
              variant="ghost"
              size="small"
              className="px-2 text-text-secondary hover:text-text-primary"
            >
              <RiArrowLeftLine className="size-4 mr-1" />
              <span>Beranda</span>
            </ButtonLink>
            <div className="h-4 w-px bg-separator-border hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <ExileLogo size={28} showText={false} />
              <span className="font-semibold text-body-1-semibold tracking-tight text-text-primary">
                Exile Studio
              </span>
              <Chip variant="caption" color="blue">
                Studio ajar
              </Chip>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Student POV Toggle */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                setStudentPovActive(!studentPovActive);
              }}
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-caption-1-medium transition-all cursor-pointer",
                studentPovActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold shadow-xs"
                  : "bg-background-secondary-default border-border-button-default text-text-secondary hover:text-text-primary"
              )}
              title="Alihkan sudut pandang antara pengajar dan siswa"
            >
              {studentPovActive ? (
                <>
                  <RiEyeLine className="size-3.5 text-amber-500" />
                  <span>Sudut pandang siswa</span>
                </>
              ) : (
                <>
                  <RiUserVoiceLine className="size-3.5 text-text-secondary" />
                  <span>Sudut pandang pengajar</span>
                </>
              )}
            </button>

            {/* Launch Room Button */}
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleLaunchRoom}
              disabled={launchingRoom}
              className="gap-1.5 shadow-sm font-semibold"
            >
              <RiPlayCircleLine className="size-4" />
              <span className="hidden sm:inline">
                {launchingRoom ? "Membuka..." : "Buka Ruang Kuis"}
              </span>
            </Button>

            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Student POV Banner Alert when active */}
        <AnimatePresence>
          {studentPovActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption-1-regular text-text-primary"
            >
              <div className="flex items-start gap-3">
                <RiEyeLine className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-700 dark:text-amber-300">
                    Mode simulasi sudut pandang siswa
                  </strong>
                  <span>
                    Anda sedang melihat materi dari kacamata murid: melihat analogi yang masuk akal, titik keraguan umum, dan kunci jawaban disembunyikan untuk simulasi belajar.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentPovActive(false)}
                className="text-caption-2-medium text-amber-700 dark:text-amber-300 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
              >
                Kembali ke mode pengajar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Source Ingestion & Copilot Assistant                         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-5">
            {/* Source & Document Panel */}
            <div className="p-5 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2">
                  <RiUploadCloud2Line className="size-4 text-accent-700" />
                  <h3 className="text-body-1-semibold text-text-primary tracking-tight">
                    Sumber bahan ajar
                  </h3>
                </div>
                <span className="text-caption-2-regular text-text-tertiary">
                  Masukan materi
                </span>
              </div>

              {/* Multimodal Upload Trigger */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-border-button-default hover:border-accent-500/50 bg-background-secondary-default/30 hover:bg-background-secondary-default/60 transition-all flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-caption-1-semibold text-text-primary group-hover:text-accent-700 transition-colors">
                    <RiFilePdfLine className="size-4 text-rose-500" />
                    <RiImageLine className="size-4 text-emerald-500" />
                    <RiFileTextLine className="size-4 text-blue-500" />
                    <span>Unggah berkas PDF / gambar tugas / teks</span>
                  </div>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {uploadedFileName ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Berkas terpilih: {uploadedFileName}
                      </span>
                    ) : (
                      "Klik untuk memilih dokumen dari perangkat Anda"
                    )}
                  </span>
                </button>
              </div>

              {/* Direct Text Editor (Clean & Blank by default) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-caption-2-medium text-text-tertiary block">
                    Isi teks materi ajar
                  </label>
                  {docText && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocText("");
                        setUploadedFileName("");
                        setUploadedFileBase64("");
                      }}
                      className="text-caption-2-regular text-text-tertiary hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      Kosongkan teks
                    </button>
                  )}
                </div>
                <textarea
                  ref={docTextareaRef}
                  rows={5}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Ketik atau tempel teks modul, silabus, atau lembar kerja di sini..."
                  className="w-full p-3 rounded-2xl bg-background-secondary-default border border-border-button-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none font-mono text-xs leading-relaxed"
                />
              </div>

              {/* On-Demand Create Button ("Buatkan") */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  onClick={handleProcessDocument}
                  disabled={processing}
                  className="w-full gap-2 justify-center shadow-xs font-semibold"
                >
                  <RiSparklingLine className={cx("size-4", processing && "animate-spin")} />
                  <span>
                    {processing ? "Bernalar & mengolah..." : "Buatkan Artifak (Create)"}
                  </span>
                </Button>
                {processingStep && (
                  <p className="text-caption-2-regular text-text-tertiary text-center mt-2 animate-pulse font-mono">
                    {processingStep}
                  </p>
                )}
              </div>
            </div>

            {/* Studio Copilot Multi-turn Chat Panel with Screenshot Image Upload */}
            <div className="p-5 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2">
                  <RiSparklingLine className="size-4 text-purple-500" />
                  <h4 className="text-body-2-semibold text-text-primary">
                    Exile Copilot
                  </h4>
                </div>
                <span className="text-caption-2-regular text-text-tertiary">
                  Panduan & asistensi
                </span>
              </div>

              {/* Message History */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-caption-1-regular">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cx(
                      "p-3 rounded-2xl leading-relaxed text-xs space-y-1.5",
                      msg.role === "user"
                        ? "bg-accent-500/15 text-text-primary ml-4 border border-accent-500/20"
                        : "bg-background-secondary-default text-text-secondary mr-4 border border-border-button-default"
                    )}
                  >
                    <div className="font-semibold text-caption-2-medium text-text-tertiary">
                      {msg.role === "user" ? "Anda" : "Exile Copilot"}
                    </div>
                    {msg.imagePreview && (
                      <div className="rounded-lg overflow-hidden border border-border-button-default max-w-[160px]">
                        <img
                          src={msg.imagePreview}
                          alt="Lampiran tangkapan layar"
                          className="w-full h-auto object-cover max-h-24"
                        />
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="p-3 rounded-2xl bg-background-secondary-default text-text-tertiary text-xs animate-pulse">
                    Exile Copilot sedang menganalisis masukan...
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Attached Screenshot Preview in Chat */}
              {copilotAttachedImage && (
                <div className="p-2 rounded-xl bg-background-secondary-default border border-border-button-default flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={copilotAttachedImage.base64}
                      alt="Pratinjau"
                      className="size-8 rounded-lg object-cover border border-border-button-default shrink-0"
                    />
                    <span className="truncate text-caption-2-medium text-text-primary">
                      {copilotAttachedImage.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCopilotAttachedImage(null)}
                    className="p-1 text-text-tertiary hover:text-rose-500 transition-colors cursor-pointer"
                    title="Hapus lampiran"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              )}

              {/* Chat Input with Image Attachment Button */}
              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-1">
                <input
                  ref={copilotImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCopilotImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => copilotImageInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-border-button-default bg-background-secondary-default hover:bg-background-secondary-default/80 text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
                  title="Lampirkan tangkapan layar fitur"
                >
                  <RiImageAddLine className="size-4" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tanyakan fitur, konsep, atau lampirkan foto..."
                  className="flex-1 p-2.5 rounded-xl bg-background-secondary-default border border-border-button-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={chatLoading || (!chatInput.trim() && !copilotAttachedImage)}
                  className="p-2.5 rounded-xl bg-accent-700 hover:bg-accent-800 text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                  title="Kirim pesan"
                >
                  <RiSendPlane2Line className="size-4" />
                </button>
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Studio Artifact Suite (Intisari, 3D, Kuis, Slides, dll)     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* Artifact Navigation Tab Bar */}
            <div className="p-2 rounded-2xl border border-border-button-default bg-background-primary-default shadow-card flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("summary");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "summary"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiBookOpenLine className="size-4" />
                <span>Intisari</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("flashcards");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "flashcards"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiFileCopyLine className="size-4" />
                <span>Kartu 3D</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("quiz");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "quiz"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiQuestionnaireLine className="size-4" />
                <span>Kuis adaptif</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("slides");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "slides"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiPresentationLine className="size-4" />
                <span>Slide deck</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("mindmap");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "mindmap"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiNodeTree className="size-4" />
                <span>Mind map</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("report");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "report"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiArticleLine className="size-4" />
                <span>Laporan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("table");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "table"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiTableLine className="size-4" />
                <span>Tabel data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setActiveTab("infographic");
                }}
                className={cx(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption-1-medium whitespace-nowrap transition-all cursor-pointer",
                  activeTab === "infographic"
                    ? "bg-accent-700 text-white font-semibold shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                )}
              >
                <RiLayoutGridLine className="size-4" />
                <span>Infografis</span>
              </button>
            </div>

            {/* If no document has been generated yet, show the clean Exile Tools Guide */}
            {!processedDoc ? (
              <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8 shadow-card space-y-6">
                <div className="border-b border-separator-border pb-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <RiCompass3Line className="size-5 text-accent-700" />
                    <h3 className="text-title-2-semibold text-text-primary tracking-tight">
                      Panduan pemakaian Exile Studio
                    </h3>
                  </div>
                  <p className="text-body-2-regular text-text-secondary">
                    Ikuti langkah ringkas di bawah ini untuk mengolah materi ajar dan menghasilkan artifak belajar interaktif.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        1
                      </span>
                      <span>Masukkan bahan ajar</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Ketik atau tempel teks modul ajar di panel sebelah kiri, atau unggah berkas lembar kerja dalam format PDF, gambar dokumen, maupun teks.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        2
                      </span>
                      <span>Klik tombol Buatkan Artifak</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Klik tombol &ldquo;Buatkan Artifak (Create)&rdquo;. Sistem AI akan menganalisis materi dan menyusun intisari, kartu 3D, kuis, dan slide secara otomatis.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        3
                      </span>
                      <span>Eksplorasi 8 artifak interaktif</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Buka tab di atas untuk meninjau intisari, membalik kartu hafalan 3D, menyimak slide materi, mind map, dan infografis esensial.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        4
                      </span>
                      <span>Kuis adaptif & analisis pengecoh</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Gunakan penggeser tingkat kesulitan (Dasar, Sedang, Menantang) untuk memeriksa soal kuis beserta pembahasan miskonsepsi siswa.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        5
                      </span>
                      <span>Simulasi sudut pandang siswa</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Aktifkan tombol sakelar di pojok atas untuk melihat analogi yang masuk akal bagi murid dan menyembunyikan jawaban untuk latihan mandiri.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                      <span className="inline-flex size-6 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                        6
                      </span>
                      <span>Buka ruang kuis kelas live</span>
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                      Tekan tombol &ldquo;Buka Ruang Kuis&rdquo; di kanan atas untuk mendapatkan kode PIN 6-digit agar murid dapat bergabung dan berlomba secara langsung.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-body-1-semibold text-text-primary">
                      Siap membuat artifak pembelajaran pertama Anda?
                    </h4>
                    <p className="text-caption-1-regular text-text-secondary">
                      Masukkan teks bahan ajar pada panel sebelah kiri lalu tekan tombol Buatkan Artifak.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="medium"
                    onClick={() => {
                      if (!docText.trim() && !uploadedFileBase64) {
                        docTextareaRef.current?.focus();
                        toast.info("Silakan ketik atau tempel materi pada kolom teks sebelah kiri.");
                      } else {
                        handleProcessDocument();
                      }
                    }}
                    className="gap-1.5 shrink-0 font-semibold"
                  >
                    <RiSparklingLine className="size-4" />
                    <span>Buatkan Artifak (Create)</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Artifact Content Panels with Framer Motion Entrance */
              <motion.div
                key={activeTab + (studentPovActive ? "-student" : "-teacher")}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8 shadow-card space-y-6"
              >
                {/* Document Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-separator-border pb-4">
                  <div>
                    <span className="text-caption-2-medium text-text-tertiary block">
                      {processedDoc.subjectArea} {processedDoc.gradeLevel ? `• ${processedDoc.gradeLevel}` : ""}
                    </span>
                    <h2 className="text-title-2-semibold sm:text-title-1-semibold text-text-primary tracking-tight mt-1">
                      {processedDoc.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {studentPovActive && (
                      <Chip variant="caption" color="yellow">
                        Simulasi siswa
                      </Chip>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* TAB 1: SUMMARY (Intisari - NO GLOSSARY)                   */}
                {/* ========================================================= */}
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    {/* Overview Paragraph */}
                    <div className="p-5 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-2">
                      <span className="text-caption-2-medium text-text-tertiary block">
                        Ringkasan intisari materi
                      </span>
                      <p className="text-body-1-regular text-text-secondary leading-relaxed">
                        {processedDoc.summary.overview}
                      </p>
                    </div>

                    {/* Student POV Insight Box */}
                    {processedDoc.studentPov && (
                      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-body-2-semibold">
                          <RiLightbulbLine className="size-4" />
                          <span>Kacamata siswa: apa yang mereka rasakan?</span>
                        </div>
                        <p className="text-body-2-regular text-text-secondary leading-relaxed">
                          {processedDoc.studentPov.studentMentalModel}
                        </p>
                        <div className="pt-2 border-t border-amber-500/20">
                          <span className="text-caption-2-semibold text-amber-700 dark:text-amber-300 block mb-1">
                            Analogi mudah dipahami siswa:
                          </span>
                          <p className="text-caption-1-regular text-text-secondary italic">
                            &ldquo;{processedDoc.studentPov.relatableAnalogy}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Key Takeaways */}
                    <div className="space-y-3">
                      <h4 className="text-title-3-semibold text-text-primary">
                        Poin-poin penting
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {processedDoc.summary.keyTakeaways.map((point, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 flex items-start gap-2.5"
                          >
                            <span className="inline-flex size-5 rounded-full bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center shrink-0 mt-0.5 font-bold">
                              {i + 1}
                            </span>
                            <span className="text-caption-1-regular text-text-secondary leading-snug">
                              {point}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: 3D FLASHCARDS                                      */}
                {/* ========================================================= */}
                {activeTab === "flashcards" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-caption-1-medium text-text-secondary">
                      <span>
                        Kartu {flashcardIndex + 1} dari {processedDoc.flashcards.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFlashcardHint(!showFlashcardHint)}
                        className="text-accent-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RiLightbulbLine className="size-3.5" />
                        <span>{showFlashcardHint ? "Tutup petunjuk" : "Lihat petunjuk"}</span>
                      </button>
                    </div>

                    {/* 3D Flip Card Container */}
                    <div className="perspective-1000 flex justify-center py-4">
                      <motion.div
                        onClick={() => {
                          soundEffects.playClick();
                          setIsFlipped(!isFlipped);
                        }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="w-full max-w-lg min-h-[260px] p-8 rounded-3xl border border-border-button-default bg-background-secondary-default shadow-card flex flex-col justify-between cursor-pointer select-none relative [transform-style:preserve-3d]"
                      >
                        {/* Front Side */}
                        <div
                          className={cx(
                            "space-y-4 flex flex-col justify-between h-full",
                            isFlipped && "invisible"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <Chip variant="caption" color="blue">
                              {currentFlashcard?.tag || "Pertanyaan"}
                            </Chip>
                            <span className="text-caption-2-regular text-text-tertiary">
                              Klik kartu untuk membalik
                            </span>
                          </div>
                          <p className="text-title-2-semibold text-text-primary text-center my-auto leading-snug">
                            {currentFlashcard?.front}
                          </p>
                          {showFlashcardHint && currentFlashcard?.hint && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-caption-2-regular text-amber-700 dark:text-amber-300">
                              Petunjuk: {currentFlashcard.hint}
                            </div>
                          )}
                        </div>

                        {/* Back Side */}
                        <div
                          className={cx(
                            "space-y-4 flex flex-col justify-between h-full [transform:rotateY(180deg)] absolute inset-8",
                            !isFlipped && "invisible"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <Chip variant="caption" color="lime">
                              Jawaban & Penjelasan
                            </Chip>
                            <span className="text-caption-2-regular text-text-tertiary">
                              Klik untuk membalik kembali
                            </span>
                          </div>
                          <p className="text-title-3-semibold text-text-primary text-center my-auto leading-relaxed">
                            {currentFlashcard?.back}
                          </p>
                          <div className="text-center text-caption-2-regular text-text-tertiary">
                            Tekan tombol panah untuk kartu berikutnya
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Flashcard Stepper Controls */}
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={flashcardIndex === 0}
                        onClick={() => {
                          soundEffects.playClick();
                          setIsFlipped(false);
                          setShowFlashcardHint(false);
                          setFlashcardIndex((prev) => Math.max(0, prev - 1));
                        }}
                      >
                        <RiArrowLeftLine className="size-4 mr-1" />
                        <span>Sebelumnya</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        {processedDoc.flashcards.map((_, i) => (
                          <div
                            key={i}
                            className={cx(
                              "size-2 rounded-full transition-all",
                              flashcardIndex === i ? "bg-accent-700 w-5" : "bg-border-button-default"
                            )}
                          />
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={flashcardIndex === processedDoc.flashcards.length - 1}
                        onClick={() => {
                          soundEffects.playClick();
                          setIsFlipped(false);
                          setShowFlashcardHint(false);
                          setFlashcardIndex((prev) =>
                            Math.min(processedDoc!.flashcards.length - 1, prev + 1)
                          );
                        }}
                      >
                        <span>Berikutnya</span>
                        <RiArrowRightLine className="size-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: ADAPTIVE QUIZ WITH DIFFICULTY SLIDER               */}
                {/* ========================================================= */}
                {activeTab === "quiz" && (
                  <div className="space-y-6">
                    {/* Difficulty Slider Bar */}
                    <div className="p-4 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-caption-2-medium text-text-tertiary block">
                            Tingkat kesulitan kuis
                          </span>
                          <span className="text-body-2-semibold text-text-primary">
                            {quizDifficulty === 1
                              ? "Level 1: Dasar (Pemahaman konsep)"
                              : quizDifficulty === 2
                              ? "Level 2: Sedang (Penerapan kontekstual)"
                              : "Level 3: Menantang (Penalaran kritis & analisis)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!studentPovActive && (
                            <button
                              type="button"
                              onClick={() => setShowDistractorRationale(!showDistractorRationale)}
                              className="text-caption-2-regular text-text-tertiary hover:text-text-primary underline cursor-pointer"
                            >
                              {showDistractorRationale
                                ? "Sembunyikan analisis pengecoh"
                                : "Tampilkan analisis pengecoh"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 3-Step Slider */}
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={quizDifficulty}
                        onChange={(e) => {
                          soundEffects.playClick();
                          setQuizDifficulty(Number(e.target.value));
                        }}
                        className="w-full accent-accent-700 cursor-pointer h-2 bg-border-button-default rounded-lg"
                      />

                      <div className="flex justify-between text-caption-2-regular text-text-tertiary px-1">
                        <span>Dasar</span>
                        <span>Sedang</span>
                        <span>Menantang</span>
                      </div>
                    </div>

                    {/* Question List */}
                    <div className="space-y-6">
                      {displayedQuestions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-caption-2-medium text-text-tertiary block font-mono">
                                Butir {idx + 1}
                              </span>
                              <h4 className="text-body-1-semibold text-text-primary">
                                {q.question}
                              </h4>
                            </div>
                            {q.conceptTag && (
                              <Chip variant="caption" color="gray">
                                {q.conceptTag}
                              </Chip>
                            )}
                          </div>

                          {/* 4 Interactive Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt) => {
                              const isTested = testedAnswers[q.id || String(idx)] === opt.label;
                              const isStudentPov = studentPovActive;

                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playClick();
                                    setTestedAnswers((prev) => ({
                                      ...prev,
                                      [q.id || String(idx)]: opt.label,
                                    }));
                                  }}
                                  className={cx(
                                    "text-left p-3 rounded-xl border text-caption-1-regular transition-all cursor-pointer flex flex-col justify-between gap-1",
                                    isTested
                                      ? opt.isCorrect
                                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                                        : "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-semibold"
                                      : !isStudentPov && opt.isCorrect
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-text-primary"
                                      : "bg-background-primary-default border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">{opt.label}.</span>
                                    <span>{opt.text}</span>
                                  </div>
                                  {!isStudentPov && showDistractorRationale && (
                                    <span className="text-caption-2-regular text-text-tertiary mt-1 border-t border-separator-border pt-1">
                                      {opt.distractorRationale}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation & Misconception Insights */}
                          {!studentPovActive && (
                            <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default text-caption-2-regular text-text-secondary flex items-start gap-2">
                              <RiShieldCheckLine className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-semibold text-text-primary block">
                                  Pembahasan pedagogis:
                                </strong>
                                <span>{q.explanation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: SLIDE DECK                                         */}
                {/* ========================================================= */}
                {activeTab === "slides" && processedDoc.slideDeck && (
                  <div className="space-y-6">
                    {/* Presentation Preview Card */}
                    <div className="p-8 rounded-3xl bg-background-secondary-default border border-border-button-default shadow-card min-h-[300px] flex flex-col justify-between space-y-6">
                      <div className="flex items-center justify-between border-b border-separator-border pb-3">
                        <span className="text-caption-2-medium text-text-tertiary font-mono">
                          Slide {activeSlideIndex + 1} dari {processedDoc.slideDeck.length}
                        </span>
                        <Chip variant="caption" color="blue">
                          Presentasi guru
                        </Chip>
                      </div>

                      <div className="space-y-4 my-auto">
                        <h3 className="text-title-1-bold text-text-primary tracking-tight">
                          {processedDoc.slideDeck[activeSlideIndex]?.title}
                        </h3>
                        <ul className="space-y-2 text-body-1-regular text-text-secondary">
                          {processedDoc.slideDeck[activeSlideIndex]?.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-accent-700 font-bold">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Presenter Notes */}
                      <div className="p-3.5 rounded-2xl bg-background-primary-default border border-border-button-default text-caption-1-regular text-text-secondary">
                        <strong className="text-caption-2-semibold text-text-primary block mb-1">
                          Catatan pengajar:
                        </strong>
                        <p>{processedDoc.slideDeck[activeSlideIndex]?.presenterNotes}</p>
                      </div>
                    </div>

                    {/* Slide Stepper Controls */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        {processedDoc.slideDeck.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              soundEffects.playClick();
                              setActiveSlideIndex(i);
                            }}
                            className={cx(
                              "size-2.5 rounded-full transition-all cursor-pointer",
                              activeSlideIndex === i ? "bg-accent-700 w-6" : "bg-border-button-default"
                            )}
                            title={`Slide ${i + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          disabled={activeSlideIndex === 0}
                          onClick={() => {
                            soundEffects.playClick();
                            setActiveSlideIndex((prev) => Math.max(0, prev - 1));
                          }}
                        >
                          <RiArrowLeftLine className="size-4" />
                          <span>Sebelumnya</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          disabled={activeSlideIndex === processedDoc.slideDeck.length - 1}
                          onClick={() => {
                            soundEffects.playClick();
                            setActiveSlideIndex((prev) =>
                              Math.min(processedDoc!.slideDeck!.length - 1, prev + 1)
                            );
                          }}
                        >
                          <span>Berikutnya</span>
                          <RiArrowRightLine className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 5: MIND MAP (Hierarchical Concept Tree)               */}
                {/* ========================================================= */}
                {activeTab === "mindmap" && processedDoc.mindMap && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-background-secondary-default/50 border border-border-button-default shadow-card space-y-6">
                      <div className="text-center space-y-1">
                        <span className="text-caption-2-medium text-text-tertiary block">
                          Pohon konsep materi
                        </span>
                        <h3 className="text-title-2-semibold text-text-primary">
                          {processedDoc.mindMap.label}
                        </h3>
                        <p className="text-body-2-regular text-text-secondary max-w-lg mx-auto">
                          {processedDoc.mindMap.description}
                        </p>
                      </div>

                      {/* Mind Map Branches */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-separator-border">
                        {processedDoc.mindMap.children?.map((branch) => (
                          <div
                            key={branch.id}
                            className="p-4 rounded-2xl border border-border-button-default bg-background-primary-default space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-body-2-semibold text-text-primary font-semibold">
                                {branch.label}
                              </h4>
                              {branch.category && (
                                <Chip variant="caption" color="blue">
                                  {branch.category}
                                </Chip>
                              )}
                            </div>
                            <p className="text-caption-2-regular text-text-secondary">
                              {branch.description}
                            </p>

                            {/* Sub-children */}
                            {branch.children && branch.children.length > 0 && (
                              <div className="pt-2 border-t border-separator-border space-y-2">
                                {branch.children.map((leaf: any) => (
                                  <div
                                    key={leaf.id}
                                    className="p-2.5 rounded-xl bg-background-secondary-default/60 border border-border-button-default text-xs space-y-0.5"
                                  >
                                    <span className="font-semibold text-text-primary block">
                                      {leaf.label}
                                    </span>
                                    <span className="text-caption-2-regular text-text-secondary block">
                                      {leaf.description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 6: PEDAGOGICAL REPORT                                 */}
                {/* ========================================================= */}
                {activeTab === "report" && processedDoc.report && (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="p-5 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-2">
                      <span className="text-caption-2-medium text-text-tertiary block">
                        Rangkuman evaluasi pedagogis
                      </span>
                      <p className="text-body-1-regular text-text-secondary leading-relaxed">
                        {processedDoc.report.executiveSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Core Competencies */}
                      <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
                        <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                          <RiCheckDoubleLine className="size-4 text-emerald-500" />
                          <span>Capaian kompetensi utama</span>
                        </h4>
                        <ul className="space-y-2 text-caption-1-regular text-text-secondary">
                          {processedDoc.report.coreCompetencies.map((comp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{comp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Difficulty Hotspots */}
                      <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
                        <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                          <RiFireLine className="size-4 text-rose-500" />
                          <span>Titik kesulitan siswa (hotspots)</span>
                        </h4>
                        <ul className="space-y-2 text-caption-1-regular text-text-secondary">
                          {processedDoc.report.difficultyHotspots.map((spot, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{spot}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-caption-1-regular text-text-primary space-y-1">
                      <strong className="text-blue-600 dark:text-blue-400 font-semibold block">
                        Rekomendasi tindakan di kelas:
                      </strong>
                      <p className="text-text-secondary">{processedDoc.report.recommendedAction}</p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 7: DATA TABLE                                         */}
                {/* ========================================================= */}
                {activeTab === "table" && processedDoc.dataTable && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border-button-default overflow-hidden bg-background-secondary-default/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-caption-1-regular">
                          <thead className="bg-background-primary-default border-b border-separator-border text-text-secondary">
                            <tr>
                              {processedDoc.dataTable.columns.map((col, i) => (
                                <th key={i} className="py-3 px-4 font-semibold text-xs">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-separator-border">
                            {processedDoc.dataTable.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-background-secondary-default/80">
                                {processedDoc.dataTable!.columns.map((col, j) => (
                                  <td key={j} className="py-3 px-4 text-text-primary text-xs">
                                    {String(row[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 8: INFOGRAPHIC                                        */}
                {/* ========================================================= */}
                {activeTab === "infographic" && processedDoc.infographic && (
                  <div className="space-y-6">
                    {/* Central Banner */}
                    <div className="p-6 rounded-3xl bg-gradient-to-r from-accent-700 to-accent-900 text-white shadow-card space-y-2 text-center">
                      <span className="text-caption-2-medium opacity-80 block">
                        Rangkuman visual esensial
                      </span>
                      <h3 className="text-title-1-bold">{processedDoc.infographic.title}</h3>
                      <p className="text-body-2-regular opacity-90 max-w-xl mx-auto">
                        {processedDoc.infographic.centralConcept}
                      </p>
                    </div>

                    {/* 3 Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {processedDoc.infographic.pillars.map((pillar, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <h4 className="text-body-1-semibold text-text-primary">
                              {pillar.title}
                            </h4>
                            <ul className="space-y-1.5 text-caption-1-regular text-text-secondary">
                              {pillar.keyPoints.map((pt, j) => (
                                <li key={j} className="flex items-start gap-1.5">
                                  <span className="text-accent-700 font-bold">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-3 border-t border-separator-border text-caption-2-semibold text-accent-700 dark:text-accent-300 italic">
                            &ldquo;{pillar.quoteOrMnemonic}&rdquo;
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
