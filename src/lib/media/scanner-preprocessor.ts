/**
 * Client-side image pre-processor and document paper contrast filter.
 * Optimized for mobile devices and fast browser processing.
 */

export const MAX_SCAN_DIMENSION = 1600;
export const DEFAULT_JPEG_QUALITY = 0.85;
export const MAX_DOCUMENT_PAGES = 30;
export const MAX_TOTAL_PAYLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  applyFilter?: boolean;
}

export interface ProcessedImageResult {
  base64: string;
  rawBase64: string;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
}

export interface MultiPageInput {
  base64: string;
  mimeType: string;
  text?: string;
}

export interface MultiPageDocumentPayload {
  combinedTextSnippet: string;
  images: Array<{
    base64: string;
    mimeType: string;
  }>;
}

/**
 * Calculates target dimensions preserving aspect ratio.
 * Clamps width and height to maximum 1600px.
 */
export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth = MAX_SCAN_DIMENSION,
  maxHeight = MAX_SCAN_DIMENSION
): { width: number; height: number } {
  const clampedMaxWidth = Math.min(Math.max(1, maxWidth), MAX_SCAN_DIMENSION);
  const clampedMaxHeight = Math.min(Math.max(1, maxHeight), MAX_SCAN_DIMENSION);

  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: clampedMaxWidth, height: clampedMaxHeight };
  }

  if (srcWidth <= clampedMaxWidth && srcHeight <= clampedMaxHeight) {
    return {
      width: Math.round(srcWidth),
      height: Math.round(srcHeight),
    };
  }

  const ratio = Math.min(
    clampedMaxWidth / srcWidth,
    clampedMaxHeight / srcHeight
  );

  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Adjusts image contrast and brightness on an HTML5 canvas.
 * Stretches histogram so paper background turns bright white
 * and handwriting or printed text becomes dark and crisp.
 * Does not invert colors or corrupt image data.
 * Safe in SSR environments.
 */
export function applyDocumentPaperFilter(canvas: HTMLCanvasElement): void {
  if (typeof window === "undefined" || !canvas) {
    return;
  }

  if (typeof canvas.getContext !== "function") {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  if (width <= 0 || height <= 0) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return;
  }

  const data = imageData.data;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return;
  }

  // Calculate luminance histogram (Rec. 601 coefficients)
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = (r * 77 + g * 150 + b * 29) >> 8;
    histogram[lum]++;
  }

  // Find 2nd percentile for ink and 90th percentile for paper
  const lowCutoff = Math.max(1, Math.round(totalPixels * 0.02));
  const highCutoff = Math.max(1, Math.round(totalPixels * 0.90));

  let cumulative = 0;
  let pLow = 0;
  let pHigh = 255;
  let foundLow = false;

  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (!foundLow && cumulative >= lowCutoff) {
      pLow = i;
      foundLow = true;
    }
    if (cumulative >= highCutoff) {
      pHigh = i;
      break;
    }
  }

  // Guard against non-document images or low dynamic range
  const actualRange = pHigh - pLow;
  if (actualRange < 30 || pHigh < 150 || pLow > 100) {
    return;
  }

  // Build 256-entry lookup table for fast linear stretch
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    if (i <= pLow) {
      lut[i] = 0;
    } else if (i >= pHigh) {
      lut[i] = 255;
    } else {
      const normalized = (i - pLow) / actualRange;
      lut[i] = Math.round(normalized * 255);
    }
  }

  // Apply lookup table to RGB channels while preserving alpha
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Loads an image from a File or Blob into an ImageBitmap or HTMLImageElement.
 */
async function loadSourceImage(
  file: File | Blob
): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to Image element when createImageBitmap fails
    }
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Browser environment is required to load images."));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image data."));
    };

    img.src = url;
  });
}

/**
 * Clamps dimensions to maximum 1600px, renders to canvas,
 * optionally applies paper contrast filter, and exports lightweight JPEG.
 * Safe in SSR environments.
 */
