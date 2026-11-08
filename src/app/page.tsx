"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowRightLine,
  RiQuillPenLine,
  RiPlayCircleLine,
  RiHashtag,
  RiLightbulbLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Spinner } from "@/components/base/spinner/spinner";
import { ExileLogo } from "@/components/brand/exile-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton, SettingsModal } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { saveHostToken } from "@/lib/rooms/host-token";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { useExileSettings } from "@/lib/settings/user-settings";
import { useTranslation } from "@/lib/i18n/use-translation";
import { soundEffects } from "@/lib/audio/sounds";
import { ScrollReveal } from "@/components/foundations/scroll-reveal/scroll-reveal";
import {
  ScrollProgressBar,
  ScrollToTopButton,
} from "@/components/foundations/smooth-scroll";
import {
  CURRICULUM_CARDS_POOL,
  CurriculumCardItem,
} from "@/lib/curriculum/curriculum-cards-pool";
import { LetterpressCard3D } from "@/components/landing/letterpress-card-3d";
import { cx } from "@/utils/cx";

const TactileArtifact3D = dynamic(
  () =>
    import("@/components/landing/tactile-artifact-3d").then(
      (mod) => mod.TactileArtifact3D
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full min-h-[380px] sm:min-h-[540px] rounded-3xl border border-border-button-default bg-background-secondary-default flex items-center justify-center p-6 animate-pulse"
        aria-hidden="true"
      >
        <div className="w-48 sm:w-64 h-32 sm:h-44 rounded-2xl bg-background-tertiary-default/60 border border-border-button-default/50" />
      </div>
    ),
  }
);

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type CategoryFilter = "all" | "stem" | "language" | "heritage" | "social";

const CATEGORY_TABS: Array<{
  id: CategoryFilter;
  labelId: string;
  labelEn: string;
  count: number;
}> = [
  { id: "all", labelId: "Semua bidang", labelEn: "All disciplines", count: 20 },
  { id: "stem", labelId: "Sains & fisika", labelEn: "Science & physics", count: 5 },
  { id: "language", labelId: "Bahasa & sastra", labelEn: "Language & literature", count: 5 },
  { id: "heritage", labelId: "Muatan lokal & budaya", labelEn: "Heritage & culture", count: 5 },
  { id: "social", labelId: "Sosial & humaniora", labelEn: "Social & civics", count: 5 },
];

