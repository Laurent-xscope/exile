"use client";

import { useRef, useState } from "react";
import { RiFileTextLine, RiUploadCloud2Line, RiCloseLine } from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Spinner } from "@/components/base/spinner/spinner";
import type { QuizDifficultyLevel } from "@/lib/quiz/options";
import { cx } from "@/utils/cx";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 8 * 1024 * 1024;

interface QuizUploadProps {
  roomCode: string;
  hostToken: string | null;
  isEn?: boolean;
  initialDifficulty?: QuizDifficultyLevel;
  initialTimeSec?: number;
  initialStreakBonus?: boolean;
  onSettingsChange?: (partial: {
    difficulty?: QuizDifficultyLevel;
    timePerQuestionSec?: number;
    streakBonus?: boolean;
  }) => void;
  onCreated: () => void;
}

const DIFFICULTY_OPTIONS: Array<{
  id: QuizDifficultyLevel;
  labelId: string;
  labelEn: string;
  descId: string;
  descEn: string;
}> = [
  {
    id: "mudah",
    labelId: "Mudah",
    labelEn: "Easy",
    descId: "Pemahaman konsep inti",
    descEn: "Core concept understanding",
  },
  {
    id: "sedang",
    labelId: "Sedang",
    labelEn: "Medium",
    descId: "Penerapan & analisis",
    descEn: "Application & analysis",
  },
  {
    id: "sulit",
    labelId: "Sulit",
    labelEn: "Hard",
    descId: "Penalaran kritis (hots)",
    descEn: "Critical reasoning (hots)",
  },
  {
    id: "campuran",
    labelId: "Campuran",
    labelEn: "Mixed",
    descId: "Bertahap mudah ke sulit",
    descEn: "Gradual easy to hard",
  },
];

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Berkas tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

