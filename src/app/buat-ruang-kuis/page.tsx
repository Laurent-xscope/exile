"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Spinner } from "@/components/base/spinner/spinner";
import { saveHostToken } from "@/lib/rooms/host-token";
import { toast } from "sonner";

export default function BuatRuangKuisPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function initializeRoom() {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;

      try {
        const res = await fetch("/api/rooms/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostName: "Pengajar exile",
            settings: {
              timePerQuestionSec: 20,
              streakBonus: true,
              shuffleQuestions: false,
            },
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!mounted) return;

        if (!res.ok || !data.success || !data.roomCode || !data.hostToken) {
          throw new Error(data.error || "Gagal membuat ruangan kuis.");
        }

        saveHostToken(data.roomCode, data.hostToken);
        toast.success(`Ruangan berhasil dibuat! Pin: ${data.roomCode}`);
        router.push(`/buat-ruang-kuis/${data.roomCode}`);
      } catch (err) {
        if (!mounted) return;
        isCreatingRef.current = false;
        const msg =
          err instanceof Error ? err.message : "Gagal membuat ruangan kuis.";
        setError(msg);
        toast.error(msg);
      }
    }

    void initializeRoom();

    return () => {
      mounted = false;
    };
  }, [router, isRetrying]);

  const handleRetry = () => {
    setError(null);
    isCreatingRef.current = false;
    setIsRetrying((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background-full flex flex-col items-center justify-center px-3 sm:px-6 py-8 text-center overflow-x-hidden">
      {error ? (
        <div className="max-w-md w-full bg-background-primary-default p-4 sm:p-6 rounded-3xl border border-border-button-default shadow-xs space-y-4">
          <p className="text-body-medium text-text-error-primary">{error}</p>
          <Button
            variant="secondary"
            size="medium"
            onClick={handleRetry}
          >
            Coba lagi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-text-secondary">
          <Spinner size="lg" aria-label="Menyiapkan ruangan kuis baru" />
          <div className="space-y-1">
            <h1 className="text-headline-semibold text-text-primary">
              Menyiapkan ruangan kuis...
            </h1>
            <p className="text-body-2-regular text-text-secondary">
              Membuka ruang ajar dan menghasilkan pin kelas instan
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
