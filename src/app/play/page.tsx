"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiBookOpenLine,
  RiArrowRightLine,
  RiUserLine,
  RiHashtag,
  RiArrowLeftLine,
  RiQuillPenLine,
  RiCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Spinner } from "@/components/base/spinner/spinner";
import { SettingsButton } from "@/components/settings/settings-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { soundEffects } from "@/lib/audio/sounds";
import { loadSettings, type ExileSettings } from "@/lib/settings/user-settings";
import { cx } from "@/utils/cx";

const AVATARS = [
  { id: "garuda", label: "Garuda", subtitle: "Elang Dewata" },
  { id: "barong", label: "Barong", subtitle: "Pelindung Dharma" },
  { id: "dragon", label: "Naga", subtitle: "Naga Basuki" },
  { id: "lotus", label: "Padma", subtitle: "Teratai Suci" },
];

export default function PlayJoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("garuda");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const settings = loadSettings();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      if (codeParam) {
        setRoomCode(codeParam.trim().toUpperCase());
      }

      const savedNick =
        settings.defaultNickname ||
        sessionStorage.getItem("exile_nickname") ||
        localStorage.getItem("exile_player_nickname") ||
        "";
      if (savedNick) {
        setNickname(savedNick);
      }

      const savedAvatar =
        settings.defaultAvatar ||
        sessionStorage.getItem("exile_avatar") ||
        localStorage.getItem("exile_player_avatar") ||
        "garuda";
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
    }

    const handleSettingsUpdate = (e: Event) => {
      const custom = e as CustomEvent<ExileSettings>;
      if (custom.detail) {
        if (custom.detail.defaultNickname) {
          setNickname((prev) => prev || custom.detail.defaultNickname);
        }
        if (custom.detail.defaultAvatar) {
          setSelectedAvatar(custom.detail.defaultAvatar);
        }
      }
    };

    window.addEventListener("exile_settings_updated", handleSettingsUpdate);
    return () =>
      window.removeEventListener("exile_settings_updated", handleSettingsUpdate);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().replace(/\s+/g, "").toUpperCase();

    if (!cleanCode || cleanCode.length < 4) {
      toast.error("Masukkan minimal 4 digit PIN ruangan kuis.");
      return;
    }

    if (!nickname.trim()) {
      toast.error("Masukkan nama panggilan kamu.");
      return;
    }

    soundEffects.playClick();
    setLoading(true);
    toast.loading("Menghubungkan ke ruang kuis...", { id: "join" });

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: cleanCode,
          nickname: nickname.trim(),
          avatar: selectedAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ruang kuis tidak ditemukan");

      toast.success(`Berhasil masuk ke ruang ${cleanCode}`, { id: "join" });

      const cleanNickname = nickname.trim();
      localStorage.setItem("exile_player_id", data.playerId);
      localStorage.setItem("exile_player_nickname", cleanNickname);
      localStorage.setItem("exile_player_avatar", selectedAvatar);

      sessionStorage.setItem("exile_player_id", data.playerId);
      sessionStorage.setItem("exile_nickname", cleanNickname);
      sessionStorage.setItem("exile_avatar", selectedAvatar);

      router.push(`/play/${cleanCode}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Ruang kuis tidak ditemukan";
      toast.error(msg, { id: "join" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background-full text-text-primary flex flex-col justify-center items-center px-4 py-16 relative">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4">
        <ButtonLink
          href="/"
          variant="secondary"
          size="small"
          leadingIcon={RiArrowLeftLine}
        >
          Beranda
        </ButtonLink>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <SettingsButton />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8 shadow-card"
      >
        <div className="flex flex-col gap-3 pb-6 border-b border-separator-border">
          <div className="size-11 rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-center text-foreground-icon-primary shadow-2xs">
            <RiBookOpenLine className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-title-2-semibold text-text-primary">
              Gabung Arena Kuis Exile
            </h1>
            <p className="text-body-regular text-text-secondary">
              Masukkan 6 digit PIN kelas dari layar pengajar dan pilih identitasmu.
            </p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="mt-6 space-y-5">
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4 space-y-2">
            <Input
              label="PIN Ruang Kuis (6 Digit)"
              placeholder="123456"
              hint="Kode angka atau karakter yang tampil pada proyektor kelas."
              leadingIcon={RiHashtag}
              value={roomCode}
              onChange={(val) => setRoomCode(val.toUpperCase())}
              maxLength={8}
              inputDir="ltr"
              fieldClassName="h-12 bg-background-primary-default border border-border-button-default shadow-2xs"
              inputClassName="text-center font-mono text-title-2-semibold tracking-[0.28em]"
              isRequired
            />
          </div>

          <Input
            label="Nama Panggilan"
            placeholder="Ketik nama lengkap atau panggilan..."
            leadingIcon={RiUserLine}
            value={nickname}
            onChange={setNickname}
            maxLength={24}
            isRequired
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-medium text-text-primary">
                Lambang Karakter
              </span>
              <span className="text-caption-1-regular text-text-secondary">
                Pilih 1 karakter
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => {
                      soundEffects.playClick();
                      setSelectedAvatar(av.id);
                    }}
                    aria-pressed={isSelected}
                    className={cx(
                      "flex flex-col items-start justify-between rounded-2xl border p-3.5 text-start transition-colors cursor-pointer select-none",
                      "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      isSelected
                        ? "border-accent-500 bg-background-secondary-default text-text-primary shadow-xs"
                        : "border-border-button-default bg-background-primary-default text-text-secondary hover:bg-background-primary-hover hover:border-border-button-hover hover:text-text-primary",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-body-medium text-text-primary">
                        {av.label}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent-600 text-text-white">
                          <RiCheckLine className="size-3.5" aria-hidden />
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="size-5 rounded-full border border-border-checkbox-default bg-background-primary-default"
                        />
                      )}
                    </div>
                    <span className="text-caption-1-regular text-text-secondary mt-1">
                      {av.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={loading}
            trailingIcon={loading ? undefined : RiArrowRightLine}
            className="w-full"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" aria-hidden className="text-text-white" />
                <span>Menghubungkan...</span>
              </span>
            ) : (
              "Masuk ke Ruang Kuis"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-separator-border flex flex-col gap-2">
          <ButtonLink
            href="/studio"
            variant="secondary"
            size="small"
            leadingIcon={RiQuillPenLine}
            className="w-full justify-center"
          >
            Pengajar? Buka Studio Pembuat Kuis
          </ButtonLink>
        </div>
      </motion.div>
    </main>
  );
}
