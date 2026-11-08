"use client";

import { useEffect, useCallback } from "react";
import {
  RiCloseLine,
  RiCopilotFill,
  RiFileCopyLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badge";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";

export interface DirectAnswerItem {
  number: number;
  questionSnippet: string;
  answer: string;
  keyExplanation?: string;
}

export interface DirectAnswerCardProps {
  isOpen: boolean;
  onClose: () => void;
  answers: DirectAnswerItem[];
  rawTranscription?: string;
  onAskCopilot: (promptText: string) => void;
  isEn?: boolean;
  title?: string;
  className?: string;
}

export const DEFAULT_COPILOT_PROMPT_ID =
  "Tolong jelaskan langkah penyelesaian rinci untuk soal lembar tugas yang baru saja saya pindai.";

export const DEFAULT_COPILOT_PROMPT_EN =
  "Please explain the detailed step-by-step solution for the homework sheet I just scanned.";

/**
 * Formats question items, answers, and raw transcription into clean Markdown for the clipboard.
 */
export function formatAnswersForClipboard(
  answers: DirectAnswerItem[],
  rawTranscription?: string,
  isEn = false
): string {
  if (!answers || answers.length === 0) {
    return rawTranscription?.trim() || "";
  }

  const lines: string[] = [];
  lines.push(isEn ? "# Homework answer keys" : "# Kunci jawaban tugas");
  lines.push("");

  for (const item of answers) {
    lines.push(isEn ? `## Number ${item.number}` : `## Nomor ${item.number}`);
    if (item.questionSnippet?.trim()) {
      lines.push(`${isEn ? "Question:" : "Soal:"} ${item.questionSnippet.trim()}`);
    }
    lines.push(`${isEn ? "Answer:" : "Jawaban:"} ${item.answer.trim()}`);
    if (item.keyExplanation?.trim()) {
      lines.push(`${isEn ? "Explanation:" : "Penjelasan:"} ${item.keyExplanation.trim()}`);
    }
    lines.push("");
  }

  if (rawTranscription?.trim()) {
    lines.push(isEn ? "### Original transcription" : "### Transkripsi asli");
    lines.push(rawTranscription.trim());
  }

  return lines.join("\n").trim();
}

/**
 * Direct Answer Result Card & Overlay Drawer Component.
 * Displays scanned direct answer results, step-by-step explanation trigger, and clean clipboard copy.
 */
export function DirectAnswerCard({
  isOpen,
  onClose,
  answers = [],
  rawTranscription,
  onAskCopilot,
  isEn = false,
  title,
  className,
}: DirectAnswerCardProps) {
  const fade = useScrollFade();

  const handleCopy = useCallback(async () => {
    const formattedText = formatAnswersForClipboard(answers, rawTranscription, isEn);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedText);
      }
      toast.success(
        isEn
          ? "Answer keys copied to clipboard"
          : "Kunci jawaban disalin ke clipboard"
      );
    } catch {
      toast.error(
        isEn
          ? "Failed to copy answer keys"
          : "Gagal menyalin kunci jawaban"
      );
    }
  }, [answers, rawTranscription, isEn]);

  const handleAskCopilot = useCallback(() => {
    const prompt = isEn ? DEFAULT_COPILOT_PROMPT_EN : DEFAULT_COPILOT_PROMPT_ID;
    onAskCopilot(prompt);
  }, [isEn, onAskCopilot]);

  // Handle Escape key to dismiss drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const defaultTitle = isEn ? "Homework answer key" : "Kunci jawaban PR";
  const displayTitle = title ?? defaultTitle;
  const subtitle = isEn ? "Scan results" : "Hasil pindai tugas";

  return (
    <div
      data-testid="direct-answer-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Dimmed backdrop dismiss trigger */}
      <div
        data-testid="direct-answer-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Overlay drawer / modal container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={displayTitle}
        className={cx(
          "relative z-10 flex flex-col w-full max-w-full sm:max-w-[480px] max-h-[85dvh] sm:max-h-[640px]",
          "rounded-t-3xl sm:rounded-3xl bg-background-primary-default border border-border-button-default shadow-dropdown overflow-hidden",
          className
        )}
      >
        {/* Stationary header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-separator-border bg-background-primary-default shrink-0">
          <div className="flex flex-col text-start min-w-0 pr-2">
            <h2 className="text-body-semibold text-text-primary truncate">
              {displayTitle}
            </h2>
            <p className="text-caption-2-regular text-text-secondary truncate">
              {subtitle}
              {answers.length > 0 && ` • ${answers.length} ${isEn ? "answers" : "soal"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close" : "Tutup"}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-background-secondary-default hover:text-text-primary transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiCloseLine className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable list of numbered direct answers */}
        <div className="relative min-h-0 flex-1 flex flex-col bg-background-full">
          <div
            onScroll={fade.onScroll}
            data-testid="direct-answer-scroll-region"
            className="h-full overflow-y-auto p-4 space-y-3"
          >
            {answers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-body-2-medium text-text-secondary">
                  {isEn
                    ? "No direct answers found"
                    : "Tidak ada kunci jawaban langsung terdeteksi"}
                </p>
                {rawTranscription && (
                  <div className="mt-4 p-3 rounded-xl bg-background-secondary-default text-caption-1-regular text-text-secondary text-start w-full whitespace-pre-wrap max-h-48 overflow-y-auto border border-border-button-default">
                    {rawTranscription}
                  </div>
                )}
              </div>
            ) : (
              answers.map((item, index) => (
                <div
                  key={`direct-answer-${item.number}-${index}`}
                  data-testid={`direct-answer-card-${item.number}`}
                  className="rounded-2xl border border-border-button-default bg-background-primary-default p-4 flex flex-col gap-2 shadow-2xs text-start transition hover:border-border-button-hover"
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge color="neutral">
                      {isEn ? `Number ${item.number}` : `Nomor ${item.number}`}
                    </Badge>
                  </div>

                  {/* Question snippet */}
                  {item.questionSnippet ? (
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed break-words">
                      {item.questionSnippet}
                    </p>
                  ) : null}

                  {/* Direct answer text */}
                  <div className="text-title-3-semibold text-text-primary leading-snug break-words">
                    {item.answer}
                  </div>

                  {/* Optional key explanation */}
                  {item.keyExplanation ? (
                    <div className="text-caption-2-medium text-text-tertiary bg-background-secondary-default p-2 rounded-xl leading-relaxed break-words border border-border-button-default">
                      {item.keyExplanation}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <ScrollFade progress={fade.progress} surfaceClassName="from-background-primary-default" />
        </div>

        {/* Stationary footer with action buttons */}
        <div className="flex items-center justify-between gap-2.5 p-3 sm:p-4 border-t border-separator-border bg-background-primary-default shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="small"
            leadingIcon={RiFileCopyLine}
            onClick={handleCopy}
            aria-label={isEn ? "Copy" : "Salin"}
          >
            {isEn ? "Copy" : "Salin"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="small"
            leadingIcon={RiCopilotFill}
            onClick={handleAskCopilot}
            aria-label={isEn ? "Ask steps" : "Tanya langkah"}
          >
            {isEn ? "Ask steps" : "Tanya langkah"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DirectAnswerCard;