export async function compressAndResizeImage(
  file: File | Blob,
  options?: CompressImageOptions
): Promise<ProcessedImageResult> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof document.createElement !== "function"
  ) {
    throw new Error("Browser canvas environment is not available.");
  }

  const quality = Math.min(
    1,
    Math.max(0.1, options?.quality ?? DEFAULT_JPEG_QUALITY)
  );
  const applyFilter = options?.applyFilter ?? false;

  const source = await loadSourceImage(file);
  const { width, height } = calculateTargetDimensions(
    source.width,
    source.height,
    options?.maxWidth,
    options?.maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in source && typeof source.close === "function") {
      source.close();
    }
    throw new Error("Could not acquire canvas 2d context.");
  }

  ctx.drawImage(source, 0, 0, width, height);

  if ("close" in source && typeof source.close === "function") {
    source.close();
  }

  if (applyFilter) {
    applyDocumentPaperFilter(canvas);
  }

  const mimeType = "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const commaIndex = dataUrl.indexOf(",");
  const rawBase64 = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;

  const createBlobFallback = async (): Promise<Blob> => {
    // 1. Try native fetch(dataUrl) first (WebKit safe, avoids atob pattern exceptions)
    if (typeof fetch === "function") {
      try {
        const res = await fetch(dataUrl);
        const b = await res.blob();
        if (b && b.size > 0) {
          return b;
        }
      } catch {
        // Fall back to sanitized atob below
      }
    }

    // 2. Fall back to atob with sanitization and try/catch to guarantee zero pattern errors
    try {
      let sanitized = rawBase64.replace(/[^A-Za-z0-9+/=]/g, "");
      const remainder = sanitized.length % 4;
      if (remainder === 2) {
        sanitized += "==";
      } else if (remainder === 3) {
        sanitized += "=";
      }
      const binary = atob(sanitized);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } catch {
      return new Blob([], { type: mimeType });
    }
  };

  const blob = await new Promise<Blob>((resolve) => {
    if (typeof canvas.toBlob === "function") {
      try {
        canvas.toBlob(
          async (resultBlob) => {
            if (resultBlob) {
              resolve(resultBlob);
            } else {
              resolve(await createBlobFallback());
            }
          },
          mimeType,
          quality
        );
      } catch {
        void createBlobFallback().then(resolve);
      }
    } else {
      void createBlobFallback().then(resolve);
    }
  });

  return {
    base64: dataUrl,
    rawBase64,
    mimeType,
    width,
    height,
    blob,
  };
}

/**
 * Validates and packages multi-page scan payloads for API transmission.
 * Ensures total payload size does not exceed client memory limits.
 */
export async function assembleMultiPageDocument(
  pages: MultiPageInput[]
): Promise<MultiPageDocumentPayload> {
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    throw new Error("Page list is empty.");
  }

  if (pages.length > MAX_DOCUMENT_PAGES) {
    throw new Error(
      `Page count ${pages.length} exceeds maximum limit of ${MAX_DOCUMENT_PAGES}.`
    );
  }

  let totalBytes = 0;
  const processedImages: Array<{ base64: string; mimeType: string }> = [];
  const textSnippets: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageIndex = i + 1;

    if (!page || typeof page !== "object") {
      throw new Error(`Page ${pageIndex} is invalid.`);
    }

    if (
      !page.base64 ||
      typeof page.base64 !== "string" ||
      page.base64.trim().length === 0
    ) {
      throw new Error(`Page ${pageIndex} has empty image data.`);
    }

    const mimeType =
      page.mimeType &&
      typeof page.mimeType === "string" &&
      page.mimeType.trim().length > 0
        ? page.mimeType.trim()
        : "image/jpeg";

    const commaIndex = page.base64.indexOf(",");
    const cleanBase64 =
      commaIndex !== -1 ? page.base64.slice(commaIndex + 1) : page.base64;

    if (cleanBase64.length === 0) {
      throw new Error(`Page ${pageIndex} has invalid base64 data.`);
    }

    // Base64 encodes 3 bytes for every 4 characters
    const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
    totalBytes += approxBytes;

    if (totalBytes > MAX_TOTAL_PAYLOAD_BYTES) {
      throw new Error("Total payload size exceeds 20 MB limit.");
    }

    const normalizedBase64 = page.base64.startsWith("data:")
      ? page.base64
      : `data:${mimeType};base64,${cleanBase64}`;

    processedImages.push({
      base64: normalizedBase64,
      mimeType,
    });

    if (
      page.text &&
      typeof page.text === "string" &&
      page.text.trim().length > 0
    ) {
      textSnippets.push(`Page ${pageIndex}:\n${page.text.trim()}`);
    }
  }

  const combinedTextSnippet =
    textSnippets.length > 0
      ? textSnippets.join("\n\n")
      : `[Scanned document: ${processedImages.length} page${
          processedImages.length === 1 ? "" : "s"
        }]`;

  return {
    combinedTextSnippet,
    images: processedImages,
  };
}
