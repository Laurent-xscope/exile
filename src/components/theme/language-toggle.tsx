"use client";

import React, { useState, useRef, useEffect } from "react";
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react";
import { useTranslation, Language } from "@/lib/i18n/use-translation";
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
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect y="0" width="24" height="1.23" fill="#B91C1C" />
      <rect y="2.46" width="24" height="1.23" fill="#B91C1C" />
      <rect y="4.92" width="24" height="1.23" fill="#B91C1C" />
      <rect y="7.38" width="24" height="1.23" fill="#B91C1C" />
      <rect y="9.84" width="24" height="1.23" fill="#B91C1C" />
      <rect y="12.3" width="24" height="1.23" fill="#B91C1C" />
      <rect y="14.77" width="24" height="1.23" fill="#B91C1C" />
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
  const { lang, setLanguage, mounted } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div
        className={cx(
          "h-9 px-2.5 rounded-xl border border-border-button-default bg-background-secondary-default animate-pulse w-20",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const isID = lang === "id";

  const handleSelectLanguage = (selectedLang: Language) => {
    soundEffects.playClick();
    setLanguage(selectedLang);
    setIsOpen(false);
  };

  return (
    <div className={cx("relative inline-block text-start", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          soundEffects.playClick();
          setIsOpen(!isOpen);
        }}
        className={cx(
          "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-border-button-default",
          "bg-background-secondary-default text-text-primary hover:bg-background-secondary-hover",
          "transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          isOpen && "ring-2 ring-border-focus-ring bg-background-secondary-hover"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={isID ? "Pilih bahasa" : "Select language"}
      >
        {isID ? <FlagIconID /> : <FlagIconUS />}
        <span className="text-caption-1-semibold tracking-wide font-mono">
          {isID ? "ID" : "EN"}
        </span>
        <RiArrowDownSLine
          className={cx(
            "size-3.5 text-text-tertiary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cx(
            "absolute right-0 mt-1.5 w-60 z-50 rounded-2xl p-1.5 shadow-xl",
            "border border-border-button-default bg-background-primary-default backdrop-blur-md",
            "animate-in fade-in zoom-in-95 duration-150 origin-top-right focus:outline-none"
          )}
        >
          <div className="px-2.5 py-1.5 text-caption-2-medium text-text-tertiary border-b border-separator-border mb-1">
            {isID ? "Pilih bahasa" : "Select language"}
          </div>

          <button
            type="button"
            role="option"
            aria-selected={isID}
            onClick={() => handleSelectLanguage("id")}
            className={cx(
              "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-start transition-colors cursor-pointer",
              isID
                ? "bg-accent-50 text-accent-950 font-medium dark:bg-accent-950/40 dark:text-accent-200"
                : "text-text-primary hover:bg-background-secondary-default"
            )}
          >
            <div className="flex items-center gap-2.5">
              <FlagIconID className="w-5 h-3.5 shadow-xs" />
              <div>
                <div className="text-caption-1-semibold leading-tight">Bahasa indonesia</div>
                <div className="text-caption-2-regular text-text-tertiary">
                  Kurikulum merdeka & nasional
                </div>
              </div>
            </div>
            {isID && <RiCheckLine className="size-4 text-accent-600 shrink-0" />}
          </button>

          <button
            type="button"
            role="option"
            aria-selected={!isID}
            onClick={() => handleSelectLanguage("en")}
            className={cx(
              "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-start transition-colors cursor-pointer mt-0.5",
              !isID
                ? "bg-accent-50 text-accent-950 font-medium dark:bg-accent-950/40 dark:text-accent-200"
                : "text-text-primary hover:bg-background-secondary-default"
            )}
          >
            <div className="flex items-center gap-2.5">
              <FlagIconUS className="w-5 h-3.5 shadow-xs" />
              <div>
                <div className="text-caption-1-semibold leading-tight">English</div>
                <div className="text-caption-2-regular text-text-tertiary">
                  Standard international interface
                </div>
              </div>
            </div>
            {!isID && <RiCheckLine className="size-4 text-accent-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}
