"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

const triggerConfetti = async (options?: { particleCount?: number; spread?: number; origin?: { y?: number; x?: number } }) => {
  try {
    const { default: confettiLib } = await import("canvas-confetti");
    confettiLib(options);
  } catch {}
};
import {
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiUploadCloud2Line,
  RiRefreshLine,
  RiPlayCircleLine,
  RiFileCopyLine,
  RiCopilotFill,
  RiPresentationLine,
  RiNodeTree,
  RiSendPlane2Line,
  RiFireLine,
  RiLightbulbLine,
  RiFileTextLine,
  RiImageAddLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCompass3Line,
  RiRestartLine,
  RiTimerLine,
  RiTrophyLine,
  RiTableLine,
  RiBarChartBoxLine,
  RiFileList3Line,
  RiDownloadLine,
  RiHistoryLine,
  RiDeleteBinLine,
  RiAddLine,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
  RiSettings3Line,
  RiEyeLine,
  RiCameraLine,
} from "@remixicon/react";
import Image from "next/image";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/base/modal/modal";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { SettingsModal } from "@/components/settings/settings-modal";
import { PreScanModal, type PreScanMode } from "@/components/studio/pre-scan-modal";
import { MobileHomeworkScanner, type ScannedPageItem } from "@/components/studio/mobile-homework-scanner";
import { DirectAnswerCard, type DirectAnswerItem } from "@/components/studio/direct-answer-card";
import { MoreMenu, type MoreMenuItem } from "@/components/base/dropdown/more-menu";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { useTranslation } from "@/lib/i18n/use-translation";
import { saveHostToken } from "@/lib/rooms/host-token";
import { soundEffects } from "@/lib/audio/sounds";
import { FormattedMessage } from "@/components/chat/formatted-message";
import { ScrollReveal } from "@/components/foundations/scroll-reveal/scroll-reveal";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";
import type {
  DocumentAnalysis,
  MindMapNode,
  Question,
  Quiz,
  StudioCraftableArtifact,
} from "@/lib/ai/prompts";
import type { StudioAction } from "@/lib/ai/agent";
import {
  loadStudioHistory,
  saveStudioHistoryEntry,
  deleteStudioHistoryEntry,
  fetchRemoteStudioHistory,
  syncStudioHistoryEntry,
  deleteRemoteStudioHistoryEntry,
  type StudioHistoryEntry,
} from "@/lib/studio/history-store";
import {
  loadSavedCopilotChat,
  saveCopilotChat,
  clearCopilotChat,
} from "@/lib/studio/copilot-chat-store";
import {
  calculateResponseScore,
  evaluateQuizResponse,
} from "@/lib/quiz/scoring";
import type { ScoreResult } from "@/lib/quiz/scoring";
import { confidenceLevel } from "@/lib/wayground/flashcards";
import type { QuizDifficultyLevel } from "@/lib/quiz/options";

type StudioArtifactTab =
  | "summary"
  | "flashcards"
  | "quiz"
  | "slides"
  | "mindmap"
  | "report"
  | "table"
  | "infographic";

type InstantQuizRun = {
  id: string;
  title: string;
  source: string;
  questions: Question[];
  launch: "source" | "ai";
};

function questionKey(question: Question, index: number) {
  return question.id || String(index);
}

/**
 * NotebookLM-style progressive explanation: shown only after the learner
 * selects an option, without pre-revealing unselected answer keys.
 */
