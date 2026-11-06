"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  RiEyeLine,
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
  RiSaveLine,
  RiAddLine,
} from "@remixicon/react";
import Image from "next/image";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Modal } from "@/components/base/modal/modal";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { useTranslation } from "@/lib/i18n/use-translation";
import { saveHostToken } from "@/lib/rooms/host-token";
import { soundEffects } from "@/lib/audio/sounds";
import { FormattedMessage } from "@/components/chat/formatted-message";
import { ScrollReveal } from "@/components/foundations/scroll-reveal/scroll-reveal";
import { cx } from "@/utils/cx";
import type {
  DocumentAnalysis,
  MindMapNode,
  Question,
  Quiz,
  StudioCraftableArtifact,
} from "@/lib/ai/prompts";
import {
  loadStudioHistory,
  saveStudioHistoryEntry,
  deleteStudioHistoryEntry,
  type StudioHistoryEntry,
} from "@/lib/studio/history-store";
import {
  calculateResponseScore,
  evaluateQuizResponse,
} from "@/lib/quiz/scoring";
import type { ScoreResult } from "@/lib/quiz/scoring";
import { confidenceLevel } from "@/lib/wayground/flashcards";

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
    <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-separator-border bg-background-secondary-default/60 px-4 py-3">
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
              "rounded-xl border p-3",
              selectedOption.isCorrect
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-border-error-default bg-rose-500/10"
            )}
          >
            <span
              className={cx(
                "mb-1 flex items-center gap-1.5 text-caption-2-medium",
                selectedOption.isCorrect
                  ? "text-emerald-700 dark:text-emerald-300"
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
            {selectedOption.distractorRationale && (
              <p className="mt-1 text-caption-2-regular leading-relaxed text-text-secondary">
                {selectedOption.distractorRationale}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 border-t border-separator-border pt-3 text-caption-2-regular text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
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
    <div className="space-y-3 rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RiCopilotFill className="size-4 text-accent-700" />
          <span className="text-caption-1-semibold text-text-primary">
            {isEn
              ? "Expand this artifact with a question"
              : "Perluas artifak ini dengan pertanyaan"}
          </span>
        </div>
        <span className="text-caption-2-regular text-text-tertiary">
          {isEn
            ? "Keep asking until the artifact covers everything you need"
            : "Tanyakan terus sampai bahasan artifak ini terasa cukup"}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={`${artifact}-${suggestion}`}
              type="button"
              disabled={loading}
              onClick={() => {
                onChange(suggestion);
                onSubmit(suggestion);
              }}
              className="rounded-full border border-border-button-default bg-background-primary-default px-3 py-1 text-caption-2-regular text-text-secondary transition-colors hover:border-accent-500/40 hover:text-text-primary disabled:opacity-50 cursor-pointer"
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
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-xl border border-border-button-default bg-background-primary-default px-3.5 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-60"
        />
        <Button
          type="submit"
          variant="secondary"
          size="small"
          disabled={loading || value.trim().length < 2}
          className="shrink-0 justify-center"
        >
          <RiCopilotFill className={cx("size-3.5", loading && "animate-spin")} />
          <span>
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
      aria-label={isEn ? "Instant quiz" : "Kuis instan"}
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
                <span>{isEn ? "Instant practice" : "Latihan instan"}</span>
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
                    className="rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-3 text-center"
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

              <div className="space-y-2.5 rounded-2xl border border-border-button-default p-4">
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
                  {isEn ? "Launch live room" : "Buka ruang live"}
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
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-caption-2-medium tabular-nums",
                    remainingSec <= 5 && !revealed
                      ? "border-border-error-default bg-background-secondary-default text-text-error-primary"
                      : "border-border-button-default bg-background-secondary-default text-text-secondary"
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
                        "group flex min-h-24 w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-all cursor-pointer disabled:cursor-default motion-safe:active:scale-[0.99]",
                        isSelectedCorrect
                          ? "border-emerald-500 bg-emerald-500/15"
                          : isWrongSelection
                            ? "border-border-error-default bg-rose-500/10"
                            : revealed
                              ? "border-border-button-default bg-background-primary-default opacity-60"
                              : "border-border-button-default bg-background-secondary-default/50 hover:-translate-y-0.5 hover:border-border-button-hover hover:bg-background-secondary-default"
                      )}
                    >
                      <span
                        className={cx(
                          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border font-mono text-body-2-semibold",
                          isSelectedCorrect
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : isWrongSelection
                              ? "border-rose-600 bg-rose-600 text-white"
                              : "border-border-button-default bg-background-primary-default text-text-secondary"
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
                          <RiCheckLine className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isWrongSelection ? (
                          <RiCloseLine className="size-4 text-text-error-primary" />
                        ) : (
                          <span className="size-2 rounded-full bg-border-button-default transition-colors group-hover:bg-border-button-hover" />
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
                          ? "text-emerald-600 dark:text-emerald-400"
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
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-separator-border bg-background-full px-5 py-4 sm:px-7">
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
  const copilotImageInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const docTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial state starts completely empty — no forced template
  const [docText, setDocText] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [reasoningElapsedSec, setReasoningElapsedSec] = useState<number>(0);
  const [, setProcessingStep] = useState<string>("");
  const [processedDoc, setProcessedDoc] = useState<
    (DocumentAnalysis & { quizId?: string }) | null
  >(null);

  // Studio Artifact Tab Navigation & Craft Selection
  const [activeTab, setActiveTab] = useState<StudioArtifactTab>("flashcards");
  const [selectedArtifacts, setSelectedArtifacts] = useState<
    StudioCraftableArtifact[]
  >(["flashcards"]);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const toggleArtifactSelection = (artifact: StudioCraftableArtifact) => {
    soundEffects.playClick();
    setSelectedArtifacts((prev) => {
      if (prev.includes(artifact)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== artifact);
      }
      return [...prev, artifact];
    });
  };

  // Student POV Simulator Toggle
  const [studentPovActive, setStudentPovActive] = useState<boolean>(false);

  // Adaptive Quiz Difficulty Slider (1 = Dasar, 2 = Sedang, 3 = Menantang HOTS)
  const [quizDifficulty, setQuizDifficulty] = useState<number>(2);
  const [testedAnswers, setTestedAnswers] = useState<Record<string, string>>({});
  const [showDistractorRationale, setShowDistractorRationale] = useState<boolean>(true);
  const [expandedQuestionExplanations, setExpandedQuestionExplanations] = useState<Record<string, boolean>>({});

  // 3D Flashcards State
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showFlashcardHint, setShowFlashcardHint] = useState<boolean>(false);
  // Wayground-style study loop: cards the learner marked "Got it".
  const [masteredCards, setMasteredCards] = useState<number[]>([]);
  const [cardViewMode, setCardViewMode] = useState<"deck" | "grid">("deck");
  const [cardTagFilter, setCardTagFilter] = useState<string>("all");
  const [cardFocusInput, setCardFocusInput] = useState<string>("");
  const [generatingMoreCards, setGeneratingMoreCards] = useState<boolean>(false);

  // Slides, MindMap, Table & Continuous Artifact Expansion State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [selectedMindMapNode, setSelectedMindMapNode] = useState<MindMapNode | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>("");
  const [artifactExpandInput, setArtifactExpandInput] = useState<Record<string, string>>({});
  const [expandingArtifact, setExpandingArtifact] = useState<StudioCraftableArtifact | null>(null);

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>("");
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"text" | "pdf" | "image">("text");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("");

  // Room Launching State
  const [launchingRoom, setLaunchingRoom] = useState<boolean>(false);

  // AI topic-to-quiz state
  const [aiQuizTopic, setAiQuizTopic] = useState("");
  const [aiQuizCount, setAiQuizCount] = useState(5);
  const [aiQuizLoading, setAiQuizLoading] = useState(false);
  const [aiQuiz, setAiQuiz] = useState<{
    quizId: string;
    quiz: Quiz;
  } | null>(null);
  const [expandedAiQuestionIndex, setExpandedAiQuestionIndex] = useState<number | null>(null);
  const [aiQuizAnswers, setAiQuizAnswers] = useState<Record<number, string>>({});
  const [instantQuiz, setInstantQuiz] = useState<InstantQuizRun | null>(null);

  // Persistent Notebook History (PDF + AI Artifacts + Answers)
  const [currentNotebookId, setCurrentNotebookId] = useState<string>("nb-session");
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    const hasMeaningfulContent =
      Boolean(processedDoc) ||
      Boolean(aiQuiz) ||
      Boolean(uploadedFileName && docText.trim().length > 20);
    if (!hasMeaningfulContent) return;

    const title =
      processedDoc?.title ||
      aiQuiz?.quiz.title ||
      uploadedFileName ||
      docText.trim().split(/\r?\n/)[0]?.slice(0, 60) ||
      "Notebook materi";

    saveStudioHistoryEntry({
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
    });
  }, [
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
  ]);

  const handleSaveToHistory = () => {
    soundEffects.playClick();
    if (!processedDoc && !aiQuiz && !docText.trim()) {
      toast.error(
        isEn
          ? "Nothing to save yet. Upload a pdf or enter material first."
          : "Belum ada materi atau jawaban untuk disimpan."
      );
      return;
    }
    const title =
      processedDoc?.title ||
      aiQuiz?.quiz.title ||
      uploadedFileName ||
      docText.trim().split(/\r?\n/)[0]?.slice(0, 60) ||
      "Notebook materi";
    const updated = saveStudioHistoryEntry({
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
    });
    setHistoryEntries(updated);
    toast.success(
      isEn
        ? "Saved to history."
        : "Dokumen & jawaban berhasil disimpan ke riwayat."
    );
  };

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

    // Support Word .docx via server extraction
    if (file.name.toLowerCase().endsWith(".docx")) {
      setUploadedFileType("text");
      setUploadedFileBase64("");
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const res = event.target?.result as string;
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          const apiRes = await fetch("/api/ai/process-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "transcribe",
              fileName: file.name,
              fileType: "text",
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              fileBase64: base64,
            }),
          });
          const data = await apiRes.json();
          if (!apiRes.ok || !data.success) {
            throw new Error(data.error || "Gagal membaca dokumen Word (.docx)");
          }
          const cleanedText = String(data.transcription || "").trim();
          setDocText(cleanedText);
          toast.success(`Dokumen Word "${file.name}" berhasil diekstrak (${cleanedText.length} karakter).`);
        } catch {
          toast.error("Gagal membaca dokumen Word (.docx). Pastikan berkas tidak terenkripsi atau rusak.");
        }
      };
      reader.readAsDataURL(file);
      return;
    }

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
      reader.onload = async (event) => {
        const dataUrl = typeof event.target?.result === "string" ? event.target.result : "";
        setUploadedFileBase64(dataUrl);

        // Ingest and transcribe directly via AI Multimodal API (Zero local/browser OCR dependency)
        await transcribeUploadedFile(dataUrl, file.name, detectedType, mime);
      };
      reader.readAsDataURL(file);
    }
  };

  // Multimodal Vision direct transcription (AI multimodal, zero local/browser OCR dependency)
  const transcribeUploadedFile = async (
    base64Data: string,
    fileName: string,
    fileType: "pdf" | "image" | "text",
    mimeType: string
  ) => {
    setIsTranscribing(true);
    const statusMsg = isEn
      ? `Analyzing & transcribing "${fileName}" directly via AI Multimodal...`
      : `Menganalisis & mentranskripsi "${fileName}" langsung via AI Multimodal...`;
    setTranscriptionStatus(statusMsg);

    const toastId = toast.loading(
      isEn
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
          isEn
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

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}s`;
  };

  // Process Document with AI Reasoning & On-Demand Synthesis
  const handleProcessDocument = async () => {
    if (!docText.trim() && !uploadedFileBase64) {
      toast.error(
        isEn
          ? "Please enter lesson text or upload a document first."
          : "Silakan masukkan teks materi atau unggah berkas terlebih dahulu."
      );
      docTextareaRef.current?.focus();
      return;
    }

    setProcessing(true);
    setReasoningElapsedSec(0);
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setReasoningElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    setProcessingStep(
      isEn
        ? "Inspecting document and curriculum parameters..."
        : "Memeriksa masukan dokumen materi..."
    );
    soundEffects.playClick();

    try {
      setTimeout(() => {
        setProcessingStep(
          isEn
            ? "Synthesizing core conceptual hierarchy..."
            : "Menganalisis konsep dan struktur materi..."
        );
      }, 700);

      setTimeout(() => {
        setProcessingStep(
          isEn
            ? "Authoring NotebookLM-grade interactive artifacts..."
            : "Menghasilkan artifak ajar interaktif berstandar NotebookLM..."
        );
      }, 1600);

      const res = await fetch("/api/ai/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          extractedText: docText,
          text: docText,
          fileName: uploadedFileName || "materi-ajar.txt",
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

      // If multimodal transcription is available and current docText is blank or placeholder, enrich it
      if (data.transcription && (!docText.trim() || docText.startsWith("Lampiran berkas:"))) {
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
      setProcessingStep("");
    }
  };

  // Launch live classroom room
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
      void triggerConfetti({ particleCount: 60, spread: 70 });
      toast.success(`Ruang kuis aktif! PIN: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.quiz) {
        throw new Error(data.error || "Gagal membuat kuis instan");
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
      void triggerConfetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
      toast.success(
        isEn
          ? `Instant quiz ready: ${data.quiz.questions.length} questions.`
          : `Kuis instan siap: ${data.quiz.questions.length} soal.`
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not generate the instant quiz."
            : "Gagal membuat kuis instan."
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
      toast.success(`Ruang kuis AI aktif! PIN: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
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

      const edited = Array.isArray(data.changedDocuments) ? data.changedDocuments[0] : null;
      if (edited?.text) {
        setDocText(edited.text);
        toast.success(isEn ? "Material updated." : "Materi diperbarui.");
      }

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

  return (
    <div className="min-h-screen bg-background-secondary-default/30 pb-12 text-text-primary selection:bg-accent-700 selection:text-text-white">
      {/* Notebook workspace bar */}
      <header className="sticky top-0 z-30 border-b border-separator-border bg-background-full/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <ButtonLink
              href="/"
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiArrowLeftLine}
              aria-label={t.studio.backHome}
              className="text-text-secondary"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-caption-1-medium text-text-tertiary">
                Studio
              </span>
              <span className="text-text-tertiary">/</span>
              <span className="max-w-[30vw] truncate text-caption-1-semibold text-text-primary">
                {processedDoc?.title || (isEn ? "Untitled notebook" : "Notebook baru")}
              </span>
            </div>

            <div className="hidden h-5 w-px bg-separator-border sm:block" />

            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleSaveToHistory}
              leadingIcon={RiSaveLine}
              aria-label={isEn ? "Save" : "Simpan"}
            >
              <span className="hidden md:inline">{isEn ? "Save" : "Simpan"}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => {
                soundEffects.playClick();
                setHistoryEntries(loadStudioHistory());
                setIsHistoryOpen(true);
              }}
              leadingIcon={RiHistoryLine}
              aria-label={isEn ? "History" : "Riwayat"}
            >
              <span className="hidden md:inline">
                {isEn ? "History" : "Riwayat"}
              </span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleLaunchRoom}
              disabled={launchingRoom}
              leadingIcon={RiPlayCircleLine}
              aria-label={t.studio.launchRoomBtn}
              className="font-semibold shadow-xs"
            >
              <span className="hidden sm:inline">
                {launchingRoom ? t.studio.launchingRoomBtn : t.studio.launchRoomBtn}
              </span>
            </Button>

            <div className="hidden items-center gap-0.5 sm:flex">
              <LanguageToggle />
              <ThemeToggle />
              <SettingsButton />
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Notebook workspace */}
      <main className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6">
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
                    {t.studio.studentPovBannerTitle}
                  </strong>
                  <span>
                    {t.studio.studentPovBannerDesc}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentPovActive(false)}
                className="text-caption-2-medium text-amber-700 dark:text-amber-300 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
              >
                {t.studio.studentPovBannerBack}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
          {/* ========================================================================= */}
          {/* SOURCES RAIL: Redesigned material input + artifact checklist + Create     */}
          {/* ========================================================================= */}
          <aside className="min-w-0 space-y-3 self-start lg:col-span-3">
            <ScrollReveal
              variant="slide-up"
              className="space-y-3.5 rounded-2xl border border-separator-border bg-background-full p-4 shadow-card"
            >
              {/* Multimodal Dropzone & Upload Trigger */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.docx,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped && fileInputRef.current) {
                      const dt = new DataTransfer();
                      dt.items.add(dropped);
                      fileInputRef.current.files = dt.files;
                      handleFileChange({
                        target: fileInputRef.current,
                      } as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  className={cx(
                    "group flex w-full flex-col gap-2.5 rounded-2xl border border-dashed p-3.5 text-start transition-all cursor-pointer",
                    isDraggingFile
                      ? "border-accent-600 bg-accent-500/10"
                      : uploadedFileName
                        ? "border-accent-500/40 bg-accent-500/5 hover:border-accent-500/60"
                        : "border-border-button-default bg-background-secondary-default/35 hover:border-accent-500/50 hover:bg-background-secondary-default/65"
                  )}
                >
                  <div className="flex w-full items-center gap-3">
                    <span
                      className={cx(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        uploadedFileName
                          ? "border-accent-500/30 bg-accent-700 text-text-white"
                          : "border-separator-border bg-background-full text-text-secondary group-hover:text-accent-700"
                      )}
                    >
                      <RiUploadCloud2Line className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-caption-1-semibold text-text-primary">
                        {uploadedFileName || t.studio.uploadTitle}
                      </span>
                      <span className="mt-0.5 block truncate text-caption-2-regular text-text-tertiary">
                        {uploadedFileName
                          ? `${docText.trim().length.toLocaleString()} ${isEn ? "characters" : "karakter"}`
                          : t.studio.uploadHint}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["Pdf", "Docx", "Txt", isEn ? "Image" : "Gambar"].map((fmt) => (
                      <span
                        key={fmt}
                        className="rounded-md border border-separator-border bg-background-full px-2 py-0.5 font-mono text-[10px] text-text-tertiary"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </button>
              </div>

              {/* Multimodal AI Vision Ingestion Status Banner */}
              {uploadedFileBase64 && (
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-2 text-caption-2-medium text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cx(
                        "inline-flex rounded-full size-2 shrink-0",
                        isTranscribing ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                      )}
                    />
                    <span className="truncate">
                      {isTranscribing
                        ? isEn
                          ? "Transcribing file..."
                          : "Mentranskripsi berkas..."
                        : isEn
                          ? "File ready"
                          : "Berkas siap"}
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
                      className="text-caption-2-medium hover:underline text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <RiRefreshLine className="size-3" />
                      <span>{isEn ? "Retry" : "Ulang"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Redesigned Material Sheet Editor */}
              <div className="overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default/35 transition-all focus-within:border-accent-500/60 focus-within:ring-2 focus-within:ring-accent-500/15">
                <div className="flex items-center justify-between gap-2 border-b border-separator-border bg-background-secondary-default/70 px-3 py-2">
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
                        className="text-caption-2-regular text-text-tertiary hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        {t.studio.textEditorClear}
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={docTextareaRef}
                    rows={6}
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
                    className="w-full bg-transparent p-3 text-caption-1-regular leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none resize-y min-h-[132px] disabled:opacity-60"
                  />
                  {isTranscribing && (
                    <div className="absolute inset-0 bg-background-secondary-default/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-background-primary-default px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-xs">
                        <RiRefreshLine className="size-3.5 animate-spin text-emerald-600" />
                        <span>{transcriptionStatus || (isEn ? "Transcribing..." : "Mentranskripsi...")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist Menu: Choose specific artifacts to create */}
              <div className="space-y-2 pt-0.5">
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
                      if (selectedArtifacts.length === allIds.length) {
                        setSelectedArtifacts(["flashcards"]);
                      } else {
                        setSelectedArtifacts(allIds);
                      }
                    }}
                    className="text-caption-2-medium text-accent-700 hover:underline cursor-pointer"
                  >
                    {selectedArtifacts.length === 7
                      ? isEn
                        ? "Reset"
                        : "Atur ulang"
                      : isEn
                        ? "Select all"
                        : "Pilih semua"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
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
                          "flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-start transition-all cursor-pointer",
                          checked
                            ? "border-accent-600/50 bg-accent-500/10 text-text-primary"
                            : "border-border-button-default bg-background-secondary-default/30 text-text-secondary hover:bg-background-secondary-default/60 hover:text-text-primary"
                        )}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cx(
                              "flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              checked
                                ? "border-accent-700 bg-accent-700 text-text-white"
                                : "border-border-button-default bg-background-full text-transparent"
                            )}
                          >
                            <RiCheckLine className="size-3" />
                          </span>
                          <Icon
                            className={cx(
                              "size-4 shrink-0",
                              checked ? "text-accent-700" : "text-text-tertiary"
                            )}
                          />
                          <span className="truncate text-caption-1-medium">
                            {item.label}
                          </span>
                        </span>
                        {item.built && (
                          <span className="size-2 shrink-0 rounded-full bg-accent-600" />
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
                  size="medium"
                  onClick={handleProcessDocument}
                  disabled={processing}
                  className="w-full justify-center font-semibold"
                >
                  <RiCopilotFill className={cx("size-4", processing && "animate-spin")} />
                  <span>
                    {processing
                      ? `${t.studio.creatingBtn}... (${formatTimer(reasoningElapsedSec)})`
                      : t.studio.createBtn}
                  </span>
                </Button>

                {processing && (
                  <div className="mt-2.5 p-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 flex items-center justify-between gap-2.5 text-caption-1-medium text-text-primary animate-pulse">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex size-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2.5 bg-accent-600"></span>
                      </span>
                      <span className="truncate text-xs text-text-secondary">
                        {isEn ? "Crafting selected artifacts..." : "Menyusun artifak pilihan..."}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-700 dark:text-accent-300 shrink-0">
                      {formatTimer(reasoningElapsedSec)}
                    </span>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </aside>

          {/* ========================================================================= */}
          {/* NOTEBOOK CANVAS: Artifact navigation (gated until created) & content      */}
          {/* ========================================================================= */}
          <section className="min-w-0 space-y-4 lg:col-span-9 xl:col-span-6">
            {/* Artifact Navigation Tab Bar */}
            <ScrollReveal
              variant="slide-up"
              className="sticky top-14 z-20 rounded-2xl border border-separator-border bg-background-full/95 p-1.5 shadow-card backdrop-blur"
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasFlashcards) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.flashcards}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.flashcards}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("flashcards");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "flashcards" && hasFlashcards
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasFlashcards
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasQuiz) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.quiz}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.quiz}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("quiz");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "quiz" && hasQuiz
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasQuiz
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasSummary) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.summary}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.summary}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("summary");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "summary" && hasSummary
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasSummary
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
                  )}
                >
                  <RiBookOpenLine className="size-4" />
                  <span>{t.studio.tabs.summary}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasMindMap) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.mindmap}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.mindmap}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("mindmap");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "mindmap" && hasMindMap
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasMindMap
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasInfographic) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.infographic}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.infographic}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("infographic");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "infographic" && hasInfographic
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasInfographic
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasTable) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.table}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.table}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("table");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "table" && hasTable
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasTable
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                  onClick={() => {
                    soundEffects.playClick();
                    if (!hasReport) {
                      toast.info(
                        isEn
                          ? `Artifact "${t.studio.tabs.report}" is not yet crafted. Select it above and click "Generate artifacts".`
                          : `Artifak "${t.studio.tabs.report}" belum diracik. Centang di atas lalu klik "Mulai racik materi".`
                      );
                      return;
                    }
                    setActiveTab("report");
                  }}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-caption-1-medium whitespace-nowrap transition-colors cursor-pointer",
                    activeTab === "report" && hasReport
                      ? "bg-accent-700 text-text-white font-semibold shadow-xs"
                      : hasReport
                        ? "text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
                        : "text-text-secondary/40 hover:bg-background-secondary-default/50"
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
                        ? "bg-accent-700 text-text-white font-semibold shadow-xs"
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
              <ScrollReveal variant="scale-up" delay={80} className="rounded-2xl border border-separator-border bg-background-full p-5 shadow-card space-y-5 sm:p-6">
                <div className="border-b border-separator-border pb-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <RiCompass3Line className="size-5 text-accent-700" />
                    <h3 className="text-title-2-semibold text-text-primary tracking-tight">
                      {t.studio.guideTitle}
                    </h3>
                  </div>
                  <p className="text-body-2-regular text-text-secondary">
                    {t.studio.guideSubtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {t.studio.guideSteps.map((step) => (
                    <div
                      key={step.num}
                      className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/40 space-y-1.5"
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
                key={activeTab + (studentPovActive ? "-student" : "-teacher")}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-separator-border bg-background-full p-5 shadow-card space-y-5 sm:p-6"
              >
                {/* Document Header Banner */}
                <div className="flex flex-col gap-3 border-b border-separator-border pb-4 sm:flex-row sm:items-start sm:justify-between">
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
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-separator-border bg-background-secondary-default/60 px-2 py-1"
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
                  <div className="flex shrink-0 items-center gap-2">
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
                            className="p-3.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 flex items-start gap-2.5"
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
                                className="p-3.5 rounded-2xl border border-border-button-default bg-background-primary-default space-y-1"
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
                                className="rounded-2xl border border-accent-500/25 bg-accent-500/5 p-4 space-y-2"
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
                      <div className="inline-flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-1">
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCardViewMode("deck");
                          }}
                          className={cx(
                            "rounded-lg px-3 py-1.5 text-caption-1-medium transition-colors cursor-pointer",
                            cardViewMode === "deck"
                              ? "bg-accent-700 text-text-white font-semibold"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {isEn ? "3d card mode" : "Mode kartu 3d"}
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
                              ? "bg-accent-700 text-text-white font-semibold"
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
                          "rounded-full border px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                          cardTagFilter === "all"
                            ? "border-accent-700 bg-accent-700 text-text-white"
                            : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
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
                          "rounded-full border px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                          cardTagFilter === "unmastered"
                            ? "border-accent-700 bg-accent-700 text-text-white"
                            : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
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
                            "rounded-full border px-3 py-1 text-caption-2-medium transition-colors cursor-pointer",
                            cardTagFilter === tag
                              ? "border-accent-700 bg-accent-700 text-text-white"
                              : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {filteredFlashcards.length === 0 ? (
                      <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-8 text-center space-y-3">
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
                              className="flex flex-col justify-between gap-4 rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-5"
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
                                <div className="rounded-xl border border-separator-border bg-background-primary-default p-3.5 text-caption-1-regular text-text-secondary leading-relaxed">
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
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.45, ease: "easeInOut" }}
                            className="w-full max-w-xl min-h-[280px] p-8 rounded-3xl border border-border-button-default bg-background-secondary-default shadow-card flex flex-col justify-between cursor-pointer select-none relative outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring [transform-style:preserve-3d]"
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
                                  {currentFlashcard?.tag || (isEn ? "Concept" : "Pertanyaan")}
                                </Chip>
                                {masteredCards.includes(currentOriginalIndex) && (
                                  <Chip variant="caption" color="lime">
                                    {isEn ? "Mastered" : "Paham"}
                                  </Chip>
                                )}
                              </div>
                              <p className="text-title-2-semibold text-text-primary text-center my-auto leading-snug">
                                {currentFlashcard?.front}
                              </p>
                              {showFlashcardHint && currentFlashcard?.hint && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-caption-2-regular text-amber-700 dark:text-amber-300">
                                  {isEn ? "Hint:" : "Petunjuk:"} {currentFlashcard.hint}
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
                                  {isEn ? "Answer & synthesis" : "Jawaban & penjelasan"}
                                </Chip>
                                <span className="text-caption-2-regular text-text-tertiary">
                                  {isEn ? "Click to flip back" : "Klik untuk membalik kembali"}
                                </span>
                              </div>
                              <p className="text-body-1-regular sm:text-title-3-semibold text-text-primary text-center my-auto leading-relaxed">
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
                                    ? "bg-accent-700 w-5"
                                    : masteredCards.includes(originalIndex)
                                      ? "bg-accent-700/40 w-2"
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
                    <div className="flex flex-col gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-4 sm:flex-row sm:items-center">
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
                        className="h-10 flex-1 rounded-xl border border-border-button-default bg-background-primary-default px-3.5 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleGenerateMoreCards}
                        disabled={generatingMoreCards}
                        className="shrink-0"
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
                    <div className="flex flex-col gap-3 rounded-2xl border border-accent-500/25 bg-accent-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-700 text-text-white">
                          <RiPlayCircleLine className="size-5" />
                        </span>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-body-2-semibold text-text-primary">
                              {isEn ? "Instant quiz" : "Kuis instan"}
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
                        variant="primary"
                        size="medium"
                        onClick={openSourceInstantQuiz}
                        disabled={displayedQuestions.length === 0}
                        leadingIcon={RiPlayCircleLine}
                        className="shrink-0 justify-center"
                      >
                        {isEn ? "Start instant quiz" : "Mulai kuis instan"}
                      </Button>
                    </div>

                    {/* Difficulty Slider Bar */}
                    <div className="p-4 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-3">
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
                          {!studentPovActive && (
                            <button
                              type="button"
                              onClick={() => setShowDistractorRationale(!showDistractorRationale)}
                              className="text-caption-2-regular text-text-tertiary hover:text-text-primary underline cursor-pointer"
                            >
                              {showDistractorRationale
                                ? (isEn ? "Hide distractor breakdown" : "Sembunyikan analisis pengecoh")
                                : (isEn ? "Show distractor breakdown" : "Tampilkan analisis pengecoh")}
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
                            className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
                          >
                            <div className="space-y-3 border-b border-separator-border bg-background-secondary-default/40 p-5">
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
                                        "flex w-full cursor-pointer flex-col justify-between gap-2 rounded-xl border p-3 text-start text-caption-1-regular transition-all",
                                        isSelected
                                          ? opt.isCorrect
                                            ? "border-emerald-500 bg-emerald-500/15 text-text-primary"
                                            : "border-border-error-default bg-rose-500/10 text-text-primary"
                                          : "border-border-button-default bg-background-primary-default text-text-secondary hover:border-border-button-hover hover:bg-background-secondary-default hover:text-text-primary"
                                      )}
                                    >
                                      <span className="flex w-full items-start justify-between gap-2">
                                        <span className="flex min-w-0 items-start gap-2.5">
                                          <span
                                            className={cx(
                                              "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg border font-mono text-caption-2-semibold",
                                              isSelected && opt.isCorrect
                                                ? "border-emerald-600 bg-emerald-600 text-white"
                                                : isSelected
                                                  ? "border-rose-600 bg-rose-600 text-white"
                                                  : "border-border-button-default bg-background-secondary-default text-text-tertiary"
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
                                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
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

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator-border pt-3">
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
                    <div className="p-8 rounded-3xl bg-background-secondary-default border border-border-button-default shadow-card min-h-[300px] flex flex-col justify-between space-y-6">
                      <div className="flex items-center justify-between border-b border-separator-border pb-3">
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
                      <div className="p-3.5 rounded-2xl bg-background-primary-default border border-border-button-default text-caption-1-regular text-text-secondary">
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Chip variant="caption" color="blue">
                          {isEn
                            ? `${(processedDoc.mindMap.children || []).length} main branches`
                            : `${(processedDoc.mindMap.children || []).length} cabang utama`}
                        </Chip>
                        <span className="text-caption-2-regular text-text-tertiary">
                          {isEn
                            ? "Click any branch to collapse or expand sub-concepts"
                            : "Klik cabang untuk membuka/menutup sub-konsep atau memperluasnya"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            soundEffects.playClick();
                            setCollapsedBranches({});
                          }}
                        >
                          {isEn ? "Expand all" : "Buka semua"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => {
                            soundEffects.playClick();
                            const next: Record<string, boolean> = {};
                            (processedDoc.mindMap?.children || []).forEach((b) => {
                              next[b.id] = true;
                            });
                            setCollapsedBranches(next);
                          }}
                        >
                          {isEn ? "Collapse all" : "Ringkas semua"}
                        </Button>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 rounded-3xl bg-background-secondary-default/50 border border-border-button-default shadow-card space-y-6">
                      {/* Root Node */}
                      <div className="mx-auto max-w-2xl rounded-2xl border border-accent-500/35 bg-accent-500/10 p-5 text-center space-y-1.5">
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
                              className="rounded-2xl border border-border-button-default bg-background-primary-default p-4 space-y-3 flex flex-col justify-between"
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
                                        className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
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
                                  <div className="pt-2 border-t border-separator-border space-y-2">
                                    {branch.children.map((leaf: MindMapNode, lIdx) => (
                                      <button
                                        key={leaf.id || lIdx}
                                        type="button"
                                        onClick={() => {
                                          soundEffects.playClick();
                                          setSelectedMindMapNode(leaf);
                                        }}
                                        className={cx(
                                          "w-full text-start p-2.5 rounded-xl border transition-colors cursor-pointer space-y-0.5",
                                          selectedMindMapNode?.id === leaf.id
                                            ? "border-accent-500/50 bg-accent-500/10"
                                            : "bg-background-secondary-default/60 border-border-button-default hover:border-accent-500/35"
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

                              <div className="pt-2 border-t border-separator-border/60 flex items-center justify-end">
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
                    <div className="p-5 rounded-2xl bg-background-secondary-default/50 border border-border-button-default space-y-2">
                      <span className="text-caption-2-medium text-text-tertiary block">
                        {isEn ? "Executive briefing document" : "Dokumen rangkuman laporan"}
                      </span>
                      <p className="text-body-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                        {processedDoc.report.executiveSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Core Competencies */}
                      <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
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
                      <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/30 space-y-3">
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
                        <div className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/25 space-y-2.5">
                          <h4 className="text-body-2-semibold text-text-primary">
                            {isEn ? "Prerequisite foundation" : "Pengetahuan prasyarat"}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {processedDoc.report.prerequisiteKnowledge.map((pre, idx) => (
                              <span
                                key={idx}
                                className="rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5 text-caption-1-regular text-text-secondary"
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
                                className="rounded-2xl border border-border-button-default bg-background-primary-default p-5 space-y-3"
                              >
                                <h5 className="text-body-1-semibold text-text-primary">
                                  {sec.heading}
                                </h5>
                                <p className="text-caption-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                                  {sec.content}
                                </p>
                                {sec.keyPoints && sec.keyPoints.length > 0 && (
                                  <ul className="space-y-1.5 pt-2 border-t border-separator-border text-caption-1-regular text-text-secondary">
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
                      <div className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/25 text-caption-1-regular text-text-primary space-y-1">
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
                        className="h-9 w-full rounded-xl border border-border-button-default bg-background-secondary-default/50 px-3.5 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                    </div>

                    <div className="rounded-2xl border border-border-button-default overflow-hidden bg-background-secondary-default/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-caption-1-regular">
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
                          className="p-5 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-700 text-text-white font-mono text-xs font-bold">
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
                            <div className="pt-3 border-t border-separator-border text-caption-2-semibold text-accent-700 dark:text-accent-300 italic">
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

          <aside className="space-y-4 lg:col-span-12 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:col-span-3 xl:block xl:space-y-4">
            {/* Topic-to-quiz generator: no source document required */}
            <ScrollReveal
              variant="slide-up"
              delay={60}
              className="space-y-3 rounded-2xl border border-separator-border bg-background-full p-4 shadow-card"
            >
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-accent-700/10 text-accent-700 border border-accent-700/20 flex items-center justify-center">
                    <RiCopilotFill className="size-4" />
                  </div>
                  <h4 className="text-body-2-semibold text-text-primary">
                    {isEn ? "Instant quiz" : "Kuis instan"}
                  </h4>
                </div>
              </div>

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
                  <span className="rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 font-mono text-caption-1-semibold tabular-nums text-text-primary">
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
                <div className="flex justify-between px-0.5 font-mono text-[11px] text-text-tertiary">
                  <span>3</span>
                  <span>8</span>
                  <span>15</span>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={handleGenerateAiQuiz}
                disabled={
                  aiQuizLoading ||
                  (aiQuizTopic.trim().length < 2 && docText.trim().length < 20)
                }
                className="w-full justify-center gap-1.5"
              >
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
              </Button>

              {aiQuiz && (
                <div className="overflow-hidden rounded-2xl border border-accent-500/25 bg-background-primary-default">
                  <div className="space-y-3 border-b border-separator-border bg-accent-500/5 p-4">
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
                        variant="primary"
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
                        onClick={handleLaunchAiQuiz}
                        disabled={launchingRoom}
                        leadingIcon={RiPlayCircleLine}
                        className="flex-1 justify-center"
                      >
                        {launchingRoom
                          ? isEn
                            ? "Opening..."
                            : "Membuka..."
                          : isEn
                            ? "Launch live"
                            : "Luncurkan live"}
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
                          className="overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.playClick();
                              setExpandedAiQuestionIndex(isOpen ? null : index);
                            }}
                            aria-expanded={isOpen}
                            aria-controls={`ai-question-explanation-${index}`}
                            className="flex w-full items-start gap-2.5 p-3 text-start transition-colors hover:bg-background-secondary-default/60 cursor-pointer"
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
                                className="overflow-hidden border-t border-separator-border"
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
                                            "flex w-full items-start justify-between gap-2 rounded-xl border p-2.5 text-start text-caption-2-regular transition-colors cursor-pointer",
                                            isSelected
                                              ? opt.isCorrect
                                                ? "border-emerald-500 bg-emerald-500/15 text-text-primary"
                                                : "border-border-error-default bg-rose-500/10 text-text-primary"
                                              : "border-border-button-default bg-background-primary-default text-text-secondary hover:bg-background-secondary-default"
                                          )}
                                        >
                                          <span className="flex items-start gap-2 min-w-0">
                                            <span
                                              className={cx(
                                                "inline-flex size-5 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
                                                isSelected && opt.isCorrect
                                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                                  : isSelected
                                                    ? "border-rose-600 bg-rose-600 text-white"
                                                    : "border-border-button-default bg-background-secondary-default text-text-tertiary"
                                              )}
                                            >
                                              {opt.label}
                                            </span>
                                            <span className="leading-snug">{opt.text}</span>
                                          </span>
                                          {isSelected ? (
                                            opt.isCorrect ? (
                                              <RiCheckLine className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
            </ScrollReveal>

            {/* Studio Copilot Multi-turn Chat Panel with Screenshot Image Upload */}
            <ScrollReveal variant="slide-up" delay={80} className="space-y-3 rounded-2xl border border-separator-border bg-background-full p-4 shadow-card">
              <div className="flex items-center justify-between border-b border-separator-border pb-3">
                <div className="flex items-center gap-2">
                  <RiCopilotFill className="size-4 text-accent-700" />
                  <h4 className="text-body-2-semibold text-text-primary">
                    {t.studio.copilotTitle}
                  </h4>
                </div>
                <span className="text-caption-2-regular text-text-tertiary">
                  {t.studio.copilotSubtitle}
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
                      {msg.role === "user" ? (isEn ? "You" : "Anda") : "Exile copilot"}
                    </div>
                    {msg.imagePreview && (
                      <div className="rounded-lg overflow-hidden border border-border-button-default max-w-[160px]">
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
                  </div>
                ))}
                {chatLoading && (
                  <div className="p-3 rounded-2xl bg-background-secondary-default text-text-tertiary text-xs animate-pulse">
                    {isEn ? "Exile Copilot is reasoning through context..." : "Exile Copilot sedang menganalisis masukan..."}
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Attached Screenshot Preview in Chat */}
              {copilotAttachedImage && (
                <div className="p-2 rounded-xl bg-background-secondary-default border border-border-button-default flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Image
                      src={copilotAttachedImage.base64}
                      alt="Pratinjau"
                      width={32}
                      height={32}
                      unoptimized
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
                  placeholder={t.studio.copilotInputPlaceholder}
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
            </ScrollReveal>
          </aside>
        </div>
      </main>

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
        <div className="flex items-center justify-between border-b border-separator-border pb-4">
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
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-8 text-center space-y-2">
            <p className="text-body-2-medium text-text-primary">
              {isEn ? "No saved history yet" : "Belum ada riwayat tersimpan"}
            </p>
            <p className="text-caption-1-regular text-text-secondary">
              {isEn
                ? "Upload a pdf or craft an artifact and it will be saved here automatically."
                : "Unggah berkas pdf atau buat artifak untuk menyimpannya secara otomatis di sini."}
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
                    "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                    isCurrent
                      ? "border-accent-500/40 bg-accent-500/5"
                      : "border-border-button-default bg-background-secondary-default/40"
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
                      variant="primary"
                      size="small"
                      onClick={() => handleLoadHistoryEntry(entry)}
                    >
                      {isEn ? "Open" : "Buka"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      iconOnly
                      leadingIcon={RiDeleteBinLine}
                      onClick={() => handleDeleteHistoryEntry(entry.id)}
                      aria-label={isEn ? "Delete" : "Hapus"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
