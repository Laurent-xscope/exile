"use client";

import React from "react";
import { cx } from "@/utils/cx";

interface FormattedMessageProps {
  content: string;
  className?: string;
}

/**
 * Formats markdown syntax commonly output by AI models into clean React elements:
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - `code` -> <code>
 * - Bullet / Numbered lists with clean spacing
 */
export function FormattedMessage({ content, className = "" }: FormattedMessageProps) {
  if (!content) return null;

  // Split lines to preserve structured line breaks and lists
  const lines = content.split("\n");

  return (
    <div className={cx("space-y-1.5 leading-relaxed text-xs", className)}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={lineIndex} className="h-1.5" />;
        }

        // Header lines (e.g. ### Title or ## Title)
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={lineIndex} className="font-semibold text-caption-1-semibold text-text-primary pt-1">
              {formatInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={lineIndex} className="font-semibold text-body-2-semibold text-text-primary pt-1.5">
              {formatInlineMarkdown(trimmed.slice(3))}
            </h3>
          );
        }

        // Bullet lists (*, -, •)
        const isBullet =
          trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ");
        if (isBullet) {
          const bulletText = trimmed.replace(/^(\*|-|•)\s+/, "");
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-2">
              <span className="size-1.5 rounded-full bg-accent-600 dark:bg-accent-400 mt-1.5 shrink-0" />
              <div className="flex-1">{formatInlineMarkdown(bulletText)}</div>
            </div>
          );
        }

        // Numbered lists (e.g. "1. ", "2. ")
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const text = numberedMatch[2];
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-1.5">
              <span className="font-mono text-caption-2-bold text-accent-700 dark:text-accent-400 shrink-0 min-w-4">
                {num}.
              </span>
              <div className="flex-1">{formatInlineMarkdown(text)}</div>
            </div>
          );
        }

        // Regular paragraph line
        return <div key={lineIndex}>{formatInlineMarkdown(line)}</div>;
      })}
    </div>
  );
}

/**
 * Parses inline bold (**text**), italic (*text*), and code (`code`)
 */
function formatInlineMarkdown(text: string): React.ReactNode[] {
  // Regex splitting by:
  // 1. `**bold**`
  // 2. `*italic*`
  // 3. `` `code` ``
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-text-primary">
          {inner}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-text-primary">
          {inner}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="font-mono text-[11px] px-1 py-0.5 rounded bg-background-primary-default/90 border border-border-button-default text-text-primary"
        >
          {inner}
        </code>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
