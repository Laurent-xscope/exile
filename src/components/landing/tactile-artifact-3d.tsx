"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { cx } from "@/utils/cx";
import { RiRepeatLine } from "@remixicon/react";
import { soundEffects } from "@/lib/audio/sounds";

export interface TactileSubject {
  id: string;
  pillLabel: string;
  categoryTag: string;
  question: string;
  badge: string;
  backPrinciple: string;
  backRationale1: string;
  backRationale2: string;
  takeaway: string;
  accentHex: string;
}

export const TACTILE_SUBJECTS: TactileSubject[] = [
  {
    id: "sains",
    pillLabel: "Sains & energi",
    categoryTag: "Fisika semikonduktor • sel surya",
    question: "Mengapa sel surya tandem perovskite melampaui batas efisiensi silikon konvensional?",
    badge: "Efisiensi 33.9% · melampaui S-Q",
    backPrinciple: "Prinsip tandem pita energi",
    backRationale1:
      "Lapisan perovskite menyerap foton spektrum biru berenergi tinggi, sementara silikon menangkap spektrum inframerah dekat tanpa kehilangan termalisasi.",
    backRationale2:
      "Rekayasa tandem bertingkat ini menembus batas teoritis Shockley-Queisser (29.4%) hingga efisiensi konversi daya terverifikasi mencapai 33.9%.",
    takeaway: "Batas Shockley-Queisser terlampaui",
    accentHex: "#10b981",
  },
  {
    id: "biologi",
    pillLabel: "Biologi sel",
    categoryTag: "Bioenergetika • sintesis ATP",
    question: "Bagaimana gradien proton melintasi membran memicu laju sintesis ATP puncak pada mitokondria?",
    badge: "Gradien ΔpH · puncak 32-34 ATP",
    backPrinciple: "Kemiosmosis gradien proton",
    backRationale1:
      "Rantai transpor elektron memompa proton melintasi membran dalam mitokondria, membentuk potensial elektrokimia dan beda gradien pH (ΔpH).",
    backRationale2:
      "Aliran balik proton melalui ATP sintase menggerakkan rotor katalitik secara mekanokimiawi hingga menghasilkan laju sintesis optimal 32-34 ATP per glukosa.",
    takeaway: "Sintesis energi optimal pada kesetimbangan",
    accentHex: "#0ea5e9",
  },
  {
    id: "bahasa",
    pillLabel: "Bahasa & kognisi",
    categoryTag: "Kognisi bahasa • retensi memori",
    question: "Bagaimana modalitas spasial-taktil mempertahankan retensi pemahaman jangka panjang dibanding teks?",
    badge: "Retensi 84% · kurva kognitif",
    backPrinciple: "Efek superioritas spasial",
    backRationale1:
      "Interaksi spasial-taktil melibatkan korteks somatosensori dan visual secara serempak, memperkuat pengkodean jejak memori ganda dalam hipokampus.",
    backRationale2:
      "Uji kognitif jangka panjang menunjukkan penurunan tajam pada teks biasa (28% di H+30), sementara representasi spasial mempertahankan 84% pemahaman.",
    takeaway: "Retensi spasial terbukti 3x lebih kuat",
    accentHex: "#3b82f6",
  },
];

