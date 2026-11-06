import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import {
  Caption,
  FadeInText,
  MarkIcon,
  SlowZoom,
  body,
  display,
  ramp,
  useEnter,
  useTheme,
} from "../ui";

const STACK = [
  { rot: -9, dx: -46, dy: 34, score: "70" },
  { rot: -4, dx: 38, dy: 18, score: "85" },
  { rot: 5, dx: -28, dy: 6, score: "60" },
  { rot: 8, dx: 48, dy: -10, score: "75" },
];

export const ProblemScene: React.FC = () => {
  const t = useTheme();
  return (
    <AbsoluteFill style={{ background: t.cream }}>
      <SlowZoom to={1.04} origin="30% 50%">
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 130, top: 80, width: 760, height: 800 }}>
            {STACK.map((s, i) => (
              <Sheet key={i} index={i} {...s} />
            ))}
            <TopSheet />
          </div>
          <div
            style={{
              position: "absolute",
              left: 1000,
              top: 250,
              width: 820,
              display: "flex",
              flexDirection: "column",
              gap: 36,
            }}
          >
            <FadeInText
              text={COPY.problem.title}
              delay={22}
              size={68}
              color={t.ink}
              align="left"
            />
            <QuestionLine />
          </div>
        </AbsoluteFill>
      </SlowZoom>
      <Caption text={COPY.problem.caption} delay={150} tone="light" />
    </AbsoluteFill>
  );
};

const QuestionLine: React.FC = () => {
  const t = useTheme();
  const s = useEnter(96, { damping: 14, stiffness: 120, mass: 0.9 });
  return (
    <div
      style={{
        ...display(92, t.teal),
        textAlign: "left",
        opacity: s,
        transform: `translateY(${(1 - s) * 36}px) scale(${0.94 + 0.06 * s})`,
        transformOrigin: "left center",
      }}
    >
      Tapi kenapa siswa <span style={{ color: t.danger }}>keliru?</span>
    </div>
  );
};

const Sheet: React.FC<{ index: number; rot: number; dx: number; dy: number; score: string }> = ({
  index,
  rot,
  dx,
  dy,
  score,
}) => {
  const t = useTheme();
  const s = useEnter(index * 5);
  return (
    <div
      style={{
        position: "absolute",
        left: 120 + dx,
        top: 110 + dy,
        width: 500,
        height: 620,
        borderRadius: 18,
        background: t.paper,
        border: "2px solid rgba(20,40,42,0.1)",
        boxShadow: "0 24px 50px rgba(20,40,42,0.18)",
        transform: `translateY(${(1 - s) * -900}px) rotate(${rot * s}deg)`,
        padding: 36,
      }}
    >
      <div style={{ ...body(26, t.muted, 700) }}>{COPY.problem.worksheetTitle}</div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
          <div key={i} style={{ height: 14, width: `${w * 100}%`, borderRadius: 7, background: "rgba(20,40,42,0.1)" }} />
        ))}
      </div>
      <div style={{ ...display(96, t.danger), position: "absolute", right: 40, bottom: 34, opacity: 0.55 }}>
        {score}
      </div>
    </div>
  );
};

const ROWS: { ok: boolean; w: number }[] = [
  { ok: true, w: 0.78 },
  { ok: false, w: 0.62 },
  { ok: true, w: 0.7 },
  { ok: false, w: 0.55 },
];

const TopSheet: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const enter = useEnter(22);
  const badge = useEnter(46, { damping: 11, stiffness: 170, mass: 0.7 });
  // 90 -> 130: red crosses dissolve into gold question marks
  const morph = ramp(frame, 90, 126, 0, 1, Easing.inOut(Easing.cubic));
  const q = useEnter(96, { damping: 10, stiffness: 190, mass: 0.6 });
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        top: 80,
        width: 540,
        height: 700,
        borderRadius: 20,
        background: t.paper,
        border: "2px solid rgba(20,40,42,0.14)",
        boxShadow: "0 40px 80px rgba(20,40,42,0.28)",
        transform: `translateY(${(1 - enter) * -1000}px) rotate(${-2 * enter}deg)`,
        padding: 40,
      }}
    >
      <div style={{ ...body(28, t.ink, 700) }}>{COPY.problem.worksheetTitle}</div>
      <div style={{ ...body(24, t.muted, 500), marginTop: 6 }}>Nama: Dimas Arya · Kelas 8B</div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 34 }}>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ ...body(28, t.ink, 700), width: 34 }}>{i + 1}.</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 16, width: `${r.w * 100}%`, borderRadius: 8, background: "rgba(20,40,42,0.14)" }} />
              <div style={{ height: 16, width: `${r.w * 70}%`, borderRadius: 8, background: "rgba(20,40,42,0.08)", marginTop: 12 }} />
            </div>
            <div style={{ position: "relative", width: 56, height: 56 }}>
              {r.ok ? (
                <MarkIcon kind="ok" size={52} color={t.success} />
              ) : (
                <>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - morph, transform: `scale(${1 - morph * 0.4})` }}>
                    <MarkIcon kind="no" size={52} color={t.danger} />
                  </div>
                  <div
                    style={{
                      ...display(58, t.gold),
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: q,
                      transform: `scale(${q}) rotate(${interpolate(q, [0, 1], [-30, 0])}deg)`,
                      textShadow: `0 0 0 ${t.gold}`,
                    }}
                  >
                    ?
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 34,
          bottom: 38,
          width: 190,
          height: 190,
          borderRadius: "50%",
          border: `7px solid ${t.danger}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${badge}) rotate(${-12 * badge}deg)`,
          opacity: 1 - morph * 0.35,
        }}
      >
        <div style={{ ...display(84, t.danger) }}>55</div>
      </div>
    </div>
  );
};
