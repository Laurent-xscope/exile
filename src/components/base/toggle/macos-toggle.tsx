"use client";

import React from "react";
import { cx } from "@/utils/cx";
import { soundEffects } from "@/lib/audio/sounds";

interface MacOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  color?: "green" | "accent";
}

/**
 * Authentic native macOS toggle switch:
 * - Rounded pill track (38px x 22px)
 * - Pure white circular knob (18px) with authentic macOS dual-layer shadow
 * - Smooth transition (0.2s cubic-bezier(0.2, 0.85, 0.32, 1.2))
 */
export function MacOSToggle({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
  color = "green",
}: MacOSToggleProps) {
  const handleClick = () => {
    if (disabled) return;
    soundEffects.playClick();
    onChange(!checked);
  };

  const activeBg =
    color === "green" ? "bg-[#34C759] border-[#34C759]" : "bg-accent-600 border-accent-600";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={cx(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors duration-200 select-none cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-1",
        checked
          ? activeBg
          : "bg-[#E5E5EA] dark:bg-[#39393D] border-[#D1D1D6] dark:border-[#48484A]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none inline-block size-[18px] rounded-full bg-[#FAFAFA] transition-transform duration-200 ease-out",
          checked ? "translate-x-[17px]" : "translate-x-[1px]",
          "shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_1px_rgba(0,0,0,0.15)]"
        )}
      />
    </button>
  );
}
