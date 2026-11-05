"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  RiSettings3Line,
  RiVolumeUpLine,
  RiTimeLine,
  RiContrastDropLine,
  RiUser3Line,
  RiRefreshLine,
  RiPlayFill,
  RiSunLine,
  RiMoonLine,
  RiComputerLine,
  RiCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Input } from "@/components/base/input/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/base/modal/modal";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { FlagIconID, FlagIconUS } from "@/components/theme/language-toggle";
import { soundEffects } from "@/lib/audio/sounds";
import {
  useExileSettings,
  DEFAULT_SETTINGS,
  saveSettings,
} from "@/lib/settings/user-settings";
import { MacOSToggle } from "@/components/base/toggle/macos-toggle";
import { cx } from "@/utils/cx";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function SettingToggleRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: SettingToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-medium text-text-primary">{title}</p>
        <p className="text-caption-1-regular text-text-secondary">
          {description}
        </p>
      </div>
      <MacOSToggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        label={title}
        color="green"
      />
    </div>
  );
}

const AVATAR_OPTIONS = [
  { id: "garuda", label: "Garuda", subtitle: "Elang dewata" },
  { id: "barong", label: "Barong", subtitle: "Pelindung dharma" },
  { id: "dragon", label: "Naga", subtitle: "Naga basuki" },
  { id: "lotus", label: "Padma", subtitle: "Teratai suci" },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSetting, mounted } = useExileSettings();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "audio" | "quiz" | "display" | "profile"
  >("audio");

  // Sync accessibility classes with document root
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("high-contrast", Boolean(settings.highContrast));
    root.classList.toggle("compact-density", Boolean(settings.compactDensity));
  }, [mounted, settings.highContrast, settings.compactDensity]);

  if (!mounted) return null;

  const handleTestSound = (type: "correct" | "click" | "fanfare") => {
    if (type === "correct") soundEffects.playCorrect();
    else if (type === "fanfare") soundEffects.playVictory();
    else soundEffects.playClick();
  };

  const handleResetDefaults = () => {
    saveSettings(DEFAULT_SETTINGS);
    setTheme("system");
    toast.info("Pengaturan dikembalikan ke nilai standar.");
  };

  const currentThemeKey = theme || settings.theme || "system";

  const NAV_ITEMS = [
    { id: "audio", label: "Suara", icon: RiVolumeUpLine },
    { id: "quiz", label: "Kuis", icon: RiTimeLine },
    { id: "display", label: "Tampilan", icon: RiContrastDropLine },
    { id: "profile", label: "Profil", icon: RiUser3Line },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="xl"
    >
      <ModalHeader
        title="Pengaturan"
        description="Preferensi audio, durasi kuis, tampilan, dan profil."
        icon={RiSettings3Line}
        closeLabel="Tutup pengaturan"
      />

      <ModalBody className="py-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[360px]">
          {/* Side navigation */}
          <nav className="md:col-span-4 flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-separator-border pb-3 md:pb-0 md:pr-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cx(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-body-2-medium transition-colors cursor-pointer text-start select-none w-full",
                    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    isActive
                      ? "bg-accent-50 text-accent-800 font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                  )}
                >
                  <Icon className={cx("size-4 shrink-0", isActive ? "text-accent-700" : "text-text-tertiary")} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tab content panel */}
          <div className="md:col-span-8 space-y-4">
            {activeTab === "audio" && (
              <div className="space-y-4">
                <SettingToggleRow
                  title="Efek suara"
                  description="Gamelan pentatonik untuk jawaban benar & nada interaktif"
                  checked={settings.soundEnabled}
                  onChange={(val) => updateSetting("soundEnabled", val)}
                />

                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-body-medium text-text-primary">
                      Volume suara
                    </span>
                    <span className="text-caption-1-medium font-mono text-text-secondary">
                      {settings.soundVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    aria-label="Volume suara"
                    value={settings.soundVolume}
                    onChange={(e) =>
                      updateSetting("soundVolume", Number(e.target.value))
                    }
                    disabled={!settings.soundEnabled}
                    className="w-full h-1.5 rounded-full bg-background-tertiary-default accent-accent-600 cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("click")}
                    >
                      Tes klik
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("correct")}
                    >
                      Tes gamelan
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("fanfare")}
                    >
                      Tes fanfare
                    </Button>
                  </div>
                </div>

                <SettingToggleRow
                  title="Detik hitung mundur"
                  description="Suara ketukan halus saat 5 detik terakhir pertanyaan"
                  checked={settings.countdownTicks && settings.soundEnabled}
                  disabled={!settings.soundEnabled}
                  onChange={(val) => updateSetting("countdownTicks", val)}
                />
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-medium text-text-primary">
                      Durasi standar soal (detik)
                    </span>
                    <span className="text-caption-1-regular text-text-secondary">
                      Waktu standar untuk menjawab setiap butir soal di arena kelas
                    </span>
                  </div>
                  <SegmentedControl
                    aria-label="Durasi standar soal"
                    selectedKeys={new Set([String(settings.defaultQuestionTimeSec)])}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected != null) {
                        updateSetting("defaultQuestionTimeSec", Number(selected));
                      }
                    }}
                    className="w-full grid grid-cols-4"
                  >
                    {[15, 20, 30, 45].map((sec) => (
                      <SegmentedControlItem
                        key={sec}
                        id={String(sec)}
                        className="w-full font-mono"
                      >
                        {sec} detik
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </div>

                <SettingToggleRow
                  title="Bonus poin beruntun (streak)"
                  description="Tambahan skor bila siswa menjawab benar secara berturut-turut"
                  checked={settings.streakBonusEnabled}
                  onChange={(val) => updateSetting("streakBonusEnabled", val)}
                />

                <SettingToggleRow
                  title="Acak urutan soal"
                  description="Variasikan urutan soal untuk setiap sesi kuis baru"
                  checked={settings.shuffleQuestions}
                  onChange={(val) => updateSetting("shuffleQuestions", val)}
                />
              </div>
            )}

            {activeTab === "display" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-medium text-text-primary">
                      Bahasa antarmuka
                    </span>
                    <span className="text-caption-1-regular text-text-secondary">
                      Pilih bahasa aplikasi antara bahasa indonesia dan english
                    </span>
                  </div>
                  <SegmentedControl
                    aria-label="Bahasa antarmuka"
                    selectedKeys={new Set([settings.language || "id"])}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected != null) {
                        updateSetting("language", selected as "id" | "en");
                      }
                    }}
                    className="w-full grid grid-cols-2"
                  >
                    <SegmentedControlItem id="id" className="w-full gap-2 font-medium">
                      <FlagIconID />
                      <span>Indonesia</span>
                    </SegmentedControlItem>
                    <SegmentedControlItem id="en" className="w-full gap-2 font-medium">
                      <FlagIconUS />
                      <span>English</span>
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>

                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-medium text-text-primary">
                      Tema antarmuka
                    </span>
                    <span className="text-caption-1-regular text-text-secondary">
                      Pilih mode pencahayaan layar atau sesuaikan otomatis dengan sistem
                    </span>
                  </div>
                  <SegmentedControl
                    aria-label="Tema antarmuka"
                    selectedKeys={new Set([currentThemeKey])}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected != null) {
                        const nextTheme = String(selected) as
                          | "light"
                          | "dark"
                          | "system";
                        setTheme(nextTheme);
                        updateSetting("theme", nextTheme);
                      }
                    }}
                    className="w-full grid grid-cols-3"
                  >
                    <SegmentedControlItem id="light" className="w-full gap-1.5">
                      <RiSunLine className="size-4 shrink-0" aria-hidden />
                      <span>Terang</span>
                    </SegmentedControlItem>
                    <SegmentedControlItem id="dark" className="w-full gap-1.5">
                      <RiMoonLine className="size-4 shrink-0" aria-hidden />
                      <span>Gelap</span>
                    </SegmentedControlItem>
                    <SegmentedControlItem id="system" className="w-full gap-1.5">
                      <RiComputerLine className="size-4 shrink-0" aria-hidden />
                      <span>Sistem</span>
                    </SegmentedControlItem>
                  </SegmentedControl>
                </div>

                <SettingToggleRow
                  title="Mode kontras tinggi"
                  description="Tingkatkan ketajaman garis pembatas dan rasio kontras elemen"
                  checked={settings.highContrast}
                  onChange={(val) => updateSetting("highContrast", val)}
                />

                <SettingToggleRow
                  title="Kepadatan tampilan ringkas"
                  description="Optimalkan ruang layar untuk menampilkan lebih banyak data sekaligus"
                  checked={settings.compactDensity}
                  onChange={(val) => updateSetting("compactDensity", val)}
                />
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
                  <Input
                    label="Nama panggilan standar"
                    placeholder="Contoh: putu aryana"
                    hint="Nama ini akan otomatis terisi saat anda bergabung ke ruang kuis."
                    leadingIcon={RiUser3Line}
                    value={settings.defaultNickname}
                    onChange={(val) => updateSetting("defaultNickname", val)}
                    maxLength={32}
                  />
                </div>

                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-medium text-text-primary">
                      Lambang karakter standar
                    </span>
                    <span className="text-caption-1-regular text-text-secondary">
                      Pilih identitas visual standar untuk papan peringkat kelas
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVATAR_OPTIONS.map((av) => {
                      const isSelected = settings.defaultAvatar === av.id;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => updateSetting("defaultAvatar", av.id)}
                          className={cx(
                            "flex flex-col items-start justify-between rounded-xl border p-3 text-start transition-colors cursor-pointer select-none",
                            "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                            isSelected
                              ? "border-accent-500 bg-background-primary-default text-text-primary shadow-xs"
                              : "border-border-button-default bg-background-primary-default/60 text-text-secondary hover:bg-background-primary-hover hover:text-text-primary",
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-body-medium text-text-primary">
                              {av.label}
                            </span>
                            {isSelected ? (
                              <RiCheckLine
                                className="size-4 text-accent-600 shrink-0"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                          <span className="text-caption-1-regular text-text-secondary mt-0.5">
                            {av.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="sm:justify-between border-t border-separator-border pt-4">
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiRefreshLine}
          onClick={handleResetDefaults}
        >
          Reset standar
        </Button>
        <Button variant="primary" size="small" onClick={onClose}>
          Selesai
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function SettingsButton({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton
        icon={RiSettings3Line}
        size="medium"
        onClick={() => setIsOpen(true)}
        aria-label="Buka pengaturan"
        title="Pengaturan"
        className={className}
      />

      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