const CANVAS_W = 960;
const CANVAS_H = 1280;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + " " + word;
    const width = ctx.measureText(testLine).width;
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// 1. Shared 512x512 tangent-space normalMap
function generateSharedNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const height = new Float32Array(size * size);
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < size * size; i++) {
    height[i] = (rnd() - 0.5) * 0.12;
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const tl = height[ym1 * size + xm1];
      const t = height[ym1 * size + x];
      const tr = height[ym1 * size + xp1];
      const l = height[y * size + xm1];
      const r = height[y * size + xp1];
      const bl = height[yp1 * size + xm1];
      const b = height[yp1 * size + x];
      const br = height[yp1 * size + xp1];

      const dX = tr + 2 * r + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      const nx = -dX * 2.0;
      const ny = -dY * 2.0;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// 2. Shared 512x512 roughnessMap
function generateSharedRoughnessMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#c8c8c8";
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  let seed = 999;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < data.length; i += 4) {
    const noise = (rnd() - 0.5) * 26;
    const v = Math.min(255, Math.max(0, 195 + noise));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// 3. Shared offscreen paper canvas with neutral graphite/ivory surfaces
function generateOffscreenPaperCanvas(isDark: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  if (isDark) {
    bgGrad.addColorStop(0, "#1b1c1e");
    bgGrad.addColorStop(0.5, "#202225");
    bgGrad.addColorStop(1, "#242629");
  } else {
    bgGrad.addColorStop(0, "#f7f8fa");
    bgGrad.addColorStop(0.5, "#f3f5f8");
    bgGrad.addColorStop(1, "#ebedf0");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  let seed = 777;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Subtle paper fibers in neutral tones
  ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(15, 23, 42, 0.025)";
  for (let i = 0; i < 350; i++) {
    const fx = rnd() * CANVAS_W;
    const fy = rnd() * CANVAS_H;
    const fw = 1 + rnd() * 2.5;
    const fh = 1 + rnd() * 2;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // Outer border
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.22)";
  roundRect(ctx, 36, 36, CANVAS_W - 72, CANVAS_H - 72, 24);
  ctx.stroke();

  // Subtle inner hairline
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(17, 19, 23, 0.14)";
  roundRect(ctx, 48, 48, CANVAS_W - 96, CANVAS_H - 96, 18);
  ctx.stroke();

  return canvas;
}

// 4. Printed header lines for reference index sheets (neutral slate tones)
function generateWorksheetTexture(isDark: boolean): THREE.CanvasTexture {
  const sizeW = 256;
  const sizeH = 320;
  const canvas = document.createElement("canvas");
  canvas.width = sizeW;
  canvas.height = sizeH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = isDark ? "#1b1c1e" : "#f7f8fa";
  ctx.fillRect(0, 0, sizeW, sizeH);

  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, sizeW - 24, sizeH - 24);

  ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
  ctx.font = "bold 10px monospace";
  ctx.fillText("Exile • silabus kurikulum", 20, 28);

  ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(16, 185, 129, 0.45)";
  ctx.fillRect(20, 36, 120, 3);

  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.07)";
  for (let y = 56; y < sizeH - 24; y += 18) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(sizeW - 20, y);
    ctx.stroke();
  }

  ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
  ctx.fillRect(20, 68, 140, 6);
  ctx.fillRect(20, 104, 180, 6);
  ctx.fillRect(20, 140, 110, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 5a. Solar efficiency curve for "sains"
function drawSolarEfficiencyGraph(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  isDark: boolean
) {
  // Panel header
  ctx.textAlign = "start";
  ctx.font = "600 13px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Analisis energi • spektrum fotovoltaik", px + 32, py + 36);

  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
  ctx.fillText("Kurva efisiensi konversi sel surya tandem", px + 32, py + 64);

  // Plot boundaries
  const plotLeft = px + 68;
  const plotRight = px + pw - 36;
  const plotW = plotRight - plotLeft;
  const plotTop = py + 92;
  const plotBottom = py + ph - 70;
  const plotH = plotBottom - plotTop;

  const yMin = 15;
  const yMax = 38;
  const getY = (val: number) => plotBottom - ((val - yMin) / (yMax - yMin)) * plotH;
  const getX = (frac: number) => plotLeft + frac * plotW;

  // Horizontal gridlines & Y labels
  const yTicks = [15, 20, 25, 30, 35];
  ctx.lineWidth = 1;
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 19, 23, 0.12)";
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    ctx.font = "500 12px monospace";
    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.textAlign = "end";
    ctx.fillText(`${tick}%`, plotLeft - 10, y + 4);
  }

  // Axes lines
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(60, 64, 67, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop - 8);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight + 8, plotBottom);
  ctx.stroke();

  // X ticks
  const xLabels = [
    { frac: 0.12, label: "Silikon standar" },
    { frac: 0.44, label: "Silikon lab" },
    { frac: 0.72, label: "Tandem awal" },
    { frac: 0.92, label: "Perovskite tandem" },
  ];
  ctx.textAlign = "center";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  for (const tick of xLabels) {
    const x = getX(tick.frac);
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(60, 64, 67, 0.25)";
    ctx.beginPath();
    ctx.moveTo(x, plotBottom);
    ctx.lineTo(x, plotBottom + 6);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.fillText(tick.label, x, plotBottom + 22);
  }

  // Dashed S-Q limit line at 29.4%
  const ySQ = getY(29.4);
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(plotLeft, ySQ);
  ctx.lineTo(plotRight, ySQ);
  ctx.stroke();
  ctx.restore();

  // Label for S-Q limit
  ctx.textAlign = "start";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  roundRect(ctx, plotLeft + 16, ySQ - 24, 206, 20, 4);
  ctx.fillStyle = isDark ? "rgba(36, 38, 41, 0.85)" : "#ebedf0";
  ctx.fill();
  ctx.fillStyle = isDark ? "#cbd5e1" : "#3c4043";
  ctx.fillText("Batas S-Q 29.4% (teoritis silikon)", plotLeft + 22, ySQ - 10);

  // Curve points: (0.06, 18.0), (0.24, 22.2), (0.44, 26.1), (0.70, 29.6), (0.92, 33.9)
  const pts = [
    { x: getX(0.06), y: getY(18.0) },
    { x: getX(0.24), y: getY(22.2) },
    { x: getX(0.44), y: getY(26.1) },
    { x: getX(0.70), y: getY(29.6) },
    { x: getX(0.92), y: getY(33.9) },
  ];

  // Draw gradient area under curve
  const areaGrad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
  areaGrad.addColorStop(0, isDark ? "rgba(16, 185, 129, 0.28)" : "rgba(16, 185, 129, 0.18)");
  areaGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

  ctx.beginPath();
  ctx.moveTo(pts[0].x, plotBottom);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
  }
  ctx.lineTo(pts[pts.length - 1].x, plotBottom);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw curve stroke
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
  }
  ctx.strokeStyle = isDark ? "#10b981" : "#059669";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Data point 1: Silikon 26.1%
  const pSilicon = pts[2];
  ctx.beginPath();
  ctx.arc(pSilicon.x, pSilicon.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#64748b" : "#475569";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pSilicon.x, pSilicon.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Callout pill: Silikon 26.1%
  roundRect(ctx, pSilicon.x - 64, pSilicon.y - 42, 128, 28, 14);
  ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(17, 19, 23, 0.22)";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#cbd5e1" : "#3c4043";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Silikon 26.1%", pSilicon.x, pSilicon.y - 23);

  // Data point 2: Perovskite 33.9%
  const pPerov = pts[4];
  ctx.beginPath();
  ctx.arc(pPerov.x, pPerov.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pPerov.x, pPerov.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#10b981" : "#059669";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pPerov.x, pPerov.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Callout pill: Perovskite 33.9%
  roundRect(ctx, pPerov.x - 145, pPerov.y - 46, 140, 32, 16);
  ctx.fillStyle = isDark ? "#064e3b" : "#ecfdf5";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? "#10b981" : "#059669";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#6ee7b7" : "#047857";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Perovskite 33.9%", pPerov.x - 75, pPerov.y - 25);

  // Footer summary strip
  ctx.textAlign = "start";
  ctx.font = "500 12px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Silikon: 26.1%  •  Batas S-Q: 29.4%  •  Tandem: 33.9% (+7.8%)", px + 32, py + ph - 24);
}

// 5b. Proton-gradient vs ATP synthesis rate curve for "biologi"
function drawProtonGradientGraph(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  isDark: boolean
) {
  // Panel header
  ctx.textAlign = "start";
  ctx.font = "600 13px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Kinetika bioenergetika • mitokondria", px + 32, py + 36);

  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
  ctx.fillText("Kurva laju sintesis ATP vs gradien proton (ΔpH)", px + 32, py + 64);

  const plotLeft = px + 68;
  const plotRight = px + pw - 36;
  const plotW = plotRight - plotLeft;
  const plotTop = py + 92;
  const plotBottom = py + ph - 70;
  const plotH = plotBottom - plotTop;

  const yMin = 0;
  const yMax = 40;
  const getY = (val: number) => plotBottom - ((val - yMin) / (yMax - yMin)) * plotH;
  const xMin = 0;
  const xMax = 2.2;
  const getX = (val: number) => plotLeft + ((val - xMin) / (xMax - xMin)) * plotW;

  // Y gridlines & labels
  const yTicks = [0, 10, 20, 30, 40];
  ctx.lineWidth = 1;
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 19, 23, 0.12)";
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    ctx.font = "500 12px monospace";
    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.textAlign = "end";
    ctx.fillText(`${tick}`, plotLeft - 10, y + 4);
  }

  // Axes lines
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(60, 64, 67, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop - 8);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight + 8, plotBottom);
  ctx.stroke();

  // X ticks
  const xTicks = [0.0, 0.5, 1.0, 1.5, 2.0];
  ctx.textAlign = "center";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  for (const tick of xTicks) {
    const x = getX(tick);
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(60, 64, 67, 0.25)";
    ctx.beginPath();
    ctx.moveTo(x, plotBottom);
    ctx.lineTo(x, plotBottom + 6);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.fillText(`${tick.toFixed(1)} ΔpH`, x, plotBottom + 22);
  }

  // Smooth curve points peaking at 32-34 ATP
  const pts = [
    { x: getX(0.08), y: getY(1.0) },
    { x: getX(0.45), y: getY(6.0) },
    { x: getX(0.90), y: getY(17.5) },
    { x: getX(1.30), y: getY(28.5) },
    { x: getX(1.65), y: getY(33.8) },
    { x: getX(1.95), y: getY(33.0) },
    { x: getX(2.15), y: getY(32.1) },
  ];

  // Shaded area under curve
  const areaGrad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
  areaGrad.addColorStop(0, isDark ? "rgba(14, 165, 233, 0.28)" : "rgba(14, 165, 233, 0.18)");
  areaGrad.addColorStop(1, "rgba(14, 165, 233, 0.0)");

  ctx.beginPath();
  ctx.moveTo(pts[0].x, plotBottom);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
  }
  ctx.lineTo(pts[pts.length - 1].x, plotBottom);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Main curve stroke
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = (pts[i].x + pts[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
  }
  ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Peak drop-line to X axis
  const pPeak = pts[4];
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.5)" : "rgba(2, 132, 199, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pPeak.x, pPeak.y);
  ctx.lineTo(pPeak.x, plotBottom);
  ctx.stroke();
  ctx.restore();

  // Labeled point 1: Ambang aktivasi (0.45, 6.0 ATP)
  const p1 = pts[1];
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#64748b" : "#475569";
  ctx.fill();
  roundRect(ctx, p1.x - 70, p1.y - 36, 140, 26, 13);
  ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(17, 19, 23, 0.22)";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#cbd5e1" : "#3c4043";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Ambang 0.45 ΔpH (6 ATP)", p1.x, p1.y - 19);

  // Labeled point 2: Puncak 32-34 ATP
  ctx.beginPath();
  ctx.arc(pPeak.x, pPeak.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pPeak.x, pPeak.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pPeak.x, pPeak.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  roundRect(ctx, pPeak.x - 75, pPeak.y - 48, 150, 32, 16);
  ctx.fillStyle = isDark ? "#082f49" : "#f0f9ff";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#7dd3fc" : "#0369a1";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Puncak 32-34 ATP", pPeak.x, pPeak.y - 27);

  // Footer summary strip
  ctx.textAlign = "start";
  ctx.font = "500 12px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Gradien optimal: 1.65 ΔpH  •  Kapasitas puncak: 32-34 ATP/glukosa", px + 32, py + ph - 24);
}

