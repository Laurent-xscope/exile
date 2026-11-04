/* One continuous dolly across the whole film.
 *
 * Acts never own the camera — the program below does. Cuts between acts land
 * MID-MOVE (cut on motion), which is what stops the film from reading as
 * slides: the camera keeps flying while the content swaps underneath it.
 * The ambient field sits OUTSIDE this transform, so background vs slabs
 * parallax like a 2.5D diorama.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { EZ, clamp01, mix, wob } from "./motion";

export type CamKey = {
  f: number; // frame of the key
  s: number; // zoom scale
  x: number; // stage-x in focus
  y: number; // stage-y in focus
  e?: (t: number) => number; // ease INTO this key from the previous key
};

/* act windows (frames); ambient + director both read this */
export const ACT = [
  { id: "hook", start: 0, end: 126 },
  { id: "paste", start: 126, end: 336 },
  { id: "live", start: 336, end: 516 },
  { id: "radar", start: 516, end: 678 },
  { id: "outro", start: 678, end: 870 },
] as const;

/* the program — read it as the shot list:
 * A1 raise + slow push, punch INTO the studio panel at the cut,
 * per-panel settle, pan to the fanned cards, close-up,
 * long cross-flight onto the PIN digits (A3), pull wide,
 * drift hold, push onto the vote bars,
 * land on the radar polygon (A4), settle, push into the flagged chip,
 * pull back over the remedial steps (A5), and mega-pull-back for the wordmark.
 */
export const CAM: CamKey[] = [
  { f: 0, s: 0.99, x: 640, y: 336 },
  { f: 12, s: 1.07, x: 640, y: 348, e: EZ.settle },
  { f: 70, s: 1.13, x: 648, y: 356, e: EZ.settle },
  { f: 116, s: 1.2, x: 652, y: 352, e: EZ.settle },
  { f: 128, s: 1.56, x: 860, y: 268, e: EZ.push },
  { f: 166, s: 1.12, x: 758, y: 380, e: EZ.settle },
  { f: 210, s: 1.04, x: 646, y: 368, e: EZ.settle },
  { f: 252, s: 1.32, x: 848, y: 452, e: EZ.settle },
  { f: 298, s: 1.62, x: 864, y: 470, e: EZ.push },
  { f: 338, s: 1.88, x: 244, y: 246, e: EZ.push },
  { f: 376, s: 1.05, x: 656, y: 370, e: EZ.settle },
  { f: 424, s: 1.0, x: 640, y: 362, e: EZ.settle },
  { f: 468, s: 1.36, x: 880, y: 558, e: EZ.push },
  { f: 512, s: 1.52, x: 902, y: 568, e: EZ.push },
  { f: 520, s: 1.5, x: 666, y: 380, e: EZ.push },
  { f: 558, s: 1.08, x: 640, y: 368, e: EZ.settle },
  { f: 602, s: 1.42, x: 1008, y: 262, e: EZ.push },
  { f: 672, s: 1.6, x: 1030, y: 272, e: EZ.push },
  { f: 682, s: 1.48, x: 520, y: 396, e: EZ.push },
  { f: 718, s: 0.97, x: 640, y: 362, e: EZ.settle },
  { f: 762, s: 0.9, x: 640, y: 356, e: EZ.settle },
  { f: 845, s: 0.92, x: 640, y: 360, e: EZ.settle },
];

export type CamPose = { s: number; x: number; y: number };

export function cameraAt(f: number): CamPose {
  let i = 0;
  while (i < CAM.length - 2 && f >= CAM[i + 1].f) i++;
  const a = CAM[i];
  const b = CAM[Math.min(i + 1, CAM.length - 1)];
  const span = Math.max(1, b.f - a.f);
  const raw = clamp01((f - a.f) / span);
  const t = (b.e ?? EZ.settle)(raw);
  const breathe = Math.sin(f * 0.11);
  return {
    s: mix(a.s, b.s, t) + 0.0022 * breathe,
    x: mix(a.x, b.x, t) + wob(f, 2, 0.9),
    y: mix(a.y, b.y, t) + wob(f, 5, 0.7),
  };
}

export function CamLayer({ children }: { children: React.ReactNode }): React.JSX.Element {
  const frame = useCurrentFrame();
  const { s, x, y } = cameraAt(frame);
  return (
    <div
      style={{
        position: "absolute",
        width: 1280,
        height: 720,
        top: 0,
        left: 0,
        transform: `translate(${640 - x}px, ${360 - y}px) scale(${s})`,
        transformOrigin: `${x}px ${y}px`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}
