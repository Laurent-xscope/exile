"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { RiSunLine, RiMoonLine } from "@remixicon/react";
import { IconButton } from "@/components/base/buttons/icon-button";
import { cx } from "@/utils/cx";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cx(
          "size-9 rounded-2lg border border-border-button-default bg-background-secondary-default animate-pulse",
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  const toggleTheme = () => {
    if (theme === "dark" || resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap";

  return (
    <IconButton
      icon={isDark ? RiSunLine : RiMoonLine}
      size="medium"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={className}
    />
  );
}