function ExplanationPanel({
  question,
  selectedLabel,
  isEn,
  showDistractorBreakdown = true,
  contextLabel,
  compact = false,
}: {
  question: Question;
  selectedLabel?: string;
  isEn: boolean;
  showDistractorBreakdown?: boolean;
  contextLabel: string;
  compact?: boolean;
}) {
  const selectedOption = selectedLabel
    ? question.options.find((option) => option.label === selectedLabel)
    : undefined;
  const isCorrect = selectedOption?.isCorrect === true;

  return (
    <div className="overflow-hidden rounded-2xl bg-background-primary-default">
      <div className="flex flex-wrap items-start justify-between gap-2 bg-background-secondary-default/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-700">
            <RiLightbulbLine className="size-4" />
          </span>
          <div className="space-y-0.5">
            <span className="block text-caption-2-medium tracking-wide text-text-tertiary">
              {isEn ? "Explain" : "Penjelasan"}
            </span>
            <p className="text-caption-1-semibold text-text-primary">
              {isEn ? "Concept explanation" : "Pembahasan konsep"}
            </p>
          </div>
        </div>
        {selectedOption && (
          <Chip variant="caption" color={isCorrect ? "lime" : "rose"}>
            {isCorrect
              ? isEn
                ? "You got it"
                : "Tepat"
              : isEn
                ? "Needs another look"
                : "Perlu ditinjau"}
          </Chip>
        )}
      </div>

      <div className={cx("space-y-4", compact ? "p-3.5" : "p-4")}>
        <p className="text-caption-1-regular leading-relaxed text-text-secondary">
          {question.explanation}
        </p>

        {selectedOption && (
          <div
            className={cx(
              "rounded-xl p-3",
              selectedOption.isCorrect
                ? "bg-emerald-500/10"
                : "bg-rose-500/10"
            )}
          >
            <span
              className={cx(
                "mb-1 flex items-center gap-1.5 text-caption-2-medium",
                selectedOption.isCorrect
                  ? "text-state-success-text"
                  : "text-text-error-primary"
              )}
            >
              {selectedOption.isCorrect ? (
                <RiCheckLine className="size-3.5" />
              ) : (
                <RiCloseLine className="size-3.5" />
              )}
              {selectedOption.isCorrect
                ? isEn
                  ? "Your choice is right"
                  : "Pilihan anda tepat"
                : isEn
                  ? "Where your choice slipped"
                  : "Titik yang perlu diluruskan"}
            </span>
            <p className="text-caption-1-medium text-text-primary">
              {selectedOption.label}. {selectedOption.text}
            </p>
            {showDistractorBreakdown && selectedOption.distractorRationale && (
              <p className="mt-1 text-caption-2-regular leading-relaxed text-text-secondary">
                {selectedOption.distractorRationale}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 pt-3 text-caption-2-regular text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <RiBookOpenLine className="size-3.5 shrink-0" />
            <span className="truncate">
              {isEn ? "Anchored to" : "Berakar pada"} {contextLabel}
            </span>
          </span>
          {question.culturalContext && (
            <span className="sm:max-w-xs sm:text-end">{question.culturalContext}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactExpansionBar({
  artifact,
  value,
  onChange,
  onSubmit,
  loading,
  isEn,
  placeholder,
  suggestions,
}: {
  artifact: StudioCraftableArtifact;
  value: string;
  onChange: (next: string) => void;
  onSubmit: (overrideQuestion?: string) => void;
  loading: boolean;
  isEn: boolean;
  placeholder: string;
  suggestions: string[];
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-background-secondary-default/40 p-4 max-w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RiCopilotFill className="size-4 shrink-0 text-accent-700" />
          <span className="text-caption-1-semibold text-text-primary break-words">
            {isEn
              ? "Expand this artifact with a question"
              : "Perluas artifak ini dengan pertanyaan"}
          </span>
        </div>
        <span className="text-caption-2-regular text-text-tertiary break-words">
          {isEn
            ? "Keep asking until the artifact covers everything you need"
            : "Tanyakan terus sampai bahasan artifak ini terasa cukup"}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-full">
          {suggestions.map((suggestion) => (
            <button
              key={`${artifact}-${suggestion}`}
              type="button"
              disabled={loading}
              onClick={() => {
                onChange(suggestion);
                onSubmit(suggestion);
              }}
              className="rounded-full bg-background-primary-default px-3 py-1 text-caption-2-regular text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center w-full min-w-0"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          placeholder={placeholder}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-border-button-default bg-background-primary-default px-3.5 py-2 text-body-medium text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-border-focus-ring disabled:opacity-60 shadow-xs"
        />
        <Button
          type="submit"
          variant="secondary"
          size="small"
          disabled={loading || value.trim().length < 2}
          className="min-h-[44px] shrink-0 justify-center"
        >
          <RiCopilotFill className={cx("size-3.5 shrink-0", loading && "animate-spin")} />
          <span className="truncate">
            {loading
              ? isEn
                ? "Expanding..."
                : "Memperluas..."
              : isEn
                ? "Expand artifact"
                : "Perluas artifak"}
          </span>
        </Button>
      </form>
    </div>
  );
}

/**
 * Wayground-style instant player, rebuilt on Exile's native UI and scored with
 * the reference 600 + speed + streak algorithm. It is a solo preview: no
 * invented participants or fake class data.
 */
function InstantQuizDialog({
  run,
  isEn,
  timeLimitMs,
  onClose,
  onLaunchLive,
}: {
  run: InstantQuizRun | null;
  isEn: boolean;
  timeLimitMs: number;
  onClose: () => void;
  onLaunchLive: () => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [awards, setAwards] = useState<Record<string, ScoreResult>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState<{
    runId: string;
    index: number;
    attempt: number;
    elapsed: number;
  }>({ runId: "", index: 0, attempt: 0, elapsed: 0 });
  const runId = run?.id;

  useEffect(() => {
    if (!runId || finished) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setClock({
        runId,
        index: questionIndex,
        attempt,
        elapsed: Math.min(timeLimitMs, Date.now() - startedAt),
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [runId, questionIndex, finished, timeLimitMs, attempt]);

  const conceptStats = useMemo(() => {
    if (!run) return [];
    const concepts = Array.from(
      new Set(run.questions.map((question) => question.conceptTag))
    );
    return concepts.map((concept) => {
      const matching = run.questions
        .map((question, index) => ({
          question,
          key: questionKey(question, index),
        }))
        .filter(({ question }) => question.conceptTag === concept);
      return {
        concept,
        total: matching.length,
        correct: matching.filter(({ question, key }) =>
          evaluateQuizResponse(question, answers[key])
        ).length,
      };
    });
  }, [run, answers]);

  if (!run || run.questions.length === 0) return null;

  const total = run.questions.length;
  const question = run.questions[questionIndex];
  const key = questionKey(question, questionIndex);
  const elapsedMs =
    clock.runId === run.id &&
    clock.index === questionIndex &&
    clock.attempt === attempt
      ? clock.elapsed
      : 0;
  const selectedLabel = answers[key];
  const expired = !selectedLabel && elapsedMs >= timeLimitMs;
  const revealed = Boolean(selectedLabel) || expired;
  const selectedIsCorrect = Boolean(
    selectedLabel && evaluateQuizResponse(question, selectedLabel)
  );
  const totalScore = Object.values(awards).reduce(
    (sum, award) => sum + award.total,
    0
  );
  const correctCount = run.questions.filter((item, index) =>
    evaluateQuizResponse(item, answers[questionKey(item, index)])
  ).length;
  const accuracy = Math.round((correctCount / total) * 100);
  const remainingSec = Math.max(0, Math.ceil((timeLimitMs - elapsedMs) / 1000));
  const questionProgress = finished
    ? 100
    : Math.round(((questionIndex + (revealed ? 1 : 0)) / total) * 100);
  const timerProgress = Math.max(
    0,
    Math.min(100, ((timeLimitMs - elapsedMs) / timeLimitMs) * 100)
  );

  const selectAnswer = (label: string) => {
    if (revealed) return;
    soundEffects.playClick();
    const correct = evaluateQuizResponse(question, label);
    const award = calculateResponseScore({
      isCorrect: correct,
      timeTakenMs: Math.min(elapsedMs, timeLimitMs),
      totalTimeMs: timeLimitMs,
      currentStreak: streak,
      streakBonusEnabled: true,
    });
    setAnswers((previous) => ({ ...previous, [key]: label }));
    setAwards((previous) => ({ ...previous, [key]: award }));
    setStreak(award.newStreak);
    if (correct) {
      setBestStreak((previous) => Math.max(previous, award.newStreak));
    }
  };

  const nextQuestion = () => {
    soundEffects.playClick();
    if (questionIndex + 1 >= total) {
      setFinished(true);
      return;
    }
    setQuestionIndex((value) => value + 1);
  };

  const restart = () => {
    soundEffects.playClick();
    setQuestionIndex(0);
    setAnswers({});
    setAwards({});
    setStreak(0);
    setBestStreak(0);
    setFinished(false);
    setAttempt((value) => value + 1);
  };

  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="xl"
      aria-label={isEn ? "Quick quiz" : "Kuis cepat"}
      className="gap-0 overflow-hidden p-0"
    >
      <div className="flex max-h-[88vh] flex-col bg-background-full">
        <div className="relative overflow-hidden bg-accent-700 px-5 pb-4 pt-5 text-text-white sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-text-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 right-24 size-36 rounded-full bg-text-white/5"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-caption-2-medium tracking-wide text-text-white/70">
                <RiCopilotFill className="size-4" />
                <span>{isEn ? "Quick practice" : "Latihan cepat"}</span>
                <span className="rounded-full bg-text-white/15 px-2 py-0.5 normal-case tracking-normal">
                  {isEn ? "Solo" : "Mandiri"}
                </span>
              </div>
              <h2 className="truncate text-title-3-semibold text-text-white">
                {run.title}
              </h2>
              <p className="flex min-w-0 items-center gap-1.5 text-caption-2-regular text-text-white/70">
                <RiBookOpenLine className="size-3.5 shrink-0" />
                <span className="truncate">
                  {isEn ? "Source" : "Sumber"}: {run.source}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-xl bg-text-white/10 px-3 py-1.5 text-end">
                <span className="block text-caption-2-medium tracking-wide text-text-white/60">
                  {isEn ? "Score" : "Skor"}
                </span>
                <span className="font-mono text-body-1-semibold tabular-nums text-text-white">
                  {totalScore.toLocaleString()}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiCloseLine}
                onClick={onClose}
                aria-label={isEn ? "Close quiz" : "Tutup kuis"}
                className="text-text-white hover:bg-text-white/10"
              />
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-white/20">
              <div
                className="h-full rounded-full bg-text-white transition-[width] duration-300"
                style={{ width: `${questionProgress}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-caption-2-medium tabular-nums text-text-white/80">
              {finished ? total : questionIndex + 1}/{total}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          {finished ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-700">
                  <RiTrophyLine className="size-8" />
                </span>
                <div className="space-y-1">
                  <span className="text-caption-2-medium tracking-wide text-text-tertiary">
                    {isEn ? "Round complete" : "Ronde selesai"}
                  </span>
                  <h3 className="text-title-1-semibold text-text-primary">
                    {accuracy >= 80
                      ? isEn
                        ? "Strong grasp"
                        : "Pemahaman kuat"
                      : accuracy >= 50
                        ? isEn
                          ? "Good foundation"
                          : "Dasar yang baik"
                        : isEn
                          ? "Worth another pass"
                          : "Layak diulang"}
                  </h3>
                  <p className="text-body-2-regular text-text-secondary">
                    {isEn
                      ? `${correctCount} of ${total} correct. Review the reasoning, then run it back.`
                      : `${correctCount} dari ${total} benar. Tinjau alasannya, lalu ulangi.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    label: isEn ? "Accuracy" : "Akurasi",
                    value: `${accuracy}%`,
                  },
                  {
                    label: isEn ? "Points" : "Poin",
                    value: totalScore.toLocaleString(),
                  },
                  {
                    label: isEn ? "Best streak" : "Streak terbaik",
                    value: String(bestStreak),
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-background-secondary-default/50 p-3 text-center"
                  >
                    <span className="block text-caption-2-regular text-text-tertiary">
                      {stat.label}
                    </span>
                    <span className="mt-0.5 block font-mono text-title-3-semibold tabular-nums text-text-primary">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-caption-1-semibold text-text-primary">
                    {isEn ? "Concept check" : "Pemeriksaan konsep"}
                  </h4>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {isEn ? "Source-grounded" : "Berbasis sumber"}
                  </span>
                </div>
                {conceptStats.map((stat) => (
                  <div key={stat.concept} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-caption-2-regular">
                      <span className="truncate text-text-secondary">
                        {stat.concept}
                      </span>
                      <span className="shrink-0 font-mono text-text-tertiary">
                        {stat.correct}/{stat.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
                      <div
                        className={cx(
                          "h-full rounded-full",
                          stat.correct === stat.total
                            ? "bg-accent-600"
                            : "bg-chart-3"
                        )}
                        style={{
                          width: `${Math.round((stat.correct / stat.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  leadingIcon={RiRestartLine}
                  onClick={restart}
                >
                  {isEn ? "Play again" : "Main lagi"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  leadingIcon={RiPlayCircleLine}
                  onClick={() => {
                    onClose();
                    onLaunchLive();
                  }}
                >
                  {isEn ? "Quiz room" : "Ruang kuis"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-caption-2-medium text-text-tertiary">
                    {isEn ? "Question" : "Soal"} {questionIndex + 1}
                  </span>
                  <Chip variant="caption" color="gray">
                    {question.conceptTag}
                  </Chip>
                </div>
                <div
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-caption-2-medium tabular-nums",
                    remainingSec <= 5 && !revealed
                      ? " bg-background-secondary-default text-text-error-primary"
                      : "bg-background-secondary-default text-text-secondary"
                  )}
                >
                  <RiTimerLine className="size-3.5" />
                  {revealed ? (isEn ? "Locked" : "Terkunci") : `${remainingSec}s`}
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
                <div
                  className={cx(
                    "h-full rounded-full transition-[width] duration-100",
                    remainingSec <= 5 ? "bg-chart-3" : "bg-accent-600"
                  )}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>

              <h3 className="text-title-2-semibold leading-snug text-text-primary">
                {question.question}
              </h3>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {question.options.map((option) => {
                  const isSelected = selectedLabel === option.label;
                  const isSelectedCorrect =
                    isSelected && evaluateQuizResponse(question, option.label);
                  const isWrongSelection = isSelected && !isSelectedCorrect;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => selectAnswer(option.label)}
                      disabled={revealed}
                      className={cx(
                        "group flex min-h-24 w-full items-start gap-3 rounded-2xl p-3.5 text-start transition-all cursor-pointer disabled:cursor-default motion-safe:active:scale-[0.99]",
                        isSelectedCorrect
                          ? "bg-emerald-500/15"
                          : isWrongSelection
                            ? "bg-rose-500/10"
                            : revealed
                              ? "bg-background-primary-default opacity-60"
                              : "bg-background-secondary-default/50 hover:-translate-y-0.5 hover:bg-background-secondary-default"
                      )}
                    >
                      <span
                        className={cx(
                          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-body-2-semibold",
                          isSelectedCorrect
                            ? "bg-emerald-600 text-white"
                            : isWrongSelection
                              ? "bg-rose-600 text-white"
                              : "bg-background-primary-default text-text-secondary"
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="text-caption-1-medium leading-snug text-text-primary">
                          {option.text}
                        </span>
                      </span>
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                        {isSelectedCorrect ? (
                          <RiCheckLine className="size-4 text-state-success-text" />
                        ) : isWrongSelection ? (
                          <RiCloseLine className="size-4 text-text-error-primary" />
                        ) : (
                          <span className="size-2 rounded-full bg-background-tertiary-default transition-colors group-hover:bg-background-tertiary-hover" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-caption-1-medium">
                    <span
                      className={cx(
                        "inline-flex items-center gap-1.5",
                        selectedIsCorrect
                          ? "text-state-success-text"
                          : "text-text-error-primary"
                      )}
                    >
                      {selectedIsCorrect ? (
                        <RiCheckLine className="size-4" />
                      ) : (
                        <RiCloseLine className="size-4" />
                      )}
                      {selectedLabel
                        ? selectedIsCorrect
                          ? isEn
                            ? "Correct"
                            : "Tepat"
                          : isEn
                            ? "Not quite"
                            : "Belum tepat"
                        : isEn
                          ? "Time's up"
                          : "Waktu habis"}
                    </span>
                    {selectedLabel && awards[key] && (
                      <span className="font-mono text-caption-2-medium text-text-tertiary">
                        +{awards[key].total} {isEn ? "pts" : "poin"}
                      </span>
                    )}
                  </div>
                  <ExplanationPanel
                    question={question}
                    selectedLabel={selectedLabel}
                    isEn={isEn}
                    showDistractorBreakdown={false}
                    contextLabel={run.source}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {!finished && (
          <div className="flex shrink-0 items-center justify-between gap-3 bg-background-full px-5 py-4 sm:px-7">
            <span className="hidden text-caption-2-regular text-text-tertiary sm:block">
              {revealed
                ? isEn
                  ? "The explanation stays grounded in your source."
                  : "Penjelasan tetap berakar pada sumber Anda."
                : isEn
                  ? "Choose an answer before the timer runs out."
                  : "Pilih jawaban sebelum waktu habis."}
            </span>
            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={nextQuestion}
              disabled={!revealed}
              trailingIcon={RiArrowRightLine}
              className="ms-auto shrink-0"
            >
              {questionIndex + 1 >= total
                ? isEn
                  ? "See results"
                  : "Lihat hasil"
                : isEn
                  ? "Next question"
                  : "Soal berikutnya"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useExileSettings();
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const copilotImageInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const docTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [docText, setDocText] = useState<string>("");
  const [docTitle, setDocTitle] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [reasoningElapsedSec, setReasoningElapsedSec] = useState<number>(0);
  const [processedDoc, setProcessedDoc] = useState<
    (DocumentAnalysis & { quizId?: string }) | null
  >(null);

  const [activeTab, setActiveTab] = useState<StudioArtifactTab>("flashcards");
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    StudioCraftableArtifact[]
  >(["flashcards"]);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState<boolean>(false);
  const [isQuickQuizOpen, setIsQuickQuizOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Mobile Homework Scanner states
  const [isPreScanModalOpen, setIsPreScanModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<PreScanMode>("direct_answer");
  const [isDirectAnswerCardOpen, setIsDirectAnswerCardOpen] = useState<boolean>(false);
  const [directAnswers, setDirectAnswers] = useState<DirectAnswerItem[]>([]);
  const [scanTranscription, setScanTranscription] = useState<string>("");
  const [isScanProcessing, setIsScanProcessing] = useState<boolean>(false);
  const copilotScrollFade = useScrollFade();

  useEffect(() => {
    if (!isCopilotDrawerOpen && !isMobileSourcesOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCopilotDrawerOpen(false);
        setIsMobileSourcesOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCopilotDrawerOpen, isMobileSourcesOpen]);

  const toggleArtifactSelection = (artifact: StudioCraftableArtifact) => {
    soundEffects.playClick();
    setSelectedArtifacts((prev) => {
      if (prev.includes(artifact)) {
        return prev.filter((item) => item !== artifact);
      }
      return [...prev, artifact];
    });
  };

  const [quizDifficulty, setQuizDifficulty] = useState<number>(2);
  const [testedAnswers, setTestedAnswers] = useState<Record<string, string>>({});
  const [showDistractorRationale, setShowDistractorRationale] = useState<boolean>(true);
  const [expandedQuestionExplanations, setExpandedQuestionExplanations] = useState<Record<string, boolean>>({});

  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardTilt, setCardTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cardGlare, setCardGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const reducedMotion = useReducedMotion();

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = -((y - centerY) / centerY) * 10;
    const tiltY = ((x - centerX) / centerX) * 10;
    setCardTilt({ x: tiltX, y: tiltY });
    setCardGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.28,
    });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ x: 0, y: 0 });
    setCardGlare((prev) => ({ ...prev, opacity: 0 }));
  };
  const [showFlashcardHint, setShowFlashcardHint] = useState<boolean>(false);
  const [masteredCards, setMasteredCards] = useState<number[]>([]);
  const [cardViewMode, setCardViewMode] = useState<"deck" | "grid">("deck");
  const [cardTagFilter, setCardTagFilter] = useState<string>("all");
  const [cardFocusInput, setCardFocusInput] = useState<string>("");
  const [generatingMoreCards, setGeneratingMoreCards] = useState<boolean>(false);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [selectedMindMapNode, setSelectedMindMapNode] = useState<MindMapNode | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>("");
  const [artifactExpandInput, setArtifactExpandInput] = useState<Record<string, string>>({});
  const [expandingArtifact, setExpandingArtifact] = useState<StudioCraftableArtifact | null>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"text" | "pdf" | "image">("text");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");

  const [launchingRoom, setLaunchingRoom] = useState<boolean>(false);

  const [aiQuizTopic, setAiQuizTopic] = useState("");
  const [aiQuizCount, setAiQuizCount] = useState(5);
  const [aiQuizDifficulty, setAiQuizDifficulty] = useState<QuizDifficultyLevel>("sedang");
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [aiQuiz, setAiQuiz] = useState<{
    quizId: string;
    quiz: Quiz;
  } | null>(null);
  const [expandedAiQuestionIndex, setExpandedAiQuestionIndex] = useState<number | null>(null);
  const [aiQuizAnswers, setAiQuizAnswers] = useState<Record<number, string>>({});
  const [instantQuiz, setInstantQuiz] = useState<InstantQuizRun | null>(null);

  const [currentNotebookId, setCurrentNotebookId] = useState<string>("nb-session");
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>(() =>
    loadStudioHistory()
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    fetchRemoteStudioHistory()
      .then((merged) => {
        if (!isCancelled) {
          setHistoryEntries(merged);
        }
      })
      .catch((err) => {
        console.warn("Failed to load remote studio history on auth:", err);
      });
    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const hasMeaningfulContent =
      Boolean(processedDoc) ||
      Boolean(aiQuiz) ||
      Boolean(uploadedFileName && docText.trim().length > 20);
    if (!hasMeaningfulContent) return;

    const title =
      docTitle ||
      processedDoc?.title ||
      aiQuiz?.quiz.title ||
      uploadedFileName ||
      docText.trim().split(/\r?\n/)[0]?.slice(0, 60) ||
      "Notebook materi";

    const entry: StudioHistoryEntry = {
      id: currentNotebookId,
      title,
      fileName: uploadedFileName || "materi-ajar.txt",
      fileType: uploadedFileType,
      docText,
      processedDoc,
      aiQuiz,
      selectedArtifacts,
      activeTab,
      testedAnswers,
      masteredCards,
      updatedAt: new Date().toISOString(),
    };

    saveStudioHistoryEntry(entry);

    if (!user) return;

    const timer = setTimeout(() => {
      syncStudioHistoryEntry(entry)
        .then((synced) => {
          setHistoryEntries(synced);
        })
        .catch((err) => {
          console.warn("Failed to sync studio history to server:", err);
        });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    user,
    currentNotebookId,
    processedDoc,
    aiQuiz,
    uploadedFileName,
    uploadedFileType,
    docText,
    selectedArtifacts,
    activeTab,
    testedAnswers,
    masteredCards,
    docTitle,
  ]);

  const handleLoadHistoryEntry = (entry: StudioHistoryEntry) => {
    soundEffects.playClick();
    setCurrentNotebookId(entry.id);
    setUploadedFileName(entry.fileName || "");
    setUploadedFileType(entry.fileType || "text");
    setUploadedFileBase64("");
    setDocText(entry.docText || "");
    setProcessedDoc(entry.processedDoc || null);
    setAiQuiz(entry.aiQuiz || null);
    setSelectedArtifacts(
      entry.selectedArtifacts?.length ? entry.selectedArtifacts : ["flashcards"]
    );
    setActiveTab((entry.activeTab as StudioArtifactTab) || "flashcards");
    setTestedAnswers(entry.testedAnswers || {});
    setMasteredCards(entry.masteredCards || []);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsHistoryOpen(false);
    toast.success(
      isEn ? `Loaded "${entry.title}"` : `Memuat "${entry.title}" dari riwayat.`
    );
  };

  const handleDeleteHistoryEntry = (id: string) => {
    soundEffects.playClick();
    const updated = deleteStudioHistoryEntry(id);
    setHistoryEntries(updated);
    if (user) {
      deleteRemoteStudioHistoryEntry(id)
        .then((latest) => {
          setHistoryEntries(latest);
        })
        .catch((err) => {
          console.warn("Failed to delete remote studio history entry:", err);
        });
    }
    toast.success(isEn ? "Removed from history." : "Dihapus dari riwayat.");
  };

  const handleNewNotebook = () => {
    soundEffects.playClick();
    setCurrentNotebookId(`nb-${Date.now()}`);
    setUploadedFileName("");
    setUploadedFileBase64("");
    setUploadedFileType("text");
    setDocText("");
    setProcessedDoc(null);
    setAiQuiz(null);
    setTestedAnswers({});
    setExpandedQuestionExplanations({});
    setMasteredCards([]);
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsHistoryOpen(false);
  };

  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      imagePreview?: string;
      actionCard?: {
        type: "create_artifact";
        artifactType: StudioCraftableArtifact;
        label: string;
        topic?: string;
        count?: number;
        difficulty?: string;
        executed?: boolean;
      };
    }>
  >([
    {
      role: "assistant",
      content: isEn
        ? "Ask me anything about your material or Exile. I can read uploaded files, fix typos directly in your text, or explain how any feature works."
        : "Tanyakan apa saja soal materi Anda atau cara pakai Exile. Saya bisa membaca berkas yang diunggah, memperbaiki salah ketik langsung di teks materi, atau menjelaskan konsep tertentu.",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [copilotAttachedImage, setCopilotAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const hasLoadedCopilotChatRef = useRef(false);

  useEffect(() => {
    const saved = loadSavedCopilotChat<typeof chatMessages[number]>();
    if (saved && saved.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved chat from localStorage after mount
      setChatMessages(saved);
    }
    hasLoadedCopilotChatRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedCopilotChatRef.current) return;
    saveCopilotChat(chatMessages);
  }, [chatMessages]);

  const handleClearCopilotChat = () => {
    soundEffects.playClick();
    clearCopilotChat();
    setChatMessages([
      {
        role: "assistant",
        content: isEn
          ? "Ask me anything about your material or Exile. I can read uploaded files, fix typos directly in your text, or explain how any feature works."
          : "Tanyakan apa saja soal materi Anda atau cara pakai Exile. Saya bisa membaca berkas yang diunggah, memperbaiki salah ketik langsung di teks materi, atau menjelaskan konsep tertentu.",
      },
    ]);
    toast.success(isEn ? "Chat cleared" : "Obrolan dibersihkan");
  };

  const teacherName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      settings.defaultNickname ||
      "Pengajar Exile"
    );
  }, [user, settings.defaultNickname]);

  const displayedQuestions: Question[] = useMemo(() => {
    if (!processedDoc) return [];
    if (quizDifficulty === 1) {
      return (
        processedDoc.difficultyQuizzes?.easy ||
        processedDoc.quiz
      );
    }
    if (quizDifficulty === 3) {
      return (
        processedDoc.difficultyQuizzes?.hard ||
        processedDoc.quiz
      );
    }
    return (
      processedDoc.difficultyQuizzes?.medium ||
      processedDoc.quiz
    );
  }, [processedDoc, quizDifficulty]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playClick();
    setUploadedFileName(file.name);
    const mime = file.type || "text/plain";
    setUploadedMimeType(mime);

    const lowerName = file.name.toLowerCase();

    // 1. Standard text files: read directly in client via readAsText
    const isStandardText =
      /\.(txt|md|csv|tsv|json|yaml|yml)$/i.test(lowerName) ||
      (mime.startsWith("text/") &&
        !/\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|epub|rtf|jpe?g|png|webp|bmp|gif|heic|heif|jfif|tiff?)$/i.test(
          lowerName
        ));

    if (isStandardText) {
      setUploadedFileType("text");
      setUploadedFileBase64("");
      const reader = new FileReader();
      reader.onload = (event) => {
        const content =
          typeof event.target?.result === "string" ? event.target.result : "";
        setDocText(content);
        toast.success(
          isEn
            ? `Text file "${file.name}" loaded successfully.`
            : `Berkas teks "${file.name}" berhasil dimuat.`
        );
      };
      reader.readAsText(file);
      return;
    }

    // 2. Office / rich docs: .pptx, .xlsx, .odt, .ods, .odp, .epub, .rtf, .doc, .docx
    // Handled via server extractText with detectedType: "text" (so they don't get routed to image vision)
    const isOfficeDoc =
      /\.(pptx|xlsx|odt|ods|odp|epub|rtf|docx?|ppt|xls)$/i.test(lowerName);

    if (isOfficeDoc) {
      setUploadedFileType("text");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl =
          typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);
        await transcribeUploadedFile(dataUrl, file.name, "text", mime);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. PDF documents
    const isPdf = mime === "application/pdf" || lowerName.endsWith(".pdf");
    if (isPdf) {
      setUploadedFileType("pdf");
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl =
          typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);
        await transcribeUploadedFile(dataUrl, file.name, "pdf", mime);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 4. Images: .jpg, .jpeg, .png, .webp, .bmp, .gif, .heic, .heif or mime.startsWith("image/")
    const isImage =
      /\.(jpe?g|png|webp|bmp|gif|heic|heif|jfif|tiff?)$/i.test(lowerName) ||
      mime.startsWith("image/");

    const detectedType: "image" | "text" = isImage ? "image" : "text";
    setUploadedFileType(detectedType);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl =
        typeof event.target?.result === "string" ? event.target.result : "";
      setUploadedFileBase64(dataUrl);
      await transcribeUploadedFile(dataUrl, file.name, detectedType, mime);
    };
    reader.readAsDataURL(file);
  };

  const transcribeUploadedFile = async (
    base64Data: string,
    fileName: string,
    fileType: "pdf" | "image" | "text",
    mimeType: string
  ) => {
    setIsTranscribing(true);
    const statusMsg =
      fileType === "text"
        ? isEn
          ? `Extracting text from "${fileName}"...`
          : `Mengekstrak teks dari "${fileName}"...`
        : isEn
        ? `Analyzing & transcribing "${fileName}" directly via AI Multimodal...`
        : `Menganalisis & mentranskripsi "${fileName}" langsung via AI Multimodal...`;
    setTranscriptionStatus(statusMsg);

    const toastId = toast.loading(
      fileType === "text"
        ? isEn
          ? `Extracting text from "${fileName}"...`
          : `Mengekstrak teks dari "${fileName}"...`
        : isEn
        ? `Transcribing "${fileName}" via AI Multimodal Vision...`
        : `Mentranskripsi "${fileName}" langsung via AI Multimodal Vision...`
    );

    try {
      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transcribe",
          fileName,
          fileType,
          fileBase64: base64Data,
          mimeType,
          text: docText.startsWith("Lampiran berkas:") ? "" : docText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mentranskripsi dokumen visual.");
      }

      if (data.transcription && data.transcription.trim().length > 0) {
        setDocText(data.transcription.trim());
        toast.success(
          fileType === "text"
            ? isEn
              ? `Document "${fileName}" text extracted successfully (${data.transcription.length} chars).`
              : `Teks dokumen "${fileName}" berhasil diekstrak (${data.transcription.length} karakter).`
            : isEn
            ? `Direct AI multimodal transcription complete (${data.transcription.length} chars).`
            : `Transkripsi visual AI multimodal selesai (${data.transcription.length} karakter).`,
          { id: toastId }
        );
      } else {
        if (!docText.trim()) {
          setDocText(`Lampiran berkas: ${fileName}`);
        }
        toast.dismiss(toastId);
        toast.success(`Berkas "${fileName}" siap diolah.`);
      }
    } catch (err: unknown) {
      console.warn("Direct multimodal transcription error:", err);
      if (!docText.trim()) {
        setDocText(`Lampiran berkas: ${fileName}`);
      }
      toast.dismiss(toastId);
      toast.info(
        isEn
          ? `File "${fileName}" attached. Multimodal AI will ingest on create.`
          : `Berkas "${fileName}" terlampir. AI Multimodal akan memproses saat dibuat.`
      );
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus("");
    }
  };

  const handleCopilotImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
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

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}s`;
  };

  const handleProcessDocument = async (overrideText?: string) => {
    if (selectedArtifacts.length === 0) {
      toast.error(
        isEn
          ? "Please select at least one artifact to craft."
          : "Pilih minimal satu artifak untuk dibuat."
      );
      return;
    }
    const textToProcess = typeof overrideText === "string" ? overrideText : docText;
    if (!textToProcess.trim() && !uploadedFileBase64) {
      toast.error(
        isEn
          ? "Please enter lesson text or upload a document first."
          : "Silakan masukkan teks materi atau unggah berkas terlebih dahulu."
      );
      docTextareaRef.current?.focus();
      return;
    }

    setIsMobileSourcesOpen(false);
    setProcessing(true);
    setReasoningElapsedSec(0);
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setReasoningElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    soundEffects.playClick();

    try {

      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          extractedText: textToProcess,
          text: textToProcess,
          fileName: uploadedFileName || (isEn ? "Scanned homework" : "Lembar tugas terpindai"),
          fileType: uploadedFileType || "text",
          fileBase64: uploadedFileBase64 || undefined,
          mimeType: uploadedMimeType || "text/plain",
          artifacts: selectedArtifacts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses dokumen");

      const docPayload: DocumentAnalysis & { quizId?: string } =
        data.document || data.analysis;

      if (!docPayload) {
        throw new Error("Format hasil analisis dokumen tidak valid.");
      }

      if (data.transcription && (!textToProcess.trim() || textToProcess.startsWith("Lampiran berkas:"))) {
        setDocText(data.transcription);
      }

      setProcessedDoc((prev) => {
        if (!prev) return docPayload;
        return {
          ...prev,
          title: docPayload.title || prev.title,
          subjectArea: docPayload.subjectArea || prev.subjectArea,
          gradeLevel: docPayload.gradeLevel || prev.gradeLevel,
          transcription: docPayload.transcription || prev.transcription,
          quizId: docPayload.quizId || prev.quizId,
          flashcards:
            selectedArtifacts.includes("flashcards") && docPayload.flashcards?.length
              ? docPayload.flashcards
              : prev.flashcards,
          quiz:
            selectedArtifacts.includes("quiz") && docPayload.quiz?.length
              ? docPayload.quiz
              : prev.quiz,
          summary:
            selectedArtifacts.includes("summary") && docPayload.summary?.overview
              ? docPayload.summary
              : prev.summary,
          mindMap:
            selectedArtifacts.includes("mindmap") && docPayload.mindMap
              ? docPayload.mindMap
              : prev.mindMap,
          infographic:
            selectedArtifacts.includes("infographic") && docPayload.infographic
              ? docPayload.infographic
              : prev.infographic,
          dataTable:
            selectedArtifacts.includes("table") && docPayload.dataTable
              ? docPayload.dataTable
              : prev.dataTable,
          report:
            selectedArtifacts.includes("report") && docPayload.report
              ? docPayload.report
              : prev.report,
        };
      });

      const nextActiveTab: StudioArtifactTab = selectedArtifacts[0] || "flashcards";
      setActiveTab(nextActiveTab);
      if (selectedArtifacts.includes("flashcards")) {
        setFlashcardIndex(0);
        setCardTagFilter("all");
        setMasteredCards([]);
        setIsFlipped(false);
      }
      if (selectedArtifacts.includes("quiz")) {
        setTestedAnswers({});
        setExpandedQuestionExplanations({});
      }
      if (selectedArtifacts.includes("mindmap")) {
        setCollapsedBranches({});
        setSelectedMindMapNode(null);
      }
      setActiveSlideIndex(0);
      void triggerConfetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      toast.success(
        isEn
          ? "Selected artifacts are ready."
          : "Artifak pilihan berhasil dibuat."
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menganalisis dokumen";
      toast.error(msg);
    } finally {
      clearInterval(timerInterval);
      setProcessing(false);
    }
  };

  const handleSelectScanMode = (mode: PreScanMode) => {
    setScannerMode(mode);
    setIsPreScanModalOpen(false);
    setIsScannerOpen(true);
  };

  const handleScannerComplete = async (data: {
    mode: PreScanMode;
    pages: ScannedPageItem[];
    combinedSnippet: string;
  }) => {
    const { mode, pages } = data;
    setIsScannerOpen(false);
    if (typeof (soundEffects as { playScanComplete?: () => void }).playScanComplete === "function") {
      (soundEffects as { playScanComplete?: () => void }).playScanComplete?.();
    } else {
      soundEffects.playClick();
    }
    setIsScanProcessing(true);

    try {
      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanMode: mode,
          action: mode === "learning" ? "transcribe" : undefined,
          images: pages.map((p) => ({
            base64: p.base64,
            mimeType: p.mimeType,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ||
            (isEn ? "Failed to process scan" : "Gagal memproses pindaian")
        );
      }

      if (mode === "direct_answer") {
        const answers: DirectAnswerItem[] = json.directAnswers || [];
        const transcription: string = json.transcription || "";
        setDirectAnswers(answers);
        setScanTranscription(transcription);
        setIsDirectAnswerCardOpen(false);

        const userPrompt = isEn
          ? "Please check and provide direct answers for this scanned homework sheet."
          : "Tolong periksa dan berikan jawaban langsung untuk lembar tugas terpindai ini.";

        const lines: string[] = [];
        if (answers.length > 0) {
          lines.push(
            isEn
              ? "Here are the direct answers and key explanations for your scanned assignment:"
              : "Berikut adalah jawaban langsung dan penjelasan kunci untuk lembar tugas terpindai Anda:"
          );
          lines.push("");
          answers.forEach((item) => {
            lines.push(
              isEn ? `### Question ${item.number}` : `### Soal ${item.number}`
            );
            if (item.questionSnippet?.trim()) {
              lines.push(`> ${item.questionSnippet.trim()}`);
              lines.push("");
            }
            lines.push(`**${isEn ? "Answer" : "Jawaban"}:** ${item.answer.trim()}`);
            if (item.keyExplanation?.trim()) {
              lines.push(
                `**${isEn ? "Explanation" : "Penjelasan"}:** ${item.keyExplanation.trim()}`
              );
            }
            lines.push("");
          });

          if (transcription?.trim()) {
            lines.push("---");
            lines.push(
              isEn ? "**Scanned transcription:**" : "**Transkripsi hasil pindai:**"
            );
            lines.push(transcription.trim());
          }
        } else {
          lines.push(
            transcription?.trim() ||
              (isEn
                ? "No questions or answers could be detected from the scanned sheet."
                : "Tidak ada soal atau jawaban yang berhasil dideteksi dari lembar pindaian.")
          );
        }

        const assistantReply = lines.join("\n").trim();

        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: userPrompt },
          { role: "assistant", content: assistantReply },
        ]);

        setIsCopilotDrawerOpen(true);

        toast.success(
          isEn
            ? "Answer keys scanned successfully"
            : "Kunci jawaban berhasil dipindai"
        );
      } else if (mode === "learning") {
        const transcription: string = json.transcription || "";
        const title = isEn ? "Scanned homework" : "Lembar tugas terpindai";
        setDocText(transcription);
        setDocTitle(title);
        setUploadedFileName(title);
        toast.success(
          isEn
            ? "Homework sheet transcribed successfully"
            : "Lembar tugas berhasil ditranskripsikan"
        );
        void handleProcessDocument(transcription);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
            ? "Failed to process scan"
            : "Gagal memproses pindaian";
      toast.error(msg);
    } finally {
      setIsScanProcessing(false);
    }
  };

  const handleAskCopilotFromDirectAnswers = (promptText: string) => {
    setIsDirectAnswerCardOpen(false);
    setIsCopilotDrawerOpen(true);
    setChatInput(promptText);
  };

  const handleLaunchRoom = async () => {
    setLaunchingRoom(true);
    soundEffects.playClick();
    try {
      const questionsToUse =
        displayedQuestions.length > 0 ? displayedQuestions : undefined;

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (!res.ok || !data.success || !data.hostToken) {
        throw new Error(data.error || "Gagal membuka ruang kelas");
      }

      saveHostToken(data.roomCode, data.hostToken);

      if (displayedQuestions.length === 0 && docText.trim().length > 0) {
        try {
          await fetch(`/api/rooms/${data.roomCode}/quiz`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-host-token": data.hostToken,
            },
            body: JSON.stringify({
              text: docText,
              questionCount: 5,
              difficulty: settings.defaultQuestionTimeSec <= 15 ? 3 : 2,
            }),
          });
        } catch (quizErr) {
          console.error("Auto quiz generation failed:", quizErr);
        }
      }

      void triggerConfetti({ particleCount: 60, spread: 70 });
      toast.success(`Ruang kuis aktif! Pin: ${data.roomCode}`);
      router.push(`/buat-ruang-kuis/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal meluncurkan ruangan kuis";
      toast.error(msg);
    } finally {
      setLaunchingRoom(false);
    }
  };

  const handleGenerateAiQuiz = async () => {
    const rawTopic = aiQuizTopic.trim();
    const fallbackTopicFromDoc =
      processedDoc?.title ||
      uploadedFileName ||
      docText
        .trim()
        .split(/\r?\n/)[0]
        ?.slice(0, 80) ||
      "";
    const topic = rawTopic.length >= 2 ? rawTopic : fallbackTopicFromDoc.trim();

    if (topic.length < 2) {
      toast.error(
        isEn
          ? "Enter a topic or paste material first."
          : "Masukkan topik atau isi materi terlebih dahulu."
      );
      return;
    }

    setAiQuizLoading(true);
    soundEffects.playClick();
    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          grade: "Fase D (SMP Kelas 7-9)",
          contextText: docText.trim().length > 20 ? docText.trim() : undefined,
          questionCount: aiQuizCount,
          difficulty: aiQuizDifficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.quiz) {
        throw new Error(data.error || "Gagal membuat kuis cepat");
      }

      setAiQuiz({ quizId: data.quizId, quiz: data.quiz });
      setExpandedAiQuestionIndex(null);
      setAiQuizAnswers({});
      setInstantQuiz({
        id: `ai-${data.quizId}-${Date.now()}`,
        title: data.quiz.title,
        source: topic,
        questions: data.quiz.questions,
        launch: "ai",
      });
      setIsQuickQuizOpen(false);
      void triggerConfetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
      toast.success(
        isEn
          ? `Quick quiz ready: ${data.quiz.questions.length} questions.`
          : `Kuis cepat siap: ${data.quiz.questions.length} soal.`
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not generate the quick quiz."
            : "Gagal membuat kuis cepat."
      );
    } finally {
      setAiQuizLoading(false);
    }
  };

  const handleLaunchAiQuiz = async () => {
    if (!aiQuiz) return;
    setLaunchingRoom(true);
    soundEffects.playClick();

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: aiQuiz.quizId,
          hostName: teacherName,
          questions: aiQuiz.quiz.questions,
          settings: {
            timePerQuestionSec: settings.defaultQuestionTimeSec,
            streakBonus: settings.streakBonusEnabled,
            shuffleQuestions: settings.shuffleQuestions,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.hostToken) {
        throw new Error(data.error || "Gagal membuka ruang kuis AI");
      }

      saveHostToken(data.roomCode, data.hostToken);
      void triggerConfetti({ particleCount: 60, spread: 70 });
      toast.success(`Ruang kuis AI aktif! Pin: ${data.roomCode}`);
      router.push(`/buat-ruang-kuis/${data.roomCode}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not launch the AI quiz room."
            : "Gagal meluncurkan ruang kuis AI."
      );
    } finally {
      setLaunchingRoom(false);
    }
  };

  const openAiInstantQuiz = () => {
    if (!aiQuiz || aiQuiz.quiz.questions.length === 0) return;
    soundEffects.playClick();
    setInstantQuiz({
      id: `ai-${aiQuiz.quizId}-${Date.now()}`,
      title: aiQuiz.quiz.title,
      source: aiQuizTopic.trim(),
      questions: aiQuiz.quiz.questions,
      launch: "ai",
    });
    setIsQuickQuizOpen(false);
  };

  const openSourceInstantQuiz = () => {
    if (displayedQuestions.length === 0) {
      toast.error(
        isEn
          ? "Generate a quiz from a source first."
          : "Buat kuis dari sumber terlebih dahulu."
      );
      return;
    }
    soundEffects.playClick();
    setInstantQuiz({
      id: `source-${processedDoc?.title ?? "quiz"}-${quizDifficulty}-${Date.now()}`,
      title: processedDoc?.title || (isEn ? "Source quiz" : "Kuis sumber"),
      source:
        uploadedFileName || (isEn ? "your lesson text" : "teks materi Anda"),
      questions: displayedQuestions,
      launch: "source",
    });
    setIsQuickQuizOpen(false);
  };

  const handleSendChatMessage = async (e?: FormEvent) => {
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

      const edited = Array.isArray(data.changedDocuments) ? data.changedDocuments[0] : null;
      if (edited?.text) {
        setDocText(edited.text);
        toast.success(isEn ? "Material updated." : "Materi diperbarui.");
      }

      if (Array.isArray(data.studioActions) && data.studioActions.length > 0) {
        for (const action of data.studioActions) {
          if (action.type === "create_artifact" && action.artifactType) {
            const artType = action.artifactType as StudioCraftableArtifact;
            setActiveTab(artType);
            setSelectedArtifacts((prev) =>
              prev.includes(artType) ? prev : [...prev, artType]
            );

            const artifactLabel = t.studio.tabs[artType] || artType;

            if (artType === "quiz") {
              const topic =
                action.topic?.trim() ||
                docText.trim().split(/\r?\n/)[0]?.slice(0, 80) ||
                "Kuis";
              const count = action.count || (action.questions ? action.questions.length : 5);
              const diffStr =
                action.difficulty === "Sulit"
                  ? "sulit"
                  : action.difficulty === "Mudah"
                    ? "mudah"
                    : "sedang";

              if (Array.isArray(action.questions) && action.questions.length > 0) {
                setProcessedDoc((prev) => {
                  const base: DocumentAnalysis & { quizId?: string } = prev || {
                    title: topic,
                    gradeLevel: "Fase D (SMP)",
                    subjectArea: "Materi ajar",
                    flashcards: [],
                    quiz: [],
                    summary: {
                      overview: "",
                      keyTakeaways: [],
                      culturalGlossary: [],
                      expansions: [],
                    },
                  };
                  return {
                    ...base,
                    title: topic || base.title,
                    quiz: action.questions!,
                    quizId: base.quizId || `quiz-${Date.now()}`,
                  };
                });
                setTestedAnswers({});
                setExpandedQuestionExplanations({});
                void triggerConfetti({ particleCount: 40, spread: 60 });
                toast.success(
                  isEn
                    ? `Quiz created: ${action.questions.length} questions.`
                    : `Kuis berhasil dibuat: ${action.questions.length} butir.`
                );
              } else {
                try {
                  const contextParts = [
                    docText.trim(),
                    action.focusAspect ? `Aspek fokus pembelajaran: ${action.focusAspect}` : "",
                  ].filter(Boolean);
                  const combinedContext = contextParts.join("\n\n");

                  const quizRes = await fetch("/api/ai/generate-quiz", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      topic,
                      contextText: combinedContext.length > 10 ? combinedContext : undefined,
                      questionCount: count,
                      difficulty: diffStr,
                    }),
                  });
                  const quizData = await quizRes.json();
                  if (quizRes.ok && quizData.success && quizData.quiz) {
                    setProcessedDoc((prev) => {
                      const base: DocumentAnalysis & { quizId?: string } = prev || {
                        title: topic,
                        gradeLevel: "Fase D (SMP)",
                        subjectArea: "Materi ajar",
                        flashcards: [],
                        quiz: [],
                        summary: {
                          overview: "",
                          keyTakeaways: [],
                          culturalGlossary: [],
                          expansions: [],
                        },
                      };
                      return {
                        ...base,
                        title: topic || base.title,
                        quiz: quizData.quiz.questions,
                        quizId: quizData.quizId || base.quizId,
                      };
                    });
                    setTestedAnswers({});
                    setExpandedQuestionExplanations({});
                    void triggerConfetti({ particleCount: 40, spread: 60 });
                    toast.success(
                      isEn
                        ? `Quiz created: ${quizData.quiz.questions.length} questions.`
                        : `Kuis berhasil dibuat: ${quizData.quiz.questions.length} butir.`
                    );
                  }
                } catch (quizErr) {
                  console.error("Quiz generation failed:", quizErr);
                }
              }
            } else if (artType === "mindmap" && action.mindmap) {
              setProcessedDoc((prev) => {
                const base: DocumentAnalysis & { quizId?: string } = prev || {
                  title: action.topic || "Peta konsep",
                  gradeLevel: "Fase D (SMP)",
                  subjectArea: "Materi ajar",
                  flashcards: [],
                  quiz: [],
                  summary: {
                    overview: "",
                    keyTakeaways: [],
                    culturalGlossary: [],
                    expansions: [],
                  },
                };
                return {
                  ...base,
                  mindMap: action.mindmap,
                };
              });
              setCollapsedBranches({});
              setSelectedMindMapNode(null);
              void triggerConfetti({ particleCount: 35, spread: 50 });
              toast.success(
                isEn
                  ? `${artifactLabel} ready.`
                  : `${artifactLabel} berhasil disusun.`
              );
            } else {
              try {
                const contentText =
                  docText.trim().length >= 40
                    ? docText
                    : [
                        docText.trim(),
                        action.topic ? `Materi: ${action.topic}` : "",
                        action.focusAspect ? `Aspek fokus: ${action.focusAspect}` : "",
                      ]
                        .filter(Boolean)
                        .join(". ")
                        .trim();
                const fallbackSource =
                  contentText.length >= 40
                    ? contentText
                    : `Materi pembelajaran: ${action.topic || "Konsep utama"}. Aspek fokus: ${action.focusAspect || "Pemahaman menyeluruh konsep materi"}.`;

                const procRes = await fetch("/api/ai/process-document", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "analyze",
                    extractedText: fallbackSource,
                    text: fallbackSource,
                    fileName: uploadedFileName || "materi-ajar.txt",
                    fileType: uploadedFileType || "text",
                    fileBase64: uploadedFileBase64 || undefined,
                    mimeType: uploadedMimeType || "text/plain",
                    artifacts: [artType],
                  }),
                });
                const procData = await procRes.json();
                if (procRes.ok) {
                  const docPayload: DocumentAnalysis & { quizId?: string } =
                    procData.document || procData.analysis;
                  if (docPayload) {
                    setProcessedDoc((prev) => {
                      if (!prev) return docPayload;
                      return {
                        ...prev,
                        title: docPayload.title || prev.title,
                        flashcards:
                          artType === "flashcards" && docPayload.flashcards?.length
                            ? docPayload.flashcards
                            : prev.flashcards,
                        summary:
                          artType === "summary" && docPayload.summary?.overview
                            ? docPayload.summary
                            : prev.summary,
                        mindMap:
                          artType === "mindmap" && docPayload.mindMap
                            ? docPayload.mindMap
                            : prev.mindMap,
                        infographic:
                          artType === "infographic" && docPayload.infographic
                            ? docPayload.infographic
                            : prev.infographic,
                        dataTable:
                          artType === "table" && docPayload.dataTable
                            ? docPayload.dataTable
                            : prev.dataTable,
                        report:
                          artType === "report" && docPayload.report
                            ? docPayload.report
                            : prev.report,
                      };
                    });
                    if (artType === "flashcards") {
                      setFlashcardIndex(0);
                      setMasteredCards([]);
                      setIsFlipped(false);
                    }
                    if (artType === "mindmap") {
                      setCollapsedBranches({});
                      setSelectedMindMapNode(null);
                    }
                    void triggerConfetti({ particleCount: 35, spread: 50 });
                    toast.success(
                      isEn
                        ? `${artifactLabel} ready.`
                        : `${artifactLabel} berhasil disusun.`
                    );
                  }
                }
              } catch (artErr) {
                console.error("Artifact generation failed:", artErr);
              }
            }
          }
        }
      }

      const primaryAction = Array.isArray(data.studioActions)
        ? data.studioActions.find((a: StudioAction) => a.type === "create_artifact")
        : undefined;

      const actionCard = primaryAction
        ? {
            type: "create_artifact" as const,
            artifactType: primaryAction.artifactType as StudioCraftableArtifact,
            label:
              t.studio.tabs[primaryAction.artifactType as StudioCraftableArtifact] ||
              primaryAction.artifactType,
            topic: primaryAction.topic,
            count: primaryAction.count,
            difficulty: primaryAction.difficulty,
          }
        : undefined;

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Maaf, respon tidak dapat disusun.",
          actionCard,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim pesan";
      toast.error(msg);
    } finally {
      setChatLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const flashcardTags = useMemo(() => {
    if (!processedDoc?.flashcards) return [];
    return Array.from(new Set(processedDoc.flashcards.map((c) => c.tag).filter(Boolean)));
  }, [processedDoc]);

  const filteredFlashcards = useMemo(() => {
    const all = processedDoc?.flashcards || [];
    if (cardTagFilter === "all") return all.map((card, originalIndex) => ({ card, originalIndex }));
    if (cardTagFilter === "unmastered") {
      return all
        .map((card, originalIndex) => ({ card, originalIndex }))
        .filter(({ originalIndex }) => !masteredCards.includes(originalIndex));
    }
    return all
      .map((card, originalIndex) => ({ card, originalIndex }))
      .filter(({ card }) => card.tag === cardTagFilter);
  }, [processedDoc, cardTagFilter, masteredCards]);

  const safeCardCursor = filteredFlashcards.length > 0
    ? Math.min(flashcardIndex, filteredFlashcards.length - 1)
    : 0;
  const activeCardEntry = filteredFlashcards[safeCardCursor];
  const currentFlashcard = activeCardEntry?.card;
  const currentOriginalIndex = activeCardEntry?.originalIndex ?? 0;

  const handleGenerateMoreCards = async () => {
    const material = (docText || processedDoc?.transcription || "").trim();
    if (material.length < 30 || generatingMoreCards || !processedDoc) return;
    soundEffects.playClick();
    setGeneratingMoreCards(true);
    try {
      const res = await fetch("/api/ai/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: material,
          count: 6,
          focus: cardFocusInput.trim() || undefined,
          existingFronts: processedDoc.flashcards.map((c) => c.front),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menambah kartu.");
      const added = Array.isArray(data.flashcards) ? data.flashcards : [];
      if (added.length > 0) {
        setProcessedDoc((prev) =>
          prev
            ? {
                ...prev,
                flashcards: [...prev.flashcards, ...added],
              }
            : prev
        );
        setCardFocusInput("");
        toast.success(
          isEn ? `Added ${added.length} new cards.` : `${added.length} kartu baru ditambahkan.`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah kartu.");
    } finally {
      setGeneratingMoreCards(false);
    }
  };

  const handleShuffleCards = () => {
    if (!processedDoc || processedDoc.flashcards.length < 2) return;
    soundEffects.playClick();
    const shuffled = [...processedDoc.flashcards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setProcessedDoc({ ...processedDoc, flashcards: shuffled });
    setMasteredCards([]);
    setFlashcardIndex(0);
    setIsFlipped(false);
    toast.success(isEn ? "Deck shuffled." : "Urutan kartu diacak.");
  };

  const handleAskCardToCopilot = async (card: { front: string; back: string; tag?: string }) => {
    const promptText = isEn
      ? `Explain this card in more detail with a concrete example:\nQuestion: ${card.front}\nAnswer: ${card.back}`
      : `Jelaskan kartu ini lebih mendalam beserta contoh konkretnya:\nPertanyaan: ${card.front}\nJawaban: ${card.back}`;
    soundEffects.playClick();
    const nextMessages = [...chatMessages, { role: "user" as const, content: promptText }];
    setChatMessages(nextMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/studio-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          documentContext: docText || processedDoc?.transcription || undefined,
          documentTitle: processedDoc?.title || undefined,
          currentTab: "flashcards",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi asisten");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Tidak ada balasan." },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pertanyaan");
    } finally {
      setChatLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sourceLabel =
    uploadedFileName || (isEn ? "your lesson text" : "teks materi anda");
  const aiQuizConcepts = aiQuiz
    ? Array.from(
        new Set(aiQuiz.quiz.questions.map((question) => question.conceptTag))
      ).slice(0, 5)
    : [];
  const hasFlashcards = Boolean(
    processedDoc?.flashcards && processedDoc.flashcards.length > 0
  );
  const hasQuiz = Boolean(processedDoc?.quiz && processedDoc.quiz.length > 0);
  const hasSummary = Boolean(
    processedDoc?.summary && processedDoc.summary.overview.trim().length > 0
  );
  const hasMindMap = Boolean(
    processedDoc?.mindMap && processedDoc.mindMap.label
  );
  const hasInfographic = Boolean(
    processedDoc?.infographic && processedDoc.infographic.pillars?.length > 0
  );
  const hasTable = Boolean(
    processedDoc?.dataTable && processedDoc.dataTable.columns?.length > 0
  );
  const hasReport = Boolean(
    processedDoc?.report && processedDoc.report.executiveSummary?.trim().length > 0
  );

  const handleExpandArtifact = async (
    artifact: StudioCraftableArtifact,
    overrideQuestion?: string
  ) => {
    const rawQuestion = (overrideQuestion ?? artifactExpandInput[artifact] ?? "").trim();
    const material = (docText || processedDoc?.transcription || "").trim();
    if (!rawQuestion || material.length < 20 || !processedDoc || expandingArtifact) {
      return;
    }

    soundEffects.playClick();
    setExpandingArtifact(artifact);
    try {
      const existingItems =
        artifact === "summary"
          ? processedDoc.summary.keyTakeaways
          : artifact === "flashcards"
            ? processedDoc.flashcards.map((c) => c.front)
            : artifact === "quiz"
              ? processedDoc.quiz.map((q) => q.question)
              : artifact === "mindmap"
                ? (processedDoc.mindMap?.children || []).map((b) => b.label)
                : artifact === "infographic"
                  ? (processedDoc.infographic?.pillars || []).map((p) => p.title)
                  : artifact === "report"
                    ? (processedDoc.report?.sections || []).map((s) => s.heading)
                    : [];

      const res = await fetch("/api/ai/expand-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact,
          question: rawQuestion,
          sourceText: material,
          columns: processedDoc.dataTable?.columns,
          existingItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperluas artifak.");
      }

      setProcessedDoc((prev) => {
        if (!prev) return prev;
        if (artifact === "summary" && data.answer) {
          return {
            ...prev,
            summary: {
              ...prev.summary,
              keyTakeaways: [
                ...prev.summary.keyTakeaways,
                ...(Array.isArray(data.newTakeaways) ? data.newTakeaways : []),
              ],
              culturalGlossary: [
                ...prev.summary.culturalGlossary,
                ...(Array.isArray(data.newGlossary) ? data.newGlossary : []),
              ],
              expansions: [
                ...(prev.summary.expansions || []),
                { question: rawQuestion, answer: data.answer },
              ],
            },
          };
        }
        if (artifact === "flashcards" && Array.isArray(data.flashcards)) {
          return {
            ...prev,
            flashcards: [...prev.flashcards, ...data.flashcards],
          };
        }
        if (artifact === "quiz" && Array.isArray(data.questions)) {
          const nextQuiz = [...prev.quiz, ...data.questions];
          return {
            ...prev,
            quiz: nextQuiz,
            difficultyQuizzes: prev.difficultyQuizzes
              ? {
                  ...prev.difficultyQuizzes,
                  medium: [...(prev.difficultyQuizzes.medium || prev.quiz), ...data.questions],
                }
              : undefined,
          };
        }
        if (artifact === "mindmap" && Array.isArray(data.newBranches) && prev.mindMap) {
          return {
            ...prev,
            mindMap: {
              ...prev.mindMap,
              children: [...(prev.mindMap.children || []), ...data.newBranches],
            },
          };
        }
        if (artifact === "infographic" && Array.isArray(data.newPillars) && prev.infographic) {
          return {
            ...prev,
            infographic: {
              ...prev.infographic,
              pillars: [...prev.infographic.pillars, ...data.newPillars],
            },
          };
        }
        if (artifact === "table" && Array.isArray(data.newRows) && prev.dataTable) {
          return {
            ...prev,
            dataTable: {
              ...prev.dataTable,
              rows: [...prev.dataTable.rows, ...data.newRows],
            },
          };
        }
        if (artifact === "report" && data.newSection && prev.report) {
          return {
            ...prev,
            report: {
              ...prev.report,
              sections: [...(prev.report.sections || []), data.newSection],
            },
          };
        }
        return prev;
      });

      setArtifactExpandInput((prev) => ({ ...prev, [artifact]: "" }));
      toast.success(
        isEn
          ? "Artifact expanded with new insights."
          : "Artifak berhasil diperluas dengan bahasan baru."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperluas artifak.");
    } finally {
      setExpandingArtifact(null);
    }
  };

  const handleCopyTableCsv = () => {
    if (!processedDoc?.dataTable) return;
    soundEffects.playClick();
    const { columns, rows } = processedDoc.dataTable;
    const escapeCell = (val: unknown) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const csvLines = [
      columns.map(escapeCell).join(","),
      ...rows.map((r) => columns.map((c) => escapeCell(r[c])).join(",")),
    ];
    void navigator.clipboard.writeText(csvLines.join("\n"));
    toast.success(isEn ? "Table copied as csv." : "Tabel disalin dalam format csv.");
  };

  const studioHeaderMoreMenuItems: MoreMenuItem[] = [
    {
      id: "header-history",
      label: isEn ? "History" : "Riwayat",
      icon: RiHistoryLine,
      onAction: () => {
        soundEffects.playClick();
        if (user) {
          fetchRemoteStudioHistory()
            .then((latest) => setHistoryEntries(latest))
            .catch((err) => {
              console.warn("Failed to refresh remote history:", err);
              setHistoryEntries(loadStudioHistory());
            });
        } else {
          setHistoryEntries(loadStudioHistory());
        }
        setIsHistoryOpen(true);
      },
    },
    {
      id: "header-quick-quiz",
      label: isEn ? "Quick quiz" : "Kuis cepat",
      icon: RiQuestionnaireLine,
      onAction: () => {
        soundEffects.playClick();
        setIsQuickQuizOpen(true);
      },
    },
    {
      id: "header-copilot",
      label: "Exile copilot",
      icon: RiCopilotFill,
      onAction: () => {
        soundEffects.playClick();
        setIsCopilotDrawerOpen(true);
      },
    },
    {
      id: "header-settings",
      label: isEn ? "Settings" : "Pengaturan",
      icon: RiSettings3Line,
      onAction: () => {
        soundEffects.playClick();
        setIsSettingsOpen(true);
      },
    },
    {
      id: "header-clear-text",
      label: isEn ? "Clear text" : "Bersihkan teks",
      icon: RiDeleteBinLine,
      isDestructive: true,
      destructiveTitle: isEn ? "Clear source text" : "Bersihkan teks bahan ajar",
      destructiveDescription: isEn
        ? "This will clear your draft and source material. Continue?"
        : "Ini akan mengosongkan draf dan teks bahan ajar anda. Lanjutkan?",
      confirmLabel: isEn ? "Clear" : "Bersihkan",
      cancelLabel: isEn ? "Cancel" : "Batal",
      disabled: !docText && !uploadedFileName,
      onAction: () => {
        setDocText("");
        setUploadedFileName("");
        setUploadedFileBase64("");
        toast.info(isEn ? "Text cleared." : "Teks dikosongkan.");
      },
    },
  ];

  const artifactCardMoreMenuItems: MoreMenuItem[] = [
    {
      id: "artifact-reset",
      label: isEn ? "Reset progress" : "Reset progres",
      icon: RiRefreshLine,
      onAction: () => {
        soundEffects.playClick();
        if (activeTab === "flashcards") {
          setMasteredCards([]);
          setCardTagFilter("all");
          setFlashcardIndex(0);
          setIsFlipped(false);
          toast.info(isEn ? "Flashcard progress reset." : "Progres kartu direset.");
        } else if (activeTab === "quiz") {
          setTestedAnswers({});
          setExpandedQuestionExplanations({});
          toast.info(isEn ? "Quiz answers reset." : "Jawaban kuis direset.");
        } else {
          toast.info(isEn ? "View reset." : "Tampilan direset.");
        }
      },
    },
    {
      id: "artifact-copy",
      label: isEn ? "Copy content" : "Salin konten",
      icon: RiFileCopyLine,
      onAction: () => {
        soundEffects.playClick();
        if (!processedDoc) return;
        let textToCopy = processedDoc.title;
        if (activeTab === "summary" && processedDoc.summary) {
          textToCopy = `${processedDoc.title}\n\n${processedDoc.summary.overview}\n\n${processedDoc.summary.keyTakeaways.join("\n")}`;
        } else if (activeTab === "flashcards" && processedDoc.flashcards) {
          textToCopy = processedDoc.flashcards
            .map((f, i) => `${i + 1}. Q: ${f.front}\nA: ${f.back}`)
            .join("\n\n");
        } else if (activeTab === "quiz" && processedDoc.quiz) {
          textToCopy = processedDoc.quiz
            .map(
              (q, i) =>
                `${i + 1}. ${q.question}\n${q.options.map((o) => `  ${o.label}. ${o.text}`).join("\n")}`
            )
            .join("\n\n");
        }
        void navigator.clipboard.writeText(textToCopy);
        toast.success(isEn ? "Content copied to clipboard." : "Konten disalin ke papan klip.");
      },
    },
    {
      id: "artifact-view-mode",
      label:
        activeTab === "flashcards"
          ? cardViewMode === "deck"
            ? (isEn ? "Switch to grid view" : "Beralih ke tampilan kisi")
            : (isEn ? "Switch to 3d card mode" : "Beralih ke mode kartu 3d")
          : (isEn ? "Toggle view mode" : "Ubah mode tampilan"),
      icon: RiEyeLine,
      onAction: () => {
        soundEffects.playClick();
        if (activeTab === "flashcards") {
          setCardViewMode((prev) => (prev === "deck" ? "grid" : "deck"));
        } else if (activeTab === "quiz") {
          setShowDistractorRationale((prev) => !prev);
        }
      },
    },
    {
      id: "artifact-regenerate",
      label: isEn ? "Regenerate artifact" : "Buat ulang artifak",
      icon: RiRestartLine,
      disabled: processing || selectedArtifacts.length === 0,
      onAction: () => {
        void handleProcessDocument();
      },
    },
  ];

  const renderSourcesRailContent = (isMobileDrawer = false) => {
    const currentFileInputRef = isMobileDrawer ? mobileFileInputRef : fileInputRef;

    return (
      <div className="space-y-2.5">
        {!isMobileDrawer && (
          <div className="flex items-center justify-between pb-0.5">
            <span className="text-caption-2-medium text-text-tertiary">
              {isEn ? "Source material" : "Bahan ajar"}
            </span>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-lg hover:bg-background-secondary-default text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              title={isEn ? "Collapse sidebar" : "Tutup bilah sisi"}
              aria-label={isEn ? "Collapse sidebar" : "Tutup bilah sisi"}
            >
              <RiSidebarFoldLine className="size-4" />
            </button>
          </div>
        )}

        {/* Multimodal Dropzone & Upload Trigger */}
        <div className="flex items-center gap-2">
          <input
            ref={currentFileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.heic,.heif,.jfif,.tiff,.tif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.rtf,.txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.epub,image/*,text/*,application/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => currentFileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped && currentFileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(dropped);
                currentFileInputRef.current.files = dt.files;
                handleFileChange({
                  target: currentFileInputRef.current,
                } as ChangeEvent<HTMLInputElement>);
              }
            }}
            className={cx(
              "group flex flex-1 min-w-0 flex-col gap-2 rounded-xl p-2.5 text-start transition-all cursor-pointer border-0",
              isDraggingFile
                ? "bg-accent-500/10"
                : uploadedFileName
                  ? "bg-accent-500/5"
                  : "bg-background-secondary-default/35 hover:bg-background-secondary-default/65"
            )}
          >
            <div className="flex w-full items-center gap-2.5">
              <span
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  uploadedFileName
                    ? "bg-background-tertiary-default text-text-primary"
                    : "bg-background-full text-text-secondary group-hover:text-text-primary"
                )}
              >
                <RiUploadCloud2Line className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption-1-semibold text-text-primary">
                  {docTitle || uploadedFileName || t.studio.uploadTitle}
                </span>
                <span className="mt-0.5 block truncate text-caption-2-regular text-text-tertiary">
                  {uploadedFileName
                    ? `${docText.trim().length.toLocaleString()} ${isEn ? "characters" : "karakter"}`
                    : t.studio.uploadHint}
                </span>
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={isScanProcessing}
            onClick={() => {
              soundEffects.playClick();
              setIsPreScanModalOpen(true);
            }}
            title={isEn ? "Scan homework with camera" : "Pindai tugas kamera"}
            aria-label={isEn ? "Scan homework with camera" : "Pindai tugas kamera"}
            className="size-11 bg-background-secondary-default/50 hover:bg-background-secondary-default border border-border-button-default text-text-secondary hover:text-text-primary rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanProcessing ? (
              <span className="size-4 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-500" />
            ) : (
              <RiCameraLine className="size-5" />
            )}
          </button>
        </div>

        {/* Multimodal AI Vision Ingestion Status Banner */}
        {uploadedFileBase64 && (
          <div className="p-2 rounded-xl bg-emerald-500/10 flex items-center justify-between gap-2 text-caption-2-medium text-state-success-text">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cx(
                  "inline-flex rounded-full size-2 shrink-0",
                  isTranscribing ? "bg-warning animate-ping" : "bg-emerald-500"
                )}
              />
              <span className="truncate">
                {isTranscribing
                  ? isEn
                    ? "Transcribing file..."
                    : "Mentranskripsi berkas..."
                  : isEn
                    ? "Document ready"
                    : "Dokumen siap"}
              </span>
            </div>
            {!isTranscribing && (
              <button
                type="button"
                onClick={() =>
                  transcribeUploadedFile(
                    uploadedFileBase64,
                    uploadedFileName || "dokumen.pdf",
                    uploadedFileType,
                    uploadedMimeType || "application/pdf"
                  )
                }
                className="text-caption-2-medium hover:underline text-state-success-text flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RiRefreshLine className="size-3" />
                <span>{isEn ? "Retry" : "Ulang"}</span>
              </button>
            )}
          </div>
        )}

        {/* Material Sheet Editor */}
        <div className="overflow-hidden rounded-xl bg-background-secondary-default/35 transition-all border-0">
          <div className="flex items-center justify-between gap-2 bg-background-secondary-default/70 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <RiFileTextLine className="size-3.5 shrink-0 text-accent-700" />
              <span className="truncate text-caption-2-medium text-text-secondary">
                {t.studio.textEditorLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-md bg-background-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
                {docText.trim().length.toLocaleString()}
              </span>
              {(docText || uploadedFileName) && (
                <button
                  type="button"
                  onClick={() => {
                    setDocText("");
                    setUploadedFileName("");
                    setUploadedFileBase64("");
                  }}
                  className="text-caption-2-regular text-text-tertiary hover:text-text-error-primary transition-colors cursor-pointer"
                >
                  {t.studio.textEditorClear}
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={isMobileDrawer ? undefined : docTextareaRef}
              rows={isMobileDrawer ? 4 : 3}
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              placeholder={
                isTranscribing
                  ? isEn
                    ? "Transcribing content..."
                    : "Mentranskripsi konten..."
                  : t.studio.textEditorPlaceholder
              }
              disabled={isTranscribing}
              className="w-full bg-transparent p-2.5 text-caption-1-regular leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none resize-y min-h-[76px] disabled:opacity-60"
            />
            {isTranscribing && (
              <div className="absolute inset-0 bg-background-secondary-default/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-medium text-state-success-text bg-background-primary-default px-3 py-1.5 rounded-xl shadow-xs">
                  <RiRefreshLine className="size-3.5 animate-spin text-state-success-text" />
                  <span>{transcriptionStatus || (isEn ? "Transcribing..." : "Mentranskripsi...")}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Checklist Menu: Choose specific artifacts to create */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-caption-2-medium text-text-tertiary">
              {isEn ? "Select artifacts" : "Pilih artifak"}
            </span>
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                const allIds: StudioCraftableArtifact[] = [
                  "flashcards",
                  "quiz",
                  "summary",
                  "mindmap",
                  "infographic",
                  "table",
                  "report",
                ];
                if (selectedArtifacts.length > 0) {
                  setSelectedArtifacts([]);
                } else {
                  setSelectedArtifacts(allIds);
                }
              }}
              className="text-caption-2-medium text-accent-700 hover:underline cursor-pointer"
            >
              {selectedArtifacts.length > 0
                ? isEn
                  ? "Deselect all"
                  : "Batal pilih semua"
                : isEn
                  ? "Select all"
                  : "Pilih semua"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {(
              [
                {
                  id: "flashcards" as const,
                  label: t.studio.tabs.flashcards,
                  icon: RiFileCopyLine,
                  built: hasFlashcards,
                },
                {
                  id: "quiz" as const,
                  label: t.studio.tabs.quiz,
                  icon: RiQuestionnaireLine,
                  built: hasQuiz,
                },
                {
                  id: "summary" as const,
                  label: t.studio.tabs.summary,
                  icon: RiBookOpenLine,
                  built: hasSummary,
                },
                {
                  id: "mindmap" as const,
                  label: t.studio.tabs.mindmap,
                  icon: RiNodeTree,
                  built: hasMindMap,
                },
                {
                  id: "infographic" as const,
                  label: t.studio.tabs.infographic,
                  icon: RiBarChartBoxLine,
                  built: hasInfographic,
                },
                {
                  id: "table" as const,
                  label: t.studio.tabs.table,
                  icon: RiTableLine,
                  built: hasTable,
                },
                {
                  id: "report" as const,
                  label: t.studio.tabs.report,
                  icon: RiFileList3Line,
                  built: hasReport,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const checked = selectedArtifacts.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleArtifactSelection(item.id)}
                  className={cx(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-start transition-all cursor-pointer border-0",
                    checked
                      ? "bg-accent-500/10 text-text-primary"
                      : "bg-background-secondary-default/30 text-text-secondary hover:bg-background-secondary-default/60 hover:text-text-primary"
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cx(
                        "flex size-4 shrink-0 items-center justify-center rounded-md transition-colors",
                        checked
                          ? "bg-background-tertiary-default text-text-primary"
                          : "bg-background-full text-transparent"
                      )}
                    >
                      <RiCheckLine className="size-3" />
                    </span>
                    <Icon
                      className={cx(
                        "size-3.5 shrink-0",
                        checked ? "text-accent-700" : "text-text-tertiary"
                      )}
                    />
                    <span className="truncate text-caption-1-medium">
                      {item.label}
                    </span>
                  </span>
                  {item.built && (
                    <span className="size-1.5 shrink-0 rounded-full bg-border-button-hover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single On-Demand Create Button */}
        <div className="pt-0.5">
          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={() => {
              if (isMobileDrawer) {
                setIsMobileSourcesOpen(false);
              }
              void handleProcessDocument();
            }}
            disabled={processing || selectedArtifacts.length === 0}
            className={cx(
              "w-full justify-center font-semibold gap-2 transition-all",
              (processing || selectedArtifacts.length === 0) &&
                "opacity-40 text-text-placeholder border-border-button-default cursor-not-allowed disabled:pointer-events-auto"
            )}
          >
            <span
              className={cx(
                "inline-flex items-center gap-2",
                (processing || selectedArtifacts.length === 0) && "text-text-placeholder"
              )}
            >
              <RiCopilotFill className={cx("size-4", processing && "animate-spin")} />
              <span>
                {processing
                  ? `${t.studio.creatingBtn}... (${formatTimer(reasoningElapsedSec)})`
                  : t.studio.createBtn}
              </span>
            </span>
          </Button>

          {processing && (
            <div className="mt-2 p-2.5 rounded-xl bg-accent-500/10 flex items-center justify-between gap-2 text-caption-1-medium text-text-primary animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-accent-600"></span>
                </span>
                <span className="truncate text-xs text-text-secondary">
                  {isEn ? "Crafting selected artifacts..." : "Menyusun artifak pilihan..."}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-700 shrink-0">
                {formatTimer(reasoningElapsedSec)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-clip bg-background-secondary-default/30 pb-12 text-text-primary selection:bg-accent-700 selection:text-text-white">
      {/* Notebook workspace bar */}
      <header className="sticky top-0 z-30 bg-background-full/92 backdrop-blur-xl border-0">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <ButtonLink
              href="/"
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiArrowLeftLine}
              aria-label={t.studio.backHome}
              className="text-text-secondary shrink-0"
            />
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
              <span className="text-caption-1-medium text-text-tertiary hidden xs:inline">
                Studio
              </span>
              <span className="text-text-tertiary hidden xs:inline">/</span>
              <span className="max-w-[76px] xs:max-w-[120px] sm:max-w-[200px] md:max-w-[30vw] truncate text-caption-1-semibold text-text-primary">
                {processedDoc?.title || (isEn ? "Untitled notebook" : "Notebook baru")}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3 ms-auto">
            <div
              className="flex items-center gap-1 px-1.5 py-1 text-caption-2-medium text-text-tertiary shrink-0"
              title={
                user
                  ? (isEn ? "Auto-saved" : "Tersimpan otomatis")
                  : (isEn ? "Sign in to sync" : "Masuk untuk sinkronkan ke akun")
              }
              aria-label={
                user
                  ? (isEn ? "Auto-saved" : "Tersimpan otomatis")
                  : (isEn ? "Sign in to sync" : "Masuk untuk sinkronkan ke akun")
              }
              aria-live="polite"
            >
              {user ? (
                <RiCheckLine className="size-3.5 text-foreground-icon-secondary shrink-0" aria-hidden="true" />
              ) : (
                <span className="size-1.5 rounded-full bg-border-button-default shrink-0" aria-hidden="true" />
              )}
              <span className="hidden lg:inline max-w-[130px] truncate">
                {user
                  ? (isEn ? "Auto-saved" : "Tersimpan otomatis")
                  : (isEn ? "Sign in to sync" : "Masuk untuk sinkronkan ke akun")}
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleLaunchRoom}
              disabled={launchingRoom}
              leadingIcon={RiPlayCircleLine}
              aria-label={t.studio.launchRoomBtn}
              className="font-medium shadow-xs"
            >
              <span className="hidden sm:inline">
                {launchingRoom ? t.studio.launchingRoomBtn : t.studio.launchRoomBtn}
              </span>
            </Button>

            <MoreMenu
              items={studioHeaderMoreMenuItems}
              aria-label={isEn ? "More options" : "Opsi lanjutan"}
            />
            <UserNav includePreferences />
          </div>
        </div>
      </header>

      {/* Notebook workspace */}
      <main className="mx-auto max-w-[1440px] px-3 pt-3 pb-3 sm:px-6 space-y-3 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-5 items-start min-w-0">
          {/* ========================================================================= */}
          {/* SOURCES RAIL: Desktop Sidebar & Collapsible Rail                          */}
          {/* ========================================================================= */}
          <div
            className={cx(
              "hidden lg:block shrink-0 min-w-0",
              isSidebarCollapsed
                ? "lg:col-span-1 xl:col-span-1"
                : "lg:col-span-4 xl:col-span-3"
            )}
          >
            {isSidebarCollapsed ? (
              <aside className="shrink-0 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-background-secondary-default/50 hover:bg-background-secondary-default text-text-secondary hover:text-text-primary text-caption-1-medium transition-colors cursor-pointer border-0"
                  title={isEn ? "Expand sidebar" : "Buka bilah sisi"}
                  aria-label={isEn ? "Expand sidebar" : "Buka bilah sisi"}
                >
                  <RiSidebarUnfoldLine className="size-4" />
                  <span className="hidden xl:inline text-caption-2-medium">{isEn ? "Source material" : "Bahan ajar"}</span>
                </button>
              </aside>
            ) : (
              <aside className="w-full min-w-0 space-y-2.5 self-start">
                <ScrollReveal
                  variant="slide-up"
                  className="space-y-2.5 rounded-2xl bg-background-secondary-default/45 p-3 shadow-sm border-0"
                >
                  {renderSourcesRailContent(false)}
                </ScrollReveal>
              </aside>
            )}
          </div>

          {/* ========================================================================= */}
          {/* NOTEBOOK CANVAS: Artifact navigation (gated until created) & content      */}
          {/* ========================================================================= */}
          <section
            className={cx(
              "min-w-0 space-y-4 col-span-1",
              isSidebarCollapsed
                ? "lg:col-span-11 xl:col-span-11"
                : "lg:col-span-8 xl:col-span-9"
            )}
          >
            {/* Mobile Material Sheet Bar */}
            <div className="flex lg:hidden items-center justify-between gap-2.5 rounded-2xl bg-background-secondary-default/60 p-2.5 shadow-xs">
              <button
                type="button"
                onClick={() => setIsMobileSourcesOpen(true)}
                className="flex items-center gap-2.5 min-w-0 text-start flex-1 cursor-pointer border-0 bg-transparent p-0"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-700">
                  <RiFileTextLine className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-caption-1-semibold text-text-primary">
                    {uploadedFileName || (docText.trim() ? `${docText.trim().length.toLocaleString()} ${isEn ? "chars" : "karakter"}` : (isEn ? "Source material" : "Bahan ajar"))}
                  </span>
                  <span className="block text-caption-2-regular text-text-tertiary truncate">
                    {isEn ? "Tap to open material & artifact editor" : "Ketuk untuk buka materi & pilihan artifak"}
                  </span>
                </div>
              </button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setIsMobileSourcesOpen(true)}
                leadingIcon={RiBookOpenLine}
                className="shrink-0 font-medium"
              >
                {isEn ? "Material" : "Bahan ajar"}
              </Button>
            </div>

            {/* Artifact Navigation Tab Bar */}
            <ScrollReveal
              variant="slide-up"
              className="sticky top-14 z-20 rounded-2xl bg-background-full/95 p-1.5 shadow-card backdrop-blur"
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x">
                <button
                  type="button"
                  disabled={!hasFlashcards}
                  onClick={() => {
                    if (!hasFlashcards) return;
                    soundEffects.playClick();
                    setActiveTab("flashcards");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "flashcards" && hasFlashcards
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasFlashcards
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiFileCopyLine className="size-4" />
                  <span>{t.studio.tabs.flashcards}</span>
                  {hasFlashcards && processedDoc?.flashcards?.length ? (
                    <span className="rounded-full bg-current/15 px-1.5 py-0.2 font-mono text-[11px]">
                      {processedDoc.flashcards.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={!hasQuiz}
                  onClick={() => {
                    if (!hasQuiz) return;
                    soundEffects.playClick();
                    setActiveTab("quiz");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "quiz" && hasQuiz
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasQuiz
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiQuestionnaireLine className="size-4" />
                  <span>{t.studio.tabs.quiz}</span>
                  {hasQuiz && processedDoc?.quiz?.length ? (
                    <span className="rounded-full bg-current/15 px-1.5 py-0.2 font-mono text-[11px]">
                      {processedDoc.quiz.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={!hasSummary}
                  onClick={() => {
                    if (!hasSummary) return;
                    soundEffects.playClick();
                    setActiveTab("summary");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "summary" && hasSummary
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasSummary
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiBookOpenLine className="size-4" />
                  <span>{t.studio.tabs.summary}</span>
                </button>

                <button
                  type="button"
                  disabled={!hasMindMap}
                  onClick={() => {
                    if (!hasMindMap) return;
                    soundEffects.playClick();
                    setActiveTab("mindmap");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "mindmap" && hasMindMap
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasMindMap
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiNodeTree className="size-4" />
                  <span>{t.studio.tabs.mindmap}</span>
                  {hasMindMap && processedDoc?.mindMap?.children?.length ? (
                    <span className="rounded-full bg-current/15 px-1.5 py-0.2 font-mono text-[11px]">
                      {processedDoc.mindMap.children.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={!hasInfographic}
                  onClick={() => {
                    if (!hasInfographic) return;
                    soundEffects.playClick();
                    setActiveTab("infographic");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "infographic" && hasInfographic
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasInfographic
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiBarChartBoxLine className="size-4" />
                  <span>{t.studio.tabs.infographic}</span>
                  {hasInfographic && processedDoc?.infographic?.pillars?.length ? (
                    <span className="rounded-full bg-current/15 px-1.5 py-0.2 font-mono text-[11px]">
                      {processedDoc.infographic.pillars.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={!hasTable}
                  onClick={() => {
                    if (!hasTable) return;
                    soundEffects.playClick();
                    setActiveTab("table");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "table" && hasTable
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasTable
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiTableLine className="size-4" />
                  <span>{t.studio.tabs.table}</span>
                  {hasTable && processedDoc?.dataTable?.rows?.length ? (
                    <span className="rounded-full bg-current/15 px-1.5 py-0.2 font-mono text-[11px]">
                      {processedDoc.dataTable.rows.length}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  disabled={!hasReport}
                  onClick={() => {
                    if (!hasReport) return;
                    soundEffects.playClick();
                    setActiveTab("report");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors",
                    activeTab === "report" && hasReport
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                      : hasReport
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
                        : "text-text-secondary/40 cursor-not-allowed opacity-40"
                  )}
                >
                  <RiFileList3Line className="size-4" />
                  <span>{t.studio.tabs.report}</span>
                </button>

                {processedDoc?.slideDeck && processedDoc.slideDeck.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setActiveTab("slides");
                    }}
                    className={cx(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                      activeTab === "slides"
                        ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                        : "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                    )}
                  >
                    <RiPresentationLine className="size-4" />
                    <span>{t.studio.tabs.slides}</span>
                  </button>
                )}
              </div>
            </ScrollReveal>

            {/* If no document has been generated yet, show the clean Exile Tools Guide (without duplicate Create button) */}
            {!processedDoc ? (
              <ScrollReveal variant="scale-up" delay={80} className="rounded-2xl bg-background-full p-4 sm:p-6 shadow-card space-y-4 sm:space-y-5">
                <div className="pb-2 sm:pb-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RiCompass3Line className="size-5 text-accent-700 shrink-0" />
                      <h3 className="text-title-3-semibold sm:text-title-2-semibold text-text-primary tracking-tight">
                        {t.studio.guideTitle}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="small"
                      onClick={() => setIsMobileSourcesOpen(true)}
                      leadingIcon={RiAddLine}
                      className="lg:hidden shrink-0 font-medium"
                    >
                      {isEn ? "Add material" : "Tambah materi"}
                    </Button>
                  </div>
                  <p className="text-body-2-regular text-text-secondary">
                    {t.studio.guideSubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {t.studio.guideSteps.map((step) => (
                    <div
                      key={step.num}
                      className="p-4 rounded-2xl bg-background-secondary-default/40 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                        <span className="inline-flex size-6 rounded-lg bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center font-bold">
                          {step.num}
                        </span>
                        <span>{step.title}</span>
                      </div>
                      <p className="text-caption-1-regular text-text-secondary leading-relaxed pl-8">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            ) : (
              /* Artifact Content Panels with Framer Motion Entrance */
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl bg-background-full p-5 shadow-card space-y-5 sm:p-6"
              >
                {/* Document Header Banner */}
                <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-caption-2-medium tracking-wide text-text-tertiary">
                      <span>{isEn ? "Notebook" : "Notebook"}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {processedDoc.subjectArea}
                        {processedDoc.gradeLevel ? ` · ${processedDoc.gradeLevel}` : ""}
                      </span>
                    </div>
                    <h2 className="text-title-2-semibold leading-tight tracking-tight text-text-primary sm:text-title-1-semibold">
                      {processedDoc.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-caption-2-regular text-text-tertiary">
                      <span
                        title={sourceLabel}
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-background-secondary-default/60 px-2 py-1"
                      >
                        <RiBookOpenLine className="size-3.5 shrink-0 text-accent-700" />
                        <span className="truncate">
                          {isEn ? "Grounded in" : "Berakar pada"}{" "}
                          <span className="text-text-secondary">{sourceLabel}</span>
                        </span>
                      </span>
                      {hasQuiz && (
                        <span className="rounded-lg bg-background-secondary-default/60 px-2 py-1">
                          {displayedQuestions.length} {isEn ? "questions" : "soal"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <MoreMenu
                      items={artifactCardMoreMenuItems}
                      aria-label={isEn ? "Artifact options" : "Opsi artifak"}
                    />
                  </div>
                </div>

                {/* ========================================================= */}
                {/* TAB 1: SUMMARY (Intisari - NO GLOSSARY)                   */}
                {/* ========================================================= */}
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    {/* Overview Paragraph */}
                    <div className="p-5 rounded-2xl bg-background-secondary-default/50 space-y-2">
                      <span className="text-caption-2-medium text-text-tertiary block">
                        {isEn ? "Executive conceptual summary" : "Ringkasan intisari materi"}
                      </span>
                      <p className="text-body-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                        {processedDoc.summary.overview}
                      </p>
                    </div>

                    {/* Key Takeaways */}
                    <div className="space-y-3">
                      <h4 className="text-title-3-semibold text-text-primary">
                        {isEn ? "Core takeaways" : "Poin-poin penting"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {processedDoc.summary.keyTakeaways.map((point, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-2xl bg-background-secondary-default/40 flex items-start gap-2.5"
                          >
                            <span className="inline-flex size-5 rounded-md bg-accent-700/15 text-accent-700 font-mono text-xs items-center justify-center shrink-0 mt-0.5 font-bold">
                              {i + 1}
                            </span>
                            <span className="text-caption-1-regular text-text-secondary leading-snug">
                              {point}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Terms / Glossary */}
                    {processedDoc.summary.culturalGlossary &&
                      processedDoc.summary.culturalGlossary.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-title-3-semibold text-text-primary">
                            {isEn ? "Key terms & patterns" : "Istilah & pola kunci"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {processedDoc.summary.culturalGlossary.map((item, idx) => (
                              <div
                                key={`${item.term}-${idx}`}
                                className="p-3.5 rounded-2xl bg-background-primary-default space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-body-2-semibold text-text-primary">
                                    {item.term}
                                  </span>
                                  {item.category && (
                                    <Chip variant="caption" color="gray">
                                      {item.category}
                                    </Chip>
                                  )}
                                </div>
                                <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                                  {item.meaning}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Expanded Deep-Dive Q&As */}
                    {processedDoc.summary.expansions &&
                      processedDoc.summary.expansions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-title-3-semibold text-text-primary">
                            {isEn ? "Deep-dive expansions" : "Pendalaman tanya-jawab"}
                          </h4>
                          <div className="space-y-3">
                            {processedDoc.summary.expansions.map((exp, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl bg-accent-500/5 p-4 space-y-2"
                              >
                                <div className="flex items-center gap-2 text-body-2-semibold text-text-primary">
                                  <RiCopilotFill className="size-4 text-accent-700 shrink-0" />
                                  <span>{exp.question}</span>
                                </div>
                                <p className="text-caption-1-regular text-text-secondary leading-relaxed whitespace-pre-line pl-6">
                                  {exp.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    <ArtifactExpansionBar
                      artifact="summary"
                      value={artifactExpandInput.summary || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({ ...prev, summary: next }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("summary", q)}
                      loading={expandingArtifact === "summary"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask a follow-up question to deepen this summary..."
                          : "Tanyakan sesuatu untuk memperdalam intisari ini..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Explain the core sentence patterns with examples",
                              "Summarize the step-by-step learning progression",
                              "What are the most important vocabulary groups?",
                            ]
                          : [
                              "Jelaskan pola kalimat utama beserta contoh konkretnya",
                              "Rangkum urutan kata sifat dan kata penghubung di materi ini",
                              "Apa langkah latihan bertahap dari kata hingga paragraf?",
                            ]
                      }
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: 3D FLASHCARDS (NotebookLM 1:1 Study Deck)          */}
                {/* ========================================================= */}
                {activeTab === "flashcards" && (
                  <div className="space-y-6">
                    {/* Top Deck Toolbar: View Switcher, Shuffle, Reset */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-xl bg-background-secondary-default p-1">
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCardViewMode("deck");
                          }}
                          className={cx(
                            "rounded-lg px-3 py-1.5 text-caption-1-medium transition-colors cursor-pointer",
                            cardViewMode === "deck"
                              ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {isEn ? "Kartu 3d" : "Kartu 3d"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCardViewMode("grid");
                          }}
                          className={cx(
                            "rounded-lg px-3 py-1.5 text-caption-1-medium transition-colors cursor-pointer",
                            cardViewMode === "grid"
                              ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-semibold shadow-xs"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {isEn
                            ? `All cards (${filteredFlashcards.length})`
                            : `Semua kartu (${filteredFlashcards.length})`}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={handleShuffleCards}
                        >
                          {isEn ? "Shuffle" : "Acak kartu"}
                        </Button>
                        {masteredCards.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            onClick={() => {
                              soundEffects.playClick();
                              setMasteredCards([]);
                              setCardTagFilter("all");
                              setFlashcardIndex(0);
                            }}
                          >
                            {isEn ? "Reset progress" : "Reset hafalan"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Topic Tag & Mastery Filters */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setCardTagFilter("all");
                          setFlashcardIndex(0);
                          setIsFlipped(false);
                        }}
                        className={cx(
                          "rounded-full px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                          cardTagFilter === "all"
                            ? "bg-background-tertiary-default text-text-primary border border-border-button-default"
                            : "bg-background-secondary-default text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {isEn
                          ? `All (${processedDoc.flashcards.length})`
                          : `Semua (${processedDoc.flashcards.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setCardTagFilter("unmastered");
                          setFlashcardIndex(0);
                          setIsFlipped(false);
                        }}
                        className={cx(
                          "rounded-full px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                          cardTagFilter === "unmastered"
                            ? "bg-background-tertiary-default text-text-primary border border-border-button-default"
                            : "bg-background-secondary-default text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {isEn
                          ? `Need review (${processedDoc.flashcards.length - masteredCards.length})`
                          : `Perlu diulang (${processedDoc.flashcards.length - masteredCards.length})`}
                      </button>
                      {flashcardTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCardTagFilter(tag);
                            setFlashcardIndex(0);
                            setIsFlipped(false);
                          }}
                          className={cx(
                            "rounded-full px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                            cardTagFilter === tag
                              ? "bg-background-tertiary-default text-text-primary border border-border-button-default"
                              : "bg-background-secondary-default text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {filteredFlashcards.length === 0 ? (
                      <div className="rounded-2xl bg-background-secondary-default/40 p-8 text-center space-y-3">
                        <p className="text-body-2-regular text-text-secondary">
                          {isEn
                            ? "All cards in this filter have been mastered!"
                            : "Semua kartu pada filter ini sudah Anda kuasai."}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setCardTagFilter("all");
                            setFlashcardIndex(0);
                          }}
                        >
                          {isEn ? "Show all cards" : "Tampilkan semua kartu"}
                        </Button>
                      </div>
                    ) : cardViewMode === "grid" ? (
                      /* Grid View: All cards side-by-side */
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {filteredFlashcards.map(({ card, originalIndex }, idx) => {
                          const isMastered = masteredCards.includes(originalIndex);
                          return (
                            <div
                              key={card.id || originalIndex}
                              className="flex flex-col justify-between gap-4 rounded-2xl bg-background-secondary-default/50 p-5"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-caption-2-medium text-text-tertiary">
                                      #{idx + 1}
                                    </span>
                                    <Chip variant="caption" color="blue">
                                      {card.tag || (isEn ? "Concept" : "Konsep")}
                                    </Chip>
                                  </div>
                                  {isMastered && (
                                    <Chip variant="caption" color="lime">
                                      {isEn ? "Mastered" : "Paham"}
                                    </Chip>
                                  )}
                                </div>
                                <p className="text-body-1-semibold text-text-primary leading-snug">
                                  {card.front}
                                </p>
                                <div className="rounded-xl bg-background-primary-default p-3.5 text-caption-1-regular text-text-secondary leading-relaxed">
                                  {card.back}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAskCardToCopilot(card)}
                                  className="text-caption-2-medium text-text-secondary hover:text-text-primary underline cursor-pointer"
                                >
                                  {isEn ? "Ask assistant to elaborate" : "Tanya asisten lebih dalam"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playClick();
                                    setFlashcardIndex(idx);
                                    setIsFlipped(false);
                                    setCardViewMode("deck");
                                  }}
                                  className="text-caption-2-semibold text-accent-700 hover:underline cursor-pointer"
                                >
                                  {isEn ? "Open in 3d view" : "Buka di kartu 3d"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* 3D Interactive Deck Mode */
                      <>
                        <div className="flex items-center justify-between text-caption-1-medium text-text-secondary">
                          <span>
                            {isEn
                              ? `Card ${safeCardCursor + 1} of ${filteredFlashcards.length}`
                              : `Kartu ${safeCardCursor + 1} dari ${filteredFlashcards.length}`}
                          </span>
                          <div className="flex items-center gap-4">
                            {currentFlashcard?.hint && (
                              <button
                                type="button"
                                onClick={() => setShowFlashcardHint(!showFlashcardHint)}
                                className="text-accent-700 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RiLightbulbLine className="size-3.5" />
                                <span>
                                  {showFlashcardHint
                                    ? (isEn ? "Hide hint" : "Tutup petunjuk")
                                    : (isEn ? "View hint" : "Lihat petunjuk")}
                                </span>
                              </button>
                            )}
                            {currentFlashcard && (
                              <button
                                type="button"
                                onClick={() => handleAskCardToCopilot(currentFlashcard)}
                                className="text-text-secondary hover:text-text-primary flex items-center gap-1 underline cursor-pointer"
                              >
                                <RiCopilotFill className="size-3.5" />
                                <span>{isEn ? "Ask assistant" : "Tanya asisten"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3D Flip Card Container */}
                        <div className="perspective-1000 flex justify-center py-2">
                          <motion.div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              soundEffects.playClick();
                              setIsFlipped(!isFlipped);
                            }}
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                soundEffects.playClick();
                                setIsFlipped(!isFlipped);
                              } else if (e.key === "ArrowRight") {
                                e.preventDefault();
                                setIsFlipped(false);
                                setShowFlashcardHint(false);
                                setFlashcardIndex((prev) =>
                                  Math.min(filteredFlashcards.length - 1, prev + 1)
                                );
                              } else if (e.key === "ArrowLeft") {
                                e.preventDefault();
                                setIsFlipped(false);
                                setShowFlashcardHint(false);
                                setFlashcardIndex((prev) => Math.max(0, prev - 1));
                              }
                            }}
                            animate={
                              reducedMotion
                                ? { opacity: 1 }
                                : {
                                    rotateX: cardTilt.x,
                                    rotateY: (isFlipped ? 180 : 0) + (isFlipped ? -cardTilt.y : cardTilt.y),
                                  }
                            }
                            transition={
                              reducedMotion
                                ? { duration: 0.2 }
                                : {
                                    type: "spring",
                                    stiffness: 240,
                                    damping: 22,
                                    mass: 0.8,
                                  }
                            }
                            className="w-full max-w-xl min-h-[260px] sm:min-h-[300px] p-5 sm:p-8 rounded-3xl vb-letterpress-surface shadow-card flex flex-col justify-between cursor-pointer select-none relative outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring [transform-style:preserve-3d] transition-shadow duration-300 overflow-hidden"
                          >
                            {/* Dynamic Specular Sheen Glare */}
                            <div
                              className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-200 z-10"
                              style={{
                                opacity: cardGlare.opacity,
                                background: `radial-gradient(circle at ${cardGlare.x}% ${cardGlare.y}%, rgba(255, 255, 255, 0.45) 0%, transparent 60%)`,
                              }}
                              aria-hidden="true"
                            />

                            {/* Front Side */}
                            <div
                              className={cx(
                                "space-y-4 flex flex-col justify-between h-full relative z-20",
                                isFlipped && "invisible"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <Chip variant="caption" color="blue">
                                  {currentFlashcard?.tag || (isEn ? "Concept" : "Pertanyaan")}
                                </Chip>
                                {masteredCards.includes(currentOriginalIndex) && (
                                  <Chip variant="caption" color="lime">
                                    {isEn ? "Mastered" : "Paham"}
                                  </Chip>
                                )}
                              </div>
                              <p className="font-display vb-deboss text-title-1-medium text-text-primary text-center my-auto leading-snug px-2">
                                {currentFlashcard?.front}
                              </p>
                              {showFlashcardHint && currentFlashcard?.hint && (
                                <div className="p-3 rounded-xl bg-amber-500/10 text-caption-2-regular text-warning">
                                  {isEn ? "Hint:" : "Petunjuk:"} {currentFlashcard.hint}
                                </div>
                              )}
                            </div>

                            {/* Back Side */}
                            <div
                              className={cx(
                                "space-y-4 flex flex-col justify-between h-full [transform:rotateY(180deg)] absolute inset-5 sm:inset-8 z-20",
                                !isFlipped && "invisible"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <Chip variant="caption" color="lime">
                                  {isEn ? "Answer & synthesis" : "Jawaban & penjelasan"}
                                </Chip>
                                <span className="text-caption-2-regular text-text-tertiary">
                                  {isEn ? "Click to flip back" : "Klik untuk membalik kembali"}
                                </span>
                              </div>
                              <p className="font-display vb-deboss text-body-1-medium sm:text-title-2-medium text-text-primary text-center my-auto leading-relaxed px-2">
                                {currentFlashcard?.back}
                              </p>
                              <div className="text-center text-caption-2-regular text-text-tertiary">
                                {isEn ? "Mark your mastery below or use arrows" : "Tandai pemahaman di bawah atau gunakan tombol panah"}
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Study loop: self-assessment + confidence */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-body-2-medium text-text-secondary">
                            {isEn ? "Mastered" : "Dikuasai"}: {masteredCards.length}/
                            {processedDoc.flashcards.length} (
                            {confidenceLevel(masteredCards.length, processedDoc.flashcards.length)}
                            %)
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="small"
                              disabled={!isFlipped}
                              onClick={() => {
                                soundEffects.playClick();
                                setMasteredCards((prev) =>
                                  prev.filter((i) => i !== currentOriginalIndex)
                                );
                                const total = filteredFlashcards.length;
                                setIsFlipped(false);
                                setShowFlashcardHint(false);
                                setFlashcardIndex((safeCardCursor + 1) % total);
                              }}
                            >
                              {isEn ? "Need review" : "Perlu diulang"}
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              disabled={!isFlipped}
                              onClick={() => {
                                soundEffects.playClick();
                                const nextMastered = masteredCards.includes(currentOriginalIndex)
                                  ? masteredCards
                                  : [...masteredCards, currentOriginalIndex];
                                setMasteredCards(nextMastered);
                                setIsFlipped(false);
                                setShowFlashcardHint(false);
                                const total = filteredFlashcards.length;
                                for (let step = 1; step <= total; step++) {
                                  const candidateIdx = (safeCardCursor + step) % total;
                                  const candidateOrig =
                                    filteredFlashcards[candidateIdx]?.originalIndex ?? 0;
                                  if (!nextMastered.includes(candidateOrig)) {
                                    setFlashcardIndex(candidateIdx);
                                    return;
                                  }
                                }
                                toast.success(
                                  isEn ? "Deck mastered!" : "Semua kartu dikuasai!"
                                );
                              }}
                            >
                              {isEn ? "Got it" : "Sudah paham"}
                            </Button>
                          </div>
                        </div>

                        {/* Flashcard Stepper Controls */}
                        <div className="flex items-center justify-between gap-4">
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            disabled={safeCardCursor === 0}
                            onClick={() => {
                              soundEffects.playClick();
                              setIsFlipped(false);
                              setShowFlashcardHint(false);
                              setFlashcardIndex((prev) => Math.max(0, prev - 1));
                            }}
                          >
                            <RiArrowLeftLine className="size-4 mr-1" />
                            <span>{isEn ? "Previous" : "Sebelumnya"}</span>
                          </Button>

                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {filteredFlashcards.map(({ originalIndex }, i) => (
                              <button
                                key={originalIndex}
                                type="button"
                                aria-label={`Kartu ${i + 1}`}
                                onClick={() => {
                                  soundEffects.playClick();
                                  setIsFlipped(false);
                                  setShowFlashcardHint(false);
                                  setFlashcardIndex(i);
                                }}
                                className={cx(
                                  "h-2 rounded-full transition-all cursor-pointer",
                                  safeCardCursor === i
                                    ? "bg-background-tertiary-default border border-border-button-default w-5"
                                    : masteredCards.includes(originalIndex)
                                      ? "bg-text-tertiary/40 w-2"
                                      : "bg-border-button-default w-2"
                                )}
                              />
                            ))}
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            disabled={safeCardCursor === filteredFlashcards.length - 1}
                            onClick={() => {
                              soundEffects.playClick();
                              setIsFlipped(false);
                              setShowFlashcardHint(false);
                              setFlashcardIndex((prev) =>
                                Math.min(filteredFlashcards.length - 1, prev + 1)
                              );
                            }}
                          >
                            <span>{isEn ? "Next" : "Berikutnya"}</span>
                            <RiArrowRightLine className="size-4 ml-1" />
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Expand Deck with DeepSeek AI */}
                    <div className="flex flex-col gap-2.5 rounded-2xl bg-background-secondary-default/40 p-4 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={cardFocusInput}
                        onChange={(e) => setCardFocusInput(e.target.value)}
                        disabled={generatingMoreCards}
                        placeholder={
                          isEn
                            ? "Optional focus for new cards (e.g. compare concepts, formulas)..."
                            : "Fokus kartu tambahan (opsional, mis. perbandingan konsep, studi kasus)..."
                        }
                        className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-border-button-default bg-background-primary-default px-3.5 py-2 text-body-medium text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-border-focus-ring disabled:opacity-60 shadow-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleGenerateMoreCards}
                        disabled={generatingMoreCards}
                        className="min-h-[44px] shrink-0"
                      >
                        {generatingMoreCards
                          ? isEn
                            ? "Writing 6 cards..."
                            : "Menyusun 6 kartu..."
                          : isEn
                            ? "+ Add 6 cards"
                            : "+ Tambah 6 kartu"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: ADAPTIVE QUIZ WITH DIFFICULTY SLIDER               */}
                {/* ========================================================= */}
                {activeTab === "quiz" && (
                  <div className="space-y-6">
                    {/* Wayground-style instant practice entry */}
                    <div className="flex flex-col gap-3 rounded-2xl bg-accent-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-tertiary-default text-text-primary border border-border-button-default">
                          <RiPlayCircleLine className="size-5" />
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-body-2-semibold text-text-primary">
                              {isEn ? "Quick quiz" : "Kuis cepat"}
                            </h4>
                            <Chip variant="caption" color="blue">
                              {isEn ? "Solo practice" : "Latihan mandiri"}
                            </Chip>
                          </div>
                          <p className="text-caption-2-regular text-text-secondary">
                            {isEn
                              ? "Play one question at a time with timer scoring, streak bonuses, and source-grounded explanations."
                              : "Mainkan soal satu per satu dengan skor waktu, bonus streak, dan penjelasan berbasis sumber."}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="medium"
                        onClick={openSourceInstantQuiz}
                        disabled={displayedQuestions.length === 0}
                        leadingIcon={RiPlayCircleLine}
                        className="shrink-0 justify-center"
                      >
                        {isEn ? "Start quick quiz" : "Mulai kuis cepat"}
                      </Button>
                    </div>

                    {/* Difficulty Slider Bar */}
                    <div className="p-4 rounded-2xl bg-background-secondary-default/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-caption-2-medium text-text-tertiary block">
                            {isEn ? "Quiz difficulty tier" : "Tingkat kesulitan kuis"}
                          </span>
                          <span className="text-body-2-semibold text-text-primary">
                            {quizDifficulty === 1
                              ? (isEn ? "Level 1: foundation (core concepts)" : "Level 1: dasar (pemahaman konsep)")
                              : quizDifficulty === 2
                              ? (isEn ? "Level 2: intermediate (application)" : "Level 2: sedang (penerapan kontekstual)")
                              : (isEn ? "Level 3: advanced (critical reasoning)" : "Level 3: menantang (penalaran kritis & analisis)")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDistractorRationale(!showDistractorRationale)}
                            className="text-caption-2-regular text-text-tertiary hover:text-text-primary underline cursor-pointer"
                          >
                            {showDistractorRationale
                              ? (isEn ? "Hide distractor breakdown" : "Sembunyikan analisis pengecoh")
                              : (isEn ? "Show distractor breakdown" : "Tampilkan analisis pengecoh")}
                          </button>
                        </div>
                      </div>

                      {/* 3-Step Slider */}
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={1}
                        value={quizDifficulty}                          onChange={(e) => {
                          soundEffects.playClick();
                          setQuizDifficulty(Number(e.target.value));
                          setTestedAnswers({});
                          setExpandedQuestionExplanations({});
                        }}
                        className="w-full accent-accent-700 cursor-pointer h-2 bg-border-button-default rounded-lg"
                      />

                      <div className="flex justify-between text-caption-2-regular text-text-tertiary px-1">
                        <span>{isEn ? "Foundation" : "Dasar"}</span>
                        <span>{isEn ? "Intermediate" : "Sedang"}</span>
                        <span>{isEn ? "Advanced" : "Menantang"}</span>
                      </div>
                    </div>

                    {/* Question List */}
                    <div className="space-y-4">
                      {displayedQuestions.map((q, idx) => {
                        const key = questionKey(q, idx);
                        const selectedLabel = testedAnswers[key];
                        const selectedOption = q.options.find(
                          (option) => option.label === selectedLabel
                        );
                        const isExpanded = expandedQuestionExplanations[key] === true;
                        const isCorrect = selectedOption?.isCorrect === true;

                        return (
                          <article
                            key={key}
                            className="overflow-hidden rounded-2xl bg-background-primary-default"
                          >
                            <div className="space-y-3 bg-background-secondary-default/40 p-5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-caption-2-medium text-text-tertiary">
                                  {String(idx + 1).padStart(2, "0")} /{" "}
                                  {String(displayedQuestions.length).padStart(2, "0")}
                                </span>
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {q.conceptTag && (
                                    <Chip variant="caption" color="gray">
                                      {q.conceptTag}
                                    </Chip>
                                  )}
                                  {selectedOption && (
                                    <Chip
                                      variant="caption"
                                      color={isCorrect ? "lime" : "rose"}
                                    >
                                      {isCorrect
                                        ? isEn
                                          ? "Correct"
                                          : "Tepat"
                                        : isEn
                                          ? "Review"
                                          : "Tinjau"}
                                    </Chip>
                                  )}
                                </div>
                              </div>
                              <h4 className="text-title-3-semibold leading-snug text-text-primary">
                                {q.question}
                              </h4>
                            </div>

                            <div className="space-y-3 p-5">
                              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {q.options.map((opt) => {
                                  const isSelected = selectedLabel === opt.label;

                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() => {
                                        soundEffects.playClick();
                                        setTestedAnswers((prev) => ({
                                          ...prev,
                                          [key]: opt.label,
                                        }));
                                        setExpandedQuestionExplanations(
                                          (prev) => ({
                                            ...prev,
                                            [key]: true,
                                          })
                                        );
                                      }}
                                      className={cx(
                                        "flex w-full cursor-pointer flex-col justify-between gap-2 rounded-xl p-3 text-start text-caption-1-regular transition-all",
                                        isSelected
                                          ? opt.isCorrect
                                            ? "bg-emerald-500/15 text-text-primary"
                                            : "bg-rose-500/10 text-text-primary"
                                          : "bg-background-primary-default text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                                      )}
                                    >
                                      <span className="flex w-full items-start justify-between gap-2">
                                        <span className="flex min-w-0 items-start gap-2.5">
                                          <span
                                            className={cx(
                                              "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-caption-2-semibold",
                                              isSelected && opt.isCorrect
                                                ? "bg-emerald-600 text-white"
                                                : isSelected
                                                  ? "bg-rose-600 text-white"
                                                  : "bg-background-secondary-default text-text-tertiary"
                                            )}
                                          >
                                            {opt.label}
                                          </span>
                                          <span className="leading-snug">
                                            {opt.text}
                                          </span>
                                        </span>
                                        {isSelected ? (
                                          <span
                                            className={cx(
                                              "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                                              opt.isCorrect
                                                ? "bg-emerald-500/20 text-state-success-text"
                                                : "bg-rose-500/20 text-text-error-primary"
                                            )}
                                          >
                                            {opt.isCorrect ? (
                                              <RiCheckLine className="size-4" />
                                            ) : (
                                              <RiCloseLine className="size-4" />
                                            )}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                                <span className="text-caption-2-regular text-text-tertiary">
                                  {selectedOption
                                    ? isCorrect
                                      ? isEn
                                        ? "Right choice. Read the reasoning below."
                                        : "Pilihan anda tepat. Baca alasannya di bawah."
                                      : isEn
                                        ? "Review the explanation below, then try another option."
                                        : "Tinjau penjelasan di bawah, lalu coba opsi lain."
                                    : isEn
                                      ? "Select an option above to check your answer."
                                      : "Pilih salah satu opsi di atas untuk menguji jawaban anda."}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="small"
                                  onClick={() => {
                                    soundEffects.playClick();
                                    setExpandedQuestionExplanations((prev) => ({
                                      ...prev,
                                      [key]: !isExpanded,
                                    }));
                                  }}
                                  disabled={!selectedLabel}
                                  leadingIcon={RiLightbulbLine}
                                  aria-expanded={isExpanded && Boolean(selectedLabel)}
                                  aria-controls={`question-explanation-${key}`}
                                >
                                  {isExpanded && selectedLabel
                                    ? isEn
                                      ? "Hide explanation"
                                      : "Tutup penjelasan"
                                    : isEn
                                      ? "Explain answer"
                                      : "Jelaskan jawaban"}
                                </Button>
                              </div>

                              <AnimatePresence initial={false}>
                                {isExpanded && selectedLabel && (
                                  <motion.div
                                    id={`question-explanation-${key}`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <ExplanationPanel
                                      question={q}
                                      selectedLabel={selectedLabel}
                                      isEn={isEn}
                                      showDistractorBreakdown={showDistractorRationale}
                                      contextLabel={sourceLabel}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <ArtifactExpansionBar
                      artifact="quiz"
                      value={artifactExpandInput.quiz || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({ ...prev, quiz: next }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("quiz", q)}
                      loading={expandingArtifact === "quiz"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask to add 3 new quiz questions on a specific concept..."
                          : "Tanyakan topik tertentu untuk menambah 3 soal kuis baru..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Add questions on adjective order and sentence patterns",
                              "Add questions on physical appearance vs personality",
                              "Add questions on connecting words (and, also, but, because)",
                            ]
                          : [
                              "Tambah soal tentang urutan kata sifat (adjective order)",
                              "Tambah soal tentang pola kalimat has, is, dan wears",
                              "Tambah soal penggabungan kalimat dengan and, also, but",
                            ]
                      }
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: SLIDE DECK                                         */}
                {/* ========================================================= */}
                {activeTab === "slides" && processedDoc.slideDeck && (
                  <div className="space-y-6">
                    {/* Presentation Preview Card */}
                    <div className="p-8 rounded-3xl bg-background-secondary-default shadow-card min-h-[300px] flex flex-col justify-between space-y-6">
                      <div className="flex items-center justify-between pb-3">
                        <span className="text-caption-2-medium text-text-tertiary font-mono">
                          {isEn
                            ? `Slide ${activeSlideIndex + 1} of ${processedDoc.slideDeck.length}`
                            : `Slide ${activeSlideIndex + 1} dari ${processedDoc.slideDeck.length}`}
                        </span>
                        <Chip variant="caption" color="blue">
                          {isEn ? "Educator slide" : "Presentasi guru"}
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
                      <div className="p-3.5 rounded-2xl bg-background-primary-default text-caption-1-regular text-text-secondary">
                        <strong className="text-caption-2-semibold text-text-primary block mb-1">
                          {isEn ? "Presenter notes:" : "Catatan pengajar:"}
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
                              activeSlideIndex === i ? "bg-background-tertiary-default border border-border-button-default w-6" : "bg-border-button-default"
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
                          <span>{isEn ? "Previous" : "Sebelumnya"}</span>
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
                          <span>{isEn ? "Next" : "Berikutnya"}</span>
                          <RiArrowRightLine className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 5: MIND MAP (NotebookLM-Grade Interactive Concept Tree) */}
                {/* ========================================================= */}
                {activeTab === "mindmap" && processedDoc.mindMap && (
                  <div className="space-y-6">
                    {(() => {
                      const allBranches = processedDoc.mindMap?.children || [];
                      const totalBranches = allBranches.length;
                      const collapsedCount = Object.values(collapsedBranches).filter(Boolean).length;
                      const isAllCollapsed = totalBranches > 0 && collapsedCount >= totalBranches;
                      const isAllExpanded = collapsedCount === 0;

                      return (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Chip variant="caption" color="blue">
                              {isEn
                                ? `${totalBranches} main branches`
                                : `${totalBranches} cabang utama`}
                            </Chip>
                            <span className="text-caption-2-regular text-text-tertiary">
                              {isEn
                                ? "Click any branch to collapse or expand sub-concepts"
                                : "Klik cabang untuk membuka/menutup sub-konsep atau memperluasnya"}
                            </span>
                          </div>
                          <div className="inline-flex items-center p-1 rounded-xl bg-background-secondary-default border border-border-button-default">
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playClick();
                                setCollapsedBranches({});
                              }}
                              className={cx(
                                "px-3 py-1.5 rounded-lg text-caption-1-medium transition-all cursor-pointer border-0",
                                isAllExpanded
                                  ? "bg-background-tertiary-default text-text-primary shadow-xs font-semibold"
                                  : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              {isEn ? "Expand all" : "Buka semua"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playClick();
                                const next: Record<string, boolean> = {};
                                (processedDoc.mindMap?.children || []).forEach((b) => {
                                  next[b.id] = true;
                                });
                                setCollapsedBranches(next);
                              }}
                              className={cx(
                                "px-3 py-1.5 rounded-lg text-caption-1-medium transition-all cursor-pointer border-0",
                                isAllCollapsed
                                  ? "bg-background-tertiary-default text-text-primary shadow-xs font-semibold"
                                  : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              {isEn ? "Collapse all" : "Ringkas semua"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-5 sm:p-6 rounded-3xl bg-background-secondary-default/50 shadow-card space-y-6">
                      {/* Root Node */}
                      <div className="mx-auto max-w-2xl rounded-2xl bg-accent-500/10 p-5 text-center space-y-1.5">
                        <span className="text-caption-2-medium text-accent-700 block">
                          {isEn ? "Central concept" : "Akar konsep utama"}
                        </span>
                        <h3 className="text-title-2-semibold text-text-primary">
                          {processedDoc.mindMap.label}
                        </h3>
                        <p className="text-body-2-regular text-text-secondary">
                          {processedDoc.mindMap.description}
                        </p>
                      </div>

                      {/* Interactive Branches */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {processedDoc.mindMap.children?.map((branch, bIdx) => {
                          const isCollapsed = Boolean(collapsedBranches[branch.id]);
                          const childCount = branch.children?.length || 0;
                          return (
                            <div
                              key={branch.id || bIdx}
                              className="rounded-2xl bg-background-primary-default p-4 space-y-3 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEffects.playClick();
                                      setCollapsedBranches((prev) => ({
                                        ...prev,
                                        [branch.id]: !prev[branch.id],
                                      }));
                                      setSelectedMindMapNode(branch);
                                    }}
                                    className="flex items-start gap-2 text-start cursor-pointer group"
                                  >
                                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-700/15 font-mono text-caption-2-semibold text-accent-700">
                                      {bIdx + 1}
                                    </span>
                                    <span className="text-body-2-semibold text-text-primary group-hover:text-accent-700 transition-colors">
                                      {branch.label}
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {branch.category && (
                                      <Chip variant="caption" color="blue">
                                        {branch.category}
                                      </Chip>
                                    )}
                                    {childCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          soundEffects.playClick();
                                          setCollapsedBranches((prev) => ({
                                            ...prev,
                                            [branch.id]: !prev[branch.id],
                                          }));
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
                                      >
                                        <span>{childCount}</span>
                                        {isCollapsed ? (
                                          <RiArrowDownSLine className="size-3.5" />
                                        ) : (
                                          <RiArrowUpSLine className="size-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                                  {branch.description}
                                </p>

                                {/* Sub-children */}
                                {!isCollapsed && branch.children && branch.children.length > 0 && (
                                  <div className="pt-2 space-y-2">
                                    {branch.children.map((leaf: MindMapNode, lIdx) => (
                                      <button
                                        key={leaf.id || lIdx}
                                        type="button"
                                        onClick={() => {
                                          soundEffects.playClick();
                                          setSelectedMindMapNode(leaf);
                                        }}
                                        className={cx(
                                          "w-full text-start p-2.5 rounded-xl transition-colors cursor-pointer space-y-0.5",
                                          selectedMindMapNode?.id === leaf.id
                                            ? "bg-accent-500/10"
                                            : "bg-background-secondary-default/60 hover:bg-background-secondary-default/80"
                                        )}
                                      >
                                        <span className="font-semibold text-xs text-text-primary block">
                                          {leaf.label}
                                        </span>
                                        <span className="text-caption-2-regular text-text-secondary block leading-snug">
                                          {leaf.description}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 /60 flex items-center justify-end">
                                <button
                                  type="button"
                                  disabled={expandingArtifact === "mindmap"}
                                  onClick={() =>
                                    void handleExpandArtifact(
                                      "mindmap",
                                      isEn
                                        ? `Expand "${branch.label}" with deeper examples and sub-branches`
                                        : `Perluas cabang "${branch.label}" dengan sub-konsep dan contoh konkret baru`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-caption-2-medium text-accent-700 hover:underline disabled:opacity-50 cursor-pointer"
                                >
                                  <RiAddLine className="size-3.5" />
                                  <span>
                                    {isEn ? "Expand this branch" : "Perluas cabang ini"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <ArtifactExpansionBar
                      artifact="mindmap"
                      value={artifactExpandInput.mindmap || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({ ...prev, mindmap: next }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("mindmap", q)}
                      loading={expandingArtifact === "mindmap"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask to add a new concept branch to this mind map..."
                          : "Tanyakan topik atau aspek untuk menambah cabang baru di peta konsep..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Add a branch for sentence patterns and verb usage",
                              "Add a branch for adjective order and connecting words",
                              "Add a branch for model text analysis (Taylor Swift & Kevin)",
                            ]
                          : [
                              "Tambahkan cabang pola kalimat dan kata kerja (is, has, wears, likes)",
                              "Tambahkan cabang urutan kata sifat dan kata penghubung",
                              "Tambahkan cabang studi kasus teks model (Kevin & Taylor Swift)",
                            ]
                      }
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 6: PEDAGOGICAL REPORT (NotebookLM Briefing Doc)       */}
                {/* ========================================================= */}
                {activeTab === "report" && processedDoc.report && (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="p-5 rounded-2xl bg-background-secondary-default/50 space-y-2">
                      <span className="text-caption-2-medium text-text-tertiary block">
                        {isEn ? "Executive briefing document" : "Dokumen rangkuman laporan"}
                      </span>
                      <p className="text-body-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                        {processedDoc.report.executiveSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Core Competencies */}
                      <div className="p-5 rounded-2xl bg-background-secondary-default/30 space-y-3">
                        <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                          <RiCheckDoubleLine className="size-4 text-emerald-500" />
                          <span>
                            {isEn ? "Core learning competencies" : "Capaian kompetensi utama"}
                          </span>
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
                      <div className="p-5 rounded-2xl bg-background-secondary-default/30 space-y-3">
                        <h4 className="text-body-1-semibold text-text-primary flex items-center gap-2">
                          <RiFireLine className="size-4 text-rose-500" />
                          <span>
                            {isEn ? "Cognitive focus & roadblocks" : "Titik kesulitan utama"}
                          </span>
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

                    {/* Prerequisite Knowledge */}
                    {processedDoc.report.prerequisiteKnowledge &&
                      processedDoc.report.prerequisiteKnowledge.length > 0 && (
                        <div className="p-5 rounded-2xl bg-background-secondary-default/25 space-y-2.5">
                          <h4 className="text-body-2-semibold text-text-primary">
                            {isEn ? "Prerequisite foundation" : "Pengetahuan prasyarat"}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {processedDoc.report.prerequisiteKnowledge.map((pre, idx) => (
                              <span
                                key={idx}
                                className="rounded-xl bg-background-primary-default px-3 py-1.5 text-caption-1-regular text-text-secondary"
                              >
                                {pre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Deep-Dive Sections */}
                    {processedDoc.report.sections &&
                      processedDoc.report.sections.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-title-3-semibold text-text-primary">
                            {isEn ? "Thematic analysis sections" : "Bagian analisis mendalam"}
                          </h4>
                          <div className="space-y-3">
                            {processedDoc.report.sections.map((sec, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl bg-background-primary-default p-5 space-y-3"
                              >
                                <h5 className="text-body-1-semibold text-text-primary">
                                  {sec.heading}
                                </h5>
                                <p className="text-caption-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                                  {sec.content}
                                </p>
                                {sec.keyPoints && sec.keyPoints.length > 0 && (
                                  <ul className="space-y-1.5 pt-2 text-caption-1-regular text-text-secondary">
                                    {sec.keyPoints.map((kp, kIdx) => (
                                      <li key={kIdx} className="flex items-start gap-2">
                                        <span className="text-accent-700 font-bold">•</span>
                                        <span>{kp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Recommended Action */}
                    {processedDoc.report.recommendedAction && (
                      <div className="p-4 rounded-2xl bg-accent-500/10 text-caption-1-regular text-text-primary space-y-1">
                        <strong className="text-accent-700 font-semibold block">
                          {isEn
                            ? "Recommended learning progression:"
                            : "Rekomendasi langkah pembelajaran:"}
                        </strong>
                        <p className="text-text-secondary">
                          {processedDoc.report.recommendedAction}
                        </p>
                      </div>
                    )}

                    <ArtifactExpansionBar
                      artifact="report"
                      value={artifactExpandInput.report || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({ ...prev, report: next }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("report", q)}
                      loading={expandingArtifact === "report"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask a question to add a new analysis section to this report..."
                          : "Tanyakan sesuatu untuk menambah bagian analisis baru pada laporan..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Analyze common grammar errors when describing people",
                              "Break down the 7 practice exercises and their learning goals",
                              "Create a rubric for the mini writing task",
                            ]
                          : [
                              "Analisis kesalahan umum saat menggunakan is, has, dan wears",
                              "Bedah tahapan 7 latihan (practice 1 sampai 7) dalam modul ini",
                              "Susun panduan penilaian untuk tugas menulis deskripsi tokoh",
                            ]
                      }
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 7: DATA TABLE (NotebookLM Structured Matrix)          */}
                {/* ========================================================= */}
                {activeTab === "table" && processedDoc.dataTable && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        {processedDoc.dataTable.title && (
                          <h3 className="text-title-3-semibold text-text-primary">
                            {processedDoc.dataTable.title}
                          </h3>
                        )}
                        {processedDoc.dataTable.description && (
                          <p className="text-caption-1-regular text-text-secondary">
                            {processedDoc.dataTable.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Chip variant="caption" color="gray">
                          {processedDoc.dataTable.rows.length}{" "}
                          {isEn ? "rows" : "baris"}
                        </Chip>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={handleCopyTableCsv}
                          leadingIcon={RiDownloadLine}
                        >
                          {isEn ? "Copy csv" : "Salin csv"}
                        </Button>
                      </div>
                    </div>

                    {/* Search filter bar */}
                    <div>
                      <input
                        type="text"
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        placeholder={
                          isEn
                            ? "Filter table rows by keyword..."
                            : "Cari kata kunci di dalam tabel data..."
                        }
                        className="min-h-[40px] w-full rounded-xl border border-border-button-default bg-background-secondary-default/50 px-3.5 py-2 text-body-medium text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-border-focus-ring shadow-xs"
                      />
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-background-secondary-default/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-caption-1-regular">
                          <thead className="bg-background-primary-default text-text-secondary">
                            <tr>
                              {processedDoc.dataTable.columns.map((col, i) => (
                                <th key={i} className="py-3 px-4 font-semibold text-xs">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="">
                            {processedDoc.dataTable.rows
                              .filter((row) => {
                                const q = tableSearchQuery.trim().toLowerCase();
                                if (!q) return true;
                                return processedDoc.dataTable!.columns.some((col) =>
                                  String(row[col] ?? "")
                                    .toLowerCase()
                                    .includes(q)
                                );
                              })
                              .map((row, i) => (
                                <tr
                                  key={i}
                                  className="hover:bg-background-secondary-default/80 transition-colors"
                                >
                                  {processedDoc.dataTable!.columns.map((col, j) => (
                                    <td
                                      key={j}
                                      className="py-3 px-4 text-text-primary text-xs leading-relaxed"
                                    >
                                      {String(row[col] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <ArtifactExpansionBar
                      artifact="table"
                      value={artifactExpandInput.table || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({ ...prev, table: next }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("table", q)}
                      loading={expandingArtifact === "table"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask to add more rows to this data table..."
                          : "Tanyakan kategori atau aspek untuk menambah baris baru ke tabel..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Add rows for personality traits and their Indonesian meanings",
                              "Add rows for useful verbs (is, has, wears, likes, enjoys)",
                              "Add rows comparing Kevin and Taylor Swift from the text",
                            ]
                          : [
                              "Tambahkan baris kosakata sifat kepribadian beserta artinya",
                              "Tambahkan baris kata kerja utama (is, has, wears, likes, enjoys)",
                              "Tambahkan baris perbandingan profil Kevin dan Taylor Swift",
                            ]
                      }
                    />
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 8: INFOGRAPHIC (NotebookLM Visual Study Poster)       */}
                {/* ========================================================= */}
                {activeTab === "infographic" && processedDoc.infographic && (
                  <div className="space-y-6">
                    {/* Central Banner */}
                    <div className="p-6 rounded-3xl bg-gradient-to-r from-accent-700 to-accent-900 text-white shadow-card space-y-2 text-center">
                      <span className="text-caption-2-medium opacity-80 block">
                        {processedDoc.infographic.subtitle ||
                          (isEn ? "Essential visual infographic" : "Rangkuman visual esensial")}
                      </span>
                      <h3 className="text-title-1-bold">{processedDoc.infographic.title}</h3>
                      <p className="text-body-2-regular opacity-90 max-w-xl mx-auto">
                        {processedDoc.infographic.centralConcept}
                      </p>
                    </div>

                    {/* Visual Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processedDoc.infographic.pillars.map((pillar, i) => (
                        <div
                          key={i}
                          className="p-5 rounded-2xl bg-background-secondary-default/50 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-background-tertiary-default text-text-primary border border-border-button-default font-mono text-xs font-bold">
                                {i + 1}
                              </span>
                              <h4 className="text-body-1-semibold text-text-primary">
                                {pillar.title}
                              </h4>
                            </div>
                            <ul className="space-y-1.5 text-caption-1-regular text-text-secondary">
                              {pillar.keyPoints.map((pt, j) => (
                                <li key={j} className="flex items-start gap-1.5">
                                  <span className="text-accent-700 font-bold">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {pillar.quoteOrMnemonic && (
                            <div className="pt-3 text-caption-2-semibold text-accent-700 italic">
                              &ldquo;{pillar.quoteOrMnemonic}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <ArtifactExpansionBar
                      artifact="infographic"
                      value={artifactExpandInput.infographic || ""}
                      onChange={(next) =>
                        setArtifactExpandInput((prev) => ({
                          ...prev,
                          infographic: next,
                        }))
                      }
                      onSubmit={(q) => void handleExpandArtifact("infographic", q)}
                      loading={expandingArtifact === "infographic"}
                      isEn={isEn}
                      placeholder={
                        isEn
                          ? "Ask to add a new visual pillar to this infographic..."
                          : "Tanyakan topik untuk menambah pilar visual baru pada infografik..."
                      }
                      suggestions={
                        isEn
                          ? [
                              "Add a pillar on adjective order (Size/Length -> Color -> Noun)",
                              "Add a pillar on connecting words (and, also, but, because)",
                              "Add a pillar on hobbies and daily habits",
                            ]
                          : [
                              "Tambahkan pilar rumus urutan kata sifat (ukuran -> warna -> benda)",
                              "Tambahkan pilar kata penghubung (and, also, but, because)",
                              "Tambahkan pilar kosakata hobi dan kebiasaan tokoh",
                            ]
                      }
                    />
                  </div>
                )}
              </motion.div>
            )}
          </section>

        </div>
      </main>

      {/* Floating Exile Copilot toggle button */}
      <button
        type="button"
        onClick={() => {
          soundEffects.playClick();
          setIsCopilotDrawerOpen((prev) => !prev);
        }}
        aria-label={
          isCopilotDrawerOpen
            ? isEn
              ? "Close Exile copilot"
              : "Tutup Exile copilot"
            : isEn
              ? "Open Exile copilot"
              : "Buka Exile copilot"
        }
        title="Exile copilot"
        className={cx(
          "fixed bottom-5 end-5 z-40 size-12 rounded-full",
          "bg-background-primary-default hover:bg-background-secondary-default text-text-primary shadow-xl",
          "flex items-center justify-center transition-all cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          isCopilotDrawerOpen && "hidden sm:flex scale-95"
        )}
      >
        {isCopilotDrawerOpen ? (
          <RiCloseLine className="size-5 shrink-0" aria-hidden="true" />
        ) : (
          <RiCopilotFill className="size-5 shrink-0 text-accent-700" aria-hidden="true" />
        )}
      </button>

      {/* Exile Copilot Right-Side Drawer / Mobile Bottom Sheet */}
      <AnimatePresence>
        {isCopilotDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsCopilotDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.aside
              role="dialog"
              aria-label="Exile copilot"
              aria-modal="true"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 top-12 z-50 flex w-full sm:w-[420px] max-w-full flex-col rounded-t-3xl bg-background-primary-default shadow-2xl border-0 overflow-hidden sm:top-3 sm:bottom-20 sm:end-4 sm:inset-x-auto sm:rounded-3xl"
            >
              {/* Phone grab handle */}
              <div className="flex justify-center pt-2 sm:hidden shrink-0">
                <div className="h-1 w-10 rounded-full bg-border-button-default" />
              </div>

              {/* Pinned Drawer Header */}
              <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-background-secondary-default/50 border-b border-separator-border/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-background-tertiary-default text-text-primary flex items-center justify-center shrink-0">
                    <RiCopilotFill className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-body-1-semibold text-text-primary truncate">
                      Exile copilot
                    </h3>
                    <p className="text-caption-2-regular text-text-secondary">
                      {isEn ? "Context-aware AI tutor & studio assistant" : "Asisten studio & tutor AI kontekstual"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearCopilotChat}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-error-primary hover:bg-background-secondary-default transition-colors cursor-pointer border-0"
                    aria-label={isEn ? "Clear chat" : "Bersihkan obrolan"}
                    title={isEn ? "Clear chat" : "Bersihkan obrolan"}
                  >
                    <RiDeleteBinLine className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setIsCopilotDrawerOpen(false);
                    }}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer shrink-0 border-0"
                    aria-label={isEn ? "Close" : "Tutup"}
                    title={isEn ? "Close exile copilot" : "Tutup exile copilot"}
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Message History with ScrollFade */}
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                  onScroll={copilotScrollFade.onScroll}
                  className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cx(
                        "p-3 rounded-2xl leading-relaxed text-xs space-y-1.5",
                        msg.role === "user"
                          ? "bg-accent-500/15 text-text-primary ms-4"
                          : "bg-background-secondary-default text-text-secondary me-4"
                      )}
                    >
                      <div className="font-semibold text-caption-2-medium text-text-tertiary">
                        {msg.role === "user" ? (isEn ? "You" : "Anda") : "Exile copilot"}
                      </div>
                      {msg.imagePreview && (
                        <div className="rounded-lg overflow-hidden max-w-[160px]">
                          <Image
                            src={msg.imagePreview}
                            alt="Lampiran tangkapan layar"
                            width={320}
                            height={180}
                            unoptimized
                            className="w-full h-auto object-cover max-h-24"
                          />
                        </div>
                      )}
                      <FormattedMessage content={msg.content} />
                      {msg.actionCard && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-background-secondary-default border border-border-button-default space-y-2 text-start">
                          <div className="flex items-center gap-2 text-caption-1-semibold text-text-primary">
                            <RiCheckLine className="size-4 text-accent-700" />
                            <span>{msg.actionCard.label}</span>
                          </div>
                          {msg.actionCard.topic && (
                            <p className="text-caption-2-regular text-text-secondary">
                              {isEn ? "Topic:" : "Topik:"} {msg.actionCard.topic} {msg.actionCard.count ? `• ${msg.actionCard.count} ${isEn ? "items" : "butir"}` : ""}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              soundEffects.playClick();
                              setActiveTab(msg.actionCard!.artifactType);
                            }}
                            className="w-full justify-center min-h-[32px] font-medium"
                          >
                            {isEn ? `Open ${msg.actionCard.label} tab` : `Buka tab ${msg.actionCard.label}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="p-3 rounded-2xl bg-background-secondary-default text-text-tertiary text-xs animate-pulse">
                      {isEn ? "Exile Copilot is reasoning through context..." : "Exile Copilot sedang menganalisis masukan..."}
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
                <ScrollFade
                  progress={copilotScrollFade.progress}
                  surfaceClassName="from-background-primary-default"
                />
              </div>

              {/* Attached Screenshot Preview */}
              {copilotAttachedImage && (
                <div className="mx-4 mb-2 p-2 rounded-xl bg-background-secondary-default flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Image
                      src={copilotAttachedImage.base64}
                      alt="Pratinjau"
                      width={32}
                      height={32}
                      unoptimized
                      className="size-8 rounded-lg object-cover shrink-0"
                    />
                    <span className="truncate text-caption-2-medium text-text-primary">
                      {copilotAttachedImage.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCopilotAttachedImage(null)}
                    className="p-1 text-text-tertiary hover:text-rose-500 transition-colors cursor-pointer border-0"
                    title="Hapus lampiran"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              )}

              {/* Pinned Input Form */}
              <div className="shrink-0 p-3 sm:p-4 border-t border-separator-border/40 bg-background-primary-default pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                  <input
                    ref={copilotImageInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.heic,.heif,.jfif,.tiff,.tif,image/*"
                    onChange={handleCopilotImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => copilotImageInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-default/80 text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 border-0"
                    title="Lampirkan tangkapan layar fitur"
                  >
                    <RiImageAddLine className="size-4" />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.studio.copilotInputPlaceholder}
                    className="flex-1 p-2 sm:p-2.5 rounded-xl bg-background-secondary-default text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 text-xs border-0"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || (!chatInput.trim() && !copilotAttachedImage)}
                    className="p-2 sm:p-2.5 rounded-xl bg-background-secondary-default hover:bg-background-secondary-hover text-text-primary disabled:opacity-50 transition-colors cursor-pointer shrink-0 border-0"
                    title="Kirim pesan"
                  >
                    <RiSendPlane2Line className="size-4" />
                  </button>
                </form>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bahan Ajar Drawer / Sheet */}
      <AnimatePresence>
        {isMobileSourcesOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMobileSourcesOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-label={isEn ? "Source material" : "Bahan ajar"}
              aria-modal="true"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col rounded-t-3xl bg-background-primary-default shadow-2xl border-0 overflow-hidden sm:inset-y-0 sm:start-0 sm:end-auto sm:top-0 sm:w-[420px] sm:max-w-full sm:rounded-none sm:rounded-e-3xl lg:hidden"
            >
              <div className="flex justify-center pt-2 sm:hidden shrink-0">
                <div className="h-1 w-10 rounded-full bg-border-button-default" />
              </div>
              <div className="flex shrink-0 items-center justify-between px-4 py-3 bg-background-secondary-default/50 border-b border-separator-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-700">
                    <RiBookOpenLine className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-body-2-semibold text-text-primary">
                      {isEn ? "Source material" : "Bahan ajar"}
                    </h3>
                    <p className="text-caption-2-regular text-text-tertiary">
                      {isEn ? "Edit text, upload files, and pick artifacts" : "Ubah teks, unggah berkas, dan pilih artifak"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSourcesOpen(false)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer border-0"
                  aria-label={isEn ? "Close material drawer" : "Tutup panel bahan ajar"}
                >
                  <RiCloseLine className="size-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {renderSourcesRailContent(true)}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Quick Quiz Modal */}
      <Modal
        isOpen={isQuickQuizOpen}
        onOpenChange={setIsQuickQuizOpen}
        size="lg"
        aria-label={isEn ? "Quick quiz" : "Kuis cepat"}
        className="max-h-[92vh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl overflow-clip flex flex-col border-0 my-auto"
      >
        <ModalHeader
          title={isEn ? "Quick quiz" : "Kuis cepat"}
          description={
            isEn
              ? "Standalone one-time quiz without material. For quizzes anchored to your material, use the Adaptive quiz artifact."
              : "Kuis satu kali tanpa materi. Untuk kuis dari materi, pakai artefak Kuis adaptif."
          }
          icon={RiQuestionnaireLine}
          className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3"
        />

        <ModalBody className="space-y-3 sm:space-y-4 px-4 sm:px-6 py-2">
          <Input
            label={isEn ? "Quiz topic" : "Topik kuis"}
            placeholder={
              isEn
                ? "E.g. basa bali alus for grade 8"
                : "Mis. basa bali alus kelas 8"
            }
            hint={
              isEn
                ? "Multiple-choice questions are generated automatically."
                : "Soal pilihan ganda dibuat otomatis."
            }
            value={aiQuizTopic}
            onChange={setAiQuizTopic}
            maxLength={140}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption-1-medium text-text-secondary">
                {isEn ? "Questions" : "Jumlah soal"}
              </span>
              <span className="rounded-lg bg-background-secondary-default px-2.5 py-0.5 font-mono text-caption-1-semibold tabular-nums text-text-primary">
                {aiQuizCount} {isEn ? "questions" : "soal"}
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              step={1}
              aria-label={isEn ? "Questions" : "Jumlah soal"}
              value={aiQuizCount}
              onChange={(e) => {
                soundEffects.playClick();
                setAiQuizCount(Number(e.target.value));
              }}
              className="w-full h-2 rounded-lg bg-border-button-default accent-accent-700 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption-1-medium text-text-secondary">
                {isEn ? "Difficulty" : "Tingkat kesulitan"}
              </span>
              <span className="rounded-lg bg-background-secondary-default px-2.5 py-0.5 font-mono text-caption-1-semibold tabular-nums text-text-primary">
                {aiQuizDifficulty === "mudah"
                  ? isEn
                    ? "Easy"
                    : "Mudah"
                  : aiQuizDifficulty === "sedang"
                    ? isEn
                      ? "Medium"
                      : "Sedang"
                    : isEn
                      ? "Hard"
                      : "Sulit"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-background-secondary-default p-1">
              {(
                [
                  { id: "mudah" as const, labelId: "Mudah", labelEn: "Easy" },
                  { id: "sedang" as const, labelId: "Sedang", labelEn: "Medium" },
                  { id: "sulit" as const, labelId: "Sulit", labelEn: "Hard" },
                ]
              ).map((lvl) => {
                const active = aiQuizDifficulty === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    disabled={aiQuizLoading}
                    onClick={() => {
                      soundEffects.playClick();
                      setAiQuizDifficulty(lvl.id);
                    }}
                    className={cx(
                      "rounded-lg px-1.5 py-1 text-center text-caption-1-medium transition-colors cursor-pointer border-0",
                      active
                        ? "bg-background-tertiary-default text-text-primary font-semibold shadow-2xs"
                        : "text-text-secondary hover:text-text-primary hover:bg-background-tertiary-default"
                    )}
                  >
                    {isEn ? lvl.labelEn : lvl.labelId}
                  </button>
                );
              })}
            </div>
          </div>

          {aiQuiz && (
            <div className="overflow-hidden rounded-2xl bg-background-secondary-default/40 border-0">
              <div className="space-y-3 bg-accent-500/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <span className="block text-caption-2-medium tracking-wide text-text-tertiary">
                      {isEn ? "Study set" : "Set belajar"}
                    </span>
                    <h5 className="text-body-1-semibold leading-snug text-text-primary">
                      {aiQuiz.quiz.title}
                    </h5>
                  </div>
                  <Chip variant="caption" color="blue">
                    {aiQuiz.quiz.questions.length} {isEn ? "questions" : "soal"}
                  </Chip>
                </div>
                {aiQuizConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {aiQuizConcepts.map((concept) => (
                      <Chip key={concept} variant="caption" color="gray">
                        {concept}
                      </Chip>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={openAiInstantQuiz}
                    leadingIcon={RiPlayCircleLine}
                    className="flex-1 justify-center"
                  >
                    {isEn ? "Play now" : "Main sekarang"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setIsQuickQuizOpen(false);
                      void handleLaunchAiQuiz();
                    }}
                    disabled={launchingRoom}
                    leadingIcon={RiPlayCircleLine}
                    className="flex-1 justify-center"
                  >
                    {launchingRoom
                      ? isEn
                        ? "Opening..."
                        : "Membuka..."
                      : isEn
                        ? "Quiz room"
                        : "Ruang kuis"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    iconOnly
                    onClick={handleGenerateAiQuiz}
                    disabled={aiQuizLoading}
                    leadingIcon={RiRefreshLine}
                    aria-label={isEn ? "Regenerate quiz" : "Buat ulang kuis"}
                  />
                </div>
              </div>

              <div className="space-y-2 p-3">
                {aiQuiz.quiz.questions.map((question, index) => {
                  const isOpen = expandedAiQuestionIndex === index;
                  const pickedLabel = aiQuizAnswers[index];
                  return (
                    <div
                      key={`${index}-${question.conceptTag}`}
                      className="overflow-hidden rounded-xl bg-background-primary-default border-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setExpandedAiQuestionIndex(isOpen ? null : index);
                        }}
                        aria-expanded={isOpen}
                        aria-controls={`ai-question-explanation-${index}`}
                        className="flex w-full items-start gap-2.5 p-3 text-start transition-colors hover:bg-background-secondary-default/60 cursor-pointer border-0"
                      >
                        <span className="mt-0.5 font-mono text-caption-2-medium text-text-tertiary">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="block text-caption-1-medium leading-snug text-text-primary">
                            {question.question}
                          </span>
                          <Chip variant="caption" color="gray">
                            {question.conceptTag}
                          </Chip>
                        </span>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-caption-2-medium text-accent-700">
                          <span className="hidden sm:inline">
                            {isOpen
                              ? isEn
                                ? "Hide"
                                : "Tutup"
                              : isEn
                                ? "Answer"
                                : "Jawab"}
                          </span>
                          {isOpen ? (
                            <RiArrowUpSLine className="size-4" />
                          ) : (
                            <RiArrowDownSLine className="size-4" />
                          )}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`ai-question-explanation-${index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 p-3">
                              <div className="grid grid-cols-1 gap-2">
                                {question.options.map((opt) => {
                                  const isSelected = pickedLabel === opt.label;
                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() => {
                                        soundEffects.playClick();
                                        setAiQuizAnswers((prev) => ({
                                          ...prev,
                                          [index]: opt.label,
                                        }));
                                      }}
                                      className={cx(
                                        "flex w-full items-start justify-between gap-2 rounded-xl p-2.5 text-start text-caption-2-regular transition-colors cursor-pointer border-0",
                                        isSelected
                                          ? opt.isCorrect
                                            ? "bg-emerald-500/15 text-text-primary"
                                            : "bg-rose-500/10 text-text-primary"
                                          : "bg-background-secondary-default/50 text-text-secondary hover:bg-background-secondary-default"
                                      )}
                                    >
                                      <span className="flex items-start gap-2 min-w-0">
                                        <span
                                          className={cx(
                                            "inline-flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold",
                                            isSelected && opt.isCorrect
                                              ? "bg-emerald-600 text-text-white"
                                              : isSelected
                                                ? "bg-rose-600 text-text-white"
                                                : "bg-background-secondary-default text-text-tertiary"
                                          )}
                                        >
                                          {opt.label}
                                        </span>
                                        <span className="leading-snug">{opt.text}</span>
                                      </span>
                                      {isSelected ? (
                                        opt.isCorrect ? (
                                          <RiCheckLine className="size-4 shrink-0 text-state-success-text" />
                                        ) : (
                                          <RiCloseLine className="size-4 shrink-0 text-text-error-primary" />
                                        )
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                              {pickedLabel && (
                                <ExplanationPanel
                                  question={question}
                                  selectedLabel={pickedLabel}
                                  isEn={isEn}
                                  showDistractorBreakdown={showDistractorRationale}
                                  contextLabel={aiQuizTopic.trim() || sourceLabel}
                                  compact
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="mt-0 shrink-0 border-t border-separator-border/40 bg-background-full px-4 py-3 sm:px-6 sm:py-3 flex-row items-center justify-end gap-2 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="medium"
            onClick={() => setIsQuickQuizOpen(false)}
          >
            {isEn ? "Cancel" : "Batal"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="medium"
            onClick={handleGenerateAiQuiz}
            disabled={
              aiQuizLoading ||
              (aiQuizTopic.trim().length < 2 && docText.trim().length < 20)
            }
            className="gap-2 font-semibold flex-1 sm:flex-initial justify-center"
          >
            <span className="inline-flex items-center gap-2">
              <RiCopilotFill
                className={cx("size-4", aiQuizLoading && "animate-spin")}
              />
              <span>
                {aiQuizLoading
                  ? isEn
                    ? "Generating..."
                    : "Menyusun soal..."
                  : isEn
                    ? "Create quiz"
                    : "Buat kuis"}
              </span>
            </span>
          </Button>
        </ModalFooter>
      </Modal>

      <InstantQuizDialog
        key={instantQuiz?.id ?? "closed-instant-quiz"}
        run={instantQuiz}
        isEn={isEn}
        timeLimitMs={Math.max(5, settings.defaultQuestionTimeSec) * 1000}
        onClose={() => setInstantQuiz(null)}
        onLaunchLive={() => {
          if (instantQuiz?.launch === "ai") {
            void handleLaunchAiQuiz();
          } else {
            void handleLaunchRoom();
          }
        }}
      />

      <Modal
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        size="lg"
        aria-label={isEn ? "Saved history" : "Riwayat tersimpan"}
        className="space-y-4 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4">
          <div className="space-y-0.5">
            <h3 className="text-title-3-semibold text-text-primary">
              {isEn ? "Saved notebooks & files" : "Riwayat dokumen & artifak"}
            </h3>
            <p className="text-caption-1-regular text-text-secondary">
              {isEn
                ? "Reopen uploaded pdfs, generated artifacts, and your saved progress."
                : "Buka kembali berkas pdf, hasil artifak, dan progres yang telah disimpan."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleNewNotebook}
              leadingIcon={RiAddLine}
            >
              {isEn ? "New notebook" : "Notebook baru"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiCloseLine}
              onClick={() => setIsHistoryOpen(false)}
              aria-label={isEn ? "Close" : "Tutup"}
            />
          </div>
        </div>

        {historyEntries.length === 0 ? (
          <div className="rounded-2xl bg-background-secondary-default/40 p-8 text-center space-y-2">
            <p className="text-body-2-medium text-text-primary">
              {isEn ? "No saved history yet" : "Belum ada riwayat tersimpan"}
            </p>
            <p className="text-caption-1-regular text-text-secondary">
              {isEn
                ? "Upload a document or craft an artifact and it will be saved here automatically."
                : "Unggah berkas dokumen atau buat artifak untuk menyimpannya secara otomatis di sini."}
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
            {historyEntries.map((entry) => {
              const isCurrent = entry.id === currentNotebookId;
              const doc = entry.processedDoc;
              const badgeList: string[] = [];
              if (doc?.flashcards?.length) {
                badgeList.push(`${doc.flashcards.length} kartu`);
              }
              if (doc?.quiz?.length) {
                badgeList.push(`${doc.quiz.length} soal`);
              }
              if (doc?.summary?.overview) {
                badgeList.push(isEn ? "Summary" : "Intisari");
              }
              if (doc?.mindMap) {
                badgeList.push(isEn ? "Mind map" : "Peta konsep");
              }
              if (doc?.infographic) {
                badgeList.push(isEn ? "Infographic" : "Infografik");
              }
              if (doc?.dataTable) {
                badgeList.push(isEn ? "Data table" : "Tabel data");
              }
              if (doc?.report) {
                badgeList.push(isEn ? "Report" : "Laporan");
              }

              return (
                <div
                  key={entry.id}
                  className={cx(
                    "flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between",
                    isCurrent
                      ? "bg-accent-500/5"
                      : "bg-background-secondary-default/40"
                  )}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-body-2-semibold text-text-primary">
                        {entry.title}
                      </span>
                      {isCurrent && (
                        <Chip variant="caption" color="blue">
                          {isEn ? "Active" : "Aktif"}
                        </Chip>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-caption-2-regular text-text-tertiary">
                      <span>{entry.fileName}</span>
                      <span>·</span>
                      <span>
                        {new Date(entry.updatedAt).toLocaleString(
                          isEn ? "en-US" : "id-ID",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        )}
                      </span>
                    </div>
                    {badgeList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {badgeList.map((b) => (
                          <Chip key={b} variant="caption" color="gray">
                            {b}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleLoadHistoryEntry(entry)}
                    >
                      {isEn ? "Open" : "Buka"}
                    </Button>
                    <MoreMenu
                      items={[
                        {
                          id: `history-delete-${entry.id}`,
                          label: isEn ? "Delete entry" : "Hapus riwayat",
                          icon: RiDeleteBinLine,
                          isDestructive: true,
                          destructiveTitle: isEn ? "Delete history entry" : "Hapus riwayat",
                          destructiveDescription: isEn
                            ? `Are you sure you want to delete "${entry.title}"?`
                            : `Apakah anda yakin ingin menghapus "${entry.title}"?`,
                          confirmLabel: isEn ? "Delete" : "Hapus",
                          cancelLabel: isEn ? "Cancel" : "Batal",
                          onAction: () => handleDeleteHistoryEntry(entry.id),
                        },
                      ]}
                      aria-label={isEn ? "History entry options" : "Opsi entri riwayat"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <PreScanModal
        isOpen={isPreScanModalOpen}
        onClose={() => setIsPreScanModalOpen(false)}
        onSelectMode={handleSelectScanMode}
        isEn={isEn}
      />

      <MobileHomeworkScanner
        isOpen={isScannerOpen}
        mode={scannerMode}
        onClose={() => setIsScannerOpen(false)}
        onComplete={handleScannerComplete}
        isEn={isEn}
      />

      <DirectAnswerCard
        isOpen={isDirectAnswerCardOpen}
        onClose={() => setIsDirectAnswerCardOpen(false)}
        answers={directAnswers}
        rawTranscription={scanTranscription}
        onAskCopilot={handleAskCopilotFromDirectAnswers}
        isEn={isEn}
      />
    </div>
  );
}
