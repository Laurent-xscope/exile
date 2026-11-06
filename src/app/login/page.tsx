"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiBookOpenLine,
  RiMailLine,
  RiLockPasswordLine,
  RiUser3Line,
  RiArrowRightLine,
  RiArrowLeftLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { Spinner } from "@/components/base/spinner/spinner";
import { SettingsButton } from "@/components/settings/settings-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { useAuth } from "@/lib/auth/use-auth";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const isEn = lang === "en";
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/studio");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next");
    if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
      // The query string is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNextPath(nextParam);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [authLoading, user, nextPath, router]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(
        isEn
          ? "Enter a valid email address."
          : "Masukkan alamat email yang valid."
      );
      return;
    }
    if (!password || password.length < 6) {
      toast.error(
        isEn
          ? "Password must be at least 6 characters."
          : "Kata sandi minimal 6 karakter."
      );
      return;
    }

    setSubmitting(true);
    if (mode === "signin") {
      const res = await signInWithPassword(email, password);
      setSubmitting(false);
      if (res.success) {
        toast.success(
          isEn
            ? "Signed in to educator studio."
            : "Berhasil masuk ke studio pengajar."
        );
        router.replace(nextPath);
      }
    } else {
      const res = await signUpWithPassword(email, password, fullName);
      setSubmitting(false);
      if (res.success) {
        toast.success(
          isEn
            ? "Educator account created and signed in."
            : "Akun pengajar berhasil dibuat dan masuk."
        );
        router.replace(nextPath);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle(
        `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      );
    } catch {
      setGoogleLoading(false);
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
          {t.login.backHome}
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
        <div className="flex flex-col gap-3 pb-5 border-b border-separator-border">
          <div className="size-11 rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-center text-foreground-icon-primary shadow-2xs">
            <RiBookOpenLine className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-title-2-semibold text-text-primary">
              {t.login.title}
            </h1>
            <p className="text-body-regular text-text-secondary">
              {t.login.subtitle}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <SegmentedControl
            aria-label={isEn ? "Authentication mode" : "Mode otentikasi"}
            selectedKeys={new Set([mode])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              if (selected === "signin" || selected === "signup") {
                setMode(selected);
              }
            }}
            className="w-full"
          >
            <SegmentedControlItem id="signin" className="flex-1 justify-center">
              {t.login.modeSignin}
            </SegmentedControlItem>
            <SegmentedControlItem id="signup" className="flex-1 justify-center">
              {t.login.modeSignup}
            </SegmentedControlItem>
          </SegmentedControl>

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <Input
                type="text"
                label={t.login.fullNameLabel}
                placeholder={t.login.fullNamePlaceholder}
                leadingIcon={RiUser3Line}
                value={fullName}
                onChange={setFullName}
                isRequired
              />
            )}

            <Input
              type="email"
              label={t.login.emailLabel}
              placeholder={t.login.emailPlaceholder}
              leadingIcon={RiMailLine}
              value={email}
              onChange={setEmail}
              isRequired
              inputDir="ltr"
            />

            <Input
              type="password"
              label={t.login.passwordLabel}
              placeholder={t.login.passwordPlaceholder}
              leadingIcon={RiLockPasswordLine}
              value={password}
              onChange={setPassword}
              isRequired
              inputDir="ltr"
            />

            <Button
              type="submit"
              variant="primary"
              size="medium"
              disabled={submitting || authLoading}
              trailingIcon={submitting ? undefined : RiArrowRightLine}
              className="w-full"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" aria-hidden className="text-text-white" />
                  <span>{t.login.processing}</span>
                </span>
              ) : mode === "signin" ? (
                t.login.signinBtn
              ) : (
                t.login.signupBtn
              )}
            </Button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="grow border-t border-separator-border" />
            <span className="mx-3 shrink-0 text-caption-1-medium text-text-tertiary">
              {lang === "en" ? "Or" : "Atau"}
            </span>
            <div className="grow border-t border-separator-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="medium"
            onClick={handleGoogleLogin}
            disabled={googleLoading || authLoading}
            className="w-full justify-center gap-2.5"
          >
            {googleLoading ? (
              <Spinner size="sm" aria-hidden />
            ) : (
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{t.login.googleBtn}</span>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
