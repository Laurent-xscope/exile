"use client";

import React, { useEffect, useState } from "react";
import { useSonner, toast } from "sonner";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiCloseLine,
} from "@remixicon/react";
import { Spinner } from "@/components/base/spinner/spinner";

export interface PinPart {
  text: string;
  isPin: boolean;
}

/**
 * Pure helper that parses a string and splits it into text fragments and 6-digit PINs.
 */
export function splitMessagePins(text: string): PinPart[] {
  if (!text) return [];
  const pinRegex = /\b\d{6}\b/g;
  const parts: PinPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pinRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isPin: false });
    }
    parts.push({ text: match[0], isPin: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isPin: false });
  }

  return parts;
}

/**
 * Interactive spoiler PIN badge used inside notifications.
 * Blurred by default (filter: blur(6px)), unblurs on hover, and re-blurs on mouse leave.
 */
export function ToastSpoilerPin({ pin }: { pin: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span
      data-testid="toast-spoiler-pin"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        filter: isHovered ? "blur(0px)" : "blur(6px)",
        transition: "filter 180ms ease",
      }}
      className="inline-block mx-1 px-1.5 py-0.5 rounded-md bg-background-secondary-default text-text-primary font-mono text-caption-1-semibold tracking-wider select-all cursor-pointer pointer-events-auto"
      title="Arahkan kursor untuk melihat PIN"
    >
      {pin}
    </span>
  );
}

/**
 * Renders node content, automatically wrapping any 6-digit PIN in string children with ToastSpoilerPin.
 */
export function renderToastContent(content: React.ReactNode): React.ReactNode {
  if (typeof content !== "string") {
    return content;
  }
  const parts = splitMessagePins(content);
  if (parts.length <= 1 && (!parts[0] || !parts[0].isPin)) {
    return content;
  }

  return parts.map((part, index) =>
    part.isPin ? (
      <ToastSpoilerPin key={`toast-pin-${index}-${part.text}`} pin={part.text} />
    ) : (
      <span key={`toast-txt-${index}`}>{part.text}</span>
    )
  );
}

export interface ToastSignatureItem {
  title?: unknown;
  description?: unknown;
  type?: string;
}

/**
 * Normalizes a toast message into a stable key signature to prevent flicker during rapid clicks.
 */
export function getToastSignature(toastItem?: ToastSignatureItem | null): string {
  if (!toastItem) return "";
  const title =
    typeof toastItem.title === "string"
      ? toastItem.title
      : typeof toastItem.title === "function"
      ? String(toastItem.title())
      : "";
  const desc =
    typeof toastItem.description === "string" ? toastItem.description : "";
  const type = toastItem.type || "default";
  return `${type}:${title}:${desc}`.trim().toLowerCase();
}

/**
 * SingleToastViewport replaces the default Sonner Toaster.
 * Enforces a single active toast, unconditional 3000ms dismiss (never pause on hover),
 * smooth entrance/exit springs, and blurred 6-digit room PINs.
 */
export function SingleToastViewport() {
  const { toasts } = useSonner();
  const activeToasts = toasts.filter((t) => !t.delete);
  const current = activeToasts[0];

  // Immediately dismiss older/stacked toasts so notifications never stack
  useEffect(() => {
    if (activeToasts.length > 1) {
      for (let i = 1; i < activeToasts.length; i++) {
        toast.dismiss(activeToasts[i].id);
      }
    }
  }, [activeToasts]);

  // Unconditional 3000ms dismiss timer, keyed strictly by toast ID (never pauses on hover)
  useEffect(() => {
    if (!current?.id) return;
    const timer = setTimeout(() => {
      toast.dismiss(current.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [current?.id]);

  const signature = getToastSignature(current);

  return (
    <MotionConfig reducedMotion="never">
      <div className="fixed top-4 inset-x-0 z-[100] flex justify-center pointer-events-none px-4">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={signature || String(current.id)}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.22, ease: "easeOut" },
              }}
              exit={{
                opacity: 0,
                y: -14,
                scale: 0.96,
                transition: { duration: 0.2, ease: "easeIn" },
              }}
              className="pointer-events-auto flex items-center gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md w-full sm:w-auto min-w-[280px] p-3.5 rounded-2xl bg-background-primary-default border border-border-button-default shadow-card text-text-primary"
              data-testid="single-toast"
              role="alert"
              aria-live="polite"
            >
              {/* Status Icon */}
              <div className="shrink-0 flex items-center justify-center">
                {current.type === "success" ? (
                  <RiCheckboxCircleLine
                    className="size-5 text-foreground-icon-secondary"
                    aria-hidden="true"
                  />
                ) : current.type === "error" ? (
                  <RiErrorWarningLine
                    className="size-5 text-text-error-primary"
                    aria-hidden="true"
                  />
                ) : current.type === "loading" ? (
                  <Spinner size="sm" aria-hidden />
                ) : (
                  <RiInformationLine
                    className="size-5 text-foreground-icon-secondary"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 text-caption-1-medium sm:text-body-2-regular select-text break-words">
                {typeof current.title === "function"
                  ? current.title()
                  : renderToastContent(current.title)}
                {current.description && (
                  <div className="text-caption-2-regular text-text-secondary mt-0.5">
                    {typeof current.description === "function"
                      ? current.description()
                      : renderToastContent(current.description)}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => toast.dismiss(current.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 size-7 -me-1 rounded-lg flex items-center justify-center text-foreground-icon-tertiary hover:text-foreground-icon-primary hover:bg-background-secondary-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer"
              >
                <RiCloseLine className="size-4" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
