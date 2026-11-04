import React from "react";
import { body, useTheme } from "./ui";

/** Projector screen: ceiling bar, bezel, 16:9 content area and a soft light cone. */
export const ProjectorMockup: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 1060,
}) => {
  const t = useTheme();
  const height = Math.round((width * 9) / 16);
  return (
    <div style={{ width, position: "relative" }}>
      <div
        style={{
          width,
          height,
          borderRadius: 22,
          background: t.ink,
          padding: 14,
          boxShadow: "0 40px 90px rgba(7,42,43,0.35)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 12,
            overflow: "hidden",
            background: t.tealDeep,
          }}
        >
          {children}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        <div
          style={{
            ...body(24, t.muted, 600),
            padding: "6px 22px",
            borderRadius: 999,
            background: "rgba(20,40,42,0.08)",
          }}
        >
          Layar proyektor kelas
        </div>
      </div>
    </div>
  );
};
