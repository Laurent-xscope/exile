"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { RiCloseLine, RiTeamLine } from "@remixicon/react";
import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";

interface ExileLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

interface TeamMember {
  role: string;
  handle: string;
  roleTitle: string;
  href: string;
  avatar: string;
  initials: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    role: "Leader",
    handle: "@dear.sidd",
    roleTitle: "Arsitektur sistem & rekayasa pedagogi",
    href: "https://www.instagram.com/dear.sidd/",
    avatar: "/team/dear-sidd.jpg",
    initials: "DS",
  },
  {
    role: "Team 1",
    handle: "@wstra__",
    roleTitle: "Desain interaksi & visual 3d",
    href: "https://www.instagram.com/wstra__/",
    avatar: "/team/wstra.jpg",
    initials: "WS",
  },
  {
    role: "Team 2",
    handle: "@ekaprtama_",
    roleTitle: "Pengalaman belajar formatif & data",
    href: "https://www.instagram.com/ekaprtama_/",
    avatar: "/team/ekaprtama.jpg",
    initials: "EP",
  },
];

function ModalTeamAvatar({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative size-10 sm:size-12 rounded-full overflow-hidden shrink-0 border border-border-button-default bg-background-tertiary-default flex items-center justify-center">
      {!hasError ? (
        <Image
          src={src}
          alt={alt}
          width={48}
          height={48}
          className="object-cover size-full transition group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-caption-1-semibold text-text-secondary select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

export function ExileLogo({
  className = "",
  size = 32,
  showText = false,
}: ExileLogoProps) {
  const [showCredits, setShowCredits] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!showCredits) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCredits(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCredits]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.currentTarget.blur();
          setShowCredits(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.currentTarget.blur();
            setShowCredits(true);
          }
        }}
        title="Klik untuk melihat kredit tim"
        className={cx(
          "inline-flex items-center gap-2.5 select-none cursor-pointer transition-transform active:scale-98 rounded-xl outline-none focus:outline-none focus-visible:outline-none",
          className
        )}
      >
        <div
          className="relative overflow-hidden rounded-xl shadow-xs shrink-0 flex items-center justify-center bg-background-secondary-default hover:bg-background-secondary-hover transition"
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo.png"
            alt="Exile logo"
            width={size}
            height={size}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        {showText && (
          <span className="font-semibold text-headline-semibold text-text-primary tracking-tight">
            Exile
          </span>
        )}
      </div>

      {showCredits && mounted && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kredit tim kontributor"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowCredits(false)}
        >
          <div
            className="relative flex flex-col max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl bg-background-primary-default p-6 shadow-dropdown border border-border-button-default text-start"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-separator-border">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-background-tertiary-default text-foreground-icon-primary border border-border-button-default">
                  <RiTeamLine className="size-5 text-foreground-icon-secondary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-body-semibold text-text-primary">
                    Kredit kontributor
                  </h3>
                  <p className="text-caption-1-regular text-text-secondary">
                    Tim di balik pembuatan platform Exile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCredits(false)}
                aria-label="Tutup jendela kredit"
                className="flex size-8 items-center justify-center rounded-full text-foreground-icon-tertiary hover:bg-background-secondary-default hover:text-foreground-icon-primary transition cursor-pointer outline-none"
              >
                <RiCloseLine className="size-5 text-foreground-icon-secondary" aria-hidden="true" />
              </button>
            </div>

            {/* Contributor List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {TEAM_MEMBERS.map((member) => (
                <a
                  key={member.handle}
                  href={member.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 rounded-2xl bg-background-secondary-default p-3 transition hover:bg-background-secondary-hover border border-border-button-default group"
                >
                  <ModalTeamAvatar
                    src={member.avatar}
                    alt={member.handle}
                    initials={member.initials}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-body-2-semibold text-text-primary group-hover:text-text-primary transition">
                        {member.handle}
                      </span>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-background-tertiary-default text-text-secondary text-caption-2-medium border border-border-button-default">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-caption-2-regular text-text-secondary leading-snug break-words">
                      {member.roleTitle}
                    </p>
                    <span className="text-caption-2-regular text-text-tertiary block">
                      Instagram
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-separator-border flex items-center justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowCredits(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
