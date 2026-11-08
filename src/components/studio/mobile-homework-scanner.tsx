/* eslint-disable @next/next/no-img-element */
"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  RiCameraLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiAddLine,
  RiImageLine,
  RiEyeLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badge";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/base/modal/modal";
import { Spinner } from "@/components/base/spinner/spinner";
import {
  compressAndResizeImage,
  assembleMultiPageDocument,
} from "@/lib/media/scanner-preprocessor";
import { soundEffects } from "@/lib/audio/sounds";
import { cx } from "@/utils/cx";

export interface ScannedPageItem {
  id: string;
  base64: string;
  mimeType: string;
  thumbnailUrl: string;
}

export interface MobileHomeworkScannerProps {
  isOpen: boolean;
  mode?: "direct_answer" | "learning";
  onClose: () => void;
  onComplete: (data: {
    mode: "direct_answer" | "learning";
    pages: ScannedPageItem[];
    combinedSnippet: string;
  }) => void;
  isEn?: boolean;
}

/**
 * Pure helper: Formats the page label using sentence case.
 */
export function formatScannerPageLabel(
  pageIndex: number,
  isEn = false
): string {
  const number = Math.max(1, pageIndex + 1);
  return isEn ? `Page ${number}` : `Halaman ${number}`;
}

/**
 * Pure helper: Formats page count text using sentence case.
 */
export function formatScannerPageCount(
  count: number,
  isEn = false
): string {
  const safeCount = Math.max(0, count);
  if (isEn) {
    return safeCount === 1 ? "1 page" : `${safeCount} pages`;
  }
  return `${safeCount} halaman`;
}

/**
 * Pure helper: Formats scanner preview title using sentence case.
 */
export function formatScannerPreviewTitle(
  currentIndex: number,
  totalCount: number,
  isEn = false
): string {
  const current = Math.max(1, currentIndex + 1);
  const total = Math.max(1, totalCount);
  return isEn
    ? `Page ${current} of ${total}`
    : `Halaman ${current} dari ${total}`;
}

/**
 * Pure helper: Returns mode badge label using sentence case.
 */
export function getScannerModeLabel(
  mode: "direct_answer" | "learning",
  isEn = false
): string {
  if (mode === "direct_answer") {
    return isEn ? "Direct answer" : "Jawaban langsung";
  }
  return isEn ? "Learning mode" : "Mode belajar";
}

/**
 * Pure helper: Removes a page from array immutably.
 */
export function removeScannedPage(
  pages: ScannedPageItem[],
  indexToRemove: number
): ScannedPageItem[] {
  if (indexToRemove < 0 || indexToRemove >= pages.length) {
    return pages;
  }
  return pages.filter((_, idx) => idx !== indexToRemove);
}

/**
 * Real-time camera homework scanner with live viewfinder, document detection framing,
 * laser scan sweep, high-contrast paper preprocessor, and multi-page document assembler.
 */
