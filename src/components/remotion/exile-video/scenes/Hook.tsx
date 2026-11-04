import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import { Caption, DiamondField, FadeInText, PatraDivider, SlowZoom, ramp, useTheme } from "../ui";

export const HookScene: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(1200px 800px at 50% 40%, ${t.teal}, ${t.tealDeep})` }}
    >
      <DiamondField color={t.gold} opacity={0.1} />
      <SlowZoom to={1.04}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <FadeInText text={COPY.hook.line1} byWord delay={2} size={112} color={t.cream} />
          <FadeInText
            text={COPY.hook.line2}
            byWord
            delay={26}
            size={112}
            color={t.cream}
            highlightFrom={1}
            highlightColor={t.gold}
            style={{ marginTop: 6 }}
          />
          <div style={{ marginTop: 52 }}>
            <PatraDivider width={560} color={t.gold} progress={ramp(frame, 44, 90)} />
          </div>
        </AbsoluteFill>
      </SlowZoom>
      <Caption text={COPY.hook.caption} delay={62} />
    </AbsoluteFill>
  );
};
