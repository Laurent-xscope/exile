import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import {
  Caption,
  SlowZoom,
  SPRING_SOFT,
  body,
  display,
  ramp,
  useEnter,
  useTheme,
} from "../ui";

const WIN = { x: 70, y: 70, w: 780, h: 800 };
const CARD = { x: 990, w: 840, h: 237, gap: 24 };
const cardY = (i: number) => WIN.y + i * (CARD.h + CARD.gap);
const FLY_AT = 112;

export const SolutionScene: React.FC = () => {
  const t = useTheme();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${t.teal}, ${t.tealDeep})` }}>
      <SlowZoom to={1.045} origin="45% 45%">
        <AbsoluteFill>
          <Connectors />
          <Workspace />
          <SummaryCard />
          <FlashcardCard />
          <QuizCard />
        </AbsoluteFill>
      </SlowZoom>
      <Caption text={COPY.solution.caption} delay={150} />
    </AbsoluteFill>
  );
};

const Connectors: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const x0 = WIN.x + WIN.w;
  const y0 = WIN.y + WIN.h / 2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }} fill="none">
      {[0, 1, 2].map((i) => {
        const y1 = cardY(i) + CARD.h / 2;
        const len = 420;
        const p = ramp(frame, FLY_AT + i * 6, FLY_AT + i * 6 + 28, 0, 1, Easing.inOut(Easing.cubic));
        return (
          <path
            key={i}
            d={`M${x0} ${y0} C ${x0 + 70} ${y0}, ${CARD.x - 70} ${y1}, ${CARD.x} ${y1}`}
            stroke={t.gold}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="10 12"
            strokeDashoffset={len * (1 - p)}
            opacity={0.85 * p}
          />
        );
      })}
    </svg>
  );
};

const Workspace: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const enter = useEnter(0, SPRING_SOFT);
  const paste = ramp(frame, 34, 54);
  const press = interpolate(frame, [94, 100, 108], [1, 0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = frame >= 100 && frame < FLY_AT + 24;
  const clickRing = ramp(frame, 98, 116, 0, 1);
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        top: WIN.y,
        width: WIN.w,
        height: WIN.h,
        borderRadius: 28,
        background: t.paper,
        boxShadow: "0 50px 100px rgba(0,0,0,0.35)",
        overflow: "hidden",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 50}px)`,
      }}
    >
      <div style={{ height: 68, background: t.cream, display: "flex", alignItems: "center", padding: "0 26px", gap: 10, borderBottom: "1.5px solid rgba(20,40,42,0.1)" }}>
        {[t.danger, t.gold, t.success].map((c, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <div style={{ ...body(26, t.muted, 600), marginLeft: 18 }}>{COPY.solution.windowTitle}</div>
      </div>
      <div style={{ padding: 40 }}>
        <div style={{ ...body(26, t.muted, 700), letterSpacing: "0.04em" }}>
          {COPY.solution.moduleLabel}
        </div>
        <div
          style={{
            marginTop: 18,
            borderRadius: 20,
            border: `2px dashed ${paste > 0.05 ? t.teal : "rgba(20,40,42,0.25)"}`,
            padding: 34,
            minHeight: 340,
            background: "rgba(11,59,60,0.04)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {paste < 0.05 && (
            <div style={{ ...body(30, t.muted, 600), textAlign: "center", marginTop: 110, opacity: 1 - paste * 10 }}>
              {COPY.solution.paste}
            </div>
          )}
          <div
            style={{
              clipPath: `inset(0 0 ${(1 - paste) * 100}% 0)`,
              opacity: paste > 0 ? 1 : 0,
              transform: `translateY(${(1 - paste) * -18}px)`,
            }}
          >
            <div style={{ ...display(46, t.teal) }}>{COPY.solution.moduleHeading}</div>
            <div style={{ ...body(30, t.ink, 500), marginTop: 18, lineHeight: 1.5 }}>
              {COPY.solution.moduleBody}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 36, display: "flex", justifyContent: "flex-end", position: "relative" }}>
          <div
            style={{
              ...body(32, t.ink, 700),
              padding: "22px 46px",
              borderRadius: 18,
              background: t.gold,
              transform: `scale(${press})`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              position: "relative",
            }}
          >
            {spin && <Spinner />}
            {COPY.solution.generate}
            <div
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: 24,
                border: `3px solid ${t.gold}`,
                opacity: (1 - clickRing) * (frame > 97 ? 1 : 0),
                transform: `scale(${1 + clickRing * 0.25})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Spinner: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" style={{ transform: `rotate(${frame * 14}deg)` }}>
      <circle cx={15} cy={15} r={11} stroke="rgba(20,40,42,0.25)" strokeWidth={4} fill="none" />
      <path d="M15 4 A11 11 0 0 1 26 15" stroke="#14282A" strokeWidth={4} strokeLinecap="round" fill="none" />
    </svg>
  );
};

/** Output card shell: flies out of the workspace with a spring. */
const OutputCard: React.FC<{ index: number; title: string; children: React.ReactNode }> = ({
  index,
  title,
  children,
}) => {
  const t = useTheme();
  const s = useEnter(FLY_AT + index * 6, { damping: 15, stiffness: 120, mass: 0.9 });
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: cardY(index),
        width: CARD.w,
        height: CARD.h,
        borderRadius: 26,
        background: t.paper,
        boxShadow: "0 30px 70px rgba(0,0,0,0.3)",
        padding: "26px 34px",
        opacity: Math.min(1, s * 2),
        transform: `translateX(${(1 - s) * -560}px) scale(${0.7 + 0.3 * s})`,
        transformOrigin: "left center",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 14, height: 14, transform: "rotate(45deg)", background: t.gold }} />
        <div style={{ ...body(32, t.teal, 700) }}>{title}</div>
      </div>
      {children}
    </div>
  );
};

const SummaryCard: React.FC = () => {
  const t = useTheme();
  return (
    <OutputCard index={0} title={COPY.solution.outputs.summary}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {COPY.solution.glossary.map(([term, def]) => (
          <div key={term} style={{ ...body(29, t.ink, 500), display: "flex", gap: 12 }}>
            <span style={{ fontWeight: 700, color: t.teal, minWidth: 190 }}>{term}</span>
            <span>{def}</span>
          </div>
        ))}
      </div>
    </OutputCard>
  );
};

const FlashcardCard: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const flip = ramp(frame, 190, 220, 0, 1, Easing.inOut(Easing.cubic));
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    backfaceVisibility: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <OutputCard index={1} title={COPY.solution.outputs.cards}>
      <div style={{ perspective: 900, display: "flex", justifyContent: "center", flex: 1 }}>
        <div style={{ position: "relative", width: 360, height: 118, transformStyle: "preserve-3d", transform: `rotateY(${flip * 180}deg)` }}>
          <div style={{ ...face, background: t.teal }}>
            <span style={{ ...display(50, t.cream) }}>{COPY.solution.cardFront}</span>
          </div>
          <div style={{ ...face, background: t.gold, transform: "rotateY(180deg)" }}>
            <span style={{ ...body(32, t.ink, 700) }}>{COPY.solution.cardBack}</span>
          </div>
        </div>
      </div>
    </OutputCard>
  );
};

const QuizCard: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const pick = ramp(frame, 210, 226);
  return (
    <OutputCard index={2} title={COPY.solution.outputs.quiz}>
      <div style={{ ...body(28, t.ink, 600) }}>{COPY.solution.quizQuestion}</div>
      <div style={{ display: "flex", gap: 12 }}>
        {COPY.solution.quizOptions.map((o, i) => {
          const correct = i === 1;
          return (
            <div
              key={o}
              style={{
                ...body(28, correct && pick > 0.5 ? t.ink : t.teal, 700),
                flex: 1,
                textAlign: "center",
                padding: "14px 0",
                borderRadius: 14,
                background: correct && pick > 0.5 ? t.gold : "rgba(11,59,60,0.08)",
              }}
            >
              {o}
            </div>
          );
        })}
      </div>
    </OutputCard>
  );
};
