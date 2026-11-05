"use client";

import { useState, useEffect, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const GOOGLE_OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "130049618716-hul2uq4ftk2d7efp7usr46efuecj3fvb.apps.googleusercontent.com";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (typeof window !== "undefined" && window.location.hash.includes("id_token=")) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const idToken = hashParams.get("id_token");
        const statePath = hashParams.get("state");
        const rawNonce = sessionStorage.getItem("exile_google_oauth_nonce") || undefined;
        sessionStorage.removeItem("exile_google_oauth_nonce");
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );

        if (idToken) {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
            nonce: rawNonce,
          });
          if (!error && data.session) {
            if (mounted) {
              setSession(data.session);
              setUser(data.user);
              setLoading(false);
            }
            toast.success("Berhasil masuk dengan Google.");
            const savedNext =
              statePath ||
              sessionStorage.getItem("exile_google_oauth_next") ||
              "/studio";
            sessionStorage.removeItem("exile_google_oauth_next");
            if (savedNext.startsWith("/") && !savedNext.startsWith("//")) {
              window.location.replace(savedNext);
            }
            return;
          } else if (error) {
            toast.error(error.message || "Gagal memverifikasi token Google.");
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      let nextPath = "/studio";
      if (redirectTo) {
        try {
          const parsed = new URL(redirectTo, origin || "https://www.exile.web.id");
          const nextParam = parsed.searchParams.get("next");
          if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
            nextPath = nextParam;
          }
        } catch {
          // keep default /studio
        }
      }

      if (typeof window !== "undefined" && GOOGLE_OAUTH_CLIENT_ID) {
        const rawNonce = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(rawNonce)
        );
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        sessionStorage.setItem("exile_google_oauth_nonce", rawNonce);
        sessionStorage.setItem("exile_google_oauth_next", nextPath);

        const callbackUri = `${origin}/auth/callback`;
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", GOOGLE_OAUTH_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", callbackUri);
        authUrl.searchParams.set("response_type", "id_token");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("nonce", hashedNonce);
        authUrl.searchParams.set("prompt", "select_account");
        authUrl.searchParams.set("state", nextPath);

        window.location.assign(authUrl.toString());
        return;
      }

      const targetUrl = redirectTo || `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: targetUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Gagal masuk dengan Google";
      if (
        msg.includes("Unsupported provider") ||
        msg.includes("provider is not enabled")
      ) {
        msg =
          "Google OAuth belum diaktifkan di Supabase Dashboard (Authentication > Providers > Google). Masukkan Client ID & Secret Google Anda.";
      }
      toast.error(msg);
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return { success: true, message: "Tautan masuk telah dikirim ke email Anda." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim tautan masuk";
      toast.error(msg);
      return { success: false, message: msg };
    }
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        setSession(data.session);
        setUser(data.user);
        return { success: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Email atau kata sandi tidak sesuai.";
        toast.error(msg);
        return { success: false, message: msg };
      }
    },
    []
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || "Pengajar Exile",
              role: "teacher",
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          const signInRes = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInRes.error) throw signInRes.error;
          setSession(signInRes.data.session);
          setUser(signInRes.data.user);
        } else {
          setSession(data.session);
          setUser(data.user);
        }

        return { success: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Gagal mendaftarkan akun baru.";
        toast.error(msg);
        return { success: false, message: msg };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast.success("Berhasil keluar dari sesi pengajar.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal keluar";
      toast.error(msg);
    }
  }, []);

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}
