import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import { BarChart } from "../BarChart";
import { PhoneMockup } from "../PhoneMockup";
import { ProjectorMockup } from "../ProjectorMockup";
import {
  Caption,
  MarkIcon,
  SlowZoom,
  SPRING_SOFT,
  Theme,
  body,
  display,
  ramp,
  useEnter,
  useTheme,
} from "../ui";

const STEP = 120;
const OPTION_COLORS = ["#2D6A8F", "#E3A93A", "#C4513A", "#2F8F6B"];

export const ClassroomScene: React.FC<{ pin: string; url: string }> = ({ pin, url }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const active = Math.min(3, Math.floor(frame / STEP));
  return (
    <AbsoluteFill style={{ background: t.cream }}>
      <StepBar active={active} />
      <SlowZoom to={1.045} origin="50% 55%">
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 90, top: 190 }}>
            <ProjectorMockup width={1060}>
              {[0, 1, 2, 3].map((i) => (
                <Sequence key={i} from={i * STEP} durationInFrames={i === 3 ? STEP + 15 : STEP} layout="none">
                  <StepFade last={i === 3}>
                    {i === 0 && <PinScreen pin={pin} url={url} />}
                    {i === 1 && <LobbyScreen pin={pin} />}
                    {i === 2 && <QuizScreen />}
                    {i === 3 && <ReportScreen />}
                  </StepFade>
                </Sequence>
              ))}
            </ProjectorMockup>
          </div>
          <PhoneSlot url={url} pin={pin} />
        </AbsoluteFill>
      </SlowZoom>
      {COPY.classroom.captions.map((c, i) => (
        <Sequence key={i} from={i * STEP} durationInFrames={i === 3 ? STEP + 15 : STEP} layout="none">
          <StepFade last={i === 3} fadeOnly>
            <Caption text={c} delay={6} tone="light" />
          </StepFade>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const StepFade: React.FC<{ children: React.ReactNode; last?: boolean; fadeOnly?: boolean }> = ({
  children,
  last,
}) => {
  const frame = useCurrentFrame();
  const inn = ramp(frame, 0, 10);
  const out = last ? 1 : ramp(frame, STEP - 10, STEP, 1, 0, Easing.in(Easing.cubic));
  return <AbsoluteFill style={{ opacity: inn * out }}>{children}</AbsoluteFill>;
};

const StepBar: React.FC<{ active: number }> = ({ active }) => {
  const t = useTheme();
  const enter = useEnter(0, SPRING_SOFT);
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: 56,
        display: "flex",
        gap: 20,
        opacity: enter,
        transform: `translateY(${(1 - enter) * -30}px)`,
      }}
    >
      {COPY.classroom.steps.map((label, i) => {
        const on = i === active;
        const done = i < active;
        return (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 22px",
              borderRadius: 20,
              background: on ? t.teal : "rgba(20,40,42,0.06)",
              border: `2px solid ${on ? t.gold : "transparent"}`,
              transition: "none",
            }}
          >
            <div
              style={{
                ...body(28, on ? t.ink : t.cream, 700),
                width: 46,
                height: 46,
                borderRadius: 23,
                background: on ? t.gold : done ? t.success : t.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {done ? <MarkIcon kind="ok" size={26} color={t.cream} /> : i + 1}
            </div>
            <div style={{ ...body(30, on ? t.cream : t.muted, 700) }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Projector screens ---------- */

const PinScreen: React.FC<{ pin: string; url: string }> = ({ pin, url }) => {
  const t = useTheme();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
      <div style={{ ...body(36, t.cream, 500), opacity: 0.85 }}>
        {COPY.classroom.joinHint} <b style={{ color: t.gold }}>{url}/play</b>
      </div>
      <div style={{ ...body(26, t.gold, 700), letterSpacing: "0.22em" }}>{COPY.classroom.pinLabel}</div>
      <div style={{ display: "flex", gap: 14 }}>
        {pin.split("").map((d, i) => (
          <Digit key={i} d={d} delay={6 + i * 5} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Digit: React.FC<{ d: string; delay: number }> = ({ d, delay }) => {
  const t = useTheme();
  const s = useEnter(delay);
  return (
    <div
      style={{
        ...display(104, t.ink),
        width: 118,
        height: 150,
        borderRadius: 20,
        background: t.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, s * 2),
        transform: `translateY(${(1 - s) * 70}px) rotateX(${(1 - s) * -50}deg)`,
      }}
    >
      {d}
    </div>
  );
};

const LobbyScreen: React.FC<{ pin: string }> = ({ pin }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const count = Math.round(ramp(frame, 10, 100, 0, 24, Easing.out(Easing.quad)));
  return (
    <AbsoluteFill style={{ padding: 44 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ ...body(30, t.cream, 600), opacity: 0.85 }}>
          PIN <b style={{ color: t.gold, letterSpacing: "0.1em" }}>{pin}</b>
        </div>
        <div style={{ ...display(76, t.gold) }}>
          {count}
          <span style={{ ...body(30, t.cream, 600), marginLeft: 12 }}>siswa</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 40 }}>
        {COPY.classroom.students.map((n, i) => (
          <NameChip key={n} name={n} delay={8 + i * 5} i={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const NameChip: React.FC<{ name: string; delay: number; i: number }> = ({ name, delay, i }) => {
  const t = useTheme();
  const s = useEnter(delay);
  const colors = [t.gold, t.cream, "#8CC7B6", "#F0C979"];
  return (
    <div
      style={{
        ...body(34, t.ink, 700),
        padding: "14px 30px",
        borderRadius: 999,
        background: colors[i % colors.length],
        opacity: Math.min(1, s * 2),
        transform: `scale(${s}) rotate(${(1 - s) * (i % 2 ? 12 : -12)}deg)`,
      }}
    >
      {name}
    </div>
  );
};

const QuizScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const counts = [2, 14, 7, 1];
  return (
    <AbsoluteFill style={{ padding: "40px 48px" }}>
      <div style={{ ...display(42, t.cream, 600), lineHeight: 1.2 }}>{COPY.classroom.question}</div>
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
        {COPY.classroom.options.map((o, i) => {
          const s = ramp(frame, 28 + i * 6, 70 + i * 6, 0, 1, Easing.out(Easing.cubic));
          const hot = i === COPY.classroom.pickedIndex;
          const ok = i === COPY.classroom.correctIndex;
          const reveal = ramp(frame, 78, 92);
          return (
            <div key={o} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  ...body(30, "#fff", 700),
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: OPTION_COLORS[i],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {"ABCD"[i]}
              </div>
              <div style={{ ...body(32, t.cream, 700), width: 150 }}>{o}</div>
              <div style={{ flex: 1, height: 34, borderRadius: 17, background: "rgba(247,241,227,0.14)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(counts[i] / 14) * 100 * s}%`,
                    height: "100%",
                    borderRadius: 17,
                    background: ok && reveal > 0.5 ? t.success : hot && reveal > 0.5 ? t.danger : t.cream,
                  }}
                />
              </div>
              <div style={{ ...body(32, t.cream, 700), width: 44, textAlign: "right" }}>
                {Math.round(counts[i] * s)}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ReportScreen: React.FC = () => {
  const t = useTheme();
  const rows = COPY.classroom.reportRows.map(([label, value], i) => ({ label, value, highlight: i === 0 }));
  return (
    <AbsoluteFill style={{ padding: "36px 44px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ ...display(46, t.cream, 600) }}>{COPY.classroom.reportTitle}</div>
        <SampleTag />
      </div>
      <div style={{ marginTop: 28 }}>
        <BarChart data={rows} delay={14} width={940} labelWidth={360} rowHeight={112} fontSize={30} tone="dark" />
      </div>
    </AbsoluteFill>
  );
};

const SampleTag: React.FC = () => {
  const t = useTheme();
  return (
    <div
      style={{
        ...body(24, t.gold, 700),
        padding: "8px 20px",
        borderRadius: 999,
        border: `2px solid ${t.gold}`,
        letterSpacing: "0.04em",
      }}
    >
      {COPY.classroom.sample}
    </div>
  );
};

/* ---------- Phone ---------- */

const PhoneSlot: React.FC<{ url: string; pin: string }> = ({ url, pin }) => {
  const enter = useEnter(4, { damping: 16, stiffness: 110, mass: 0.9 });
  return (
    <div
      style={{
        position: "absolute",
        left: 1440,
        top: 172,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 120}px) rotate(${(1 - enter) * 4}deg)`,
      }}
    >
      <PhoneMockup width={350}>
        {[0, 1, 2, 3].map((i) => (
          <Sequence key={i} from={i * STEP} durationInFrames={i === 3 ? STEP + 15 : STEP} layout="none">
            <StepFade last={i === 3}>
              {i === 0 && <PhoneWaiting url={url} />}
              {i === 1 && <PhoneJoin pin={pin} />}
              {i === 2 && <PhoneQuiz />}
              {i === 3 && <PhoneResult />}
            </StepFade>
          </Sequence>
        ))}
      </PhoneMockup>
    </div>
  );
};

const UrlBar: React.FC<{ url: string }> = ({ url }) => {
  const t = useTheme();
  return (
    <div style={{ margin: "60px 22px 0", padding: "10px 18px", borderRadius: 999, background: "rgba(20,40,42,0.07)", ...body(22, t.muted, 600), textAlign: "center" }}>
      {url}/play
    </div>
  );
};

const PhoneWaiting: React.FC<{ url: string }> = ({ url }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.03;
  return (
    <AbsoluteFill>
      <UrlBar url={url} />
      <div style={{ ...display(64, t.teal), textAlign: "center", marginTop: 150, transform: `scale(${pulse})` }}>exile</div>
      <div style={{ margin: "40px 32px 0", ...body(28, t.ink, 600), padding: "20px 22px", borderRadius: 18, border: "2px solid rgba(20,40,42,0.18)", color: t.muted }}>
        Masukkan PIN
      </div>
      <div style={{ margin: "22px 32px 0", ...body(30, t.cream, 700), padding: "20px 0", borderRadius: 18, background: t.muted, textAlign: "center", opacity: 0.6 }}>
        Gabung
      </div>
    </AbsoluteFill>
  );
};

const PhoneJoin: React.FC<{ pin: string }> = ({ pin }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(pin.length, Math.floor((frame - 6) / 4)));
  const press = interpolate(frame, [52, 58, 66], [1, 0.93, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ok = useEnter(70, { damping: 12, stiffness: 160, mass: 0.7 });
  const nick = frame >= 34 ? "Ayu" : "";
  return (
    <AbsoluteFill>
      <UrlBar url="exile.web.id" />
      <div style={{ ...display(64, t.teal), textAlign: "center", marginTop: 110 }}>exile</div>
      <div style={{ margin: "34px 32px 0", ...body(34, t.ink, 700), padding: "18px 22px", borderRadius: 18, border: `2px solid ${t.teal}`, letterSpacing: "0.18em" }}>
        {pin.slice(0, typed) || <span style={{ color: t.muted, letterSpacing: 0, fontWeight: 500 }}>Masukkan PIN</span>}
      </div>
      <div style={{ margin: "16px 32px 0", ...body(30, t.ink, 600), padding: "18px 22px", borderRadius: 18, border: "2px solid rgba(20,40,42,0.18)", minHeight: 30 }}>
        {nick || <span style={{ color: t.muted, fontWeight: 500 }}>Nama panggilan</span>}
      </div>
      <div style={{ margin: "22px 32px 0", ...body(30, t.ink, 700), padding: "20px 0", borderRadius: 18, background: t.gold, textAlign: "center", transform: `scale(${press})` }}>
        Gabung
      </div>
      <AbsoluteFill
        style={{
          background: t.paper,
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          opacity: ok,
          transform: `scale(${0.9 + 0.1 * ok})`,
          padding: 30,
        }}
      >
        <div style={{ width: 120, height: 120, borderRadius: 60, background: t.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MarkIcon kind="ok" size={64} color="#fff" />
        </div>
        <div style={{ ...display(44, t.teal), textAlign: "center" }}>Kamu masuk, Ayu!</div>
        <div style={{ ...body(26, t.muted, 600), textAlign: "center" }}>Tunggu guru memulai kuis.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PhoneQuiz: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const picked = COPY.classroom.pickedIndex;
  const press = interpolate(frame, [30, 36, 44], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sheet = useEnter(48, { damping: 18, stiffness: 120, mass: 0.9 });
  return (
    <AbsoluteFill>
      <div style={{ ...body(23, t.ink, 700), margin: "62px 22px 0", lineHeight: 1.3 }}>{COPY.classroom.question}</div>
      <div style={{ margin: "20px 22px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {COPY.classroom.options.map((o, i) => (
          <PhoneOption
            key={o}
            label={o}
            index={i}
            dim={frame > 44 && i !== picked}
            pressScale={i === picked ? press : 1}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 270,
          background: t.cream,
          borderTop: `6px solid ${t.danger}`,
          borderRadius: "30px 30px 0 0",
          padding: "26px 28px",
          transform: `translateY(${(1 - sheet) * 280}px)`,
          boxShadow: "0 -20px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ ...display(32, t.danger) }}>{COPY.classroom.feedbackTitle}</div>
        <div style={{ ...body(23, t.ink, 500), marginTop: 8, lineHeight: 1.4 }}>{COPY.classroom.feedbackBody}</div>
      </div>
    </AbsoluteFill>
  );
};

const PhoneOption: React.FC<{ label: string; index: number; dim: boolean; pressScale: number }> = ({
  label,
  index,
  dim,
  pressScale,
}) => {
  const t = useTheme();
  const s = useEnter(6 + index * 5);
  return (
    <div
      style={{
        ...body(28, index === 1 ? t.ink : "#fff", 700),
        height: 98,
        borderRadius: 22,
        background: OPTION_COLORS[index],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 0 rgba(0,0,0,0.2)",
        opacity: Math.min(1, s * 2) * (dim ? 0.35 : 1),
        transform: `scale(${(0.7 + 0.3 * s) * pressScale})`,
      }}
    >
      {label}
    </div>
  );
};

const Ring: React.FC<{ theme: Theme; value: number }> = ({ theme, value }) => {
  const r = 104;
  const c = 2 * Math.PI * r;
  return (
    <svg width={260} height={260} viewBox="0 0 260 260">
      <circle cx={130} cy={130} r={r} stroke="rgba(20,40,42,0.1)" strokeWidth={22} fill="none" />
      <circle
        cx={130}
        cy={130}
        r={r}
        stroke={theme.gold}
        strokeWidth={22}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform="rotate(-90 130 130)"
      />
    </svg>
  );
};

const PhoneResult: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const v = ramp(frame, 8, 50, 0, 0.8, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
      <div style={{ position: "relative", width: 260, height: 260 }}>
        <Ring theme={t} value={v} />
        <div style={{ ...display(84, t.teal), position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Math.round(v * 100)}
        </div>
      </div>
      <div style={{ ...display(40, t.ink), marginTop: 24 }}>Kuis selesai!</div>
      <div style={{ ...body(26, t.muted, 600), marginTop: 10 }}>2 konsep perlu diulang</div>
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        {["Alus singgih", "Kata ganti"].map((c, i) => (
          <Chip key={c} text={c} delay={30 + i * 6} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const t = useTheme();
  const s = useEnter(delay);
  return (
    <div style={{ ...body(21, t.ink, 700), padding: "9px 14px", borderRadius: 999, background: t.gold, transform: `scale(${s})` }}>
      {text}
    </div>
  );
};
