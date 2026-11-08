"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  RiLogoutBoxRLine,
  RiBookOpenLine,
  RiArrowDownSLine,
  RiQuillPenLine,
  RiLoginBoxLine,
  RiSunLine,
  RiMoonLine,
  RiCheckLine,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonLink } from "@/components/base/buttons/button";
import {
  Dropdown,
  DropdownDivider,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { FlagIconID, FlagIconUS } from "@/components/theme/language-toggle";
import { useAuth } from "@/lib/auth/use-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cx } from "@/utils/cx";

export interface UserNavProps {
  includePreferences?: boolean;
}

export function UserNav({ includePreferences = false }: UserNavProps = {}) {
  const router = useRouter();
  const { lang, setLanguage } = useTranslation();
  const isEn = lang === "en";
  const { user, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = mounted ? resolvedTheme === "dark" : false;

  if (loading) {
    return (
      <div
        className="size-9 rounded-xl bg-background-secondary-default animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (!user && !includePreferences) {
    return (
      <ButtonLink
        href="/login"
        variant="secondary"
        size="small"
        leadingIcon={RiLoginBoxLine}
      >
        {isEn ? "Sign in" : "Masuk"}
      </ButtonLink>
    );
  }

  const email = user?.email || "";
  const name = user
    ? user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split("@")[0] ||
      (isEn ? "Educator" : "Pengajar")
    : isEn
      ? "Guest"
      : "Tamu";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.refresh();
  };

  return (
    <Dropdown isOpen={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownTrigger
        className={cx(
          "inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5",
          "bg-background-secondary-default hover:bg-background-secondary-hover active:bg-background-tertiary-default",
          "text-text-primary transition-colors select-none",
        )}
      >
        <Avatar
          size="xs"
          color={user ? "blue" : "neutral"}
          src={avatarUrl}
          alt={name}
          initials={initials}
        />
        <span className="text-body-2-medium text-text-primary max-w-[110px] truncate hidden sm:inline">
          {name}
        </span>
        <RiArrowDownSLine
          className={cx(
            "size-4 shrink-0 text-foreground-icon-secondary transition-transform duration-150",
            dropdownOpen && "rotate-180",
          )}
          aria-hidden
        />
      </DropdownTrigger>

      <DropdownPopover aria-label={isEn ? "Account menu" : "Menu akun"} placement="bottom end">
        <div className="flex flex-col gap-1.5 px-2 py-1.5">
          <div className="flex items-center gap-2.5">
            <Avatar
              size="sm"
              color={user ? "blue" : "neutral"}
              src={avatarUrl}
              alt={name}
              initials={initials}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-body-2-medium text-text-primary truncate">
                {name}
              </p>
              {email ? (
                <p className="text-caption-1-regular text-text-secondary truncate" dir="ltr">
                  {email}
                </p>
              ) : !user ? (
                <p className="text-caption-1-regular text-text-tertiary truncate">
                  {isEn ? "Guest user" : "Pengguna tamu"}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {!user && includePreferences && (
          <>
            <DropdownDivider />
            <DropdownGroup>
              <DropdownItem
                onSelect={() => {
                  setDropdownOpen(false);
                  router.push("/login");
                }}
              >
                <RiLoginBoxLine
                  className="size-4 shrink-0 text-foreground-icon-secondary"
                  aria-hidden
                />
                <span className="text-body-2-medium text-text-primary">
                  {isEn ? "Sign in" : "Masuk"}
                </span>
              </DropdownItem>
            </DropdownGroup>
          </>
        )}

        <DropdownDivider />

        <DropdownGroup label={isEn ? "Navigation" : "Navigasi"}>
          <DropdownItem
            onSelect={() => {
              setDropdownOpen(false);
              router.push("/studio");
            }}
          >
            <RiQuillPenLine
              className="size-4 shrink-0 text-foreground-icon-secondary"
              aria-hidden
            />
            <span className="text-body-2-medium text-text-primary">
              {isEn ? "Teacher studio" : "Studio ajar guru"}
            </span>
          </DropdownItem>

          <DropdownItem
            onSelect={() => {
              setDropdownOpen(false);
              router.push("/play");
            }}
          >
            <RiBookOpenLine
              className="size-4 shrink-0 text-foreground-icon-secondary"
              aria-hidden
            />
            <span className="text-body-2-medium text-text-primary">
              {isEn ? "Student arena" : "Arena kuis siswa"}
            </span>
          </DropdownItem>
        </DropdownGroup>

        {includePreferences && (
          <>
            <DropdownDivider />
            <DropdownGroup label={isEn ? "Preferences" : "Preferensi"}>
              <DropdownItem
                selected={lang === "id"}
                onSelect={() => {
                  setLanguage("id");
                }}
              >
                <FlagIconID />
                <span className="text-body-2-medium text-text-primary">
                  Indonesia
                </span>
                {lang === "id" && (
                  <RiCheckLine
                    className="size-4 text-accent-600 ms-auto shrink-0"
                    aria-hidden
                  />
                )}
              </DropdownItem>

              <DropdownItem
                selected={lang === "en"}
                onSelect={() => {
                  setLanguage("en");
                }}
              >
                <FlagIconUS />
                <span className="text-body-2-medium text-text-primary">
                  English
                </span>
                {lang === "en" && (
                  <RiCheckLine
                    className="size-4 text-accent-600 ms-auto shrink-0"
                    aria-hidden
                  />
                )}
              </DropdownItem>

              <DropdownItem
                onSelect={() => {
                  setTheme(isDark ? "light" : "dark");
                }}
              >
                {isDark ? (
                  <RiSunLine
                    className="size-4 shrink-0 text-foreground-icon-secondary"
                    aria-hidden
                  />
                ) : (
                  <RiMoonLine
                    className="size-4 shrink-0 text-foreground-icon-secondary"
                    aria-hidden
                  />
                )}
                <span className="text-body-2-medium text-text-primary">
                  {isDark
                    ? isEn
                      ? "Light mode"
                      : "Mode terang"
                    : isEn
                      ? "Dark mode"
                      : "Mode gelap"}
                </span>
              </DropdownItem>
            </DropdownGroup>
          </>
        )}

        {user && (
          <>
            <DropdownDivider />
            <DropdownGroup>
              <DropdownItem
                onSelect={handleSignOut}
                className="text-text-error-primary hover:bg-background-tertiary-error"
              >
                <RiLogoutBoxRLine
                  className="size-4 shrink-0 text-foreground-icon-error"
                  aria-hidden
                />
                <span className="text-body-2-medium text-text-error-primary">
                  {isEn ? "Sign out" : "Keluar akun"}
                </span>
              </DropdownItem>
            </DropdownGroup>
          </>
        )}
      </DropdownPopover>
    </Dropdown>
  );
}