const ORDERED_CATEGORIES: Array<CurriculumCardItem["category"]> = [
  "stem",
  "language",
  "heritage",
  "social",
];

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useExileSettings();
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const [pinInput, setPinInput] = useState("");
  const [creatingQuickRoom, setCreatingQuickRoom] = useState(false);
  const [showStudentJoinPanel, setShowStudentJoinPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [currentCardId, setCurrentCardId] = useState<string>(CURRICULUM_CARDS_POOL[0].id);
  const [categoryTurn, setCategoryTurn] = useState<number>(0);

  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [isHovered, setIsHovered] = useState(false);
  const [isSectionVisible, setIsSectionVisible] = useState(true);

  useEffect(() => {
    const el = document.getElementById("uji-cepat");
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stateRef = useRef({
    selectedCategory,
    categoryTurn,
    currentCardId,
  });

  useEffect(() => {
    stateRef.current = {
      selectedCategory,
      categoryTurn,
      currentCardId,
    };
  }, [selectedCategory, categoryTurn, currentCardId]);

  const handleNextCard = useCallback(() => {
    const {
      selectedCategory: activeCat,
      categoryTurn: turn,
      currentCardId: activeId,
    } = stateRef.current;

    let pool: CurriculumCardItem[];
    let nextTurn = turn;

    if (activeCat === "all") {
      const targetCategory = ORDERED_CATEGORIES[turn % ORDERED_CATEGORIES.length];
      pool = CURRICULUM_CARDS_POOL.filter((c) => c.category === targetCategory);
      nextTurn = (turn + 1) % ORDERED_CATEGORIES.length;
      setCategoryTurn(nextTurn);
    } else {
      pool = CURRICULUM_CARDS_POOL.filter((c) => c.category === activeCat);
    }

    const available = pool.filter((c) => c.id !== activeId);
    const selectionSet = available.length > 0 ? available : pool;
    const picked = pickRandom(selectionSet);

    setCurrentCardId(picked.id);
    setIsFlipped(false);
    setShowHint(false);
    setSecondsRemaining(10);
  }, []);

  const handleCategorySelect = (category: CategoryFilter) => {
    soundEffects.playClick();
    setSelectedCategory(category);
    setIsFlipped(false);
    setShowHint(false);
    setSecondsRemaining(10);

    const pool =
      category === "all"
        ? CURRICULUM_CARDS_POOL
        : CURRICULUM_CARDS_POOL.filter((c) => c.category === category);
    const picked = pickRandom(pool);

    setCurrentCardId(picked.id);
  };

  const isTimerPaused = isHovered || !isSectionVisible;

  useEffect(() => {
    if (isTimerPaused) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 0.1) {
          handleNextCard();
          return 10;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isTimerPaused, handleNextCard]);

  const currentCard =
    CURRICULUM_CARDS_POOL.find((c) => c.id === currentCardId) ||
    CURRICULUM_CARDS_POOL[0];

  const handleStudentJoin = (e: FormEvent) => {
    e.preventDefault();
    const cleanPin = normalizeRoomCode(pinInput);

    if (!isValidRoomCode(cleanPin)) {
      toast.error(
        isEn
          ? "Enter the 6-digit room pin from your teacher."
          : "Masukkan pin ruangan 6 digit dari pengajar."
      );
      return;
    }

    soundEffects.playClick();
    router.push(`/play?code=${cleanPin}`);
  };

  const handleQuickCreateRoom = async () => {
    soundEffects.playClick();
    setCreatingQuickRoom(true);
    try {
      const hostName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        settings.defaultNickname ||
        (isEn ? "Exile educator" : "Pengajar exile");

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName,
          settings: {
            timePerQuestionSec: settings.defaultQuestionTimeSec,
            streakBonus: settings.streakBonusEnabled,
            shuffleQuestions: settings.shuffleQuestions,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.hostToken) {
        throw new Error(data.error || "Gagal membuat ruangan.");
      }
      saveHostToken(data.roomCode, data.hostToken);
      toast.success(
        isEn
          ? `Room created! pin: ${data.roomCode}`
          : `Ruangan berhasil dibuat! pin: ${data.roomCode}`
      );
      router.push(`/buat-ruang-kuis/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat ruangan.";
      toast.error(msg);
    } finally {
      setCreatingQuickRoom(false);
    }
  };

  const studioHref = user ? "/studio" : "/login?next=/studio";

  return (
    <div
      className={cx(
        "min-h-screen bg-background-full text-text-primary flex flex-col justify-between overflow-x-clip selection:bg-background-tertiary-default selection:text-text-primary vb-desk-grain"
      )}
    >
      <ScrollProgressBar />

      {/* HEADER: Sticky translucent warm desk bar */}
      <header className="bg-background-full/90 backdrop-blur-md sticky top-0 z-40 border-b border-separator-border transition-colors">
        <div className="mx-auto max-w-[1160px] px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-6 sm:gap-8">
            <ExileLogo size={32} showText />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />
          </div>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <main className="flex-1">
        {/* SECTION 1: ASYMMETRIC EDITORIAL HERO + OPEN 3D STUDY DESK */}
        <section className="relative pt-6 sm:pt-16 pb-12 sm:pb-24 border-b border-separator-border/60 lg:min-h-[155vh]">
          <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:sticky lg:top-20 space-y-8 sm:space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Editorial Display Typography & CTAs */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <h1
                    className={cx(
                      "text-title-1-bold sm:text-display-1-bold text-text-primary tracking-tight leading-[1.12] font-display"
                    )}
                  >
                    <span className="block">
                      {isEn ? "Curriculum documents into" : "Olah modul & materi ajar"}
                    </span>
                    <span className="block text-text-secondary">
                      {isEn ? "living 3D learning cards." : "menjadi kartu 3D interaktif."}
                    </span>
                  </h1>

                  <div className="h-[3px] w-20 bg-border-button-default rounded-full" aria-hidden />

                  <p className="text-body-regular sm:text-body-medium text-text-secondary leading-relaxed pt-1">
                    {isEn
                      ? "Transform lesson manuscripts into tactile 3D cards and synchronous quiz rooms in seconds. Experience deep student comprehension with zero application setup."
                      : "Ubah naskah modul ajar menjadi kartu 3D taktil dan ruang kuis formatif interaktif dalam hitungan detik. Pantau pemahaman siswa secara langsung tanpa instalasi aplikasi."}
                  </p>
                </div>

                {/* Primary & Secondary Hero Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <ButtonLink
                    href={studioHref}
                    variant="secondary"
                    size="medium"
                    leadingIcon={RiQuillPenLine}
                    className="border border-border-button-default font-medium shadow-xs"
                  >
                    {isEn ? "Open Studio" : "Buka Studio"}
                  </ButtonLink>

                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={handleQuickCreateRoom}
                    disabled={creatingQuickRoom}
                    leadingIcon={creatingQuickRoom ? undefined : RiPlayCircleLine}
                    className="border border-border-button-default font-medium shadow-xs"
                  >
                    {creatingQuickRoom ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" aria-hidden />
                        <span>{isEn ? "Preparing room..." : "Menyiapkan ruangan..."}</span>
                      </span>
                    ) : isEn ? (
                      "Create Quiz Room"
                    ) : (
                      "Buat Ruang Kuis"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={() => setShowStudentJoinPanel((prev) => !prev)}
                    leadingIcon={RiHashtag}
                    className="border border-border-button-default font-medium shadow-xs"
                  >
                    {showStudentJoinPanel
                      ? isEn
                        ? "Hide pin panel"
                        : "Tutup panel pin"
                      : isEn
                      ? "Enter room pin"
                      : "Masukkan pin siswa"}
                  </Button>
                </div>

                {/* Collapsible Student 6-Digit PIN Drawer */}
                {showStudentJoinPanel && (
                  <aside className="w-full pt-3 animate-in fade-in-50 duration-200">
                    <div className="rounded-2xl bg-background-primary-default border border-border-button-default p-5 space-y-3.5 shadow-card">
                      <div className="flex items-center justify-between">
                        <h2 className="text-title-3-semibold text-text-primary">
                          {isEn ? "Join live class arena" : "Masuk arena siswa"}
                        </h2>
                        <span className="font-mono text-caption-2-medium text-text-tertiary">
                          PIN 6 digit
                        </span>
                      </div>
                      <p className="text-caption-1-regular text-text-secondary">
                        {isEn
                          ? "Join your teacher's live formative quiz session."
                          : "Bergabung ke sesi kuis formatif aktif dengan pin guru."}
                      </p>

                      <form onSubmit={handleStudentJoin} className="space-y-3">
                        <div className="relative rounded-xl border border-border-button-default bg-background-secondary-default transition-colors outline-none focus-within:border-border-button-hover focus-within:ring-2 focus-within:ring-border-focus-ring">
                          <div className="flex items-center px-3.5 py-2.5 gap-2">
                            <RiHashtag className="size-4 text-text-tertiary shrink-0" aria-hidden="true" />
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={pinInput}
                              onChange={(e) => setPinInput(normalizeRoomCode(e.target.value))}
                              placeholder="xxxxxx"
                              aria-label={isEn ? "Enter quiz room pin" : "Masukkan pin ruangan kuis"}
                              className="w-full bg-transparent text-body-medium text-text-primary placeholder:text-text-placeholder outline-none border-none focus:outline-none focus:ring-0 font-mono tracking-wider shadow-none"
                              style={{ outline: "none", boxShadow: "none" }}
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          variant="secondary"
                          size="medium"
                          trailingIcon={RiArrowRightLine}
                          className="w-full justify-center border border-border-button-default font-medium shadow-xs"
                        >
                          {isEn ? "Continue to join" : "Lanjut bergabung"}
                        </Button>
                      </form>
                    </div>
                  </aside>
                )}
              </div>

              {/* Right Column / Stage: Open Scroll-Reactive 3D Study Desk */}
              <div className="lg:col-span-7 w-full min-h-[380px] sm:min-h-[540px] flex items-center justify-center overflow-hidden sm:overflow-visible">
                <TactileArtifact3D className="w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ANIMATED STACKED 3D FLASHCARD DECK (#uji-cepat) */}
        <section id="uji-cepat" className="py-20 sm:py-28 bg-background-full">
          <div className="mx-auto max-w-[1160px] px-4 sm:px-6 space-y-8">
            <ScrollReveal
              variant="slide-up"
              className="flex flex-col items-center text-center space-y-3 max-w-3xl mx-auto"
            >
              <h2
                className={cx(
                  "text-display-3-semibold sm:text-display-2-bold text-text-primary tracking-tight font-display"
                )}
              >
                {isEn ? "Curriculum concepts & 3D interactive cards" : "Kartu konsep kurikulum & flashcard 3D"}
              </h2>
              <p className="text-body-regular sm:text-body-medium text-text-secondary max-w-2xl">
                {isEn
                  ? "Explore essential cross-discipline concepts on heavy cotton-linen cardstock with real 3D inertia."
                  : "Eksplorasi konsep esensial lintas kurikulum dengan kartu 3D bertekstur katun-linen dan rotasi fisika nyata."}
              </p>
            </ScrollReveal>

            {/* Curriculum Category Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
              {CATEGORY_TABS.map((tab) => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleCategorySelect(tab.id)}
                    className={cx(
                      "px-3.5 py-1.5 rounded-xl text-caption-1-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      isActive
                        ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-medium shadow-xs"
                        : "border border-transparent bg-background-secondary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
                    )}
                  >
                    <span>{isEn ? tab.labelEn : tab.labelId}</span>
                    <span
                      className={cx(
                        "ms-1.5 text-caption-2-medium rounded-full px-2 py-0.5",
                        isActive
                          ? "bg-background-primary-default text-text-secondary"
                          : "bg-background-primary-default text-text-tertiary"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stacked 3D Flashcard Deck Container */}
            <ScrollReveal variant="scale-up" delay={80} className="max-w-2xl mx-auto w-full pt-4">
              <div className="relative w-full">
                {/* Physical Deck Background Sheet 2 (Deepest offset) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-y-5 sm:translate-y-6 scale-[0.93] rounded-2xl bg-background-secondary-default border border-border-button-default/80 pointer-events-none -z-20 shadow-xs -rotate-1"
                />

                {/* Physical Deck Background Sheet 1 (Middle offset) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-y-2.5 sm:translate-y-3 scale-[0.965] rounded-2xl bg-background-secondary-default border border-border-button-default pointer-events-none -z-10 shadow-sm rotate-[0.8deg]"
                />

                {/* Active Top Flashcard */}
                <div
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative z-10 w-full"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCard.id}
                      initial={{ opacity: 0, x: 28, y: 16, rotate: 2, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -28, y: -16, rotate: -2, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.9 }}
                    >
                      <LetterpressCard3D
                        isFlipped={isFlipped}
                        onFlipChange={setIsFlipped}
                        minHeightClassName="min-h-[460px] sm:min-h-[420px]"
                        ariaLabel={isEn ? "Interactive 3D flashcard" : "Kartu flashcard 3D kurikulum"}
                        frontContent={
                          <div className="flex flex-col justify-between h-full space-y-6">
                            {/* Front Header: Topic Pill on Left, 10s Circular SVG Ring on Right (No Words, No Numbers) */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-separator-border">
                              <span className="px-3 py-1 rounded-full bg-background-primary-default border border-border-button-default text-caption-1-semibold text-text-primary">
                                {isEn ? currentCard.topicEn : currentCard.topic}
                              </span>

                              {/* Corner Cooldown Ring */}
                              <div
                                className="relative size-5 flex items-center justify-center shrink-0"
                                aria-hidden="true"
                              >
                                <svg
                                  className="size-5 -rotate-90 transform"
                                  viewBox="0 0 36 36"
                                >
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    className="stroke-border-button-default"
                                    strokeWidth="3.5"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    className={cx(
                                      "stroke-text-secondary transition-[stroke-dashoffset] duration-100 ease-linear",
                                      isTimerPaused && "stroke-text-tertiary"
                                    )}
                                    strokeWidth="3.5"
                                    strokeDasharray={87.96}
                                    strokeDashoffset={87.96 * (1 - secondsRemaining / 10)}
                                    strokeLinecap="round"
                                    fill="transparent"
                                  />
                                </svg>
                              </div>
                            </div>

                            <div className="my-auto py-4 flex flex-col items-center text-center space-y-5">
                              <p
                                className={cx(
                                  "text-title-2-semibold sm:text-title-1-semibold text-text-primary leading-snug max-w-xl font-display"
                                )}
                              >
                                {isEn ? currentCard.frontQuestionEn : currentCard.frontQuestion}
                              </p>

                              <div className="w-full flex flex-col items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundEffects.playClick();
                                    setShowHint((prev) => !prev);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-1-medium text-text-secondary hover:text-text-primary transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                                >
                                  <RiLightbulbLine
                                    className={cx(
                                      "size-4 transition-colors",
                                      showHint ? "text-text-primary fill-text-primary" : "text-text-tertiary"
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {showHint
                                      ? isEn
                                        ? "Hide pedagogical clue"
                                        : "Tutup petunjuk soal"
                                      : isEn
                                      ? "Need a pedagogical hint?"
                                      : "Butuh petunjuk soal?"}
                                  </span>
                                </button>

                                {showHint && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-3 p-4 rounded-xl border border-border-button-default bg-background-primary-default text-caption-1-medium text-text-secondary leading-relaxed transition-all space-y-1 text-start max-w-lg w-full"
                                  >
                                    <div className="flex items-center gap-1.5 text-caption-2-semibold text-text-primary">
                                      <RiLightbulbLine className="size-3.5 text-text-secondary" aria-hidden="true" />
                                      <span>{isEn ? "Pedagogical clue:" : "Petunjuk pemahaman:"}</span>
                                    </div>
                                    <p>{isEn ? currentCard.hintEn : currentCard.hint}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-separator-border text-center text-caption-1-medium text-text-tertiary">
                              <span>
                                {isEn
                                  ? "Click anywhere to flip & reveal scientific answer"
                                  : "Klik di mana saja untuk membalik & melihat jawaban ilmiah"}
                              </span>
                            </div>
                          </div>
                        }
                        backContent={
                          <div className="flex flex-col justify-between h-full space-y-4">
                            {/* Back Header: Topic Pill on Left, 10s Circular SVG Ring on Right (No Words, No Numbers) */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-separator-border">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-background-primary-default border border-border-button-default text-caption-1-semibold text-text-primary">
                                  {isEn ? currentCard.topicEn : currentCard.topic}
                                </span>
                                <span className="text-caption-2-medium text-text-tertiary hidden sm:inline">
                                  {isEn ? "Answer & rationale" : "Jawaban & rasional"}
                                </span>
                              </div>

                              {/* Corner Cooldown Ring */}
                              <div
                                className="relative size-5 flex items-center justify-center shrink-0"
                                aria-hidden="true"
                              >
                                <svg
                                  className="size-5 -rotate-90 transform"
                                  viewBox="0 0 36 36"
                                >
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    className="stroke-border-button-default"
                                    strokeWidth="3.5"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    className={cx(
                                      "stroke-text-secondary transition-[stroke-dashoffset] duration-100 ease-linear",
                                      isTimerPaused && "stroke-text-tertiary"
                                    )}
                                    strokeWidth="3.5"
                                    strokeDasharray={87.96}
                                    strokeDashoffset={87.96 * (1 - secondsRemaining / 10)}
                                    strokeLinecap="round"
                                    fill="transparent"
                                  />
                                </svg>
                              </div>
                            </div>

                            <div className="space-y-3.5 my-auto py-2 overflow-y-auto max-h-[300px] pe-1 text-start">
                              <div>
                                <span className="text-caption-2-semibold tracking-wider text-text-tertiary block mb-1">
                                  {isEn ? "Core scientific rationale" : "Prinsip inti & rasional"}
                                </span>
                                <h4
                                  className={cx(
                                    "text-title-2-semibold text-text-primary font-display"
                                  )}
                                >
                                  {isEn ? currentCard.backCorePrincipleEn : currentCard.backCorePrinciple}
                                </h4>
                              </div>

                              <div className="p-3.5 rounded-xl border border-border-button-default bg-background-primary-default space-y-1">
                                <span className="text-caption-1-semibold text-text-primary block">
                                  {isEn ? "Mechanism & governing rule:" : "Mekanisme & kaidah ilmiah:"}
                                </span>
                                <p className="text-body-2-regular text-text-secondary leading-relaxed">
                                  {isEn ? currentCard.mechanismExplanationEn : currentCard.mechanismExplanation}
                                </p>
                              </div>

                              <div className="p-3.5 rounded-xl border border-border-button-default bg-background-primary-default space-y-1">
                                <span className="text-caption-1-semibold text-text-primary block">
                                  {isEn ? "Real-world context & application:" : "Aplikasi di dunia nyata:"}
                                </span>
                                <p className="text-body-2-regular text-text-secondary leading-relaxed">
                                  {isEn ? currentCard.realWorldScenarioEn : currentCard.realWorldScenario}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-separator-border text-center text-caption-1-medium text-text-tertiary">
                              <span>
                                {isEn
                                  ? "Click card to flip back to question"
                                  : "Klik kartu untuk kembali ke pertanyaan"}
                              </span>
                            </div>
                          </div>
                        }
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* SECTION 3: OPEN BORDERLESS SWISS HAIRLINE LEDGER (#alur-kerja) */}
        <section id="alur-kerja" className="py-20 sm:py-28 border-t border-separator-border bg-background-full">
          <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
            {/* Header */}
            <div className="max-w-3xl space-y-4 pb-12 sm:pb-16">
              <h2
                className={cx(
                  "text-display-3-semibold sm:text-display-2-bold text-text-primary leading-tight font-display"
                )}
              >
                {isEn
                  ? "From raw document sheets to live interactive classrooms"
                  : "Dari lembar dokumen mentah menjadi ruang kuis kelas interaktif"}
              </h2>

              <p className="text-body-regular sm:text-body-medium text-text-secondary leading-relaxed">
                {isEn
                  ? "Exile unifies curriculum ingestion, multi-artifact authoring, and synchronous classroom evaluation in one fluid tactile desk experience."
                  : "Exile menyatukan pembacaan berkas ajar, penyusunan artifak terstruktur, dan evaluasi kelas serentak dalam satu alur kerja meja ajar yang mulus."}
              </p>
            </div>

            {/* Borderless Swiss Hairline Ledger: 3 Numbered Typographic Rows */}
            <div className="divide-y divide-separator-border border-t border-b border-separator-border">
              {/* Row 01 */}
              <div className="py-8 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 flex items-baseline gap-3">
                  <span className="font-mono text-title-1-bold sm:text-display-3-bold text-text-tertiary">
                    01
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    / 03
                  </span>
                </div>

                <div className="md:col-span-9 space-y-4">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display"
                    )}
                  >
                    {isEn
                      ? "Upload any document without rigid limits"
                      : "Unggah berkas dokumen apa saja tanpa batas kaku"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl">
                    {isEn
                      ? "Drop curriculum modules, lesson manuscripts, lecture notes, or study guides. Exile extracts hierarchical knowledge structures without discarding technical terminology or regional cultural nuance."
                      : "Terima modul kurikulum, naskah materi, catatan kelas, atau lembar evaluasi. Sistem mengekstrak struktur materi secara hierarkis tanpa kehilangan istilah ilmiah dan konteks budaya lokal."}
                  </p>

                  <p className="text-caption-1-medium text-text-tertiary pt-1">
                    {isEn
                      ? "Curriculum modules • Lesson manuscripts • Lecture notes • Slides • Worksheets"
                      : "Modul kurikulum • Naskah materi • Catatan kelas • Salindia ajar • Lembar evaluasi"}
                  </p>
                </div>
              </div>

              {/* Row 02 */}
              <div className="py-8 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 flex items-baseline gap-3">
                  <span className="font-mono text-title-1-bold sm:text-display-3-bold text-text-tertiary">
                    02
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    / 03
                  </span>
                </div>

                <div className="md:col-span-9 space-y-4">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display"
                    )}
                  >
                    {isEn
                      ? "Transform into 7 structured learning artifacts"
                      : "Olah menjadi 7 artifak belajar terstruktur"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl">
                    {isEn
                      ? "Automatically decomposes content into tactile 3D Cards, Adaptive HOTS Quizzes, Concise Summaries, Relational Concept Maps, Infographics, Data Tables, and Classroom Mastery Reports."
                      : "Secara otomatis membedah materi menjadi Kartu 3D, Kuis adaptif, Intisari, Peta konsep, Infografik, Tabel data, dan Laporan penguasaan kompetensi."}
                  </p>

                  <p className="text-caption-1-medium text-text-tertiary pt-1">
                    {isEn
                      ? "3D cards • Adaptive quiz • Summary • Concept map • Infographic • Data table • Mastery report"
                      : "Kartu 3D • Kuis adaptif • Intisari • Peta konsep • Infografik • Tabel data • Laporan penguasaan"}
                  </p>
                </div>
              </div>

              {/* Row 03 */}
              <div className="py-8 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 flex items-baseline gap-3">
                  <span className="font-mono text-title-1-bold sm:text-display-3-bold text-text-tertiary">
                    03
                  </span>
                  <span className="text-caption-2-medium text-text-tertiary">
                    / 03
                  </span>
                </div>

                <div className="md:col-span-9 space-y-4">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display"
                    )}
                  >
                    {isEn
                      ? "Launch live interactive quiz room with adaptive timers"
                      : "Buka Ruang Kuis interaktif dengan kendali tempo penuh"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl">
                    {isEn
                      ? "Students join via a 6-digit PIN with zero app installation required. The educator orchestrates pace and question reveals, while Exile Copilot assists live student inquiry."
                      : "Buka arena interaktif dengan kode PIN 6 digit dalam satu klik. Pengajar memegang kendali tempo soal, sementara Exile Copilot mendampingi diskusi konsep siswa di ruang obrolan."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CRAFTED EDITORIAL FOOTER */}
      <footer className="py-8 border-t border-separator-border bg-background-full">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-6 flex items-center justify-center">
          <p className="text-caption-1-regular text-text-tertiary">
            {isEn
              ? "Copyright © 2026 Exile. All rights reserved."
              : "Copyright © 2026 Exile. Hak cipta dilindungi."}
          </p>
        </div>
      </footer>

      <ScrollToTopButton label={isEn ? "Scroll to top" : "Kembali ke atas"} />
    </div>
  );
}
