"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiBookOpenLine,
  RiGroupLine,
  RiHashtag,
  RiTimeLine,
} from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { Spinner } from "@/components/base/spinner/spinner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import {
  JoinRoomForm,
  type JoinedRoomResult,
} from "@/components/rooms/join-room-form";
import { TelegramSpoilerPin } from "@/components/rooms/telegram-spoiler-pin";
import { useTranslation } from "@/lib/i18n/use-translation";
import { loadSettings } from "@/lib/settings/user-settings";
import {
  getPlayerId,
  getPlayerToken,
  savePlayerIdentity,
} from "@/lib/rooms/player-token";
import { markStudentTabForRoom } from "@/lib/rooms/host-token";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import PlayArenaClient from "./PlayArenaClient";

type RoomStatus =
  | "waiting"
  | "active"
  | "question_active"
  | "showing_leaderboard"
  | "finished";

interface RoomPreview {
  hostName: string;
  status: RoomStatus;
  totalQuestions: number;
  players?: Array<{
    id: string;
    status?: "approved" | "pending" | "rejected";
  }>;
}

type EntryPhase = "checking" | "join" | "joined" | "error";

interface PlayerIdentity {
  playerId: string;
  playerToken: string;
  nickname: string;
  avatar: string;
  playerStatus: "approved" | "pending" | "rejected";
}

function statusLabel(status: RoomStatus, isEn: boolean) {
  if (status === "waiting") return isEn ? "Lobby open" : "Lobi dibuka";
  if (status === "showing_leaderboard") {
    return isEn ? "Scoreboard" : "Papan skor";
  }
  return isEn ? "Live now" : "Sedang live";
}

