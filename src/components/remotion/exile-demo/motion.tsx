/* Motion kit v2 — rebuilt from zero for the Exile demo.
 *
 * All animation is pure frame math (no CSS transitions / CSS keyframes) so
 * every frame renders deterministically, both in the Player and headless.
 * Two layers of craft live here:
 *   1. physical entrances (remotion springs, real overshoot)
 *   2. a hand-noise cursor whose paths never repeat (arcs vary per hop)
 */
import React from "react";
import { Easing, spring } from "remotion";

export const FPS = 30;

/* ─────────────────────────── easing set ─────────────────────────── */

export const EZ = {
  /** long cinematic decay — the default settle of anything landing */
  settle: Easing.bezier(0.19, 1, 0.29, 1),
  /** camera runs: accelerates, lands soft. cuts-on-motion use this */
  push: Easing.bezier(0.55, 0, 0.16, 1),
  /** hop with a visible overshoot, then snap */
  snap: Easing.bezier(0.34, 1.42, 0.64, 1),
  outCubic: Easing.out(Easing.cubic),
  outQuart: Easing.out(Easing.poly(4)),
  inCubic: Easing.in(Easing.cubic),
  inQuad: Easing.in(Easing.quad),
  inOutQuart: Easing.inOut(Easing.poly(4)),
} as const;

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** deterministic pseudo-random in [0, 1) — stable across renders */
export const rand01 = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** low-amplitude living noise — nothing in this video is ever perfectly still */
export const wob = (f: number, seed = 0, amp = 1.5) =>
  Math.sin(f * 0.31 + seed * 3.1) * amp + Math.sin(f * 0.137 + seed * 1.7) * amp * 0.55;

/** remotion spring helper (0 for f <= 0); config lumps tuning in one place */
export function sp(
  f: number,
  cfg: { damping?: number; stiffness?: number; mass?: number } = {},
): number {
  if (f <= 0) return 0;
  return spring({
    frame: f,
    fps: FPS,
    config: { damping: 15, stiffness: 160, mass: 0.95, ...cfg },
  });
}

/* ─────────────────────────── entrances ─────────────────────────── */

export type Dir = "up" | "down" | "left" | "right" | "scale" | "pop";

const distFor = (dir: Dir, rest: number): string | undefined => {
  switch (dir) {
    case "up":
      return `translateY(${rest}px)`;
    case "down":
      return `translateY(${-rest}px)`;
    case "left":
      return `translateX(${rest}px)`;
    case "right":
      return `translateX(${-rest}px)`;
    case "scale":
      return `scale(${mix(0.9, 1, 1 - rest / 26)})`; // rest acts as px offset
    case "pop":
      return `scale(${mix(0.72, 1, 1 - rest / 34)})`;
  }
};

/** exterior-style entrance: eased rise + fade, opacity finishes early */
export function enterStyle(
  f: number,
  spec: {
    delay?: number;
    dur?: number;
    dir?: Dir;
    dist?: number;
  } = {},
): React.CSSProperties {
  const { delay = 0, dur = 26, dir = "up", dist = 26 } = spec;
  if (f < delay) return { opacity: 0 };
  const t = EZ.outCubic(clamp01((f - delay) / dur));
  const rest = (1 - t) * dist;
  const transform = dir === "scale" ? `scale(${mix(0.9, 1, t)})` : dir === "pop" ? `scale(${mix(0.78, 1, t)})` : distFor(dir, rest);
  return { opacity: clamp01(t * 1.9), transform };
}

/** physical spring entrance (real overshoot). the default for "arrival" beats */
export function springStyle(
  f: number,
  spec: {
    delay?: number;
    dir?: Dir;
    dist?: number;
    damping?: number;
    stiffness?: number;
  } = {},
): React.CSSProperties {
  const { delay = 0, dir = "up", dist = 30, damping = 14, stiffness = 170 } = spec;
  const s = sp(f - delay, { damping, stiffness });
  if (f < delay) return { opacity: 0 };
  const rest = (1 - s) * dist;
  const transform = distFor(dir, rest);
  return { opacity: clamp01(s * 1.7), transform };
}

/** raw eased ramp a→b over [at, at+dur] */
export function ramp(f: number, at: number, dur: number, a: number, b: number, e = EZ.outCubic): number {
  return a + (b - a) * e(clamp01((f - at) / dur));
}

/* ─────────────────────────── kinetic words ─────────────────────────── */

export type Tok = { t: string; accent?: boolean; soft?: boolean };

/**
 * Word-staggered headline. Each word rides its own spring, so a sentence
 * arrives like a wave instead of a block. `accent` words get the brand
 * gradient, `soft` words get the secondary ink.
 */
