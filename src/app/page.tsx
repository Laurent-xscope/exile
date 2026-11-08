"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowRightLine,
  RiQuillPenLine,
  RiPlayCircleLine,
  RiHashtag,
  RiLightbulbLine,
  RiInstagramLine,
  RiCompass3Line,
  RiQuestionnaireLine,
  RiBookOpenLine,
  RiNodeTree,
  RiBarChartBoxLine,
  RiTableLine,
  RiFileList3Line,
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
        className="w-full min-h-[360px] sm:min-h-[480px] rounded-3xl border border-border-button-default bg-background-secondary-default flex items-center justify-center p-6 animate-pulse"
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

interface CurriculumArtifactShowcaseItem {
  id: string;
  icon: typeof RiCompass3Line;
  titleId: string;
  titleEn: string;
  tagId: string;
  tagEn: string;
  descId: string;
  descEn: string;
  badgeId: string;
  badgeEn: string;
  spanClass: string;
}

const CURRICULUM_ARTIFACTS_SHOWCASE: CurriculumArtifactShowcaseItem[] = [
  {
    id: "cards",
    icon: RiCompass3Line,
    titleId: "Kartu 3d",
    titleEn: "3d tactile cards",
    tagId: "Interaktif",
    tagEn: "Interactive",
    descId: "Kartu fisik digital dengan simulasi inersia rotasi 3d dan penjelasan ilmiah dua sisi.",
    descEn: "Digital cardstock with real 3d inertia simulation and dual-sided scientific rationale.",
    badgeId: "Inersia 3d",
    badgeEn: "3d inertia",
    spanClass: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    id: "quiz",
    icon: RiQuestionnaireLine,
    titleId: "Kuis adaptif",
    titleEn: "Adaptive quiz",
    tagId: "Formatif",
    tagEn: "Formative",
    descId: "Soal HOTS bertingkat dengan analisis distraktor otomatis dan evaluasi langsung.",
    descEn: "Multi-tier HOTS questions with automatic distractor analysis and instant diagnosis.",
    badgeId: "HOTS formatif",
    badgeEn: "HOTS formative",
    spanClass: "col-span-1",
  },
  {
    id: "summary",
    icon: RiBookOpenLine,
    titleId: "Intisari",
    titleEn: "Summary",
    tagId: "Struktur",
    tagEn: "Structured",
    descId: "Ekstraksi konsep hierarkis dari modul panjang tanpa membuang nuansa penting.",
    descEn: "Hierarchical concept extraction from long modules without dropping critical nuance.",
    badgeId: "Hierarkis",
    badgeEn: "Hierarchical",
    spanClass: "col-span-1",
  },
  {
    id: "mindmap",
    icon: RiNodeTree,
    titleId: "Peta konsep",
    titleEn: "Concept map",
    tagId: "Relasional",
    tagEn: "Relational",
    descId: "Visualisasi cabang hubungan antar-konsep untuk memperkuat pemahaman holistik.",
    descEn: "Relational branching tree visualising links across core concepts for holistic grasp.",
    badgeId: "Pohon konsep",
    badgeEn: "Concept tree",
    spanClass: "col-span-1",
  },
  {
    id: "infographic",
    icon: RiBarChartBoxLine,
    titleId: "Infografik",
    titleEn: "Infographic",
    tagId: "Visual",
    tagEn: "Visual",
    descId: "Pilar visualisasi data dan ringkasan grafis yang memudahkan retensi memori.",
    descEn: "Visual data pillars and graphical summaries engineered for high memory retention.",
    badgeId: "Pilar grafis",
    badgeEn: "Graphic pillars",
    spanClass: "col-span-1",
  },
  {
    id: "table",
    icon: RiTableLine,
    titleId: "Tabel data",
    titleEn: "Data table",
    tagId: "Komparatif",
    tagEn: "Comparative",
    descId: "Klasifikasi taksonomi, variabel, dan parameter komparasi dalam tabel rapi.",
    descEn: "Taxonomies, variables, and comparative parameters organized in structured rows.",
    badgeId: "Klasifikasi",
    badgeEn: "Classification",
    spanClass: "col-span-1",
  },
  {
    id: "report",
    icon: RiFileList3Line,
    titleId: "Laporan penguasaan",
    titleEn: "Mastery report",
    tagId: "Capaian",
    tagEn: "Outcomes",
    descId: "Pemetaan capaian kompetensi siswa secara komprehensif untuk evaluasi pengajar.",
    descEn: "Comprehensive student learning outcomes mapping for real-time teacher evaluation.",
    badgeId: "Analitik kelas",
    badgeEn: "Class analytics",
    spanClass: "col-span-1 md:col-span-2 lg:col-span-2",
  },
];

interface TeamMemberProfile {
  handle: string;
  role: string;
  roleTitleId: string;
  roleTitleEn: string;
  href: string;
  avatar: string;
  initials: string;
}