export default function PlayRoomClient({ roomCode }: { roomCode: string }) {
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const code = normalizeRoomCode(roomCode);

  const [phase, setPhase] = useState<EntryPhase>("checking");
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [entryError, setEntryError] = useState("");
  const [notice, setNotice] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [initialAvatar, setInitialAvatar] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (isValidRoomCode(code)) {
      markStudentTabForRoom(code);
    }

    const bootstrap = async () => {
      if (!isValidRoomCode(code)) {
        setEntryError(
          isEn
            ? "Room pins are exactly 6 digits."
            : "Pin ruangan harus tepat 6 digit."
        );
        setPhase("error");
        return;
      }

      try {
        const res = await fetch(`/api/rooms/${code}/state`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setEntryError(
            data.error ||
              (isEn
                ? "This room does not exist or has closed."
                : "Ruangan ini tidak ditemukan atau sudah ditutup.")
          );
          setPhase("error");
          return;
        }

        setPreview(data);

        if (data.isAbandoned) {
          setEntryError(
            isEn
              ? "This classroom was closed by the teacher."
              : "Ruang kelas ini telah ditutup oleh pengajar."
          );
          setPhase("error");
          return;
        }

        if (data.status === "finished") {
          setEntryError(
            isEn
              ? "This quiz session has ended. Ask your teacher for a new room pin."
              : "Sesi kuis ini sudah berakhir. Minta pin baru kepada pengajar."
          );
          setPhase("error");
          return;
        }

        const settings = loadSettings();
        const savedNickname =
          sessionStorage.getItem("exile_nickname") ||
          localStorage.getItem("exile_player_nickname") ||
          settings.defaultNickname ||
          "";
        const savedAvatar =
          sessionStorage.getItem("exile_avatar") ||
          localStorage.getItem("exile_player_avatar") ||
          settings.defaultAvatar ||
          "garuda";
        setInitialNickname(savedNickname);
        setInitialAvatar(savedAvatar);

        const storedId = getPlayerId(code);
        const storedToken = getPlayerToken(code);

        if (storedId && storedToken && savedNickname.trim()) {
          const joinRes = await fetch("/api/rooms/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomCode: code,
              nickname: savedNickname.trim(),
              avatar: savedAvatar,
              playerToken: storedToken,
            }),
          });
          const joinData = await joinRes.json().catch(() => ({}));
          if (cancelled) return;

          if (joinRes.ok && joinData.success && joinData.playerId) {
            savePlayerIdentity(
              code,
              joinData.playerId,
              joinData.playerToken || storedToken
            );
            setIdentity({
              playerId: joinData.playerId,
              playerToken: joinData.playerToken || storedToken,
              nickname: joinData.nickname || savedNickname.trim(),
              avatar: joinData.avatar || savedAvatar,
              playerStatus: joinData.playerStatus || "approved",
            });
            setPhase("joined");
            return;
          }

          if (joinRes.status === 404) {
            setEntryError(
              joinData.error ||
                (isEn
                  ? "This room is no longer available."
                  : "Ruangan ini sudah tidak tersedia.")
            );
            setPhase("error");
            return;
          }

          setNotice(
            joinData.error ||
              (isEn
                ? "Your saved session could not reconnect. Join again below."
                : "Sesi tersimpan tidak dapat tersambung ulang. Bergabung lagi di bawah.")
          );
        }

        setPhase("join");
      } catch {
        if (cancelled) return;
        setEntryError(
          isEn
            ? "Could not reach this quiz room. Check your connection and try again."
            : "Tidak dapat menghubungi ruang kuis. Periksa koneksi lalu coba lagi."
        );
        setPhase("error");
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [code, isEn]);

  useEffect(() => {
    if (phase !== "join") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/state`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 || data?.isAbandoned) {
          setEntryError(
            isEn
              ? "This classroom was closed by the teacher."
              : "Ruang kelas ini telah ditutup oleh pengajar."
          );
          setPhase("error");
        } else if (res.ok && data.success) {
          setPreview(data);
        }
      } catch {
        // ignore background poll errors
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [phase, code, isEn]);

  const handleJoined = (result: JoinedRoomResult) => {
    setIdentity({
      playerId: result.playerId,
      playerToken: result.playerToken,
      nickname: result.nickname,
      avatar: result.avatar,
      playerStatus: result.playerStatus,
    });
    setPhase("joined");
  };

  if (identity && phase === "joined") {
    return (
      <PlayArenaClient
        key={identity.playerId}
        roomCode={code}
        playerId={identity.playerId}
        playerToken={identity.playerToken}
        nickname={identity.nickname}
        initialStatus={identity.playerStatus}
      />
    );
  }

  const playerCount =
    preview?.players?.filter(
      (player) => !player.status || player.status === "approved"
    ).length ?? 0;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background-full px-4 py-16 text-text-primary">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-6">
        <ButtonLink
          href="/play"
          variant="secondary"
          size="small"
          leadingIcon={RiArrowLeftLine}
          className="border border-border-button-default"
        >
          {isEn ? "Join another room" : "Ganti ruangan"}
        </ButtonLink>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {phase === "checking" ? (
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <Spinner
            size="md"
            aria-label={
              isEn ? "Checking quiz room" : "Memeriksa ruang kuis"
            }
          />
          <p className="text-caption-1-medium">
            {isEn ? "Checking room..." : "Memeriksa ruangan..."}
          </p>
        </div>
      ) : phase === "error" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-background-primary-default p-7 text-center shadow-lg"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-background-tertiary-error text-text-error-primary">
            <RiTimeLine className="size-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-title-2-semibold text-text-primary">
            {isEn ? "Room unavailable" : "Ruangan tidak tersedia"}
          </h1>
          <p className="mt-2 text-body-regular text-text-secondary">
            {entryError}
          </p>
          {code && (
            <div className="mt-3 flex items-center justify-center">
              <TelegramSpoilerPin pin={code} size="sm" isEn={isEn} copyable={false} />
            </div>
          )}
          <ButtonLink
            href="/play"
            variant="secondary"
            size="medium"
            leadingIcon={RiArrowLeftLine}
            className="mt-6 w-full justify-center border border-border-button-default"
          >
            {isEn ? "Try another pin" : "Coba pin lain"}
          </ButtonLink>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-4"
        >
          <div className="rounded-2xl bg-background-primary-default p-6 shadow-lg sm:p-8">
            <div className="flex items-start gap-3 pb-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-title-2-semibold text-text-primary">
                    {preview?.hostName
                      ? isEn
                        ? `${preview.hostName}'s live quiz`
                        : `Kuis live ${preview.hostName}`
                      : isEn
                        ? "Live quiz room"
                        : "Ruang kuis live"}
                  </h1>
                  {preview && (
                    <Chip variant="caption" color="neutral">
                      {statusLabel(preview.status, isEn)}
                    </Chip>
                  )}
                </div>
                <p className="mt-1 text-caption-1-regular text-text-secondary">
                  {isEn
                    ? "Enter a nickname to join. No account needed."
                    : "Masukkan nama panggilan untuk bergabung. Tanpa akun."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption-1-medium text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <RiHashtag className="size-3.5" aria-hidden />
                <TelegramSpoilerPin pin={code} size="sm" isEn={isEn} copyable={false} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RiBookOpenLine className="size-3.5" aria-hidden />
                {preview?.totalQuestions ?? 0} {isEn ? "questions" : "soal"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RiGroupLine className="size-3.5" aria-hidden />
                {playerCount} {isEn ? "joined" : "bergabung"}
              </span>
            </div>

            {notice && (
              <div className="mt-4 rounded-xl bg-background-tertiary-error px-3.5 py-2.5 text-caption-1-medium text-text-error-primary">
                {notice}
              </div>
            )}

            <div className="mt-6">
              <JoinRoomForm
                key={code}
                initialCode={code}
                codeLocked
                initialNickname={initialNickname}
                initialAvatar={initialAvatar}
                onJoined={handleJoined}
              />
            </div>
          </div>

          <p className="text-center text-caption-1-regular text-text-tertiary">
            {isEn ? "Already have a saved seat? " : "Sudah punya kursi tersimpan? "}
            <Link
              href="/play"
              className="font-medium text-text-secondary underline underline-offset-2 hover:text-text-primary"
            >
              {isEn ? "Use another device" : "Gunakan perangkat lain"}
            </Link>
          </p>
        </motion.div>
      )}
    </main>
  );
}
