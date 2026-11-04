import React, { createContext, useContext } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY_FONT, DISPLAY_FONT } from "./fonts";

export type Theme = {
  teal: string;
  tealDeep: string;
  gold: string;
  cream: string;
  paper: string;
  ink: string;
  muted: string;
  danger: string;
  success: string;
};

export const makeTheme = (p: { teal: string; gold: string; cream: string }): Theme => ({
  ...p,
  tealDeep: `color-mix(in srgb, ${p.teal} 60%, #000)`,
  paper: "#FFFCF5",
  ink: "#14282A",
  muted: "#4F6361",
  danger: "#C4513A",
  success: "#2F8F6B",
});

const ThemeContext = createContext<Theme | null>(null);
export const ThemeProvider = ThemeContext.Provider;
export const useTheme = (): Theme => {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("ThemeProvider missing");
  return t;
};

export const SPRING_POP = { damping: 15, stiffness: 150, mass: 0.8 };
export const SPRING_SOFT = { damping: 200 };

/** Spring entrance 0 -> 1, starting at `delay` frames. */
export const useEnter = (delay = 0, config: Partial<typeof SPRING_POP> = SPRING_POP) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

/** Clamped, eased interpolation between two frames. */
export const ramp = (
  frame: number,
  from: number,
  to: number,
  a = 0,
  b = 1,
  easing: (t: number) => number = Easing.out(Easing.cubic),
) =>
  interpolate(frame, [from, to], [a, b], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const display = (size: number, color: string, weight = 700): React.CSSProperties => ({
  fontFamily: DISPLAY_FONT,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
});

export const body = (size: number, color: string, weight = 500): React.CSSProperties => ({
  fontFamily: BODY_FONT,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: 1.3,
});

/** Slow push-in so no frame is ever static. */
export const SlowZoom: React.FC<{
  children: React.ReactNode;
  to?: number;
  origin?: string;
}> = ({ children, to = 1.05, origin = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = interpolate(frame, [0, durationInFrames], [1, to], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** Word-by-word (or whole block) text reveal driven by spring(). */
export const FadeInText: React.FC<{
  text: string;
  delay?: number;
  size: number;
  color: string;
  font?: "display" | "body";
  weight?: number;
  byWord?: boolean;
  stagger?: number;
  align?: React.CSSProperties["textAlign"];
  /** Words from this index on use `highlightColor`. */
  highlightFrom?: number;
  highlightColor?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  size,
  color,
  font = "display",
  weight = 700,
  byWord = false,
  stagger = 4,
  align = "center",
  highlightFrom,
  highlightColor,
  style,
}) => {
  const base = font === "display" ? display(size, color, weight) : body(size, color, weight);
  const words = text.split(" ");
  return (
    <div style={{ ...base, textAlign: align, ...style }}>
      {byWord ? (
        words.map((w, i) => (
          <Word key={i} index={i} delay={delay + i * stagger}>
            <span
              style={{
                color: highlightFrom !== undefined && i >= highlightFrom ? highlightColor : undefined,
              }}
            >
              {w}
            </span>
            {i < words.length - 1 ? "\u00A0" : ""}
          </Word>
        ))
      ) : (
        <Block delay={delay}>{text}</Block>
      )}
    </div>
  );
};

const Word: React.FC<{ delay: number; index: number; children: React.ReactNode }> = ({
  delay,
  children,
}) => {
  const s = useEnter(delay, { damping: 18, stiffness: 120, mass: 0.7 });
  return (
    <span
      style={{
        display: "inline-block",
        opacity: Math.min(1, s * 1.4),
        transform: `translateY(${(1 - s) * 44}px)`,
        filter: `blur(${Math.max(0, (1 - s) * 10)}px)`,
        whiteSpace: "pre",
      }}
    >
      {children}
    </span>
  );
};

const Block: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const s = useEnter(delay, SPRING_SOFT);
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * 28}px)` }}>{children}</div>
  );
};

/** Bottom caption so the video works muted. */
export const Caption: React.FC<{ text: string; delay?: number; tone?: "dark" | "light" }> = ({
  text,
  delay = 10,
  tone = "dark",
}) => {
  const t = useTheme();
  const s = useEnter(delay, SPRING_SOFT);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 56,
        display: "flex",
        justifyContent: "center",
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
      }}
    >
      <div
        style={{
          ...body(40, t.cream, 600),
          padding: "18px 38px",
          borderRadius: 999,
          background: tone === "dark" ? "rgba(4,24,25,0.82)" : t.teal,
          border: `1.5px solid ${t.gold}66`,
          maxWidth: 1640,
          textAlign: "center",
          boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Patra-inspired geometric divider: diamonds joined by curls. */
export const PatraDivider: React.FC<{
  width?: number;
  color: string;
  progress?: number;
}> = ({ width = 560, color, progress = 1 }) => {
  const cell = 56;
  const n = Math.max(1, Math.floor(width / cell));
  const w = n * cell;
  return (
    <div style={{ width: w * progress, height: 30, overflow: "hidden" }}>
      <svg width={w} height={30} viewBox={`0 0 ${w} 30`} fill="none">
        <line x1={0} y1={15} x2={w} y2={15} stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
        {Array.from({ length: n }).map((_, i) => (
          <g key={i} transform={`translate(${i * cell + cell / 2},15)`}>
            <path d="M0 -12 L12 0 L0 12 L-12 0Z" stroke={color} strokeWidth={2.2} fill="none" />
            <circle r={3.6} fill={color} />
            <path
              d={`M15 0 q6.5 -11 13 0 q6.5 11 13 0`}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={i < n - 1 ? 1 : 0}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

/** Slowly rotating nested diamonds used as a faint backdrop. */
export const DiamondField: React.FC<{ color: string; opacity?: number; size?: number }> = ({
  color,
  opacity = 0.08,
  size = 1500,
}) => {
  const frame = useCurrentFrame();
  const rot = frame * 0.12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        opacity,
        transform: `rotate(${rot}deg)`,
      }}
      fill="none"
      stroke={color}
      strokeWidth={0.6}
    >
      {[92, 76, 60, 44, 28].map((r, i) => (
        <rect
          key={r}
          x={-r / 1.4142}
          y={-r / 1.4142}
          width={(r * 2) / 1.4142}
          height={(r * 2) / 1.4142}
          transform={`rotate(${i % 2 ? 0 : 45})`}
        />
      ))}
      <circle r={10} />
    </svg>
  );
};

export const MarkIcon: React.FC<{ kind: "ok" | "no"; size?: number; color: string }> = ({
  kind,
  size = 36,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
    {kind === "ok" ? <path d="M4 12.5 L10 18 L20 6" /> : <path d="M5 5 L19 19 M19 5 L5 19" />}
  </svg>
);