export function QuizUpload({
  roomCode,
  hostToken,
  isEn = false,
  initialDifficulty = "sedang",
  initialTimeSec = 20,
  initialStreakBonus = true,
  onSettingsChange,
  onCreated,
}: QuizUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState<QuizDifficultyLevel>(initialDifficulty);
  const [timePerQuestionSec, setTimePerQuestionSec] = useState<number>(initialTimeSec);
  const [streakBonus, setStreakBonus] = useState<boolean>(initialStreakBonus);
  const [instructions, setInstructions] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (next: File | undefined | null) => {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      setError(isEn ? "File is larger than 8 mb." : "Berkas lebih dari 8 mb.");
      return;
    }
    setError(null);
    setFile(next);
  };

  const canSubmit = Boolean(file || instructions.trim().length >= 3) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const fileBase64 = file ? await readAsBase64(file) : undefined;
      const res = await fetch(`/api/rooms/${roomCode}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hostToken ? { "x-host-token": hostToken } : {}),
        },
        body: JSON.stringify({
          fileName: file?.name,
          mimeType: file?.type,
          fileBase64,
          questionCount: count,
          difficulty,
          timePerQuestionSec,
          streakBonus,
          instructions: instructions.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal membuat kuis.");
      toast.success(
        isEn ? `${data.totalQuestions} questions ready.` : `${data.totalQuestions} soal siap.`
      );
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kuis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 space-y-5 shadow-card">
      <div className="space-y-1">
        <h2 className="text-headline-semibold text-text-primary">
          {isEn
            ? "Upload learning source or enter topic instructions"
            : "Unggah sumber pembelajaran atau tulis instruksi materi"}
        </h2>
        <p className="text-body-2-regular text-text-secondary">
          {isEn
            ? "Upload a document (pdf, docx, txt) or describe what your class will learn, then configure quiz difficulty and question count."
            : "Unggah dokumen bahan ajar (pdf, docx, txt) atau tuliskan instruksi tentang apa yang akan dipelajari sebelum memulai kuis."}
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) pick(e.dataTransfer.files?.[0]);
        }}
        className={cx(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          dragging
            ? "border-text-primary bg-background-secondary-default"
            : "border-border-button-default hover:border-text-primary",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <div className="flex items-center gap-3">
            <RiFileTextLine className="size-6 text-text-primary" aria-hidden />
            <div className="text-start">
              <p className="text-body-medium text-text-primary break-all">{file.name}</p>
              <p className="text-caption-1-regular text-text-secondary">
                {(file.size / 1024).toFixed(file.size > 102400 ? 0 : 1)} kb
              </p>
            </div>
            {!busy && (
              <button
                type="button"
                aria-label={isEn ? "Remove file" : "Hapus berkas"}
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="ms-2 inline-flex size-8 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-secondary-default cursor-pointer"
              >
                <RiCloseLine className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <>
            <RiUploadCloud2Line className="size-7 text-text-secondary" aria-hidden />
            <p className="text-body-medium text-text-primary">
              {isEn
                ? "Drag a learning file here, or click to choose (optional if writing instructions below)"
                : "Seret berkas sumber belajar ke sini, atau klik untuk memilih"}
            </p>
            <p className="text-caption-1-regular text-text-secondary">Pdf, docx, txt, md • maks 8 mb</p>
          </>
        )}
      </div>

      {/* Instructions / Topic Textarea */}
      <label className="space-y-1.5 block">
        <span className="text-caption-1-semibold text-text-primary block">
          {isEn
            ? "Learning topic or teacher instructions"
            : "Instruksi atau topik materi yang akan dipelajari"}
        </span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={4000}
          placeholder={
            isEn
              ? "Write the topic, material summary, or specific focus (e.g. Descriptive text describing a person for grade 10, focus on adjectives and simple present tense)..."
              : "Tuliskan topik, materi pembelajaran, atau instruksi fokus soal (misal: Teks deskriptif bahasa inggris kelas 10, atau hukum newton dan penerapannya)..."
          }
          className="w-full rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5 text-body-2-regular text-text-primary placeholder:text-text-placeholder outline-none focus:border-text-primary resize-y"
        />
      </label>

      {/* Difficulty Selector */}
      <div className="space-y-2">
        <span className="text-caption-1-semibold text-text-primary block">
          {isEn ? "Quiz difficulty level" : "Tingkat kesulitan kuis"}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const active = difficulty === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  setDifficulty(opt.id);
                  onSettingsChange?.({ difficulty: opt.id });
                }}
                className={cx(
                  "p-3 rounded-2xl border text-start transition cursor-pointer",
                  active
                    ? "border-accent-600 bg-accent-700/10 text-text-primary shadow-2xs"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary hover:border-border-button-hover"
                )}
              >
                <span className="text-body-2-semibold text-text-primary block">
                  {isEn ? opt.labelEn : opt.labelId}
                </span>
                <span className="text-[11px] text-text-secondary block mt-0.5">
                  {isEn ? opt.descEn : opt.descId}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Count, Duration & Streak Bonus */}
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption-1-semibold text-text-primary">
              {isEn ? "Question count" : "Jumlah soal"}
            </span>
            <span className="rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-0.5 font-mono text-caption-1-semibold tabular-nums text-text-primary">
              {count} {isEn ? "questions" : "soal"}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={15}
            step={1}
            disabled={busy}
            aria-label={isEn ? "Questions" : "Jumlah soal"}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-border-button-default accent-accent-700 cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between px-0.5 font-mono text-[11px] text-text-tertiary">
            <span>3</span>
            <span>8</span>
            <span>15</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-caption-1-semibold text-text-primary block">
            {isEn ? "Time per question" : "Durasi per soal"}
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[15, 20, 30, 45].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={busy}
                onClick={() => {
                  setTimePerQuestionSec(sec);
                  onSettingsChange?.({ timePerQuestionSec: sec });
                }}
                className={cx(
                  "py-2 px-2 rounded-xl border text-caption-1-medium font-mono transition cursor-pointer",
                  timePerQuestionSec === sec
                    ? "border-accent-600 bg-accent-700 text-white"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
                )}
              >
                {sec}d
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-caption-1-semibold text-text-primary block">
            {isEn ? "Streak bonus" : "Bonus beruntun"}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStreakBonus(true);
                onSettingsChange?.({ streakBonus: true });
              }}
              className={cx(
                "py-2 px-2.5 rounded-xl border text-caption-1-medium transition cursor-pointer",
                streakBonus
                  ? "border-accent-600 bg-accent-700 text-white"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
              )}
            >
              {isEn ? "Active" : "Aktif"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStreakBonus(false);
                onSettingsChange?.({ streakBonus: false });
              }}
              className={cx(
                "py-2 px-2.5 rounded-xl border text-caption-1-medium transition cursor-pointer",
                !streakBonus
                  ? "border-accent-600 bg-accent-700 text-white"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary"
              )}
            >
              {isEn ? "Off" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-border-error-default bg-background-tertiary-error p-3.5 space-y-2">
          <p className="text-caption-1-medium text-text-error-primary">{error}</p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              className="text-caption-2-medium text-text-error-primary underline hover:opacity-80 cursor-pointer"
            >
              {isEn ? "Retry generation" : "Coba buat ulang"}
            </button>
          </div>
        </div>
      )}

      <Button variant="primary" onClick={submit} disabled={!canSubmit} className="w-full">
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="xs" aria-hidden />
            <span>{isEn ? "Reading and writing questions…" : "Membaca dan menyusun soal…"}</span>
          </span>
        ) : isEn ? (
          "Create quiz"
        ) : (
          "Buat kuis"
        )}
      </Button>
    </div>
  );
}