// 5c. Cognitive retention curve for "bahasa"
function drawCognitiveRetentionGraph(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  isDark: boolean
) {
  // Panel header
  ctx.textAlign = "start";
  ctx.font = "600 13px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Psikologi kognitif • retensi memori", px + 32, py + 36);

  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
  ctx.fillText("Kurva retensi pemahaman jangka panjang", px + 32, py + 64);

  const plotLeft = px + 68;
  const plotRight = px + pw - 36;
  const plotW = plotRight - plotLeft;
  const plotTop = py + 92;
  const plotBottom = py + ph - 70;
  const plotH = plotBottom - plotTop;

  const yMin = 0;
  const yMax = 100;
  const getY = (val: number) => plotBottom - ((val - yMin) / (yMax - yMin)) * plotH;

  // Y gridlines & labels
  const yTicks = [0, 25, 50, 75, 100];
  ctx.lineWidth = 1;
  for (const tick of yTicks) {
    const y = getY(tick);
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 19, 23, 0.12)";
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();

    ctx.font = "500 12px monospace";
    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.textAlign = "end";
    ctx.fillText(`${tick}%`, plotLeft - 10, y + 4);
  }

  // Axes lines
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(60, 64, 67, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop - 8);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight + 8, plotBottom);
  ctx.stroke();

  // X points: H+0, H+1, H+7, H+30
  const xH0 = plotLeft + 0.06 * plotW;
  const xH1 = plotLeft + 0.32 * plotW;
  const xH7 = plotLeft + 0.60 * plotW;
  const xH30 = plotLeft + 0.90 * plotW;

  const xTicks = [
    { x: xH0, label: "H+0" },
    { x: xH1, label: "H+1 (24 jam)" },
    { x: xH7, label: "H+7 (1 pekan)" },
    { x: xH30, label: "H+30 (1 bulan)" },
  ];

  ctx.textAlign = "center";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  for (const tick of xTicks) {
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(60, 64, 67, 0.25)";
    ctx.beginPath();
    ctx.moveTo(tick.x, plotBottom);
    ctx.lineTo(tick.x, plotBottom + 6);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.fillText(tick.label, tick.x, plotBottom + 22);
  }

  // 1. Spasial 84% curve
  const ptsSpatial = [
    { x: xH0, y: getY(100) },
    { x: xH1, y: getY(94) },
    { x: xH7, y: getY(89) },
    { x: xH30, y: getY(84) },
  ];

  const areaGrad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
  areaGrad.addColorStop(0, isDark ? "rgba(16, 185, 129, 0.28)" : "rgba(16, 185, 129, 0.18)");
  areaGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

  ctx.beginPath();
  ctx.moveTo(ptsSpatial[0].x, plotBottom);
  ctx.lineTo(ptsSpatial[0].x, ptsSpatial[0].y);
  for (let i = 0; i < ptsSpatial.length - 1; i++) {
    const cpX = (ptsSpatial[i].x + ptsSpatial[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, ptsSpatial[i].y, cpX, ptsSpatial[i + 1].y, ptsSpatial[i + 1].x, ptsSpatial[i + 1].y);
  }
  ctx.lineTo(ptsSpatial[ptsSpatial.length - 1].x, plotBottom);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(ptsSpatial[0].x, ptsSpatial[0].y);
  for (let i = 0; i < ptsSpatial.length - 1; i++) {
    const cpX = (ptsSpatial[i].x + ptsSpatial[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, ptsSpatial[i].y, cpX, ptsSpatial[i + 1].y, ptsSpatial[i + 1].x, ptsSpatial[i + 1].y);
  }
  ctx.strokeStyle = isDark ? "#10b981" : "#059669";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 2. Audio 52% curve
  const ptsAudio = [
    { x: xH0, y: getY(100) },
    { x: xH1, y: getY(76) },
    { x: xH7, y: getY(63) },
    { x: xH30, y: getY(52) },
  ];
  ctx.beginPath();
  ctx.moveTo(ptsAudio[0].x, ptsAudio[0].y);
  for (let i = 0; i < ptsAudio.length - 1; i++) {
    const cpX = (ptsAudio[i].x + ptsAudio[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, ptsAudio[i].y, cpX, ptsAudio[i + 1].y, ptsAudio[i + 1].x, ptsAudio[i + 1].y);
  }
  ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 3. Teks 28% curve
  const ptsText = [
    { x: xH0, y: getY(100) },
    { x: xH1, y: getY(58) },
    { x: xH7, y: getY(38) },
    { x: xH30, y: getY(28) },
  ];
  ctx.beginPath();
  ctx.moveTo(ptsText[0].x, ptsText[0].y);
  for (let i = 0; i < ptsText.length - 1; i++) {
    const cpX = (ptsText[i].x + ptsText[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, ptsText[i].y, cpX, ptsText[i + 1].y, ptsText[i + 1].x, ptsText[i + 1].y);
  }
  ctx.strokeStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Nodes & badges at H+30:
  // Teks 28%
  const pT = ptsText[3];
  ctx.beginPath();
  ctx.arc(pT.x, pT.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fill();
  roundRect(ctx, pT.x - 78, pT.y - 14, 72, 24, 6);
  ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(17, 19, 23, 0.22)";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Teks 28%", pT.x - 42, pT.y + 3);

  // Audio 52%
  const pA = ptsAudio[3];
  ctx.beginPath();
  ctx.arc(pA.x, pA.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.fill();
  roundRect(ctx, pA.x - 80, pA.y - 14, 74, 24, 6);
  ctx.fillStyle = isDark ? "#082f49" : "#f0f9ff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#7dd3fc" : "#0369a1";
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Audio 52%", pA.x - 43, pA.y + 3);

  // Spasial 84%
  const pS = ptsSpatial[3];
  ctx.beginPath();
  ctx.arc(pS.x, pS.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pS.x, pS.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#10b981" : "#059669";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pS.x, pS.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  roundRect(ctx, pS.x - 110, pS.y - 42, 114, 30, 15);
  ctx.fillStyle = isDark ? "#064e3b" : "#ecfdf5";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? "#10b981" : "#059669";
  ctx.stroke();
  ctx.fillStyle = isDark ? "#6ee7b7" : "#047857";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Spasial 84%", pS.x - 53, pS.y - 22);

  // Footer summary strip
  ctx.textAlign = "start";
  ctx.font = "500 12px monospace";
  ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
  ctx.fillText("Teks: 28%  •  Audio narasi: 52%  •  Spasial taktil: 84% (3.0x retensi)", px + 32, py + ph - 24);
}

// 6. Fast CanvasTexture rendering using drawImage with zero warm orange/brown tones
function renderSubjectFaceCanvas(
  canvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
  subject: TactileSubject,
  isFront: boolean,
  isDark: boolean
) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(baseCanvas, 0, 0);

  if (isFront) {
    // Header category pill
    ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
    roundRect(ctx, 72, 84, 400, 48, 24);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.22)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(98, 108, 6, 0, Math.PI * 2);
    ctx.fillStyle = subject.accentHex;
    ctx.fill();

    ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
    ctx.font = "700 20px system-ui, -apple-system, sans-serif";
    ctx.fillText(subject.categoryTag, 116, 115);

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.font = "600 17px monospace";
    ctx.fillText("Exile • meja ajar", CANVAS_W - 250, 115);

    // Question
    ctx.font = "bold 44px Georgia, serif";
    const qLines = wrapText(ctx, subject.question, CANVAS_W - 144);
    let curY = 220;
    for (const line of qLines) {
      if (isDark) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillText(line, 74, curY + 2);
        ctx.fillStyle = "#f8fafc";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(line, 74, curY + 2);
        ctx.fillStyle = "#111317";
      }
      ctx.fillText(line, 72, curY);
      curY += 60;
    }

    curY += 16;
    ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
    roundRect(ctx, 72, curY, 490, 56, 28);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.22)";
    ctx.stroke();

    ctx.fillStyle = isDark ? "#10b981" : "#059669";
    ctx.font = "700 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(subject.badge, 98, curY + 36);

    // Analytical Graph View panel in y = 600..1145
    const panelX = 64;
    const panelY = 600;
    const panelW = CANVAS_W - 128; // 832
    const panelH = 545; // up to y = 1145
    const panelR = 20;

    ctx.fillStyle = isDark ? "#202226" : "#ebedf0";
    roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.24)";
    ctx.stroke();

    if (subject.id === "sains") {
      drawSolarEfficiencyGraph(ctx, panelX, panelY, panelW, panelH, isDark);
    } else if (subject.id === "biologi") {
      drawProtonGradientGraph(ctx, panelX, panelY, panelW, panelH, isDark);
    } else {
      drawCognitiveRetentionGraph(ctx, panelX, panelY, panelW, panelH, isDark);
    }

    // Bottom rotation hint (circular E stamp and curriculum artifact completely deleted)
    ctx.font = "600 19px monospace";
    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.textAlign = "center";
    ctx.fillText("Tahan & geser untuk memutar 180°", CANVAS_W / 2, 1220);
    ctx.textAlign = "start";
  } else {
    // Back face: verified principles & scientific mechanics
    ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
    roundRect(ctx, 72, 84, 380, 48, 24);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.22)";
    ctx.stroke();

    ctx.fillStyle = isDark ? "#10b981" : "#059669";
    ctx.font = "700 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("Jawaban & prinsip inti", 96, 115);

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.font = "600 17px monospace";
    ctx.fillText("Fakta terverifikasi", CANVAS_W - 270, 115);

    ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText(subject.backPrinciple, 72, 210);

    ctx.fillStyle = isDark ? "rgba(36, 38, 41, 0.92)" : "#ebedf0";
    roundRect(ctx, 72, 255, CANVAS_W - 144, 520, 24);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(17, 19, 23, 0.22)";
    ctx.stroke();

    ctx.fillStyle = isDark ? "#cbd5e1" : "#3c4043";
    ctx.font = "700 21px system-ui, -apple-system, sans-serif";
    ctx.fillText("Mekanisme & kaidah ilmiah:", 104, 310);

    ctx.fillStyle = isDark ? "#f8fafc" : "#111317";
    ctx.font = "500 27px system-ui, -apple-system, sans-serif";
    const p1Lines = wrapText(ctx, subject.backRationale1, CANVAS_W - 208);
    let pY = 360;
    for (const line of p1Lines) {
      ctx.fillText(line, 104, pY);
      pY += 44;
    }

    pY += 20;
    const p2Lines = wrapText(ctx, subject.backRationale2, CANVAS_W - 208);
    for (const line of p2Lines) {
      ctx.fillText(line, 104, pY);
      pY += 44;
    }

    ctx.fillStyle = isDark ? "#242629" : "#ebedf0";
    roundRect(ctx, 72, 825, CANVAS_W - 144, 68, 34);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(17, 19, 23, 0.22)";
    ctx.stroke();

    ctx.fillStyle = isDark ? "#10b981" : "#059669";
    ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(`✓ ${subject.takeaway}`, 104, 868);

    ctx.fillStyle = isDark ? "#94a3b8" : "#3c4043";
    ctx.font = "600 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Laboratorium sains & komputasi • exile", CANVAS_W / 2, 1220);
    ctx.textAlign = "start";
  }
}

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function TactileFallbackCard({
  subject,
  isDark,
  isFlipped,
  onToggleFlip,
  className,
}: {
  subject: TactileSubject;
  isDark: boolean;
  isFlipped: boolean;
  onToggleFlip: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const baseCanvas = generateOffscreenPaperCanvas(isDark);
    renderSubjectFaceCanvas(canvas, baseCanvas, subject, !isFlipped, isDark);
  }, [subject, isDark, isFlipped]);

  return (
    <div
      className={cx(
        "flex flex-col items-center w-full max-w-[285px] sm:max-w-[360px] mx-auto gap-3",
        className
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleFlip();
          }
        }}
        aria-label={
          isFlipped
            ? "Kartu tampak belakang: prinsip ilmiah. Klik untuk membalik."
            : "Kartu tampak depan: grafik analisis. Klik untuk membalik."
        }
        className="w-full relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring rounded-3xl overflow-hidden shadow-xs border border-border-button-default bg-background-primary-default transition-transform active:scale-[0.99]"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto aspect-[3/4] block pointer-events-none select-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFlip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption-1-medium text-text-secondary hover:text-text-primary bg-background-secondary-default hover:bg-background-secondary-hover border border-border-button-default cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring transition-colors shadow-2xs"
        >
          <RiRepeatLine className="size-3.5 text-foreground-icon-secondary" aria-hidden="true" />
          <span>{isFlipped ? "Lihat kurva analisis" : "Balik kartu (prinsip)"}</span>
        </button>
      </div>
    </div>
  );
}