const TEAM_PROFILES: TeamMemberProfile[] = [
  {
    handle: "@dear.sidd",
    role: "Leader",
    roleTitleId: "Arsitektur sistem & rekayasa pedagogi",
    roleTitleEn: "System architecture & pedagogy",
    href: "https://www.instagram.com/dear.sidd/",
    avatar: "/team/dear-sidd.jpg",
    initials: "DS",
  },
  {
    handle: "@wstra__",
    role: "Team 1",
    roleTitleId: "Desain interaksi & visual 3d",
    roleTitleEn: "Interaction & 3d visual design",
    href: "https://www.instagram.com/wstra__/",
    avatar: "/team/wstra.jpg",
    initials: "WS",
  },
  {
    handle: "@ekaprtama_",
    role: "Team 2",
    roleTitleId: "Pengalaman belajar formatif & data",
    roleTitleEn: "Formative learning experience & data",
    href: "https://www.instagram.com/ekaprtama_/",
    avatar: "/team/ekaprtama.jpg",
    initials: "EP",
  },
];

function TeamAvatar({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative size-10 sm:size-12 rounded-full overflow-hidden shrink-0 border border-border-button-default bg-background-tertiary-default flex items-center justify-center">
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          width={48}
          height={48}
          className="object-cover size-full transition group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-caption-1-semibold text-text-secondary select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

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
          <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:sticky lg:top-20 space-y-6 sm:space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Editorial Display Typography & CTAs */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <h1
                    className={cx(
                      "text-title-1-semibold sm:text-display-3-bold md:text-display-2-bold lg:text-display-1-bold text-text-primary tracking-tight leading-[1.15] font-display"
                    )}
                  >
                    <span className="block">
                      {isEn ? "Curriculum documents into" : "Olah modul & materi ajar"}
                    </span>
                    <span className="block text-text-secondary">
                      {isEn ? "living 3d learning cards." : "menjadi kartu 3d interaktif."}
                    </span>
                  </h1>

                  <div className="h-[3px] w-20 bg-border-button-default rounded-full" aria-hidden />

                  <p className="text-body-regular sm:text-body-medium text-text-secondary leading-relaxed pt-1">
                    {isEn
                      ? "Transform lesson manuscripts into tactile 3d cards and synchronous quiz rooms in seconds. Experience deep student comprehension with zero application setup."
                      : "Ubah naskah materi ajar menjadi kartu 3d taktil dan ruang kuis formatif interaktif dalam hitungan detik. Pantau pemahaman siswa secara langsung tanpa instalasi aplikasi."}
                  </p>
                </div>

                {/* Primary & Secondary Hero Actions */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 pt-2 w-full sm:w-auto">
                  <ButtonLink
                    href={studioHref}
                    variant="secondary"
                    size="medium"
                    leadingIcon={RiQuillPenLine}
                    className="w-full sm:w-auto min-h-[44px] justify-center border border-border-button-default font-medium shadow-xs"
                  >
                    Studio
                  </ButtonLink>

                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={handleQuickCreateRoom}
                    disabled={creatingQuickRoom}
                    leadingIcon={creatingQuickRoom ? undefined : RiPlayCircleLine}
                    className="w-full sm:w-auto min-h-[44px] justify-center border border-border-button-default font-medium shadow-xs"
                  >
                    {creatingQuickRoom ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" aria-hidden />
                        <span>{isEn ? "Preparing room..." : "Menyiapkan ruangan..."}</span>
                      </span>
                    ) : isEn ? (
                      "Ruang kuis"
                    ) : (
                      "Ruang kuis"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={() => setShowStudentJoinPanel((prev) => !prev)}
                    leadingIcon={RiHashtag}
                    className="w-full sm:w-auto min-h-[44px] justify-center border border-border-button-default font-medium shadow-xs"
                  >
                    {showStudentJoinPanel
                      ? isEn
                        ? "Hide pin panel"
                        : "Tutup panel pin"
                      : isEn
                      ? "Masukkan pin"
                      : "Masukkan pin"}
                  </Button>
                </div>

                {/* Collapsible Student 6-Digit PIN Drawer */}
                {showStudentJoinPanel && (
                  <aside className="w-full pt-3 animate-in fade-in-50 duration-200">
                    <div className="rounded-2xl bg-background-primary-default border border-border-button-default p-4 sm:p-5 space-y-3.5 shadow-card">
                      <div className="flex items-center justify-between">
                        <h2 className="text-title-3-semibold text-text-primary">
                          {isEn ? "Join live class arena" : "Masuk arena siswa"}
                        </h2>
                      </div>
                      <p className="text-caption-1-regular text-text-secondary">
                        {isEn
                          ? "Join your teacher's live formative quiz session."
                          : "Bergabung ke sesi kuis formatif aktif dengan pin guru."}
                      </p>

                      <form onSubmit={handleStudentJoin} className="space-y-3">
                        <div className="relative rounded-xl border border-border-button-default bg-background-secondary-default transition-colors outline-none focus-within:border-border-button-hover focus-within:ring-2 focus-within:ring-border-focus-ring">
                          <div className="flex items-center px-3.5 py-2.5 min-h-[44px] gap-2">
                            <RiHashtag className="size-4 text-text-tertiary shrink-0" aria-hidden="true" />
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="one-time-code"
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
                          className="w-full min-h-[44px] justify-center border border-border-button-default font-medium shadow-xs"
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
                  "text-display-3-semibold sm:text-display-2-bold text-text-primary tracking-tight font-display break-words"
                )}
              >
                {isEn ? "Curriculum concepts & 3d interactive cards" : "Kartu konsep kurikulum & flashcard 3d"}
              </h2>
              <p className="text-body-regular sm:text-body-medium text-text-secondary max-w-2xl break-words">
                {isEn
                  ? "Explore essential cross-discipline concepts on heavy cotton-linen cardstock with real 3d inertia."
                  : "Eksplorasi konsep esensial lintas kurikulum dengan kartu 3d bertekstur katun-linen dan rotasi fisika nyata."}
              </p>
            </ScrollReveal>

            {/* Curriculum Category Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
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
                        ariaLabel={isEn ? "Interactive 3d flashcard" : "Kartu flashcard 3d kurikulum"}
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
                                  "text-title-2-semibold sm:text-title-1-semibold text-text-primary leading-snug max-w-xl font-display break-words"
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
                                      "size-4 transition-colors shrink-0",
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
                                    className="mt-3 p-3.5 sm:p-4 rounded-xl border border-border-button-default bg-background-primary-default text-caption-1-medium text-text-secondary leading-relaxed transition-all space-y-1 text-start max-w-lg w-full break-words"
                                  >
                                    <div className="flex items-center gap-1.5 text-caption-2-semibold text-text-primary">
                                      <RiLightbulbLine className="size-3.5 text-text-secondary shrink-0" aria-hidden="true" />
                                      <span>{isEn ? "Pedagogical clue:" : "Petunjuk pemahaman:"}</span>
                                    </div>
                                    <p className="break-words">{isEn ? currentCard.hintEn : currentCard.hint}</p>
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
                                    "text-title-2-semibold text-text-primary font-display break-words"
                                  )}
                                >
                                  {isEn ? currentCard.backCorePrincipleEn : currentCard.backCorePrinciple}
                                </h4>
                              </div>

                              <div className="p-3.5 sm:p-4 rounded-xl border border-border-button-default bg-background-primary-default space-y-1">
                                <span className="text-caption-1-semibold text-text-primary block">
                                  {isEn ? "Mechanism & governing rule:" : "Mekanisme & kaidah ilmiah:"}
                                </span>
                                <p className="text-body-2-regular text-text-secondary leading-relaxed break-words">
                                  {isEn ? currentCard.mechanismExplanationEn : currentCard.mechanismExplanation}
                                </p>
                              </div>

                              <div className="p-3.5 sm:p-4 rounded-xl border border-border-button-default bg-background-primary-default space-y-1">
                                <span className="text-caption-1-semibold text-text-primary block">
                                  {isEn ? "Real-world context & application:" : "Aplikasi di dunia nyata:"}
                                </span>
                                <p className="text-body-2-regular text-text-secondary leading-relaxed break-words">
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
                  "text-display-3-semibold sm:text-display-2-bold text-text-primary leading-tight font-display break-words"
                )}
              >
                {isEn
                  ? "From raw document sheets to live interactive classrooms"
                  : "Dari lembar dokumen mentah menjadi ruang kuis kelas interaktif"}
              </h2>

              <p className="text-body-regular sm:text-body-medium text-text-secondary leading-relaxed break-words">
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

                <div className="md:col-span-9 space-y-4 min-w-0">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display break-words"
                    )}
                  >
                    {isEn
                      ? "Upload any document without rigid limits"
                      : "Unggah berkas dokumen apa saja tanpa batas kaku"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl break-words">
                    {isEn
                      ? "Drop teaching materials (PDF, Word, text) or camera scans. Exile extracts hierarchical knowledge structures without discarding technical terminology or regional cultural nuance."
                      : "Terima dokumen materi ajar (PDF, Word, teks) atau pindaian kamera. Sistem mengekstrak struktur materi secara hierarkis tanpa kehilangan istilah ilmiah dan konteks budaya lokal."}
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

                <div className="md:col-span-9 space-y-4 min-w-0">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display break-words"
                    )}
                  >
                    {isEn
                      ? "Transform into 7 structured learning artifacts"
                      : "Olah menjadi 7 artifak belajar terstruktur"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl break-words">
                    {isEn
                      ? "Automatically decomposes content into tactile 3d cards, adaptive HOTS quizzes, concise summaries, relational concept maps, infographics, data tables, and classroom mastery reports."
                      : "Secara otomatis membedah materi menjadi kartu 3d, kuis adaptif, intisari, peta konsep, infografik, tabel data, dan laporan penguasaan kompetensi."}
                  </p>

                  {/* BENTO GRID: 7 Curriculum Artifact Showcase Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-3">
                    {CURRICULUM_ARTIFACTS_SHOWCASE.map((artifact) => {
                      const Icon = artifact.icon;
                      return (
                        <div
                          key={artifact.id}
                          className={cx(
                            "p-4 sm:p-6 rounded-2xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default transition flex flex-col justify-between space-y-3",
                            artifact.spanClass
                          )}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-8 rounded-lg bg-background-primary-default border border-border-button-default flex items-center justify-center text-text-primary shrink-0">
                                  <Icon className="size-4" aria-hidden="true" />
                                </div>
                                <h4 className="text-body-2-semibold sm:text-title-3-semibold text-text-primary font-display break-words">
                                  {isEn ? artifact.titleEn : artifact.titleId}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-background-primary-default border border-border-button-default text-caption-2-medium text-text-secondary shrink-0">
                                {isEn ? artifact.badgeEn : artifact.badgeId}
                              </span>
                            </div>

                            <p className="text-caption-1-regular sm:text-body-2-regular text-text-secondary leading-relaxed break-words">
                              {isEn ? artifact.descEn : artifact.descId}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-separator-border/60">
                            <span className="px-2 py-0.5 rounded-md bg-background-tertiary-default text-caption-2-medium text-text-tertiary">
                              {isEn ? artifact.tagEn : artifact.tagId}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

                <div className="md:col-span-9 space-y-4 min-w-0">
                  <h3
                    className={cx(
                      "text-title-2-semibold sm:text-title-1-semibold text-text-primary font-display break-words"
                    )}
                  >
                    {isEn
                      ? "Launch live interactive quiz room with adaptive timers"
                      : "Buka ruang kuis interaktif dengan kendali tempo penuh"}
                  </h3>

                  <p className="text-body-regular text-text-secondary leading-relaxed max-w-3xl break-words">
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

      {/* CRAFTED EDITORIAL FOOTER & TEAM CREDITS */}
      <footer id="tentang" className="border-t border-separator-border bg-background-full pt-12 pb-8 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-6 space-y-8 sm:space-y-12">
          {/* Team Credits Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-separator-border pb-4">
              <div className="space-y-1">
                <span className="text-caption-2-medium text-text-tertiary font-mono">
                  {isEn ? "Crafted by" : "Karya tim"}
                </span>
                <h3 className="text-title-3-semibold sm:text-title-2-semibold text-text-primary font-display">
                  {isEn ? "Credits & team contributors" : "Kredit tim pengembang"}
                </h3>
              </div>
              <p className="text-caption-1-regular text-text-secondary max-w-md">
                {isEn
                  ? "Transforming lesson manuscripts into tactile 3d cards and synchronous quiz rooms."
                  : "Mengubah naskah materi ajar menjadi kartu 3d taktil dan ruang kuis interaktif."}
              </p>
            </div>

            {/* Team Profile Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {TEAM_PROFILES.map((member) => (
                <a
                  key={member.handle}
                  href={member.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default hover:border-border-button-hover transition group outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer"
                >
                  <TeamAvatar
                    src={member.avatar}
                    alt={member.handle}
                    initials={member.initials}
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-body-2-semibold text-text-primary group-hover:text-text-primary transition">
                        {member.handle}
                      </span>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-background-tertiary-default text-text-secondary text-caption-2-medium border border-border-button-default">
                        {member.role}
                      </span>
                    </div>

                    <p className="text-caption-1-regular text-text-secondary leading-snug break-words">
                      {isEn ? member.roleTitleEn : member.roleTitleId}
                    </p>

                    <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary group-hover:text-text-secondary transition pt-0.5">
                      <RiInstagramLine className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>Instagram</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="pt-6 border-t border-separator-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
            <p className="text-caption-1-regular text-text-tertiary leading-relaxed">
              {isEn
                ? "Copyright © 2026 Exile. All rights reserved."
                : "Copyright © 2026 Exile. Hak cipta dilindungi."}
            </p>

            <span className="text-caption-2-medium text-text-tertiary">
              {isEn
                ? "Interactive curriculum evaluation platform"
                : "Platform evaluasi kurikulum interaktif"}
            </span>
          </div>
        </div>
      </footer>

      <ScrollToTopButton label={isEn ? "Scroll to top" : "Kembali ke atas"} />
    </div>
  );
}
