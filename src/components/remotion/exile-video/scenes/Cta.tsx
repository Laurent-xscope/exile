import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { COPY } from "../constants";
import {
  DiamondField,
  FadeInText,
  PatraDivider,
  SlowZoom,
  body,
  display,
  ramp,
  useEnter,
  useTheme,
} from "../ui";

export const CtaScene: React.FC<{ tagline: string; url: string }> = ({ tagline, url }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mark = useEnter(4, { damping: 12, stiffness: 120, mass: 0.9 });
  const urlIn = useEnter(70, { damping: 16, stiffness: 140, mass: 0.8 });
  const out = ramp(frame, durationInFrames - 40, durationInFrames - 6, 1, 0, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 50% 45%, ${t.teal}, ${t.tealDeep})` }}>
      <DiamondField color={t.gold} opacity={0.1} />
      <SlowZoom to={1.04}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${0.8 + 0.2 * mark})`, opacity: mark }}>
            <svg width={150} height={150} viewBox="-50 -50 100 100">
              <path d="M0 -46 L46 0 L0 46 L-46 0Z" fill={t.gold} />
              <path d="M0 -30 L30 0 L0 30 L-30 0Z" fill={t.teal} />
              <circle r={9} fill={t.gold} />
            </svg>
            <div style={{ ...display(190, t.cream) }}>{COPY.cta.brand}</div>
          </div>
          <div style={{ marginTop: 40 }}>
            <PatraDivider width={620} color={t.gold} progress={ramp(frame, 26, 70)} />
          </div>
          <FadeInText
            text={tagline}
            byWord
            delay={44}
            stagger={5}
            size={60}
            font="body"
            weight={600}
            color={t.cream}
            style={{ marginTop: 40, maxWidth: 1500 }}
          />
          <div
            style={{
              ...body(54, t.ink, 700),
              marginTop: 54,
              padding: "20px 56px",
              borderRadius: 999,
              background: t.gold,
              opacity: urlIn,
              transform: `translateY(${(1 - urlIn) * 40}px) scale(${0.9 + 0.1 * urlIn})`,
            }}
          >
            {url}
          </div>
        </AbsoluteFill>
      </SlowZoom>
    </AbsoluteFill>
  );
};
