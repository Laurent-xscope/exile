"use client";

import React from "react";
import { useExileSettings } from "@/lib/settings/user-settings";
import { soundEffects } from "@/lib/audio/sounds";
import { cx } from "@/utils/cx";

export function FlagIconID({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={cx("rounded-[2px] overflow-hidden shadow-xs shrink-0 inline-block", className)}
      aria-hidden="true"
    >
      <rect width="24" height="8" fill="#E11D48" />
      <rect y="8" width="24" height="8" fill="#FFFFFF" />
    </svg>
  );
}

export function FlagIconUS({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={cx("rounded-[2px] overflow-hidden shadow-xs shrink-0 inline-block", className)}
      aria-hidden="true"
    >
      {/* 13 Red & White Stripes */}
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect y="0" width="24" height="1.23" fill="#B91C1C" />
      <rect y="2.46" width="24" height="1.23" fill="#B91C1C" />
      <rect y="4.92" width="24" height="1.23" fill="#B91C1C" />
      <rect y="7.38" width="24" height="1.23" fill="#B91C1C" />
      <rect y="9.84" width="24" height="1.23" fill="#B91C1C" />
      <rect y="12.3" width="24" height="1.23" fill="#B91C1C" />
      <rect y="14.77" width="24" height="1.23" fill="#B91C1C" />
      {/* Blue Canton with star pattern representation */}
      <rect width="10" height="8.6" fill="#1D4ED8" />
      <circle cx="2.2" cy="2" r="0.6" fill="#FFFFFF" />
      <circle cx="5" cy="2" r="0.6" fill="#FFFFFF" />
      <circle cx="7.8" cy="2" r="0.6" fill="#FFFFFF" />
      <circle cx="3.6" cy="4.3" r="0.6" fill="#FFFFFF" />
      <circle cx="6.4" cy="4.3" r="0.6" fill="#FFFFFF" />
      <circle cx="2.2" cy="6.6" r="0.6" fill="#FFFFFF" />
      <circle cx="5" cy="6.6" r="0.6" fill="#FFFFFF" />
      <circle cx="7.8" cy="6.6" r="0.6" fill="#FFFFFF" />
    </svg>
  );
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { settings, updateSetting, mounted } = useExileSettings();

  if (!mounted) {
    return (
      <div
        className={cx(
          "h-9 px-2.5 rounded-2lg border border-border-button-default bg-background-secondary-default animate-pulse w-16",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const currentLang = settings.language || "id";
  const isID = currentLang === "id";

  const handleToggle = () => {
    soundEffects.playClick();
    const nextLang = isID ? "en" : "id";
    updateSetting("language", nextLang);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cx(
        "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-2lg border border-border-button-default",
        "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover",
        "transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className
      )}
      title={isID ? "Ubah ke Bahasa Inggris (EN-US)" : "Ganti ke Bahasa Indonesia (ID)"}
      aria-label={isID ? "Beralih ke Bahasa Inggris" : "Beralih ke Bahasa Indonesia"}
    >
      {isID ? (
        <>
          <FlagIconID />
          <span className="text-caption-1-semibold tracking-wide">ID</span>
        </>
      ) : (
        <>
          <FlagIconUS />
          <span className="text-caption-1-semibold tracking-wide">EN</span>
        </>
      )}
    </button>
  );
}
