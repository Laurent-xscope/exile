"use client";

import { useSyncExternalStore } from "react";
import { soundEffects } from "@/lib/audio/sounds";

export interface ExileSettings {
  language: "id" | "en";
  theme: "system" | "light" | "dark";
  soundEnabled: boolean;
  soundVolume: number; // 0 - 100
  countdownTicks: boolean;
  defaultQuestionTimeSec: number; // 15, 20, 30, 45
  streakBonusEnabled: boolean;
  shuffleQuestions: boolean;
  defaultNickname: string;
  defaultAvatar: string;
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

export const loadExileSettings = loadSettings;
export const saveExileSettings = saveSettings;

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

let currentSettings: ExileSettings = DEFAULT_SETTINGS;
const settingsListeners = new Set<() => void>();

function subscribeToSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  const loaded = loadSettings();
  currentSettings = loaded;
  applySettingsEffects(loaded);
  return () => settingsListeners.delete(listener);
}

function getSettingsSnapshot(): ExileSettings {
  return currentSettings;
}

function getServerSettingsSnapshot(): ExileSettings {
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ExileSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettingsEffects(settings);
    currentSettings = settings;
    settingsListeners.forEach((listener) => listener());
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

export function useExileSettings() {
  const settings = useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const updateSetting = <K extends keyof ExileSettings>(key: K, value: ExileSettings[K]) => {
    saveSettings({ ...settings, [key]: value });
  };

  return {
    settings,
    updateSetting,
    mounted,
  };
}
