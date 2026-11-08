"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  RiSettings3Line,
  RiVolumeUpLine,
  RiContrastDropLine,
  RiUser3Line,
  RiRefreshLine,
  RiPlayFill,
  RiSunLine,
  RiMoonLine,
  RiComputerLine,
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
    <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-2xl bg-background-secondary-default p-3.5 sm:p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-medium text-text-primary break-words">{title}</p>
        <p className="text-caption-1-regular text-text-secondary break-words leading-relaxed">
          {description}
        </p>
      </div>
      <div className="shrink-0 ms-2 sm:ms-3 flex items-center justify-end">
        <MacOSToggle
          checked={checked}
          onChange={(val) => {
            soundEffects.playClick();
            onChange(val);
          }}
          disabled={disabled}
          label={title}
          color="green"
        />
      </div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSetting, mounted } = useExileSettings();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "audio" | "display" | "profile"
  >("audio");

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
        description="Preferensi audio, tampilan, dan profil."
        icon={RiSettings3Line}
        closeLabel="Tutup pengaturan"
      />

      <ModalBody className="py-2 px-3 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 min-h-[360px]">
          {/* Side navigation */}
          <nav className="md:col-span-4 flex md:flex-col gap-1.5 md:gap-1 pb-2 md:pb-0 md:pe-4 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cx(
                    "flex shrink-0 items-center gap-2 px-3.5 py-2.5 md:px-3 md:py-2 rounded-full md:rounded-xl min-h-[44px] md:min-h-0 text-body-2-medium transition-colors cursor-pointer text-start select-none md:w-full",
                    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    isActive
                      ? "bg-background-secondary-hover text-text-primary font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-default"
                  )}
                >
                  <Icon className={cx("size-4 shrink-0", isActive ? "text-foreground-icon-primary" : "text-foreground-icon-tertiary")} />
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

                <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-body-medium text-text-primary">
                      Volume suara
                    </span>
                    <span className="text-caption-1-semibold font-mono tabular-nums text-text-primary bg-background-primary-default border border-border-button-default px-2.5 py-1 rounded-lg shrink-0">
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
                    className="touch-slider w-full"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("click")}
                      className="min-h-[44px] flex-1 sm:flex-initial"
                    >
                      Tes klik
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("correct")}
                      className="min-h-[44px] flex-1 sm:flex-initial"
                    >
                      Tes gamelan
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={RiPlayFill}
                      disabled={!settings.soundEnabled}
                      onClick={() => handleTestSound("fanfare")}
                      className="min-h-[44px] flex-1 sm:flex-initial"
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

            {activeTab === "display" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4 space-y-2.5">
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

                <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4 space-y-2.5">
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
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4">
                  <Input
                    label="Nama panggilan standar"
                    placeholder="Contoh: dimas arya"
                    hint="Nama ini akan otomatis terisi saat anda bergabung ke ruang kuis."
                    leadingIcon={RiUser3Line}
                    value={settings.defaultNickname}
                    onChange={(val) => updateSetting("defaultNickname", val)}
                    maxLength={32}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="sm:justify-between pt-4 gap-2">
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiRefreshLine}
          onClick={handleResetDefaults}
          className="min-h-[44px] sm:min-h-0"
        >
          Reset standar
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={onClose}
          className="min-h-[44px] sm:min-h-0"
        >
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
        className={className}
      />

      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
