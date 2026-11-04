/* Director v2 — REBUILT FROM ZERO.
 *
 * ONE continuous camera across five acts (see camera.tsx); acts swap
 * underneath it mid-move so every cut lands while the lens is flying.
 * The ambient field stays outside the transform → 2.5D parallax.
 * The loop exits through black and act one rises from black: no seam.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ACT, CamLayer } from "./camera";
import { Ambient, Vignette, Grain } from "./ambient";
import { EZ, clamp01 } from "./motion";
import { ActHook } from "./acts/act-hook";
import { ActPaste } from "./acts/act-paste";
import { ActLive } from "./acts/act-live";
import { ActRadar } from "./acts/act-radar";
import { ActOutro } from "./acts/act-outro";

export const SHEET = {
  fps: 30,
  width: 1280,
  height: 720,
  durationInFrames: 870,
} as const;

const ACT_SCENES = [ActHook, ActPaste, ActLive, ActRadar, ActOutro];

/* act layers overlap ±8f so cuts blend for a beat while the camera moves */
const BLEED = 8;

function ActLayer({ frame, idx }: { frame: number; idx: number }): React.JSX.Element | null {
  const act = ACT[idx];
  const Scene = ACT_SCENES[idx];
  const from = act.start - (idx === 0 ? 0 : BLEED);
  const to = act.end + BLEED;
  if (frame < from || frame > to) return null;

  const local = Math.min(Math.max(frame - act.start, 0), act.end - act.start);
  let opacity = 1;
  if (idx > 0 && frame < act.start) {
    opacity = EZ.outCubic(clamp01((frame - from) / BLEED));
  } else if (idx < ACT.length - 1 && frame > act.end) {
    opacity = 1 - EZ.inQuad(clamp01((frame - act.end) / BLEED));
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Scene local={local} />
    </div>
  );
}

/* a light kiss of white + an expanding ring at every act boundary — the beat */
function CutFlash({ frame, at }: { frame: number; at: number }): React.JSX.Element | null {
  const a = frame - at;
  if (a < 0 || a > 16) return null;
  const o = (a < 3 ? a / 3 : 1 - (a - 3) / 13) * 0.14;
  const r = 60 + 690 * EZ.outCubic(clamp01(a / 14));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(214,230,255,${o.toFixed(3)})` }} />
      <div
        style={{
          position: "absolute",
          left: 640 - r,
          top: 360 - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `1.5px solid rgba(158,196,255,${(0.22 * (1 - clamp01(a / 14))).toFixed(3)})`,
        }}
      />
    </div>
  );
}

/* the loop seam: dip through black at the tail of the timeline, recede at f0 */
function LoopDip({ frame }: { frame: number }): React.JSX.Element {
  const dipStart = 846;
  let o = 0;
  if (frame >= dipStart) o = EZ.inQuad(clamp01((frame - dipStart) / (870 - 2 - dipStart)));
  if (frame < 12) o = Math.max(o, 1 - EZ.outCubic(clamp01(frame / 12)));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#020408",
        opacity: o,
        pointerEvents: "none",
      }}
    />
  );
}

export function ExileVideoComposition(): React.JSX.Element {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#070B12", overflow: "hidden", fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif', color: "#E9EFFA" }}>
      <Ambient frame={frame} />
      <CamLayer>
        {ACT_SCENES.map((s, i) => (
          <ActLayer key={i} frame={frame} idx={i} />
        ))}
      </CamLayer>
      {[126, 336, 516, 678].map((at) => (
        <CutFlash key={at} frame={frame} at={at} />
      ))}
      <Vignette />
      <Grain frame={frame} />
      <LoopDip frame={frame} />
    </AbsoluteFill>
  );
}
