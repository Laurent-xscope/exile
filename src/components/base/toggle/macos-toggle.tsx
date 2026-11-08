"use client";

import { cx } from "@/utils/cx";

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
 * - White circular knob (18px) with authentic macOS dual-layer shadow
 * - Silky smooth cubic-bezier transition (0.25s cubic-bezier(0.2, 0.85, 0.32, 1.2))
 */
export function MacOSToggle({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
  color: _color,
}: MacOSToggleProps) {
  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const activeBg = "bg-accent-600";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={cx(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border border-border-button-default transition-colors duration-250 [transition-timing-function:cubic-bezier(0.2,0.85,0.32,1.2)] select-none cursor-pointer",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-1 active:scale-[0.98]",
        checked
          ? activeBg
          : "bg-background-tertiary-default",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "pointer-events-none inline-block size-[18px] rounded-full bg-text-white transition-transform duration-250 [transition-timing-function:cubic-bezier(0.2,0.85,0.32,1.2)]",
          checked ? "translate-x-[17px] rtl:-translate-x-[17px]" : "translate-x-[1px] rtl:-translate-x-[1px]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.12)]"
        )}
      />
    </button>
  );
}
