import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { body, SPRING_SOFT, useTheme } from "./ui";

export type BarDatum = { label: string; value: number; highlight?: boolean };

/** Horizontal bar chart. Bars grow with spring(), staggered by 6 frames. */
export const BarChart: React.FC<{
  data: readonly BarDatum[];
  delay?: number;
  width?: number;
  rowHeight?: number;
  labelWidth?: number;
  fontSize?: number;
  tone?: "light" | "dark";
}> = ({ data, delay = 0, width = 1100, rowHeight = 78, labelWidth = 420, fontSize = 30, tone = "light" }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = tone === "light" ? t.ink : t.cream;
  const track = tone === "light" ? "rgba(20,40,42,0.09)" : "rgba(247,241,227,0.14)";
  const barMax = width - labelWidth - 110;
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 0 }}>
      {data.map((d, i) => {
        const s = spring({ frame: frame - delay - i * 6, fps, config: SPRING_SOFT });
        const value = Math.round(d.value * s);
        const hot = !!d.highlight;
        return (
          <div
            key={d.label}
            style={{
              height: rowHeight,
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            <div style={{ ...body(fontSize, text, hot ? 700 : 600), width: labelWidth }}>{d.label}</div>
            <div style={{ width: barMax, height: 30, borderRadius: 15, background: track, overflow: "hidden" }}>
              <div
                style={{
                  width: `${d.value * s}%`,
                  height: "100%",
                  borderRadius: 15,
                  background: hot ? t.gold : t.teal,
                }}
              />
            </div>
            <div style={{ ...body(fontSize, hot ? t.danger : text, 700), width: 90, textAlign: "right" }}>
              {value}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
