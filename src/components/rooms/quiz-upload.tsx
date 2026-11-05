"use client";

import React, { useRef, useState } from "react";
import { RiFileTextLine, RiUploadCloud2Line, RiCloseLine } from "@remixicon/react";
import { toast } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { Spinner } from "@/components/base/spinner/spinner";
import { cx } from "@/utils/cx";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 8 * 1024 * 1024;

interface QuizUploadProps {
  roomCode: string;
  hostToken: string | null;
  isEn?: boolean;
  onCreated: () => void;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Berkas tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

export function QuizUpload({ roomCode, hostToken, isEn = false, onCreated }: QuizUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(8);
  const [instructions, setInstructions] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (next: File | undefined | null) => {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      setError(isEn ? "File is larger than 8 MB." : "Berkas lebih dari 8 MB.");
      return;
    }
    setError(null);
    setFile(next);
  };

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fileBase64 = await readAsBase64(file);
      const res = await fetch(`/api/rooms/${roomCode}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hostToken ? { "x-host-token": hostToken } : {}),
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileBase64,
          questionCount: count,
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
    <div className="bg-background-primary-default border border-border-button-default rounded-3xl p-6 space-y-5">
      <div className="space-y-1">
        <h2 className="text-headline-semibold text-text-primary">
          {isEn ? "Drop your material" : "Letakkan materi di sini"}
        </h2>
        <p className="text-body-2-regular text-text-secondary">
          {isEn
            ? "The system reads your file and writes the questions. You can review them before starting."
            : "Sistem membaca berkasnya lalu menyusun soal. Anda bisa memeriksanya sebelum memulai."}
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
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none cursor-pointer",
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
            <RiUploadCloud2Line className="size-8 text-text-secondary" aria-hidden />
            <p className="text-body-medium text-text-primary">
              {isEn ? "Drag a file here, or click to choose" : "Seret berkas ke sini, atau klik untuk memilih"}
            </p>
            <p className="text-caption-1-regular text-text-secondary">Pdf, docx, txt, md • maks 8 mb</p>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption-1-semibold text-text-primary">
              {isEn ? "Questions" : "Jumlah soal"}
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
        <label className="space-y-1.5 block">
          <span className="text-caption-1-semibold text-text-primary block">
            {isEn ? "Additional notes (optional)" : "Catatan tambahan (opsional)"}
          </span>
          <input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={busy}
            maxLength={600}
            placeholder={isEn ? "E.g. focus on chapter 2" : "Mis. fokus ke bab 2"}
            className="h-10 w-full rounded-xl border-2 border-border-button-default bg-background-primary-default px-3.5 text-body-2-regular text-text-primary placeholder:text-text-placeholder outline-none focus:border-text-primary"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-border-error-default bg-background-tertiary-error px-3.5 py-2.5 text-caption-1-medium text-text-error-primary">
          {error}
        </p>
      )}

      <Button variant="primary" onClick={submit} disabled={!file || busy} className="w-full">
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
