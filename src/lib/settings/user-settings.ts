"use client";

import { useState, useEffect } from "react";
import { soundEffects } from "@/lib/audio/sounds";

export interface ExileSettings {
  // Language
  language: "id" | "en";
  // Theme
  theme: "system" | "light" | "dark";
  // Audio
  soundEnabled: boolean;
  soundVolume: number; // 0 - 100
  countdownTicks: boolean;
  // Quiz defaults
  defaultQuestionTimeSec: number; // 15, 20, 30, 45
  streakBonusEnabled: boolean;
  shuffleQuestions: boolean;
  // Student profile
  defaultNickname: string;
  defaultAvatar: string;
  // Accessibility
  highContrast: boolean;
  compactDensity: boolean;
}

export const DEFAULT_SETTINGS: ExileSettings = {
  language: "id",
  theme: "system",
  soundEnabled: true,
  soundVolume: 80,
  countdownTicks: true,
  defaultQuestionTimeSec: 20,
  streakBonusEnabled: true,
  shuffleQuestions: false,
  defaultNickname: "",
  defaultAvatar: "garuda",
  highContrast: false,
  compactDensity: false,
};

const STORAGE_KEY = "exile_user_settings";

export function loadSettings(): ExileSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettingsEffects(settings: ExileSettings): void {
  if (typeof window === "undefined") return;
  soundEffects.setMuted(!settings.soundEnabled);
  soundEffects.setVolume(settings.soundVolume);
  soundEffects.setCountdownTicks(settings.countdownTicks);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = settings.language || "id";
    document.documentElement.classList.toggle("high-contrast", Boolean(settings.highContrast));
    document.documentElement.classList.toggle("compact-density", Boolean(settings.compactDensity));
  }
}

export function saveSettings(settings: ExileSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettingsEffects(settings);
    window.dispatchEvent(new CustomEvent("exile_settings_updated", { detail: settings }));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

export function useExileSettings() {
  const [settings, setSettingsState] = useState<ExileSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loaded = loadSettings();
    setSettingsState(loaded);
    applySettingsEffects(loaded);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ExileSettings>;
      if (customEvent.detail) {
        setSettingsState(customEvent.detail);
        applySettingsEffects(customEvent.detail);
      }
    };

    window.addEventListener("exile_settings_updated", handleUpdate);
    return () => window.removeEventListener("exile_settings_updated", handleUpdate);
  }, []);

  const updateSetting = <K extends keyof ExileSettings>(key: K, value: ExileSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    saveSettings(updated);
  };

  return {
    settings,
    updateSetting,
    mounted,
  };
}
