"use client";

import React, { useEffect, useState } from "react";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiHashtag,
  RiUserLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Spinner } from "@/components/base/spinner/spinner";
import { soundEffects } from "@/lib/audio/sounds";
import { useTranslation } from "@/lib/i18n/use-translation";
import { loadSettings } from "@/lib/settings/user-settings";
import {
  getPlayerToken,
  savePlayerIdentity,
} from "@/lib/rooms/player-token";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { cx } from "@/utils/cx";

const AVATARS = [
  {
    id: "garuda",
    label: "Garuda",
    hintId: "Elang dewata",
    hintEn: "Guardian eagle",
  },
  {
    id: "barong",
    label: "Barong",
    hintId: "Pelindung dharma",
    hintEn: "Protector of dharma",
  },
  {
    id: "dragon",
    label: "Naga",
    hintId: "Naga basuki",
    hintEn: "Naga basuki",
  },
  {
    id: "lotus",
    label: "Padma",
    hintId: "Teratai suci",
    hintEn: "Sacred lotus",
  },
] as const;

export interface JoinedRoomResult {
  roomCode: string;
  playerId: string;
  playerToken: string;
  playerStatus: "approved" | "pending" | "rejected";
  nickname: string;
  avatar: string;
}

interface JoinRoomFormProps {
  initialCode?: string;
  codeLocked?: boolean;
  initialNickname?: string;
  initialAvatar?: string;
  onJoined: (result: JoinedRoomResult) => void;
}

export function JoinRoomForm({
  initialCode = "",
  codeLocked = false,
  initialNickname = "",
  initialAvatar = "",
  onJoined,
}: JoinRoomFormProps) {
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const [code, setCode] = useState(() => normalizeRoomCode(initialCode));
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("garuda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const settings = loadSettings();
    const savedNickname =
      initialNickname.trim() ||
      sessionStorage.getItem("exile_nickname") ||
      localStorage.getItem("exile_player_nickname") ||
      settings.defaultNickname ||
      "";
    const savedAvatar =
      initialAvatar ||
      sessionStorage.getItem("exile_avatar") ||
      localStorage.getItem("exile_player_avatar") ||
      settings.defaultAvatar ||
      "garuda";

    /* eslint-disable react-hooks/set-state-in-effect -- defaults are only available after hydration */
    setNickname(savedNickname);
    setSelectedAvatar(savedAvatar);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialNickname, initialAvatar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCode = normalizeRoomCode(code);
    const cleanNickname = nickname.trim();

    if (!isValidRoomCode(cleanCode)) {
      setError(
        isEn
          ? "Enter the 6-digit room PIN from your teacher."
          : "Masukkan PIN ruangan 6 digit dari pengajar."
      );
      return;
    }
    if (!cleanNickname) {
      setError(
        isEn ? "Enter a nickname for this session." : "Masukkan nama panggilanmu."
      );
      return;
    }

    setError("");
    setLoading(true);
    soundEffects.playClick();

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: cleanCode,
          nickname: cleanNickname,
          avatar: selectedAvatar,
          playerToken: getPlayerToken(cleanCode) || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.playerId || !data.playerToken) {
        throw new Error(
          data.error ||
            (isEn
              ? "That room could not be joined. Check the PIN and try again."
              : "Ruangan tidak dapat dimasuki. Periksa PIN lalu coba lagi.")
        );
      }

      savePlayerIdentity(cleanCode, data.playerId, data.playerToken);
      localStorage.setItem("exile_player_nickname", cleanNickname);
      localStorage.setItem("exile_player_avatar", selectedAvatar);
      sessionStorage.setItem("exile_nickname", cleanNickname);
      sessionStorage.setItem("exile_avatar", selectedAvatar);

      onJoined({
        roomCode: data.room?.roomCode || cleanCode,
        playerId: data.playerId,
        playerToken: data.playerToken,
        playerStatus: data.playerStatus || "approved",
        nickname: data.nickname || cleanNickname,
        avatar: data.avatar || selectedAvatar,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not join this room."
            : "Gagal bergabung ke ruangan ini."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {codeLocked ? (
        <div className="rounded-2xl border border-border-button-default bg-background-secondary-default px-4 py-3 text-center">
          <span className="text-caption-2-semibold tracking-wide text-text-tertiary">
            {isEn ? "Room pin" : "Pin ruangan"}
          </span>
          <div className="mt-1 font-mono text-title-2-semibold tracking-[0.3em] text-text-primary">
            {code || "------"}
          </div>
        </div>
      ) : (
        <Input
          label={isEn ? "Quiz room pin (6 digits)" : "Pin ruang kuis (6 digit)"}
          placeholder="123456"
          hint={
            isEn
              ? "The room code shown on your teacher's screen."
              : "Kode ruangan yang tampil di layar pengajar."
          }
          leadingIcon={RiHashtag}
          value={code}
          onChange={(value) => setCode(normalizeRoomCode(value))}
          maxLength={6}
          inputDir="ltr"
          fieldClassName="h-12 bg-background-primary-default border border-border-button-default shadow-2xs"
          inputClassName="text-center font-mono text-title-2-semibold tracking-[0.28em]"
          isRequired
        />
      )}

      <Input
        label={isEn ? "Nickname" : "Nama panggilan"}
        placeholder={
          isEn ? "How should your class see you?" : "Nama yang dilihat teman sekelas..."
        }
        hint={
          isEn
            ? "No account needed. Your nickname is used for this live session."
            : "Tanpa akun. Nama ini digunakan untuk sesi kuis ini."
        }
        leadingIcon={RiUserLine}
        value={nickname}
        onChange={setNickname}
        maxLength={24}
        isRequired
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-medium text-text-primary">
            {isEn ? "Character emblem" : "Lambang karakter"}
          </span>
          <span className="text-caption-1-regular text-text-secondary">
            {isEn ? "Pick one" : "Pilih satu"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {AVATARS.map((avatar) => {
            const isSelected = selectedAvatar === avatar.id;
            return (
              <button
                type="button"
                key={avatar.id}
                onClick={() => {
                  soundEffects.playClick();
                  setSelectedAvatar(avatar.id);
                }}
                aria-pressed={isSelected}
                className={cx(
                  "flex cursor-pointer select-none flex-col items-start justify-between rounded-2xl border p-3.5 text-start transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  isSelected
                    ? "border-accent-500 bg-background-secondary-default text-text-primary shadow-xs"
                    : "border-border-button-default bg-background-primary-default text-text-secondary hover:border-border-button-hover hover:bg-background-primary-hover hover:text-text-primary"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-body-medium text-text-primary">
                    {avatar.label}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-md bg-accent-600 text-text-white">
                      <RiCheckLine className="size-3.5" aria-hidden />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="size-5 rounded-md border border-border-checkbox-default bg-background-primary-default"
                    />
                  )}
                </div>
                <span className="mt-1 text-caption-1-regular text-text-secondary">
                  {isEn ? avatar.hintEn : avatar.hintId}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-border-error-default bg-background-tertiary-error px-3.5 py-2.5 text-caption-1-medium text-text-error-primary"
        >
          {error}
        </div>
      )}

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
            <span>{isEn ? "Joining room..." : "Bergabung..."}</span>
          </span>
        ) : isEn ? (
          "Join live room"
        ) : (
          "Gabung ke ruang kuis"
        )}
      </Button>
    </form>
  );
}
