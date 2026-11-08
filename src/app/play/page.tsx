"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiLinkM,
} from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import {
  JoinRoomForm,
  type JoinedRoomResult,
} from "@/components/rooms/join-room-form";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function PlayJoinPage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const [initialCode, setInitialCode] = useState("");
  const [hasAutofillLink, setHasAutofillLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");

    if (codeParam) {
      /* eslint-disable react-hooks/set-state-in-effect -- query string is only available after hydration */
      setInitialCode(codeParam);
      setHasAutofillLink(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  const handleJoined = (result: JoinedRoomResult) => {
    router.push(`/play/${result.roomCode}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background-full px-4 py-16 text-text-primary">
      <header className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto max-w-[960px] flex items-center justify-between px-4 py-4 sm:px-6">
          <ButtonLink
            href="/"
            variant="secondary"
            size="small"
            leadingIcon={RiArrowLeftLine}
            className="border border-border-button-default"
          >
            {isEn ? "Home" : "Beranda"}
          </ButtonLink>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md mx-auto rounded-2xl bg-background-primary-default p-6 shadow-lg sm:p-8"
      >
        <div className="pb-6">
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
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-background-secondary-default border border-border-button-default p-3 text-caption-1-medium text-text-primary">
            <RiLinkM className="size-4 shrink-0 text-text-secondary" aria-hidden />
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
      </motion.div>
    </main>
  );
}
