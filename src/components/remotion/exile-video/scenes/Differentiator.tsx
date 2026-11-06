import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import { BarChart } from "../BarChart";
import {
  Caption,
  FadeInText,
  PatraDivider,
  SlowZoom,
  SPRING_SOFT,
  body,
  display,
  ramp,
  useEnter,
  useTheme,
} from "../ui";

export const DifferentiatorScene: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const chart = useEnter(14, SPRING_SOFT);
  const advice = useEnter(150, { damping: 16, stiffness: 120, mass: 0.9 });
  const sweep = ramp(frame, 120, 150, 0, 1, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${t.teal}, ${t.tealDeep})` }}>
      <SlowZoom to={1.045} origin="50% 40%">
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <FadeInText text={COPY.differentiator.title} delay={2} size={72} color={t.cream} />
            <PatraDivider width={420} color={t.gold} progress={ramp(frame, 10, 50)} />
          </div>

          <div
            style={{
              position: "absolute",
              left: 260,
              top: 250,
              width: 1400,
              borderRadius: 30,
              background: t.paper,
              padding: "34px 54px 24px",
              boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
              opacity: chart,
              transform: `translateY(${(1 - chart) * 60}px)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <div
                style={{
                  ...body(24, t.muted, 700),
                  padding: "6px 18px",
                  borderRadius: 999,
                  border: `2px dashed ${t.muted}`,
                }}
              >
                {COPY.differentiator.sample}
              </div>
            </div>
            <BarChart data={COPY.differentiator.rows} delay={28} width={1292} labelWidth={520} rowHeight={74} fontSize={32} />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: "100%",
                borderRadius: 30,
                background: `linear-gradient(100deg, transparent ${sweep * 140 - 30}%, rgba(227,169,58,0.0) ${sweep * 140}%)`,
                pointerEvents: "none",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: 360,
              top: 700,
              width: 1200,
              borderRadius: 26,
              background: t.gold,
              padding: "22px 40px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
              opacity: Math.min(1, advice * 2),
              transform: `translateY(${(1 - advice) * 140}px) scale(${0.92 + 0.08 * advice})`,
            }}
          >
            <div style={{ ...body(24, t.ink, 700), letterSpacing: "0.04em", opacity: 0.75 }}>
              {COPY.differentiator.adviceTag}
            </div>
            <div style={{ ...display(46, t.ink) }}>{COPY.differentiator.adviceTitle}</div>
            <div style={{ ...body(30, t.ink, 600) }}>{COPY.differentiator.adviceBody}</div>
          </div>
        </AbsoluteFill>
      </SlowZoom>
      <Caption text={COPY.differentiator.caption} delay={190} />
    </AbsoluteFill>
  );
};
