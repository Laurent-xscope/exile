"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiQuillPenLine,
  RiPlayCircleLine,
  RiHashtag,
  RiRefreshLine,
  RiLightbulbLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { Spinner } from "@/components/base/spinner/spinner";
import { ExileLogo } from "@/components/brand/exile-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
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
  SmoothScrollLink,
} from "@/components/foundations/smooth-scroll";
import {
  CURRICULUM_CARDS_POOL,
  CurriculumCardItem,
} from "@/lib/curriculum/curriculum-cards-pool";
import { cx } from "@/utils/cx";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const ExileProductDemo = dynamic(
  () => import("@/components/remotion/ExileProductDemo"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[16/9] rounded-3xl bg-background-primary-default border border-border-button-default flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Spinner size="md" aria-label="Memuat demonstrasi..." />
      </div>
    ),
  }
);

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
  const { lang, t } = useTranslation();
  const isEn = lang === "en";

  const [pinInput, setPinInput] = useState("");
  const [creatingQuickRoom, setCreatingQuickRoom] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [currentCardId, setCurrentCardId] = useState<string>(CURRICULUM_CARDS_POOL[0].id);
  const [categoryTurn, setCategoryTurn] = useState<number>(0);

  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
  }, []);

  const handleCategorySelect = (category: CategoryFilter) => {
    soundEffects.playClick();
    setSelectedCategory(category);
    setIsFlipped(false);
    setShowHint(false);

    const pool =
      category === "all"
        ? CURRICULUM_CARDS_POOL
        : CURRICULUM_CARDS_POOL.filter((c) => c.category === category);
    const picked = pickRandom(pool);

    setCurrentCardId(picked.id);
  };

  const isTimerPaused = isHovered;

  useEffect(() => {
    if (isTimerPaused) return;

    const interval = setInterval(() => {
      handleNextCard();
    }, 30_000);

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
          ? "Enter the 6-digit room Pin from your teacher."
          : "Masukkan Pin ruangan 6 digit dari pengajar."
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
      toast.success(isEn ? `Room created! Pin: ${data.roomCode}` : `Ruangan berhasil dibuat! Pin: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat ruangan.";
      toast.error(msg);
    } finally {
      setCreatingQuickRoom(false);
    }
  };

  const studioHref = user ? "/studio" : "/login?next=/studio";

  return (
    <div className="min-h-screen bg-background-full text-text-primary flex flex-col justify-between">
      <ScrollProgressBar />

      <header className="border-b-2 border-ink bg-background-full sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <ExileLogo size={32} showText />
            <nav aria-label={isEn ? "Page navigation" : "Navigasi halaman"} className="hidden md:flex items-center gap-5">
              <SmoothScrollLink
                href="#demo-remotion"
                className="text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {isEn ? "Video demo" : "Demo video"}
              </SmoothScrollLink>
              <SmoothScrollLink
                href="#uji-cepat"
                className="text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {isEn ? "3d cards" : "Kartu 3d"}
              </SmoothScrollLink>
              <SmoothScrollLink
                href="#tentang"
                className="text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {isEn ? "About" : "Tentang"}
              </SmoothScrollLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />
          </div>
        </div>
      </header>

      <section className="py-12 sm:py-24 border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <h1 className="text-[40px] sm:text-[56px] text-text-primary">
              {t.hero.headingLine1} {t.hero.headingLine2}
            </h1>
            <div className="h-[3px] w-24 bg-red-500" aria-hidden />

            <p className="text-[20px] leading-[1.65] text-text-secondary max-w-2xl">
              {t.hero.subheading}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={studioHref} variant="primary" size="medium" leadingIcon={RiQuillPenLine}>
                {isEn ? "Open learning studio" : "Buka studio ajar"}
              </ButtonLink>

              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={handleQuickCreateRoom}
                disabled={creatingQuickRoom}
                leadingIcon={creatingQuickRoom ? undefined : RiPlayCircleLine}
              >
                {creatingQuickRoom ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" aria-hidden />
                    <span>{isEn ? "Preparing room..." : "Menyiapkan ruangan..."}</span>
                  </span>
                ) : (
                  isEn ? "Quick host live room" : "Buat ruang kuis instan"
                )}
              </Button>

              <SmoothScrollLink
                href="#demo-remotion"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <span>{isEn ? "Watch demo" : "Lihat demo"}</span>
              </SmoothScrollLink>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="border-2 border-ink bg-background-full p-6 space-y-4">
              <span className="vb-overline text-text-secondary block">
                {isEn ? "Students" : "Siswa"}
              </span>
              <h2 className="text-[24px]">
                {isEn ? "Join the live arena" : "Masuk arena siswa"}
              </h2>
              <p className="text-[14px] leading-[1.6] text-text-secondary">
                {isEn ? "Join a live class session with your teacher's pin." : "Bergabung ke kuis langsung dengan pin guru."}
              </p>

              <form onSubmit={handleStudentJoin} className="space-y-3">
                <InputBase
                  aria-label={isEn ? "Enter quiz room pin" : "Masukkan pin ruangan kuis"}
                  value={pinInput}
                  onChange={(e) => setPinInput(normalizeRoomCode(e.target.value))}
                  placeholder={isEn ? "6-digit room pin" : "Pin kelas 6 digit"}
                  leadingIcon={RiHashtag}
                  maxLength={6}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  trailingIcon={RiArrowRightLine}
                  className="w-full justify-center"
                >
                  {isEn ? "Continue to join" : "Lanjut bergabung"}
                </Button>
              </form>
            </div>
          </aside>
        </div>
      </section>

      <section id="demo-remotion" className="py-16 sm:py-24 border-b-2 border-ink bg-background-full">
        <ScrollReveal variant="scale-up" delay={50} className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <ExileProductDemo />
        </ScrollReveal>
      </section>

      <section
        id="uji-cepat"
        className="py-16 sm:py-24 border-b-2 border-ink bg-background-full"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <ScrollReveal variant="slide-up" className="flex flex-col items-center text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-display-4-semibold sm:text-display-3-semibold text-text-primary">
              {isEn ? "Curriculum concepts & 3D interactive cards" : "Kartu konsep kurikulum & flashcard 3D"}
            </h2>
            <p className="text-body-regular sm:text-body-medium text-text-secondary max-w-2xl">
              {isEn
                ? "Explore essential cross-discipline concepts with self-rotating 3D flashcards designed for pedagogical clarity."
                : "Eksplorasi konsep esensial lintas kurikulum secara mendalam dengan kartu interaktif 3D."}
            </p>
          </ScrollReveal>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleCategorySelect(tab.id)}
                  className={cx(
                    "px-3.5 py-1.5 rounded-xl text-caption-1-medium transition-all cursor-pointer border-2",
                    isActive
                      ? "bg-ink text-paper border-ink shadow-xs font-semibold"
                      : "bg-background-primary-default border-border-button-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
                  )}
                >
                  <span>{isEn ? tab.labelEn : tab.labelId}</span>
                  <span
                    className={cx(
                      "ms-1.5 text-caption-2-medium rounded-full px-2 py-0.5",
                      isActive
                        ? "bg-paper/20 text-paper"
                        : "bg-background-secondary-default text-text-tertiary"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <ScrollReveal variant="scale-up" delay={80} className="max-w-2xl mx-auto w-full">
            <div
              className="bg-background-primary-default border border-border-button-default rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={isEn ? "Flip curriculum flashcard" : "Balik kartu kurikulum"}
                className="relative min-h-[460px] sm:min-h-[420px] w-full cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring rounded-2xl"
                style={{ perspective: "1200px" }}
                onClick={() => {
                  soundEffects.playClick();
                  setIsFlipped((prev) => !prev);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    soundEffects.playClick();
                    setIsFlipped((prev) => !prev);
                  }
                }}
              >
                <div
                  className="relative min-h-[460px] sm:min-h-[420px] w-full transition-transform duration-500 ease-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-colors"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-separator-border">
                      <span className="px-3 py-1 rounded-full bg-background-primary-default border border-border-button-default text-caption-1-semibold text-text-primary">
                        {isEn ? currentCard.topicEn : currentCard.topic}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEffects.playClick();
                          setIsFlipped((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <RiRefreshLine className={cx("size-3.5 transition-transform duration-500", isFlipped && "rotate-180")} />
                        <span>{isEn ? "Flip card" : "Balik kartu"}</span>
                      </button>
                    </div>

                    <div className="my-auto py-4 flex flex-col items-center text-center space-y-5">
                      <p className="text-title-2-semibold sm:text-title-1-semibold text-text-primary leading-snug max-w-xl">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-1-medium text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                        >
                          <RiLightbulbLine
                            className={cx(
                              "size-4 transition-colors",
                              showHint ? "text-amber-500 fill-amber-500" : "text-text-tertiary"
                            )}
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
                            className="mt-3 p-4 rounded-xl bg-background-primary-default border border-border-button-default text-caption-1-medium text-text-secondary leading-relaxed transition-all space-y-1 text-start max-w-lg w-full"
                          >
                            <div className="flex items-center gap-1.5 text-caption-2-semibold text-text-primary">
                              <RiLightbulbLine className="size-3.5 text-amber-500" />
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
                          ? "Click anywhere on this card to flip & reveal answer"
                          : "Klik di mana saja pada kartu ini untuk membalik & melihat jawaban"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-colors"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-separator-border">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-background-primary-default border border-border-button-default text-caption-1-semibold text-text-primary">
                          {isEn ? currentCard.topicEn : currentCard.topic}
                        </span>
                        <span className="text-caption-2-medium text-text-tertiary hidden sm:inline">
                          {isEn ? "Answer & rationale" : "Jawaban & rasional"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEffects.playClick();
                          setIsFlipped((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <RiRefreshLine className="size-3.5 rotate-180" />
                        <span>{isEn ? "Show question" : "Lihat soal"}</span>
                      </button>
                    </div>

                    <div className="space-y-3.5 my-auto py-2 overflow-y-auto max-h-[300px] pe-1 text-start">
                      <div>
                        <span className="text-caption-2-semibold tracking-wider text-text-tertiary block mb-1">
                          {isEn ? "Core scientific rationale" : "Prinsip inti & rasional"}
                        </span>
                        <h4 className="text-title-2-semibold text-text-primary">
                          {isEn ? currentCard.backCorePrincipleEn : currentCard.backCorePrinciple}
                        </h4>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background-primary-default border border-border-button-default space-y-1">
                        <span className="text-caption-1-semibold text-text-primary block">
                          {isEn ? "Mechanism & governing rule:" : "Mekanisme & kaidah ilmiah:"}
                        </span>
                        <p className="text-body-2-regular text-text-secondary leading-relaxed">
                          {isEn ? currentCard.mechanismExplanationEn : currentCard.mechanismExplanation}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background-primary-default border border-border-button-default space-y-1">
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
                        {isEn ? "Click card to flip back to question" : "Klik kartu untuk kembali ke pertanyaan"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer id="tentang" className="border-t-2 border-ink py-6 bg-background-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center">
          <p className="text-[13px] text-text-secondary">
            © 2026 Exile — {isEn ? "Interactive educational assessment engine" : "Platform asesmen pendidikan & literasi"}
          </p>
        </div>
      </footer>

      <ScrollToTopButton label={isEn ? "Scroll to top" : "Kembali ke atas"} />
    </div>
  );
}
