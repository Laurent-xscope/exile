import type { HTMLAttributes, Ref } from "react";
import { cx, sortCx } from "@/utils/cx";

/**
 * Figma source: Board UI → dashboard 1 "Chip" layers (status chips, delta
 * chips, price chips, role chips — e.g. nodes 3731:3273, 3731:3094, 3731:3280,
 * 3731:3055).
 *
 * Colored label chip. Three emphasis levels, all rounded radius/md (6px),
 * px 6:
 *
 *   bold    py 2, Body 1/Medium   (14/20/500) — status + percentage deltas
 *   subtle  py 4, Body 1/Medium   (14/20/500) — price chips
 *   caption py 4, Caption 1/Medium (12/16/500, tracking .15) — role tags
 *
 * Status pairs are semantic so the same component follows both Figma modes:
 *   lime    light 200/800 · dark 950 @ 60% / 500
 *   rose    light 200/800 · dark 950 @ 60% / 500
 *   yellow  light 200/800 · dark 950 @ 60% / 500
 *   cyan    light 200/800 · dark 950 @ 60% / 400
 *   blue    light 200/800 · dark 950 @ 60% / 300 (same dark status recipe;
 *           first needed by the medical template's "In treatment" status)
 *   purple  light 100/600 · dark 900/300 (AI profile delta chips)
 *   neutral bg color/neutral/200 text color/neutral/500
 *   gray    bg color/neutral/100 text color/neutral/800
 *   soft    bg background/secondary/default text text/secondary
 */

type ChipVariant = "bold" | "subtle" | "caption";
export type ChipColor = "orange" | "lime" | "rose" | "yellow" | "cyan" | "blue" | "purple" | "neutral" | "gray" | "soft";

/** Background and text pair per colour, shared with Tag Group's tags. */
const CHIP_SUCCESS = "bg-green-50 text-green-700 border-green-600";
const CHIP_WARNING = "bg-amber-50 text-amber-700 border-amber-600";
const CHIP_ERROR = "bg-rose-50 text-text-error-primary border-border-error-default";
const CHIP_NEUTRAL = "bg-transparent text-text-secondary border-border-button-default";

const CHIP_COLORS: Record<ChipColor, string> = {
  orange: CHIP_ERROR,
  lime: CHIP_SUCCESS,
  rose: CHIP_ERROR,
  yellow: CHIP_WARNING,
  cyan: CHIP_NEUTRAL,
  blue: CHIP_NEUTRAL,
  purple: CHIP_NEUTRAL,
  neutral: CHIP_NEUTRAL,
  gray: "bg-background-primary-default text-text-primary border-border-button-default",
  soft: "bg-background-secondary-default text-text-secondary border-border-button-default",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  color?: ChipColor;
  ref?: Ref<HTMLSpanElement>;
}

const styles = sortCx({
  base: "inline-flex items-center justify-center rounded-lg border-2 px-3 whitespace-nowrap font-semibold tracking-[0.01em]",
  variant: {
    bold: "py-1 text-[11px] leading-4",
    subtle: "py-1 text-[11px] leading-4",
    caption: "py-1 text-[11px] leading-4",
  },
  color: CHIP_COLORS,
});

export function Chip({
  variant = "bold",
  color = "neutral",
  className,
  ref,
  ...props
}: ChipProps) {
  return (
    <span
      ref={ref}
      className={cx(styles.base, styles.variant[variant], styles.color[color], className)}
      {...props}
    />
  );
}
