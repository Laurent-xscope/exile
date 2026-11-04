/* Ambient field — the 2.5D ground the slabs float over.
 *
 * Lives OUTSIDE the camera transform: while the camera dollies through acts,
 * this field only breathes, so background and foreground move at different
 * rates. Palette is act-aware and cross-blends at act boundaries. Vignette and
 * film grain render as overlays ABOVE the acts (filmic, one hue per whole frame).
 */
import React from "react";
import { ACT } from "./camera";
import { EZ, clamp01, mix, rand01 } from "./motion";

type ActColor = { a: string; b: string; c: string };

/* one palette per act — the frame's temperature shifts with the story beat */
const PALETTES: ActColor[] = [
  { a: "#12233F", b: "#1B1533", c: "#0B2C3D" }, // hook — deep royal + teal ember
  { a: "#0F2140", b: "#161B36", c: "#123B44" }, // paste — studio indigo
  { a: "#26200F", b: "#0F2140", c: "#0A2A38" }, // live — warm bloom over blue
  { a: "#241132", b: "#101B3A", c: "#1E1030" }, // radar — violet watch
  { a: "#0E2036", b: "#25152B", c: "#143A46" }, // outro — calm mix
];

function actMix(f: number): { i: number; j: number; t: number } {
  for (let k = ACT.length - 1; k >= 0; k--) {
    if (f >= ACT[k].start) {
      const inLen = 10; // blend into the next palette over its first frames
      if (k < ACT.length - 1 && f > ACT[k + 1].start - inLen && f <= ACT[k + 1].start) {
        return { i: k, j: k + 1, t: EZ.settle(clamp01((f - (ACT[k + 1].start - inLen)) / inLen)) };
      }
      return { i: k, j: k, t: 0 };
    }
  }
  return { i: 0, j: 0, t: 0 };
}

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];
const blendHex = (p: string, q: string, t: number): string => {
  const A = hex(p);
  const B = hex(q);
  const v = A.map((x, i) => Math.round(mix(x, B[i], t)));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
};

type Blob = { seed: number; w: number; h: number; cx: number; cy: number; orb: number; sp: number };
const BLOBS: Blob[] = [
  { seed: 1, w: 900, h: 700, cx: 240, cy: 140, orb: 70, sp: 0.008 },
  { seed: 2, w: 760, h: 720, cx: 1020, cy: 180, orb: 55, sp: 0.011 },
  { seed: 3, w: 900, h: 800, cx: 680, cy: 640, orb: 90, sp: 0.006 },
  { seed: 4, w: 520, h: 480, cx: 1160, cy: 560, orb: 48, sp: 0.014 },
];

export function paletteAt(f: number): ActColor {
  const { i, j, t } = actMix(f);
  return {
    a: blendHex(PALETTES[i].a, PALETTES[j].a, t),
    b: blendHex(PALETTES[i].b, PALETTES[j].b, t),
    c: blendHex(PALETTES[i].c, PALETTES[j].c, t),
  };
}

export function Ambient({ frame }: { frame: number }): React.JSX.Element {
  const pal = paletteAt(frame);
  /* whole field breathes once per ~18s so the loop seam can't be felt here */
  const breathe = 1 + 0.004 * Math.sin(frame * 0.054);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#070B12", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -80,
          background: `radial-gradient(120% 90% at 30% 8%, ${pal.a} 0%, rgba(7,11,18,0) 62%),
                       radial-gradient(110% 90% at 82% 20%, ${pal.b} 0%, rgba(7,11,18,0) 58%),
                       radial-gradient(120% 110% at 50% 108%, ${pal.c} 0%, rgba(7,11,18,0) 60%)`,
        }}
      />
      {BLOBS.map((bl, k) => {
          const p = [pal.a, pal.b, pal.c, pal.a][k];
        const ang = frame * bl.sp + bl.seed * 2.4;
        const x = bl.cx + Math.cos(ang) * bl.orb;
        const y = bl.cy + Math.sin(ang * 0.83 + bl.seed) * bl.orb * 0.8;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x - bl.w / 2,
              top: y - bl.h / 2,
              width: bl.w,
              height: bl.h,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${blendHex(p, "#070B12", 0.55)} 0%, rgba(7,11,18,0) 70%)`,
              filter: "blur(52px)",
              opacity: 0.5 + 0.14 * Math.sin(frame * 0.02 + bl.seed * 5),
            }}
          />
        );
      })}
      {/* drifting dot grid — two counter-moving layers, depth you can feel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(159,181,214,0.10) 1px, transparent 1.4px)",
          backgroundSize: "28px 28px",
          backgroundPosition: `${(frame * 0.45) % 28}px ${(frame * 0.22) % 28}px`,
          opacity: 0.5,
          maskImage: "radial-gradient(120% 100% at 50% 40%, black 30%, transparent 92%)",
          WebkitMaskImage: "radial-gradient(120% 100% at 50% 40%, black 30%, transparent 92%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(159,181,214,0.05) 1.2px, transparent 1.6px)",
          backgroundSize: "64px 64px",
          backgroundPosition: `${(-frame * 0.18) % 64}px ${(frame * 0.13) % 64}px`,
          opacity: 0.45,
          maskImage: "radial-gradient(130% 110% at 60% 70%, black 20%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(130% 110% at 60% 70%, black 20%, transparent 90%)",
        }}
      />
      {/* one light beam sweeps the field roughly every seven seconds */}
      <Beam frame={frame} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${breathe})` }} />
    </div>
  );
}

function Beam({ frame }: { frame: number }): React.JSX.Element | null {
  const P = 210; // sweep period
  const phase = frame % P;
  const t = EZ.inOutQuart(clamp01(phase / P));
  const x = mix(-700, 2100, t);
  const peak = Math.sin(Math.PI * t);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 300,
        top: -220,
        width: 600,
        height: 1200,
        transform: "rotate(19deg)",
        background: "linear-gradient(90deg, rgba(146,190,255,0) 0%, rgba(146,190,255,0.055) 45%, rgba(120,225,255,0.075) 55%, rgba(146,190,255,0) 100%)",
        opacity: peak * 0.85,
        filter: "blur(30px)",
      }}
    />
  );
}

/* ─────────────────── overlays (above the acts, filmic) ─────────────────── */

export function Vignette(): React.JSX.Element {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(135% 115% at 50% 46%, rgba(2,4,9,0) 52%, rgba(2,4,9,0.38) 88%, rgba(2,4,9,0.62) 100%)",
      }}
    />
  );
}

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const GRAIN_STEP = 14; // px jiggle of the grain plate — hand-move, not slide
export function Grain({ frame }: { frame: number }): React.JSX.Element {
  const gx = -Math.floor(rand01(frame) * GRAIN_STEP);
  const gy = -Math.floor(rand01(frame + 57) * GRAIN_STEP);
  return (
    <div
      style={{
        position: "absolute",
        inset: -40,
        pointerEvents: "none",
        opacity: 0.065,
        backgroundImage: GRAIN_URL,
        backgroundRepeat: "repeat",
        transform: `translate(${gx}px, ${gy}px)`,
      }}
    />
  );
}
