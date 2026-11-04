/* Act 5 — the close. Remedial chain ticks green, the metric lands,
 * then everything steps back and the wordmark holds the exit before the
 * loop dips to black.
 */
import React from "react";
import { enterStyle, sp, EZ, clamp01, counterVal, wob } from "../motion";

const STEPS = [
  { t: "Re-kuis khusus: sandhangan", at: 16 },
  { t: "Mini-video 2 menit", at: 34 },
  { t: "Guru review hasil", at: 52 },
];

export function ActOutro({ local }: { local: number }): React.JSX.Element {
  const f = local;
  /* the work panels step off stage before the wordmark takes over */
  const exitT = clamp01((f - 74) / 20);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* ——— remedial chain ——— */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 208,
          width: 452,
          height: 310,
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(17,26,46,0.96), rgba(12,18,32,0.94))",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 30px 70px rgba(2,6,16,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "24px 28px",
          opacity: 1 - exitT,
          transform: `translateY(${exitT * 46}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11.5, letterSpacing: "0.3em", color: "#8EF0C1", fontWeight: 700 }}>REMEDIAL OTOMATIS</span>
          <Ring f={f} />
        </div>
        {STEPS.map((s2, i) => {
          const row = sp(f - s2.at, { damping: 14, stiffness: 175 });
          const tick = sp(f - s2.at - 14, { damping: 12, stiffness: 210 });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: i === 0 ? 24 : 20, opacity: clamp01(row * 1.7), transform: `translateX(${(1 - row) * -24}px)` }}>
              <span style={{ width: 26, fontSize: 12.5, color: "#5F6E88", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 17, fontWeight: 620, color: "#E9EFFA", flex: 1 }}>{s2.t}</span>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "rgba(52,211,153,0.16)",
                  border: "1px solid rgba(52,211,153,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "#8EF0C1",
                  fontWeight: 800,
                  opacity: clamp01(tick * 1.8),
                  transform: `scale(${0.5 + 0.5 * clamp01(tick)})`,
                }}
              >
                ✓
              </span>
            </div>
          );
        })}
        <div style={{ marginTop: 26, ...enterStyle(f, { delay: 64, dur: 16 }) }}>
          <span style={{ fontSize: 13.5, color: "#7E8CA8", fontWeight: 550 }}>
            dijadwalkan sendiri — tanpa guru menyusun apa pun
          </span>
        </div>
      </div>

      {/* ——— the metric that lands ——— */}
      <div
        style={{
          position: "absolute",
          left: 730,
          top: 262,
          width: 420,
          opacity: 1 - exitT,
          transform: `translateX(${-exitT * 40}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 96, fontWeight: 800, color: "#F4F8FF", lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 12px 44px rgba(64,120,240,0.4)" }}>
            {counterVal(f, 30, 34, 14)}
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, color: "#8CA0BD" }}>menit</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 580, color: "#9AA7BF" }}>
            kembali ke guru per kuis — waktu untuk membimbing, bukan mengejar nilai
          </span>
        </div>
        <div style={{ marginTop: 18, ...enterStyle(f, { delay: 56, dur: 16 }) }}>
          <span style={{ fontSize: 13, color: "#6EA8FF", fontWeight: 700, letterSpacing: "0.12em" }}>GURU, BUKAN OPERATOR NILAI</span>
        </div>
      </div>

      {/* ——— the wordmark exit ——— */}
      <Wordmark f={f} />
    </div>
  );
}

const WM = "Exile";

function Wordmark({ f }: { f: number }): React.JSX.Element {
  const at = 96;
  const uSx = EZ.settle(clamp01((f - at - 18) / 22));
  const pill = sp(f - at - 34, { damping: 13, stiffness: 180 });
  const caps = EZ.outCubic(clamp01((f - at - 46) / 16));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 258 + wob(f * 1.4, 9, 2.2), display: "flex", justifyContent: "center" }}>
        {WM.split("").map((ch, i) => {
          const ls = sp(f - at - i * 2.6, { damping: 13, stiffness: 190 });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize: 118,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                background: "linear-gradient(150deg, #F4F8FF 8%, #BBD4FF 48%, #6FB7FF 92%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                opacity: clamp01(ls * 1.8),
                transform: `translateY(${(1 - ls) * 34}px) scale(${0.82 + 0.18 * ls})`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 640 - 96,
          top: 396,
          width: 192,
          height: 3,
          borderRadius: 3,
          transform: `scaleX(${uSx})`,
          background: "linear-gradient(90deg, rgba(78,141,253,0) 0%, #4F8DFD 50%, rgba(34,211,238,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 428, display: "flex", justifyContent: "center" }}>
        <span
          style={{
            opacity: clamp01(pill * 1.6),
            transform: `translateY(${(1 - pill) * 20}px)`,
            padding: "12px 26px",
            borderRadius: 999,
            fontSize: 19,
            fontWeight: 750,
            color: "#EAF2FF",
            background: "rgba(18,26,44,0.78)",
            border: "1px solid rgba(110,168,255,0.35)",
            boxShadow: "0 10px 30px rgba(2,6,16,0.5), 0 0 26px rgba(79,141,253,0.16)",
          }}
        >
          exile.web.id
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 502, display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 12, letterSpacing: "0.3em", color: "#5F6E88", fontWeight: 600, opacity: caps }}>
          ASESMEN FORMATIF · DIAGNOS GEMINI · REMEDIAL OTOMATIS
        </span>
      </div>
    </div>
  );
}

function Ring({ f }: { f: number }): React.JSX.Element {
  const t = clamp01(f / 82);
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <svg width={27} height={27} viewBox="0 0 27 27">
      <circle cx="13.5" cy="13.5" r={r} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="2.4" />
      <circle cx="13.5" cy="13.5" r={r} fill="none" stroke="#8EF0C1" strokeWidth="2.4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - t)} transform="rotate(-90 13.5 13.5)" />
    </svg>
  );
}
