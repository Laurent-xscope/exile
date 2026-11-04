import React from "react";
import { useTheme } from "./ui";

/** Phone frame. Children render inside the screen area (absolute, full size). */
export const PhoneMockup: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 380,
}) => {
  const t = useTheme();
  const height = Math.round(width * 2.05);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.14,
        background: t.ink,
        padding: 12,
        boxShadow: "0 40px 80px rgba(7,42,43,0.35), inset 0 0 0 2px rgba(255,255,255,0.08)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: width * 0.14 - 12,
          background: t.paper,
          overflow: "hidden",
        }}
      >
        {children}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            marginLeft: -48,
            width: 96,
            height: 26,
            borderRadius: 20,
            background: t.ink,
          }}
        />
      </div>
    </div>
  );
};
