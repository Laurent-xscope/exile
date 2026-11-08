"use client";

import { useRef, useState } from "react";
import { RiFileTextLine, RiUploadCloud2Line, RiCloseLine } from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Spinner } from "@/components/base/spinner/spinner";
import { MacOSToggle } from "@/components/base/toggle/macos-toggle";
import type { QuizDifficultyLevel } from "@/lib/quiz/options";
import { cx } from "@/utils/cx";

const ACCEPT =
  ".jpg,.jpeg,.png,.webp,.bmp,.gif,.heic,.heif,image/*,.pdf,.docx,.doc,.pptx,.xlsx,.odt,.odp,.ods,.epub,.rtf,.csv,.tsv,.xml,.yaml,.yml,.json,.html,.htm,.tex,.srt,.vtt,.log,.txt,.md,text/*";
const MAX_BYTES = 20 * 1024 * 1024;

interface QuizUploadProps {
  roomCode: string;
  hostToken: string | null;
  isEn?: boolean;
  initialDifficulty?: QuizDifficultyLevel;
  initialTimeSec?: number;
  initialStreakBonus?: boolean;
  initialShuffleQuestions?: boolean;
  onSettingsChange?: (partial: {
    difficulty?: QuizDifficultyLevel;
    timePerQuestionSec?: number;
    streakBonus?: boolean;
    shuffleQuestions?: boolean;
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
    labelId: "Adaptif",
    labelEn: "Adaptive",
    descId: "Bertahap mudah ke sulit",
    descEn: "Gradual easy to hard",
  },
];

function formatDuration(sec: number, isEn: boolean): string {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (s === 0) {
      return isEn ? `${m} min` : `${m} mnt`;
    }
    return isEn ? `${m} min ${s}s` : `${m} mnt ${s} dtk`;
  }
  return isEn ? `${sec}s` : `${sec} dtk`;
}

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
  initialShuffleQuestions = true,
  onSettingsChange,
  onCreated,
}: QuizUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState<QuizDifficultyLevel>(initialDifficulty);
  const [timePerQuestionSec, setTimePerQuestionSec] = useState<number>(initialTimeSec);
  const [streakBonus, setStreakBonus] = useState<boolean>(initialStreakBonus);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialShuffleQuestions ?? true
  );
  const [instructions, setInstructions] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (next: File | undefined | null) => {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      setError(isEn ? "File is larger than 20 mb." : "Berkas lebih dari 20 mb.");
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
          shuffleQuestions,
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
    <div className="bg-background-primary-default rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-headline-semibold text-text-primary">
          {isEn
            ? "Upload learning source or enter topic instructions"
            : "Unggah sumber pembelajaran atau tulis instruksi materi"}
        </h2>
        <p className="text-body-2-regular text-text-secondary">
          {isEn
            ? "Upload a document or describe what your class will learn, then configure quiz difficulty and question count."
            : "Unggah dokumen bahan ajar atau tuliskan instruksi tentang apa yang akan dipelajari sebelum memulai kuis."}
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
          "flex flex-col items-center justify-center gap-2 rounded-2xl p-5 sm:px-6 sm:py-7 min-h-[120px] text-center transition-colors outline-none cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          dragging
            ? "bg-background-secondary-hover"
            : "bg-background-secondary-default hover:bg-background-secondary-hover",
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
              <p className="text-caption-1-regular font-mono tabular-nums text-text-secondary">
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
                className="ms-2 inline-flex size-9 sm:size-8 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-secondary-default cursor-pointer min-h-[44px] min-w-[44px]"
              >
                <RiCloseLine className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <>
            <RiUploadCloud2Line className="size-7 text-text-secondary" aria-hidden />
            <p className="text-body-medium text-text-primary">
              <span className="sm:hidden">
                {isEn ? "Tap to choose file" : "Ketuk untuk memilih berkas"}
              </span>
              <span className="hidden sm:inline">
                {isEn
                  ? "Drag a learning file here, or click to choose"
                  : "Seret berkas sumber belajar ke sini, atau klik untuk memilih"}
              </span>
            </p>
            <p className="text-caption-1-regular text-text-secondary">
              {isEn ? "Maximum 20 mb" : "Maksimal 20 mb"}
            </p>
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
              ? "Write the topic, material summary, or specific focus (e.g. descriptive text describing a person for grade 10, focus on adjectives and simple present tense)..."
              : "Tuliskan topik, materi pembelajaran, atau instruksi fokus soal (misal: teks deskriptif bahasa inggris kelas 10, atau hukum newton dan penerapannya)..."
          }
          className="w-full rounded-xl ring-1 ring-inset ring-border-button-default bg-background-primary-default p-3.5 text-body-2-regular text-text-primary placeholder:text-text-placeholder outline-none focus:outline-none resize-y"
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
                  "p-3 rounded-2xl text-start transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring min-h-[44px]",
                  active
                    ? "bg-background-tertiary-default text-text-primary ring-1 ring-inset ring-border-button-hover shadow-xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
                )}
              >
                <span className="text-body-2-semibold block text-text-primary">
                  {isEn ? opt.labelEn : opt.labelId}
                </span>
                <span className="text-caption-2-regular block mt-0.5 text-text-secondary">
                  {isEn ? opt.descEn : opt.descId}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiz Configuration Settings */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-medium text-text-primary">
                {isEn ? "Question count" : "Jumlah soal"}
              </span>
              <span className="text-caption-1-regular text-text-secondary">
                {isEn
                  ? "Total questions generated for the quiz session"
                  : "Total butir pertanyaan yang disusun untuk sesi kuis"}
              </span>
            </div>
            <span className="text-caption-1-semibold font-mono tabular-nums text-text-primary bg-background-primary-default border border-border-button-default px-2.5 py-1 rounded-lg shrink-0">
              {count} {isEn ? "questions" : "soal"}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={15}
            step={1}
            disabled={busy}
            aria-label={isEn ? "Question count" : "Jumlah soal"}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="touch-slider w-full"
          />
        </div>

        <div className="rounded-2xl bg-background-secondary-default p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-medium text-text-primary">
                {isEn ? "Standard question time" : "Durasi standar soal"}
              </span>
              <span className="text-caption-1-regular text-text-secondary">
                {isEn
                  ? "Standard time limit for answering each question in class"
                  : "Waktu standar untuk menjawab setiap butir soal di arena kelas"}
              </span>
            </div>
            <span className="text-caption-1-semibold font-mono tabular-nums text-text-primary bg-background-primary-default border border-border-button-default px-2.5 py-1 rounded-lg shrink-0">
              {formatDuration(timePerQuestionSec, isEn)}
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={90}
            step={5}
            disabled={busy}
            aria-label={isEn ? "Standard question time" : "Durasi standar soal"}
            value={timePerQuestionSec}
            onChange={(e) => {
              const val = Number(e.target.value);
              setTimePerQuestionSec(val);
              onSettingsChange?.({ timePerQuestionSec: val });
            }}
            className="touch-slider w-full"
          />
        </div>

        <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-2xl bg-background-secondary-default p-3.5 sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body-medium text-text-primary break-words">
              {isEn ? "Streak bonus points" : "Bonus poin beruntun (streak)"}
            </p>
            <p className="text-caption-1-regular text-text-secondary break-words">
              {isEn
                ? "Additional score when students answer correctly consecutively"
                : "Tambahan skor bila siswa menjawab benar secara berturut-turut"}
            </p>
          </div>
          <div className="shrink-0 ms-2 sm:ms-3 flex items-center justify-end">
            <MacOSToggle
              checked={streakBonus}
              onChange={(next) => {
                setStreakBonus(next);
                onSettingsChange?.({ streakBonus: next });
              }}
              label={isEn ? "Streak bonus points" : "Bonus poin beruntun (streak)"}
              color="green"
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-2xl bg-background-secondary-default p-3.5 sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body-medium text-text-primary break-words">
              {isEn ? "Shuffle question order" : "Acak urutan soal"}
            </p>
            <p className="text-caption-1-regular text-text-secondary break-words">
              {isEn
                ? "Randomize question order for each new quiz session"
                : "Variasikan urutan soal untuk setiap sesi kuis baru"}
            </p>
          </div>
          <div className="shrink-0 ms-2 sm:ms-3 flex items-center justify-end">
            <MacOSToggle
              checked={shuffleQuestions}
              onChange={(next) => {
                setShuffleQuestions(next);
                onSettingsChange?.({ shuffleQuestions: next });
              }}
              label={isEn ? "Shuffle question order" : "Acak urutan soal"}
              color="green"
              disabled={busy}
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl bg-background-tertiary-error p-3.5 space-y-2">
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

      <Button variant="primary" onClick={submit} disabled={!canSubmit} className="w-full h-12">
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
