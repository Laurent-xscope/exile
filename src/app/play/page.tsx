"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiBookOpenLine,
  RiGroupLine,
  RiHashtag,
  RiLinkM,
  RiRefreshLine,
} from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import {
  JoinRoomForm,
  type JoinedRoomResult,
} from "@/components/rooms/join-room-form";
import { useTranslation } from "@/lib/i18n/use-translation";

interface ActiveRoomItem {
  roomCode: string;
  hostName: string;
  status: "waiting" | "active" | "question_active" | "showing_leaderboard" | "finished";
  totalQuestions: number;
  playerCount: number;
  difficulty: "mudah" | "sedang" | "sulit" | "campuran";
}

export default function PlayJoinPage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const [initialCode, setInitialCode] = useState("");
  const [hasAutofillLink, setHasAutofillLink] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const fetchActiveRooms = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoadingRooms(true);
    }
    try {
      const res = await fetch("/api/rooms/list", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.rooms)) {
        setActiveRooms(data.rooms);
      }
    } catch {
      // ignore network error
    } finally {
      if (showLoading) {
        setLoadingRooms(false);
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");

    if (codeParam) {
      /* eslint-disable react-hooks/set-state-in-effect -- query string is only available after hydration */
      setInitialCode(codeParam);
      setHasAutofillLink(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    fetchActiveRooms(true);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      fetchActiveRooms(false);
    }, 30_000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchActiveRooms(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchActiveRooms]);

  const handleJoined = (result: JoinedRoomResult) => {
    router.push(`/play/${result.roomCode}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background-full px-4 py-16 text-text-primary">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-6">
        <ButtonLink
          href="/"
          variant="secondary"
          size="small"
          leadingIcon={RiArrowLeftLine}
        >
          {isEn ? "Home" : "Beranda"}
        </ButtonLink>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card sm:p-8"
      >
        <div className="border-b border-separator-border pb-6">
          <h1 className="text-title-2-semibold tracking-tight text-text-primary">
            {isEn ? "Join exile quiz arena" : "Gabung ruang kuis exile"}
          </h1>
          <p className="mt-1 text-caption-1-regular text-text-secondary">
            {isEn
              ? "Live assessment with your class, no account needed."
              : "Asesmen langsung bersama kelas, tanpa perlu akun."}
          </p>
        </div>

        {hasAutofillLink && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-accent-700/30 bg-accent-700/10 p-3 text-caption-1-medium text-accent-700">
            <RiLinkM className="size-4 shrink-0" aria-hidden />
            <span>
              {isEn
                ? "Invitation link detected. Room pin is prefilled."
                : "Tautan undangan terdeteksi. Pin ruangan sudah terisi."}
            </span>
          </div>
        )}

        <div className="mt-6">
          <JoinRoomForm
            key={initialCode}
            initialCode={initialCode}
            onJoined={handleJoined}
          />
        </div>

        <div className="mt-6 space-y-2.5 border-t border-separator-border pt-5">
          <div className="flex items-center justify-between">
            <span className="text-caption-1-semibold text-text-primary">
              {isEn ? "Active quiz rooms" : "Daftar ruang aktif"}
            </span>
            <button
              type="button"
              onClick={() => fetchActiveRooms(true)}
              disabled={loadingRooms}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-caption-2-medium text-text-secondary hover:bg-background-secondary-default hover:text-text-primary"
            >
              <RiRefreshLine className={loadingRooms ? "size-3.5 animate-spin" : "size-3.5"} />
              <span>{isEn ? "Refresh" : "Muat ulang"}</span>
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <p className="rounded-xl border border-border-button-default bg-background-secondary-default px-3.5 py-2.5 text-caption-2-regular text-text-tertiary">
              {loadingRooms
                ? isEn
                  ? "Checking active rooms..."
                  : "Memeriksa daftar ruang aktif..."
                : isEn
                  ? "No active rooms detected yet. Enter the 6-digit PIN from your teacher above."
                  : "Belum ada ruang aktif terdeteksi. Masukkan 6 digit PIN dari guru di atas."}
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pe-1">
              {activeRooms.map((r) => (
                <button
                  key={r.roomCode}
                  type="button"
                  onClick={() => setInitialCode(r.roomCode)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default/60 p-3 text-left transition hover:border-border-button-hover hover:bg-background-secondary-default"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-body-2-semibold text-text-primary">
                        <RiHashtag className="size-3.5 text-text-tertiary" />
                        {r.roomCode}
                      </span>
                      <Chip
                        variant="caption"
                        color={r.status === "waiting" ? "lime" : "blue"}
                      >
                        {r.status === "waiting"
                          ? isEn
                            ? "Lobby"
                            : "Lobi"
                          : isEn
                            ? "Live"
                            : "Aktif"}
                      </Chip>
                    </div>
                    <p className="truncate text-caption-2-regular text-text-secondary">
                      {r.hostName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-caption-2-medium text-text-tertiary">
                    <span className="inline-flex items-center gap-1">
                      <RiBookOpenLine className="size-3.5" />
                      {r.totalQuestions}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <RiGroupLine className="size-3.5" />
                      {r.playerCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