export function Words({
  f,
  at,
  toks,
  size,
  weight = 700,
  gap = "0.32em",
  per = 2.8,
  rise = 30,
  lh = 1.14,
}: {
  f: number;
  at: number;
  toks: Tok[];
  size: number;
  weight?: number;
  gap?: string;
  per?: number;
  rise?: number;
  lh?: number;
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: gap, alignItems: "baseline", lineHeight: lh }}>
      {toks.map((tk, i) => {
        const s = sp(f - at - i * per, { damping: 14, stiffness: 165 });
        const style: React.CSSProperties = {
          opacity: clamp01(s * 1.6),
          transform: `translateY(${(1 - s) * rise}px)`,
          color: tk.soft ? "#9AA7BF" : "#EDF2FC",
          fontWeight: weight,
        };
        if (tk.accent) {
          style.background = "linear-gradient(120deg, #6EA8FF 0%, #4FD4F5 100%)";
          style.WebkitBackgroundClip = "text";
          style.WebkitTextFillColor = "transparent";
          style.backgroundClip = "text";
        }
        return (
          <span key={i} style={{ fontSize: size, whiteSpace: "nowrap", ...style }}>
            {tk.t}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── cursor ─────────────────────────── */

export type Way = {
  f: number; // frame the cursor is exactly here
  x: number;
  y: number;
  e?: (t: number) => number; // easing INTO this way
  dwell?: number; // hover wander amplitude once arrived
  click?: boolean; // click fires on arrival
};

export type CursorPose = { x: number; y: number; scale: number; ripple: { r: number; o: number } | null };

/**
 * Cursor paths get a perpendicular bow unique to each hop (seeded by the hop
 * geometry) plus hand noise — no two moves look alike, no linear slides.
 */
export function cursorAt(ways: Way[], f: number): CursorPose {
  let ripple: { r: number; o: number } | null = null;
  let scale = 1;
  for (const w of ways) {
    if (!w.click) continue;
    const age = f - w.f;
    if (age >= 0 && age < 18) {
      ripple = {
        r: 6 + 48 * EZ.outCubic(age / 18),
        o: 0.75 * Math.pow(1 - age / 18, 1.35),
      };
    }
    if (age >= 0 && age < 7) scale = 0.84 + 0.16 * EZ.outCubic(age / 7);
  }
  if (ways.length === 0) return { x: -200, y: -200, scale, ripple };

  let i = 0;
  while (i < ways.length - 1 && f >= ways[i + 1].f) i++;
  const a = ways[i];
  const last = i === ways.length - 1;
  const b = last ? a : ways[i + 1];
  const span = Math.max(1, b.f - a.f);
  const raw = clamp01((f - a.f) / span);

  let px: number;
  let py: number;
  if (last || raw === 0) {
    const d = last ? (a.dwell ?? 5) : 0;
    px = a.x + wob(f, a.x * 0.05, d);
    py = a.y + wob(f, a.y * 0.05 + 40, d * 0.8);
  } else {
    const reach = (b.e ?? EZ.settle)(raw);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const arc = (Math.sin(i * 2.399 + a.x * 0.031 + a.y * 0.017) * 0.5 + 0.62) * Math.min(34, len * 0.16);
    px = a.x + dx * reach + (-dy / len) * arc * Math.sin(Math.PI * raw);
    py = a.y + dy * reach + (dx / len) * arc * Math.sin(Math.PI * raw);
  }
  return { x: px + wob(f, 11, 1.1), y: py + wob(f, 19, 0.9), scale, ripple };
}

export function Cursor({ pose }: { pose: CursorPose }): React.JSX.Element {
  return (
    <div style={{ position: "absolute", left: pose.x, top: pose.y, zIndex: 700, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: -64,
          top: -64,
          width: 128,
          height: 128,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(110,168,255,0.11) 0%, rgba(110,168,255,0) 68%)",
        }}
      />
      {pose.ripple ? (
        <div
          style={{
            position: "absolute",
            width: pose.ripple.r * 2,
            height: pose.ripple.r * 2,
            borderRadius: "50%",
            border: `2px solid rgba(110,168,255,${pose.ripple.o})`,
            background: `rgba(110,168,255,${pose.ripple.o * 0.16})`,
            transform: `translate(${-pose.ripple.r}px, ${-pose.ripple.r}px)`,
          }}
        />
      ) : null}
      <div
        style={{
          transform: `scale(${pose.scale})`,
          transformOrigin: "5px 3px",
          filter: "drop-shadow(0 5px 12px rgba(2,6,16,0.5))",
        }}
      >
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5.5 3.5L18.5 11.5L12.5 13L10 19.5L5.5 3.5Z"
            fill="#0B1424"
            stroke="#EAF2FF"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────── confetti burst ─────────────────────────── */

const BURST_C = ["#6EA8FF", "#4FD4F5", "#8EF0C1", "#FFD873", "#C7A6FF"];

/** small particle pop for join-in moments; deterministic via rand01 seeds */
export function Burst({
  f,
  at,
  x,
  y,
  count = 14,
  life = 40,
  speed = 5.2,
  seed = 7,
}: {
  f: number;
  at: number;
  x: number;
  y: number;
  count?: number;
  life?: number;
  speed?: number;
  seed?: number;
}): React.JSX.Element {
  if (f < at || f > at + life) return <></>;
  const bits = [];
  for (let i = 0; i < count; i++) {
    const age = f - at;
    const angle = rand01(seed + i * 17.3) * Math.PI * 2;
    const v = speed * (0.5 + rand01(seed + i * 7.7));
    const bx = x + Math.cos(angle) * v * age;
    const by = y + Math.sin(angle) * v * age - 0.9 + 0.09 * age * age;
    const t = age / life;
    const s = 3 + 4 * rand01(seed + 56 + i);
    bits.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: bx - s / 2,
          top: by - s / 2,
          width: s,
          height: s,
          borderRadius: "50%",
          backgroundColor: BURST_C[i % BURST_C.length],
          opacity: Math.pow(1 - t, 1.7),
        }}
      />,
    );
  }
  return <div style={{ position: "absolute", inset: 0, zIndex: 640, pointerEvents: "none" }}>{bits}</div>;
}

/* ─────────────────────────── counter ─────────────────────────── */

/** live counting number, tabular so digits don't jitter */
export function counterVal(f: number, at: number, dur: number, to: number, from = 0): string {
  const v = Math.round(ramp(f, at, dur, from, to, EZ.outQuart));
  return String(v);
}
