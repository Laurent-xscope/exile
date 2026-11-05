import React from "react";
import Image from "next/image";
import { cx } from "@/utils/cx";

interface ExileLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function ExileLogo({
  className = "",
  size = 32,
  showText = false,
}: ExileLogoProps) {
  return (
    <div className={cx("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className="relative overflow-hidden rounded-xl border border-border-button-default shadow-xs shrink-0 flex items-center justify-center bg-[#131211]"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="Exile Logo"
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
  );
}
