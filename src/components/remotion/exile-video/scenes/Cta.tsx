import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  COPY,
  CTA_BRAND_COLOR,
  CTA_DOT_COLOR,
  CTA_TAGLINE_COLOR,
  CTA_URL_BG,
  CTA_URL_BORDER,
  CTA_URL_COLOR,
  WHITE,
} from "../constants";
import { inter, mono } from "../ui";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const CtaScene: React.FC<{ tagline?: string; url?: string }> = ({
  tagline = COPY.cta.tagline,
  url = COPY.cta.url,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 120, mass: 0.8 } });
  const taglineSpring = spring({ frame: frame - 16, fps, config: { damping: 18, stiffness: 120, mass: 0.8 } });
  const urlSpring = spring({ frame: frame - 26, fps, config: { damping: 18, stiffness: 120, mass: 0.8 } });

  const logoEnter = clamp01(logoSpring);
  const taglineEnter = clamp01(taglineSpring);
  const urlEnter = clamp01(urlSpring);

  return (
    <AbsoluteFill
      style={{
        background: WHITE,
        alignItems: "center",
        justifyContent: "center",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Centered Exile logo & wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          opacity: logoEnter,
          transform: `translateY(${(1 - logoEnter) * 22}px) scale(${0.96 + 0.04 * logoEnter})`,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: WHITE,
          }}
        >
          <Img
            src={staticFile("logo.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div
          style={{
            ...inter(84, CTA_BRAND_COLOR, 700),
            letterSpacing: "-0.035em",
            lineHeight: 1,
          }}
        >
          {COPY.cta.brand}
        </div>
      </div>

      {/* Debut tagline in Inter */}
      <div
        style={{
          ...inter(32, CTA_TAGLINE_COLOR, 500),
          letterSpacing: "-0.015em",
          marginTop: 34,
          opacity: taglineEnter,
          transform: `translateY(${(1 - taglineEnter) * 18}px)`,
          textAlign: "center",
        }}
      >
        {tagline}
      </div>

      {/* Small mono URL caption in JetBrains Mono */}
      <div
        style={{
          ...mono(20, CTA_URL_COLOR, 500),
          marginTop: 38,
          padding: "10px 24px",
          borderRadius: 999,
          background: CTA_URL_BG,
          border: `1px solid ${CTA_URL_BORDER}`,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
          opacity: urlEnter,
          transform: `translateY(${(1 - urlEnter) * 16}px)`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: CTA_DOT_COLOR }} />
        <span>{url}</span>
      </div>
    </AbsoluteFill>
  );
};