export interface TactileArtifact3DProps {
  className?: string;
  forceFallback?: boolean;
}

export function TactileArtifact3D({ className, forceFallback }: TactileArtifact3DProps = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("sains");
  const [webGlSupported, setWebGlSupported] = useState<boolean>(() => isWebGLAvailable());
  const [isFlippedFallback, setIsFlippedFallback] = useState<boolean>(false);
  const [isDarkState, setIsDarkState] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const activeSubjectIdRef = useRef<string>("sains");
  const scrollProgressRef = useRef<number>(0);

  const frontPaperMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const backPaperMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const texturesMapRef = useRef<{ [key: string]: THREE.CanvasTexture }>({});
  const basePaperCanvasRef = useRef<{ dark: HTMLCanvasElement; light: HTMLCanvasElement } | null>(null);

  // Sync theme changes for fallback rendering
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDarkState(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // Damped physics state with touch gesture discriminator
  const physicsRef = useRef({
    currentRotY: 0.34,
    currentRotX: -0.06,
    targetRotY: 0.34,
    targetRotX: -0.06,
    velY: 0,
    velX: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartRotY: 0,
    dragStartRotX: 0,
    userOffsetY: 0,
    userOffsetX: 0,
    dragStartOffsetY: 0,
    dragStartOffsetX: 0,
    liftImpulse: 0,
    isTouch: false,
    hasCaptured: false,
    containerWidth: 340,
    containerHeight: 480,
  });

  // Texture generator with caching
  const getOrCreateSubjectTexture = useCallback(
    (subject: TactileSubject, isFront: boolean, isDark: boolean): THREE.CanvasTexture => {
      const key = `${subject.id}-${isFront ? "front" : "back"}`;
      let tex = texturesMapRef.current[key];
      if (tex) return tex;

      const base = isDark
        ? basePaperCanvasRef.current?.dark
        : basePaperCanvasRef.current?.light;
      const cvs = document.createElement("canvas");
      if (base) {
        renderSubjectFaceCanvas(cvs, base, subject, isFront, isDark);
      }
      tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      texturesMapRef.current[key] = tex;
      return tex;
    },
    []
  );

  // Switch subject on demand
  const handleSelectSubject = useCallback(
    (id: string) => {
      if (id === activeSubjectIdRef.current) return;
      activeSubjectIdRef.current = id;
      setActiveSubjectId(id);

      setTimeout(() => {
        soundEffects.playClick();
      }, 0);

      const isDark =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      const subj = TACTILE_SUBJECTS.find((s) => s.id === id);
      if (subj) {
        const frontTex = getOrCreateSubjectTexture(subj, true, isDark);
        const backTex = getOrCreateSubjectTexture(subj, false, isDark);

        if (frontPaperMatRef.current && frontTex) {
          frontPaperMatRef.current.map = frontTex;
          frontPaperMatRef.current.needsUpdate = true;
        }
        if (backPaperMatRef.current && backTex) {
          backPaperMatRef.current.map = backTex;
          backPaperMatRef.current.needsUpdate = true;
        }
      }

      physicsRef.current.velY += 0.09;
      physicsRef.current.liftImpulse = 0.24;
    },
    [getOrCreateSubjectTexture]
  );

  useEffect(() => {
    if (forceFallback || !webGlSupported) {
      return;
    }

    const container = mountRef.current;
    if (!container) return;
    const texturesMap = texturesMapRef.current;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera
    const isNarrowInitial = width / height < 1;
    const initialCamZ = isNarrowInitial ? 12.8 : 9.3;
    const initialCamY = isNarrowInitial ? 0.85 : 0.65;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, initialCamY, initialCamZ);
    camera.lookAt(0, -0.32, 0);

    // 2. WebGL Renderer with device-based pixel ratio cap (clamped to 1.0 on mobile to ensure silky 60fps & no heat)
    const isMobileDevice = (typeof window !== "undefined" ? window.innerWidth : width) < 1024;
    const getTargetPixelRatio = () => {
      const maxPR = isMobileDevice ? 1.0 : 1.75;
      return Math.min(window.devicePixelRatio || 1, maxPR);
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobileDevice,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      requestAnimationFrame(() => setWebGlSupported(false));
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(getTargetPixelRatio());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isMobileDevice;
    if (!isMobileDevice) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.domElement.style.maxWidth = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      requestAnimationFrame(() => setWebGlSupported(false));
    };
    const glDom = renderer.domElement;
    glDom.addEventListener("webglcontextlost", handleContextLost);

    // 3. Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv).texture;
    scene.environment = envMap;

    // 4. Lights with Soft Shadows (512x512 on mobile to prevent GPU throttling)
    const isDarkInitial = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const keyLight = new THREE.DirectionalLight(0xffffff, isDarkInitial ? 2.5 : 1.95);
    keyLight.position.set(4.5, 6.5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = isMobileDevice ? 512 : 1024;
    keyLight.shadow.mapSize.height = isMobileDevice ? 512 : 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 2.2;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x8ab4f8, 1.8, 14);
    rimLight.position.set(-4, 3, 3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf0f4f9, 1.0);
    fillLight.position.set(-3.5, 3.5, -4.5);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xf8f9fa, 0.65);
    scene.add(ambientLight);

    // 5. Pre-bake NormalMap, RoughnessMap, and Base Canvases
    const sharedNormalMap = generateSharedNormalMap();
    const sharedRoughnessMap = generateSharedRoughnessMap();

    const darkBaseCanvas = generateOffscreenPaperCanvas(true);
    const lightBaseCanvas = generateOffscreenPaperCanvas(false);
    basePaperCanvasRef.current = { dark: darkBaseCanvas, light: lightBaseCanvas };

    // Instruction 12: Build ONLY the active subject's textures on mount
    const activeSubj =
      TACTILE_SUBJECTS.find((s) => s.id === activeSubjectIdRef.current) || TACTILE_SUBJECTS[0];

    const initialFrontTex = getOrCreateSubjectTexture(activeSubj, true, isDarkInitial);
    const initialBackTex = getOrCreateSubjectTexture(activeSubj, false, isDarkInitial);

    // Generate other subjects lazily via requestIdleCallback or setTimeout
    const generateOtherSubjectsLazily = () => {
      const isDark = document.documentElement.classList.contains("dark");
      for (const subj of TACTILE_SUBJECTS) {
        if (subj.id !== activeSubjectIdRef.current) {
          getOrCreateSubjectTexture(subj, true, isDark);
          getOrCreateSubjectTexture(subj, false, isDark);
        }
      }
    };

    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number;
        }
      ).requestIdleCallback(generateOtherSubjectsLazily, { timeout: 2500 });
    } else {
      timeoutHandle = setTimeout(generateOtherSubjectsLazily, 800);
    }

    // 6. Contained 3D Desk Board & Props Inside Camera Frustum
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, -1.82, -0.1);
    deskGroup.rotation.x = 0.22;
    deskGroup.rotation.y = -0.22;

    const deskBoardGeom = new RoundedBoxGeometry(4.8, 0.15, 3.3, 6, 0.06);
    const deskBoardMat = new THREE.MeshStandardMaterial({
      color: isDarkInitial ? 0x1b1c1e : 0x242629,
      roughness: 0.68,
      metalness: 0.08,
      normalMap: sharedNormalMap,
      normalScale: new THREE.Vector2(0.12, 0.12),
    });
    const deskBoardMesh = new THREE.Mesh(deskBoardGeom, deskBoardMat);
    deskBoardMesh.castShadow = true;
    deskBoardMesh.receiveShadow = true;
    deskGroup.add(deskBoardMesh);

    const blotterGeom = new RoundedBoxGeometry(4.35, 0.025, 2.85, 4, 0.02);
    const blotterMat = new THREE.MeshStandardMaterial({
      color: isDarkInitial ? 0x141517 : 0x1b1c1e,
      roughness: 0.92,
      metalness: 0.02,
    });
    const blotterMesh = new THREE.Mesh(blotterGeom, blotterMat);
    blotterMesh.position.set(0, 0.0875, 0);
    blotterMesh.castShadow = true;
    blotterMesh.receiveShadow = true;
    deskGroup.add(blotterMesh);

    const shadowPlaneGeom = new THREE.PlaneGeometry(16, 16);
    const shadowPlaneMat = new THREE.ShadowMaterial({
      opacity: isDarkInitial ? 0.35 : 0.2,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.082;
    shadowPlane.receiveShadow = true;
    deskGroup.add(shadowPlane);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a558,
      metalness: 0.92,
      roughness: 0.26,
    });

    const plinthGeom = new RoundedBoxGeometry(2.35, 0.05, 0.42, 4, 0.012);
    const plinthMesh = new THREE.Mesh(plinthGeom, brassMat);
    plinthMesh.position.set(0, 0.125, 0.02);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    deskGroup.add(plinthMesh);

    const walnutMat = new THREE.MeshStandardMaterial({
      color: isDarkInitial ? 0x222427 : 0x2a2d31,
      roughness: 0.75,
    });

    const worksheetTex = generateWorksheetTexture(isDarkInitial);
    const sheetGeom = new THREE.BoxGeometry(1.5, 0.012, 1.9);
    const sheetMat = new THREE.MeshStandardMaterial({
      map: worksheetTex,
      roughness: 0.86,
    });

    const sheet1 = new THREE.Mesh(sheetGeom, sheetMat);
    sheet1.position.set(-1.45, 0.1, 0.15);
    sheet1.rotation.y = -0.25;
    sheet1.castShadow = true;
    sheet1.receiveShadow = true;
    deskGroup.add(sheet1);

    const sheet2 = new THREE.Mesh(sheetGeom, sheetMat);
    sheet2.position.set(-1.25, 0.115, 0.2);
    sheet2.rotation.y = 0.12;
    sheet2.castShadow = true;
    sheet2.receiveShadow = true;
    deskGroup.add(sheet2);

    const penGroup = new THREE.Group();
    penGroup.position.set(1.55, 0.11, 0.35);
    penGroup.rotation.y = 0.15;
    penGroup.rotation.z = Math.PI / 2;

    const nibGeom = new THREE.ConeGeometry(0.035, 0.13, 16);
    const nibMesh = new THREE.Mesh(nibGeom, brassMat);
    nibMesh.position.set(0, -0.7, 0);
    nibMesh.castShadow = true;
    penGroup.add(nibMesh);

    const gripGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.26, 16);
    const gripMesh = new THREE.Mesh(gripGeom, brassMat);
    gripMesh.position.set(0, -0.5, 0);
    gripMesh.castShadow = true;
    penGroup.add(gripMesh);

    const barrelGeom = new THREE.CylinderGeometry(0.054, 0.046, 1.15, 16);
    const barrelMesh = new THREE.Mesh(barrelGeom, walnutMat);
    barrelMesh.position.set(0, 0.15, 0);
    barrelMesh.castShadow = true;
    penGroup.add(barrelMesh);

    const bandGeom = new THREE.CylinderGeometry(0.056, 0.056, 0.05, 16);
    const bandMesh = new THREE.Mesh(bandGeom, brassMat);
    bandMesh.position.set(0, -0.35, 0);
    bandMesh.castShadow = true;
    penGroup.add(bandMesh);

    const clipGeom = new THREE.BoxGeometry(0.02, 0.38, 0.028);
    const clipMesh = new THREE.Mesh(clipGeom, brassMat);
    clipMesh.position.set(0.06, 0.38, 0);
    clipMesh.castShadow = true;
    penGroup.add(clipMesh);

    const finialGeom = new THREE.SphereGeometry(0.045, 16, 16);
    const finialMesh = new THREE.Mesh(finialGeom, brassMat);
    finialMesh.position.set(0, 0.74, 0);
    finialMesh.castShadow = true;
    penGroup.add(finialMesh);

    deskGroup.add(penGroup);
    scene.add(deskGroup);

    // 7. Multi-Part 3D Hardcover Folio (scaled to 0.78 for generous air)
    const folioGroup = new THREE.Group();
    folioGroup.position.set(0, 0.26, 0);
    folioGroup.scale.set(0.78, 0.78, 0.78);

    const coverGeom = new RoundedBoxGeometry(3.18, 4.18, 0.14, 6, 0.08);
    const coverMat = new THREE.MeshPhysicalMaterial({
      color: isDarkInitial ? 0x1e2023 : 0x2b2e32,
      roughness: 0.72,
      metalness: 0.06,
      clearcoat: 0.25,
      sheen: 0.45,
      sheenRoughness: 0.4,
      normalMap: sharedNormalMap,
      normalScale: new THREE.Vector2(0.26, 0.26),
    });
    const coverMesh = new THREE.Mesh(coverGeom, coverMat);
    coverMesh.castShadow = true;
    coverMesh.receiveShadow = true;
    folioGroup.add(coverMesh);

    const paperEdgeGeom = new RoundedBoxGeometry(3.08, 4.08, 0.118, 4, 0.04);
    const paperEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xf3f5f8,
      roughness: 0.88,
    });
    const paperEdgeMesh = new THREE.Mesh(paperEdgeGeom, paperEdgeMat);
    folioGroup.add(paperEdgeMesh);

    // Front Paper Mesh (matches 960x1280 ratio 0.75)
    const frontPaperGeom = new THREE.PlaneGeometry(2.97, 3.96);
    const frontPaperMat = new THREE.MeshStandardMaterial({
      map: initialFrontTex,
      normalMap: sharedNormalMap,
      normalScale: new THREE.Vector2(0.07, 0.07),
      roughnessMap: sharedRoughnessMap,
      roughness: 0.82,
      metalness: 0.04,
    });
    frontPaperMatRef.current = frontPaperMat;
    const frontPaperMesh = new THREE.Mesh(frontPaperGeom, frontPaperMat);
    frontPaperMesh.position.set(0, 0, 0.071);
    frontPaperMesh.castShadow = true;
    frontPaperMesh.receiveShadow = true;
    folioGroup.add(frontPaperMesh);

    // Back Paper Mesh
    const backPaperGeom = new THREE.PlaneGeometry(2.97, 3.96);
    const backPaperMat = new THREE.MeshStandardMaterial({
      map: initialBackTex,
      normalMap: sharedNormalMap,
      normalScale: new THREE.Vector2(0.07, 0.07),
      roughnessMap: sharedRoughnessMap,
      roughness: 0.82,
      metalness: 0.04,
    });
    backPaperMatRef.current = backPaperMat;
    const backPaperMesh = new THREE.Mesh(backPaperGeom, backPaperMat);
    backPaperMesh.position.set(0, 0, -0.071);
    backPaperMesh.rotation.y = Math.PI;
    backPaperMesh.castShadow = true;
    backPaperMesh.receiveShadow = true;
    folioGroup.add(backPaperMesh);

    const grommetGeom = new THREE.TorusGeometry(0.065, 0.014, 12, 24);
    const grommetTop = new THREE.Mesh(grommetGeom, brassMat);
    grommetTop.position.set(-1.54, 1.15, 0);
    grommetTop.rotation.y = Math.PI / 2;
    folioGroup.add(grommetTop);

    const grommetBottom = new THREE.Mesh(grommetGeom, brassMat);
    grommetBottom.position.set(-1.54, -1.15, 0);
    grommetBottom.rotation.y = Math.PI / 2;
    folioGroup.add(grommetBottom);

    const ringGeom = new THREE.TorusGeometry(0.15, 0.024, 16, 32);
    const ringTop = new THREE.Mesh(ringGeom, brassMat);
    ringTop.position.set(-1.59, 1.15, 0);
    ringTop.rotation.y = Math.PI / 2;
    ringTop.castShadow = true;
    folioGroup.add(ringTop);

    const ringBottom = new THREE.Mesh(ringGeom, brassMat);
    ringBottom.position.set(-1.59, -1.15, 0);
    ringBottom.rotation.y = Math.PI / 2;
    ringBottom.castShadow = true;
    folioGroup.add(ringBottom);

    const folioClipGeom = new THREE.BoxGeometry(0.22, 0.16, 0.018);
    const cornerClip = new THREE.Mesh(folioClipGeom, brassMat);
    cornerClip.position.set(1.38, 1.92, 0.071);
    cornerClip.castShadow = true;
    folioGroup.add(cornerClip);

    scene.add(folioGroup);

    // 8. Passive Window Scroll Tracking (Hero Runway)
    const handleScroll = () => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
      if (isMobile) {
        // On mobile: the card must always stay facing forward (front face) by default!
        // Prevent auto-flipping on page scroll so the user never sees it backwards/upside-down.
        scrollProgressRef.current = 0;
        return;
      }
      const heroEl = document.querySelector("section");
      if (heroEl) {
        const rect = heroEl.getBoundingClientRect();
        const scrollDist = -rect.top;
        const runway = heroEl.offsetHeight - window.innerHeight;
        if (runway > 0) {
          const p = Math.min(1, Math.max(0, scrollDist / runway));
          scrollProgressRef.current = p;
          return;
        }
      }
      const scrollY = typeof window !== "undefined" ? window.scrollY || window.pageYOffset || 0 : 0;
      scrollProgressRef.current = Math.min(1, Math.max(0, scrollY / 450));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // 9. Damped Spring Physics & Pausable Render Loop (Instruction 13)
    let animationFrameId = 0;
    let isIntersecting = true;
    let isDocVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    let isRunning = false;
    let currentScrollProgress = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isRunning) return;
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const p = physicsRef.current;

      const targetScroll = scrollProgressRef.current;
      currentScrollProgress += (targetScroll - currentScrollProgress) * 0.07;

      const scrollBaseY = 0.34 + currentScrollProgress * (Math.PI - 0.68);
      const breathY = Math.sin(elapsed * 1.2) * 0.03;
      const breathX = Math.cos(elapsed * 0.9) * 0.02;

      p.targetRotY = scrollBaseY + p.userOffsetY + breathY;
      p.targetRotX = -0.06 + p.userOffsetX + breathX;

      const stiffness = 0.085;
      const damping = 0.82;

      const diffY = p.targetRotY - p.currentRotY;
      p.velY = (p.velY + diffY * stiffness) * damping;
      p.currentRotY += p.velY;

      const diffX = p.targetRotX - p.currentRotX;
      p.velX = (p.velX + diffX * stiffness) * damping;
      p.currentRotX += p.velX;

      deskGroup.rotation.y = -0.22 + currentScrollProgress * 0.44;
      deskGroup.rotation.x = 0.22 + currentScrollProgress * 0.05;
      deskGroup.position.y = -1.82 + currentScrollProgress * 0.08;
      deskGroup.position.z = -0.1;

      const isNarrow = camera.aspect < 1;
      const baseCamZ = isNarrow ? 12.8 : 9.3;
      const baseCamY = isNarrow ? 0.85 : 0.65;
      camera.position.z = baseCamZ - currentScrollProgress * 0.6;
      camera.position.y = baseCamY + currentScrollProgress * 0.15;
      camera.lookAt(0, -0.32 + currentScrollProgress * 0.12, 0);

      const hoverY = Math.sin(elapsed * 1.3) * 0.03;
      folioGroup.position.y = 0.26 + hoverY + currentScrollProgress * 0.18 + p.liftImpulse;
      folioGroup.rotation.y = p.currentRotY;
      folioGroup.rotation.x = p.currentRotX;

      p.liftImpulse *= 0.88;

      sheet1.rotation.y = -0.25 - currentScrollProgress * 0.35;
      sheet1.position.x = -1.45 - currentScrollProgress * 0.28;

      sheet2.rotation.y = 0.12 + currentScrollProgress * 0.32;
      sheet2.position.x = -1.25 + currentScrollProgress * 0.22;

      penGroup.rotation.y = 0.15 + currentScrollProgress * Math.PI * 1.2;
      penGroup.position.x = 1.55 + currentScrollProgress * 0.2;

      renderer.render(scene, camera);
    };

    const startLoop = () => {
      if (isRunning) return;
      if (!isIntersecting || !isDocVisible) return;
      isRunning = true;
      clock.start();
      animate();
    };

    const stopLoop = () => {
      if (!isRunning) return;
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      clock.stop();
    };

    // Instruction 13: IntersectionObserver on container
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && isDocVisible) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // Instruction 13: document visibilityState listener
    const handleVisibilityChange = () => {
      isDocVisible = document.visibilityState === "visible";
      if (isIntersecting && isDocVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    startLoop();

    // 10. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(getTargetPixelRatio());
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. Theme Change Observer
    const themeObserver = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      keyLight.intensity = isDark ? 2.5 : 1.95;
      const base = isDark
        ? basePaperCanvasRef.current?.dark
        : basePaperCanvasRef.current?.light;
      if (!base) return;

      coverMat.color.setHex(isDark ? 0x1e2023 : 0x2b2e32);
      deskBoardMat.color.setHex(isDark ? 0x1b1c1e : 0x242629);
      blotterMat.color.setHex(isDark ? 0x141517 : 0x1b1c1e);
      walnutMat.color.setHex(isDark ? 0x222427 : 0x2a2d31);
      shadowPlaneMat.opacity = isDark ? 0.35 : 0.2;

      for (const subj of TACTILE_SUBJECTS) {
        const ft = texturesMapRef.current[`${subj.id}-front`];
        const bt = texturesMapRef.current[`${subj.id}-back`];
        if (ft?.image) {
          renderSubjectFaceCanvas(ft.image, base, subj, true, isDark);
          ft.needsUpdate = true;
        }
        if (bt?.image) {
          renderSubjectFaceCanvas(bt.image, base, subj, false, isDark);
          bt.needsUpdate = true;
        }
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Cleanup
    return () => {
      stopLoop();
      glDom.removeEventListener("webglcontextlost", handleContextLost);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();

      if (idleHandle !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      coverGeom.dispose();
      paperEdgeGeom.dispose();
      frontPaperGeom.dispose();
      backPaperGeom.dispose();
      grommetGeom.dispose();
      ringGeom.dispose();
      folioClipGeom.dispose();

      deskBoardGeom.dispose();
      blotterGeom.dispose();
      shadowPlaneGeom.dispose();
      plinthGeom.dispose();
      sheetGeom.dispose();

      nibGeom.dispose();
      gripGeom.dispose();
      barrelGeom.dispose();
      bandGeom.dispose();
      clipGeom.dispose();
      finialGeom.dispose();

      coverMat.dispose();
      paperEdgeMat.dispose();
      frontPaperMat.dispose();
      backPaperMat.dispose();
      brassMat.dispose();
      deskBoardMat.dispose();
      blotterMat.dispose();
      shadowPlaneMat.dispose();
      walnutMat.dispose();
      sheetMat.dispose();

      sharedNormalMap.dispose();
      sharedRoughnessMap.dispose();
      worksheetTex.dispose();
      Object.values(texturesMap).forEach((tex) => tex.dispose());

      pmremGenerator.dispose();
      roomEnv.dispose();
      envMap.dispose();
      renderer.dispose();
    };
  }, [getOrCreateSubjectTexture, forceFallback, webGlSupported]);

  // Pointer interactions: Rotate ONLY when dragged, non-interfering with mobile page scroll
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = physicsRef.current;
    const isTouch = e.pointerType === "touch";
    p.isDragging = true;
    p.isTouch = isTouch;
    p.hasCaptured = false;
    p.dragStartX = e.clientX;
    p.dragStartY = e.clientY;
    p.dragStartRotY = p.currentRotY;
    p.dragStartRotX = p.currentRotX;
    p.dragStartOffsetY = p.userOffsetY;
    p.dragStartOffsetX = p.userOffsetX;

    const container = mountRef.current;
    p.containerWidth = container?.clientWidth || 340;
    p.containerHeight = container?.clientHeight || 480;

    // For mouse, immediately capture pointer for responsive rotation
    if (!isTouch) {
      p.hasCaptured = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // In case pointer capture is not supported
      }
    }
    // For touch, defer pointer capture so vertical scrolling is not blocked
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physicsRef.current;
    if (!p.isDragging) return;

    const deltaX = e.clientX - p.dragStartX;
    const deltaY = e.clientY - p.dragStartY;

    if (p.isTouch && !p.hasCaptured) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Dominant vertical movement: let page scroll vertically, cancel card drag
      if (absY > absX && absY > 8) {
        p.isDragging = false;
        return;
      }

      // Dominant horizontal movement: user is intentionally rotating the card
      if (absX > 8) {
        p.hasCaptured = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      } else {
        return;
      }
    }

    const width = p.containerWidth || 340;
    const height = p.containerHeight || 480;

    const rotDeltaY = (deltaX / width) * Math.PI;
    const rotDeltaX = p.isTouch ? 0 : -(deltaY / height) * 0.44;

    p.userOffsetY = p.dragStartOffsetY + rotDeltaY;
    p.userOffsetX = Math.max(-0.32, Math.min(0.32, p.dragStartOffsetX + rotDeltaX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physicsRef.current;
    p.isDragging = false;
    p.hasCaptured = false;
    p.isTouch = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physicsRef.current;
    p.isDragging = false;
    p.hasCaptured = false;
    p.isTouch = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const handleLostPointerCapture = () => {
    const p = physicsRef.current;
    p.isDragging = false;
    p.hasCaptured = false;
    p.isTouch = false;
  };

  // Fallback 2D card view if WebGL is unavailable or forced
  if (!webGlSupported || forceFallback) {
    const activeSubj =
      TACTILE_SUBJECTS.find((s) => s.id === activeSubjectId) || TACTILE_SUBJECTS[0];
    return (
      <div
        className={cx(
          "flex flex-col items-center w-full select-none gap-2 sm:gap-3 max-w-full sm:max-w-[440px] lg:max-w-[480px] mx-auto",
          className
        )}
      >
        {/* Subject switcher pill bar */}
        <div className="flex justify-center px-1.5 sm:px-4 w-full pt-1.5 sm:pt-0">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 p-1 rounded-full bg-background-primary-default/90 backdrop-blur-md border border-border-button-default shadow-xs max-w-full overflow-x-auto scrollbar-none">
            {TACTILE_SUBJECTS.map((subj) => {
              const isActive = subj.id === activeSubjectId;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => handleSelectSubject(subj.id)}
                  className={cx(
                    "px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-caption-2-medium sm:text-caption-1-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring flex items-center gap-1.5 shrink-0",
                    isActive
                      ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-medium shadow-xs"
                      : "border border-transparent text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
                  )}
                >
                  <span
                    className={cx(
                      "size-1.5 rounded-full",
                      isActive ? "bg-text-primary" : "bg-text-tertiary"
                    )}
                    aria-hidden="true"
                  />
                  <span>{subj.pillLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fallback 2D Graph Card */}
        <TactileFallbackCard
          subject={activeSubj}
          isDark={isDarkState}
          isFlipped={isFlippedFallback}
          onToggleFlip={() => {
            soundEffects.playClick();
            setIsFlippedFallback((prev) => !prev);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cx(
        "flex flex-col items-center w-full select-none gap-2 sm:gap-3 max-w-full sm:max-w-none mx-auto",
        className
      )}
    >
      {/* Subject switcher pill bar */}
      <div className="flex justify-center px-1.5 sm:px-4 w-full pt-1.5 sm:pt-0">
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 p-1 rounded-full bg-background-primary-default/90 backdrop-blur-md border border-border-button-default shadow-xs max-w-full overflow-x-auto scrollbar-none">
          {TACTILE_SUBJECTS.map((subj) => {
            const isActive = subj.id === activeSubjectId;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSelectSubject(subj.id)}
                className={cx(
                  "px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-caption-2-medium sm:text-caption-1-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring flex items-center gap-1.5 shrink-0",
                  isActive
                    ? "bg-background-tertiary-default text-text-primary border border-border-button-default font-medium shadow-xs"
                    : "border border-transparent text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
                )}
              >
                <span
                  className={cx(
                    "size-1.5 rounded-full",
                    isActive ? "bg-text-primary" : "bg-text-tertiary"
                  )}
                  aria-hidden="true"
                />
                <span>{subj.pillLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D WebGL Stage */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        role="img"
        aria-label="Artifak 3d interaktif kurikulum"
        className="relative w-full max-w-full sm:max-w-none h-[440px] sm:h-[540px] cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-pan-y outline-none mx-auto"
      />
    </div>
  );
}
