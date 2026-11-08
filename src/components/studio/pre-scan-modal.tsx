"use client";

import { useEffect, useCallback } from "react";
import {
  RiFlashlightLine,
  RiBookOpenLine,
  RiArrowRightSLine,
} from "@remixicon/react";
import { CloseButton } from "@/components/base/buttons/close-button";
import { soundEffects } from "@/lib/audio/sounds";
import { cx } from "@/utils/cx";

export type PreScanMode = "direct_answer" | "learning";

export interface PreScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: PreScanMode) => void;
  isEn?: boolean;
}

export const PRE_SCAN_TEXTS = {
  id: {
    title: "Pindai lembar tugas",
    description: "Pilih mode pemrosesan",
    closeLabel: "Tutup dialog",
    directAnswerTitle: "Direct answer",
    directAnswerDescription: "Jawaban instan untuk verifikasi tugas cepat",
    learningTitle: "Learning",
    learningDescription: "Transkripsi ke catatan & buat artefak belajar",
  },
  en: {
    title: "Scan assignment sheet",
    description: "Select processing mode",
    closeLabel: "Close dialog",
    directAnswerTitle: "Direct answer",
    directAnswerDescription: "Instant answers for fast homework check",
    learningTitle: "Learning",
    learningDescription: "Transcribe to notes & generate learning artifacts",
  },
} as const;

export function PreScanModal({
  isOpen,
  onClose,
  onSelectMode,
  isEn = false,
}: PreScanModalProps) {
  const texts = isEn ? PRE_SCAN_TEXTS.en : PRE_SCAN_TEXTS.id;

  const handleSelectMode = useCallback(
    (mode: PreScanMode) => {
      soundEffects.playClick();
      onSelectMode(mode);
      onClose();
    },
    [onSelectMode, onClose]
  );

  const handleClose = useCallback(() => {
    soundEffects.playClick();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-scan-modal-title"
      aria-describedby="pre-scan-modal-description"
      data-testid="pre-scan-modal-overlay"
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/70 backdrop-blur-xs transition-opacity"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        data-testid="pre-scan-modal-card"
        className={cx(
          "relative flex w-full max-w-md flex-col gap-5 p-5 sm:p-6",
          "rounded-3xl border border-border-button-default",
          "bg-background-primary-default shadow-2xl outline-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <h2
              id="pre-scan-modal-title"
              className="text-title-3-semibold text-text-primary"
            >
              {texts.title}
            </h2>
            <p
              id="pre-scan-modal-description"
              className="mt-1 text-body-regular text-text-secondary"
            >
              {texts.description}
            </p>
          </div>
          <CloseButton
            size="sm"
            aria-label={texts.closeLabel}
            onClick={handleClose}
            className="-me-1 -mt-1 shrink-0"
          />
        </div>

        {/* Mode options */}
        <div className="flex flex-col gap-3">
          {/* Card 1: Direct answer */}
          <button
            type="button"
            data-testid="pre-scan-mode-direct-answer"
            onClick={() => handleSelectMode("direct_answer")}
            className={cx(
              "group flex w-full cursor-pointer items-start gap-3.5 p-3.5 text-start sm:items-center sm:p-4",
              "rounded-2xl border border-border-button-default",
              "bg-background-secondary-default hover:bg-background-secondary-hover",
              "transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            )}
          >
            <div
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "border border-border-button-default bg-background-primary-default",
                "text-foreground-icon-primary shadow-xs"
              )}
            >
              <RiFlashlightLine className="size-5" aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-body-medium text-text-primary">
                {texts.directAnswerTitle}
              </span>
              <p className="mt-0.5 text-caption-1-regular text-text-secondary">
                {texts.directAnswerDescription}
              </p>
            </div>

            <RiArrowRightSLine
              className={cx(
                "size-5 shrink-0 text-foreground-icon-tertiary",
                "transition-transform group-hover:translate-x-0.5"
              )}
              aria-hidden="true"
            />
          </button>

          {/* Card 2: Learning */}
          <button
            type="button"
            data-testid="pre-scan-mode-learning"
            onClick={() => handleSelectMode("learning")}
            className={cx(
              "group flex w-full cursor-pointer items-start gap-3.5 p-3.5 text-start sm:items-center sm:p-4",
              "rounded-2xl border border-border-button-default",
              "bg-background-secondary-default hover:bg-background-secondary-hover",
              "transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            )}
          >
            <div
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "border border-border-button-default bg-background-primary-default",
                "text-foreground-icon-primary shadow-xs"
              )}
            >
              <RiBookOpenLine className="size-5" aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-body-medium text-text-primary">
                {texts.learningTitle}
              </span>
              <p className="mt-0.5 text-caption-1-regular text-text-secondary">
                {texts.learningDescription}
              </p>
            </div>

            <RiArrowRightSLine
              className={cx(
                "size-5 shrink-0 text-foreground-icon-tertiary",
                "transition-transform group-hover:translate-x-0.5"
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