export function MobileHomeworkScanner({
  isOpen,
  mode = "learning",
  onClose,
  onComplete,
  isEn = false,
}: MobileHomeworkScannerProps) {
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"camera" | "preview">("camera");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraUnavailable, setCameraUnavailable] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    isEn ? "Optimizing paper contrast..." : "Mengoptimalkan kontras kertas..."
  );
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean stop for media camera stream tracks without triggering render setState
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Manage camera lifecycle based on modal visibility and viewMode
  useEffect(() => {
    let isCancelled = false;

    if (!isOpen || viewMode !== "camera") {
      stopMediaTracks();
      return;
    }

    stopMediaTracks();

    void Promise.resolve().then(async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        if (!isCancelled) {
          setCameraUnavailable(true);
          setIsCameraActive(false);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
        setCameraUnavailable(false);
      } catch {
        if (!isCancelled) {
          setCameraUnavailable(true);
          setIsCameraActive(false);
        }
      }
    });

    return () => {
      isCancelled = true;
      stopMediaTracks();
    };
  }, [isOpen, viewMode, stopMediaTracks]);

  const handleClose = useCallback(() => {
    if (isProcessing) return;
    soundEffects.playClick();
    stopMediaTracks();
    setIsCameraActive(false);
    setPages([]);
    setSelectedPageIndex(0);
    setViewMode("camera");
    setError(null);
    onClose();
  }, [isProcessing, stopMediaTracks, onClose]);

  // Snaps current frame from live video feed
  const captureVideoFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isProcessing) return;

    soundEffects.playCameraShutter();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    setIsProcessing(true);
    setStatusMessage(
      isEn ? "Optimizing paper contrast..." : "Mengoptimalkan kontras kertas..."
    );
    setError(null);

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas context is unavailable.");
      }

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );

      if (!blob) {
        throw new Error("Failed to capture image frame.");
      }

      const processed = await compressAndResizeImage(blob, {
        applyFilter: true,
      });

      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const newItem: ScannedPageItem = {
        id,
        base64: processed.base64,
        mimeType: processed.mimeType,
        thumbnailUrl: processed.base64,
      };

      setPages((prev) => {
        const updated = [...prev, newItem];
        setSelectedPageIndex(updated.length - 1);
        return updated;
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to capture frame."
          : "Gagal mengambil gambar.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isEn]);

  // Fallback / Gallery File Input trigger
  const triggerCamera = useCallback(() => {
    if (isProcessing) return;
    soundEffects.playClick();
    setError(null);
    fileInputRef.current?.click?.();
  }, [isProcessing]);

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    soundEffects.playCameraShutter();
    setIsProcessing(true);
    setStatusMessage(
      isEn ? "Optimizing paper contrast..." : "Mengoptimalkan kontras kertas..."
    );
    setError(null);

    try {
      const files = Array.from(fileList);
      const newItems: ScannedPageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await compressAndResizeImage(file, {
          applyFilter: true,
        });

        const id =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        newItems.push({
          id,
          base64: processed.base64,
          mimeType: processed.mimeType,
          thumbnailUrl: processed.base64,
        });
      }

      setPages((prev) => {
        const updated = [...prev, ...newItems];
        setSelectedPageIndex(updated.length - 1);
        return updated;
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to process image."
          : "Gagal memproses gambar.";
      setError(msg);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePage = (indexToRemove: number) => {
    soundEffects.playClick();
    setPages((prev) => {
      const updated = removeScannedPage(prev, indexToRemove);
      setSelectedPageIndex((current) => {
        if (updated.length === 0) return 0;
        if (current >= updated.length) return updated.length - 1;
        return current;
      });
      if (updated.length === 0) {
        setViewMode("camera");
      }
      return updated;
    });
  };

  const handleComplete = async () => {
    if (pages.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(
      isEn ? "Assembling document..." : "Menyusun dokumen..."
    );
    setError(null);

    try {
      const doc = await assembleMultiPageDocument(
        pages.map((p) => ({
          base64: p.base64,
          mimeType: p.mimeType,
        }))
      );

      soundEffects.playScanComplete();
      stopMediaTracks();

      onComplete({
        mode,
        pages,
        combinedSnippet: doc.combinedTextSnippet,
      });

      setPages([]);
      setSelectedPageIndex(0);
      setViewMode("camera");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to assemble document."
          : "Gagal menyusun dokumen.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const activePage = pages[selectedPageIndex];

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      size="lg"
      className="p-0"
    >
      <ModalHeader
        title={isEn ? "Mobile homework scanner" : "Pindai lembar tugas"}
        icon={RiCameraLine}
        closeLabel={isEn ? "Close scanner" : "Tutup pemindai"}
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge color="primary">
            {formatScannerPageCount(pages.length, isEn)}
          </Badge>
          {viewMode === "preview" && (
            <Badge color="neutral">
              {isEn ? "Reviewing pages" : "Pratinjau halaman"}
            </Badge>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="relative flex min-h-[340px] flex-col gap-4 px-4 py-2 sm:px-6">
        {/* Hidden iPhone scanner camera file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          aria-label={isEn ? "Take photo" : "Ambil foto"}
          data-testid="scanner-file-input"
          className="hidden"
          tabIndex={-1}
          onChange={handleFileInputChange}
        />

        {/* Loading overlay during contrast enhancement or document assembly */}
        {isProcessing && (
          <div
            role="status"
            aria-live="polite"
            data-testid="scanner-loading-overlay"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background-full/85 p-6 backdrop-blur-sm"
          >
            <Spinner size="lg" className="text-text-primary" />
            <p className="text-body-medium text-text-primary text-center">
              {statusMessage}
            </p>
            <p className="text-caption-1-regular text-text-secondary text-center">
              {isEn ? "Please wait a moment." : "Mohon tunggu sebentar."}
            </p>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div
            role="alert"
            data-testid="scanner-error-banner"
            className="flex items-center gap-2.5 rounded-xl border border-border-error-default bg-background-secondary-default p-3 text-caption-1-medium text-text-error-primary"
          >
            <span className="shrink-0 font-bold" aria-hidden="true">
              !
            </span>
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* VIEW MODE 1: Live Interactive Camera Viewfinder */}
        {viewMode === "camera" && (
          <div className="flex flex-col gap-2">
            {!cameraUnavailable ? (
              <div className="relative flex aspect-[4/3] sm:aspect-[16/10] w-full max-h-[380px] sm:max-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-border-button-default bg-neutral-950 shadow-inner">
                {/* Real-time Camera Video Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover"
                />

                {!isCameraActive && !cameraUnavailable && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/90 text-text-primary">
                    <Spinner size="md" />
                    <span className="text-caption-1-medium text-text-secondary">
                      {isEn ? "Starting camera..." : "Mengaktifkan kamera..."}
                    </span>
                  </div>
                )}

                {/* Document Target Corner Brackets */}
                <div className="pointer-events-none absolute left-6 top-6 size-8 rounded-tl-xl border-t-3 border-l-3 border-accent-400 shadow-sm" />
                <div className="pointer-events-none absolute right-6 top-6 size-8 rounded-tr-xl border-t-3 border-r-3 border-accent-400 shadow-sm" />
                <div className="pointer-events-none absolute bottom-6 left-6 size-8 rounded-bl-xl border-b-3 border-l-3 border-accent-400 shadow-sm" />
                <div className="pointer-events-none absolute bottom-6 right-6 size-8 rounded-br-xl border-b-3 border-r-3 border-accent-400 shadow-sm" />

                {/* Animated Scanner Laser Sweep */}
                <div className="pointer-events-none absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-accent-400 to-transparent shadow-[0_0_12px_var(--color-accent-400)] animate-scanner-laser" />

                {/* Top Viewfinder Alignment Guide Pill */}
                <div className="pointer-events-none absolute top-3 inset-x-0 mx-auto w-fit flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-primary-default/85 backdrop-blur-xs text-caption-1-medium text-text-primary border border-border-button-default shadow-xs">
                  <RiCameraLine className="size-3.5 text-accent-500" />
                  <span>
                    {isEn
                      ? "Align document within frame"
                      : "Arahkan kamera ke lembar tugas"}
                  </span>
                </div>

                {/* Tactile Flash Feedback Overlay */}
                {flashActive && (
                  <div className="pointer-events-none absolute inset-0 bg-white/70 transition-opacity duration-200" />
                )}

                {/* Viewfinder Bottom Shutter & Controls Dock */}
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-5 sm:px-8">
                  {/* Gallery / File Picker Trigger */}
                  <button
                    type="button"
                    onClick={triggerCamera}
                    disabled={isProcessing}
                    title={isEn ? "Choose from gallery" : "Pilih dari galeri"}
                    aria-label={isEn ? "Choose from gallery" : "Pilih dari galeri"}
                    className="flex size-11 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default/80 text-text-secondary hover:text-text-primary hover:bg-background-primary-default backdrop-blur-xs transition active:scale-95 cursor-pointer"
                  >
                    <RiImageLine className="size-5" />
                  </button>

                  {/* Tactile Shutter Button */}
                  <button
                    type="button"
                    onClick={captureVideoFrame}
                    disabled={isProcessing || !isCameraActive}
                    aria-label={isEn ? "Capture page" : "Ambil foto halaman"}
                    className="group relative flex size-16 items-center justify-center rounded-full bg-accent-600 p-1 shadow-lg ring-4 ring-accent-400/30 transition hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="size-12 rounded-full border-2 border-accent-200 bg-white shadow-inner transition-transform group-active:scale-90" />
                  </button>

                  {/* Review Captured Pages Button */}
                  {pages.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default/80 backdrop-blur-xs transition hover:bg-background-primary-default active:scale-95 cursor-pointer"
                      aria-label={isEn ? "Review scanned pages" : "Lihat pindaian"}
                      title={isEn ? "Review scanned pages" : "Lihat pindaian"}
                    >
                      <img
                        src={pages[pages.length - 1].thumbnailUrl}
                        alt="Preview"
                        className="size-full object-cover"
                      />
                      <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white shadow-xs">
                        {pages.length}
                      </span>
                    </button>
                  ) : (
                    <div className="size-11" />
                  )}
                </div>
              </div>
            ) : (
              /* Fallback View: Camera Stream Unavailable (Headless/Restricted) */
              <div
                data-testid="scanner-empty-state"
                className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default p-6 text-center"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default text-foreground-icon-primary">
                  <RiCameraLine className="size-7" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                  <p className="text-title-3-semibold text-text-primary">
                    {isEn ? "Camera unavailable" : "Kamera tidak aktif"}
                  </p>
                  <p className="text-body-regular text-text-secondary">
                    {isEn
                      ? "Use system camera or choose from gallery files."
                      : "Gunakan kamera sistem atau pilih dokumen dari galeri."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  leadingIcon={RiCameraLine}
                  onClick={triggerCamera}
                  disabled={isProcessing}
                  className="min-h-11 min-w-11 touch-manipulation mt-1"
                >
                  {isEn ? "+ Open camera / files" : "+ Buka kamera / berkas"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 2: High-Contrast Document Review Viewport */}
        {viewMode === "preview" && pages.length > 0 && activePage && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-caption-1-medium text-text-secondary">
                {formatScannerPreviewTitle(
                  selectedPageIndex,
                  pages.length,
                  isEn
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-caption-1-regular text-text-tertiary">
                  {isEn ? "Filtered paper" : "Kertas teroptimalkan"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePage(selectedPageIndex)}
                  disabled={isProcessing}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default text-text-error-primary hover:bg-background-tertiary-default transition active:scale-95 cursor-pointer"
                  title={isEn ? "Delete this page" : "Hapus halaman ini"}
                  aria-label={isEn ? "Delete this page" : "Hapus halaman ini"}
                >
                  <RiDeleteBinLine className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="relative flex max-h-[320px] sm:max-h-[380px] min-h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-2 shadow-xs">
              <img
                src={activePage.thumbnailUrl}
                alt={formatScannerPageLabel(selectedPageIndex, isEn)}
                className="max-h-[300px] sm:max-h-[360px] w-auto max-w-full rounded-xl object-contain border border-border-button-default bg-background-primary-default shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Scanned Pages Horizontal Strip (Visible whenever pages exist) */}
        {pages.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-caption-1-medium text-text-secondary">
                {isEn ? "Scanned pages" : "Daftar halaman"}
              </span>
              {viewMode === "preview" && (
                <button
                  type="button"
                  onClick={() => setViewMode("camera")}
                  className="flex items-center gap-1 text-caption-1-medium text-accent-500 hover:text-accent-600 transition cursor-pointer"
                >
                  <RiCameraLine className="size-3.5" />
                  <span>{isEn ? "Back to camera" : "Buka kamera"}</span>
                </button>
              )}
            </div>

            <div
              role="region"
              aria-label={
                isEn ? "Scanned pages strip" : "Daftar halaman yang dipindai"
              }
              tabIndex={0}
              className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-thin focus:outline-none"
            >
              {pages.map((page, idx) => {
                const isSelected = selectedPageIndex === idx && viewMode === "preview";
                return (
                  <div
                    key={page.id}
                    data-testid={`page-thumbnail-item-${idx}`}
                    className={cx(
                      "group relative flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all",
                      isSelected
                        ? "border-accent-600 bg-background-secondary-hover shadow-xs ring-2 ring-border-focus-ring"
                        : "border-border-button-default bg-background-secondary-default hover:bg-background-secondary-hover hover:border-border-button-hover"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPageIndex(idx);
                        setViewMode("preview");
                      }}
                      className="relative flex flex-col items-center gap-1 text-start outline-none min-w-[72px] cursor-pointer"
                      aria-label={
                        isEn
                          ? `View page ${idx + 1}`
                          : `Lihat halaman ${idx + 1}`
                      }
                    >
                      <img
                        src={page.thumbnailUrl}
                        alt={formatScannerPageLabel(idx, isEn)}
                        className="h-20 w-16 rounded-lg border border-border-button-default object-cover bg-background-primary-default"
                      />
                      <span className="text-caption-1-semibold text-text-primary">
                        {formatScannerPageLabel(idx, isEn)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      disabled={isProcessing}
                      className="inline-flex min-h-11 min-w-11 size-11 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default text-text-error-primary hover:bg-background-tertiary-default transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer"
                      aria-label={
                        isEn
                          ? `Delete page ${idx + 1}`
                          : `Hapus halaman ${idx + 1}`
                      }
                    >
                      <RiDeleteBinLine className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}

              {/* Add Next Page Trigger Card in Strip */}
              <button
                type="button"
                onClick={() => setViewMode("camera")}
                disabled={isProcessing}
                className="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default px-4 py-3 text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary hover:border-border-button-hover transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer"
                aria-label={isEn ? "Add next page" : "Tambah halaman berikutnya"}
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-background-primary-default border border-border-button-default">
                  <RiAddLine className="size-5 text-foreground-icon-secondary" aria-hidden="true" />
                </div>
                <span className="text-caption-1-semibold">
                  {isEn ? "+ Add page" : "+ Tambah halaman"}
                </span>
              </button>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="medium"
          onClick={handleClose}
          disabled={isProcessing}
          className="min-h-11 min-w-11 touch-manipulation"
        >
          {isEn ? "Cancel" : "Batal"}
        </Button>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
          {viewMode === "preview" ? (
            <Button
              type="button"
              variant="secondary"
              size="medium"
              leadingIcon={RiCameraLine}
              onClick={() => setViewMode("camera")}
              disabled={isProcessing}
              className="min-h-11 min-w-11 touch-manipulation"
            >
              {isEn ? "+ Scan more" : "+ Pindai lagi"}
            </Button>
          ) : pages.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="medium"
              leadingIcon={RiEyeLine}
              onClick={() => setViewMode("preview")}
              disabled={isProcessing}
              className="min-h-11 min-w-11 touch-manipulation"
            >
              {isEn
                ? `Review pages (${pages.length})`
                : `Lihat pindaian (${pages.length})`}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="medium"
              leadingIcon={RiImageLine}
              onClick={triggerCamera}
              disabled={isProcessing}
              className="min-h-11 min-w-11 touch-manipulation"
            >
              {isEn ? "Choose file" : "Pilih berkas"}
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="medium"
            leadingIcon={RiCheckLine}
            onClick={handleComplete}
            disabled={pages.length === 0 || isProcessing}
            className="min-h-11 min-w-11 touch-manipulation"
          >
            {isEn ? "Finish & process" : "Selesai & proses"}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default MobileHomeworkScanner;
