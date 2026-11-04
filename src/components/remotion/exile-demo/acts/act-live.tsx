/* Act 3 — the live class. PIN digits, the room fills, answers race in.
 * Camera: close on the PIN, wide reveal, then push onto the vote bars as
 * they settle — three different moves in six seconds.
 */
import React from "react";
import { enterStyle, springStyle, Words, sp, EZ, clamp01, ramp, counterVal } from "../motion";
import { Burst } from "../motion";

const AVS = [
  { n: "Komang", c: "#6EA8FF", s: 38 },
  { n: "Putu", c: "#4FD4F5", s: 47 },
  { n: "Sari", c: "#C7A6FF", s: 56 },
  { n: "Dewi", c: "#8EF0C1", s: 65 },
  { n: "Made", c: "#FFD873", s: 74 },
];

const BARS = [
  { k: "A", w: 0.56, at: 96, hot: true },
  { k: "B", w: 0.32, at: 104, hot: false },
  { k: "C", w: 0.22, at: 112, hot: false },
  { k: "D", w: 0.08, at: 120, hot: false },
];

export function ActLive({ local }: { local: number }): React.JSX.Element {
  const f = local;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* ——— PIN slab ——— */}
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 140,
          width: 320,
          height: 192,
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(17,25,44,0.96), rgba(12,18,32,0.93))",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 30px 70px rgba(2,6,16,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          ...springStyle(f, { delay: 2, dir: "up", dist: 32, damping: 15 }),
        }}
      >
        <span style={{ position: "absolute", left: 26, top: 22, fontSize: 11.5, letterSpacing: "0.3em", color: "#8CA0BD", fontWeight: 700 }}>
          GABUNG KELAS
        </span>
        <div style={{ position: "absolute", left: 26, top: 58, display: "flex", gap: 13 }}>
          {["4", "2", "7", "1"].map((d, i) => {
            const s = sp(f - 2 - i * 3, { damping: 13, stiffness: 200 });
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: 68,
                  borderRadius: 11,
                  background: "rgba(9,14,26,0.9)",
                  border: "1px solid rgba(110,168,255,0.28)",
                  boxShadow: "inset 0 -12px 22px rgba(2,6,16,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#F0F5FF",
                  opacity: clamp01(s * 1.7),
                  transform: `translateY(${(1 - s) * -22}px) scale(${0.7 + 0.3 * clamp01(s)})`,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <span style={{ position: "absolute", left: 26, bottom: 20, fontSize: 13, color: "#5F6E88", ...enterStyle(f, { delay: 44, dur: 14 }) }}>
          exile.web.id/live · tanpa install
        </span>
      </div>

      {/* ——— class caption ——— */}
      <div style={{ position: "absolute", left: 700, top: 150 }}>
        <Words
          f={f}
          at={26}
          size={26}
          weight={700}
          per={2.6}
          toks={[
            { t: "Kuis" },
            { t: "harian", accent: true },
            { t: "·" },
            { t: "28" },
            { t: "murid" },
            { t: "masuk" },
          ]}
        />
      </div>

      {/* ——— the room fills ——— */}
      <div style={{ position: "absolute", left: 690, top: 214, display: "flex", gap: 18, alignItems: "center" }}>
        {AVS.map((av, i) => {
          const s = sp(f - 38 - i * 7, { damping: 12, stiffness: 190 });
          const initX = av.n[0];
          return (
            <div key={av.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: av.c,
                  boxShadow: "0 10px 26px rgba(2,6,16,0.42), inset 0 -10px 18px rgba(9,20,40,0.35), 0 0 0 3px rgba(7,12,22,0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0A1526",
                  opacity: clamp01(s * 1.7),
                  transform: `translateY(${(1 - s) * 24}px) scale(${0.6 + 0.4 * clamp01(s)})`,
                }}
              >
                {initX}
              </div>
              <span style={{ fontSize: 12.5, color: "#7E8CA8", fontWeight: 600, opacity: clamp01(s * 1.4) }}>{av.n}</span>
            </div>
          );
        })}
        <div
          style={{
            marginLeft: 4,
            padding: "16px 18px",
            borderRadius: 999,
            fontSize: 14.5,
            fontWeight: 700,
            color: "#9AA7BF",
            border: "1.5px dashed rgba(148,163,184,0.3)",
            opacity: clamp01(sp(f - 78, { damping: 13 }) * 1.6),
            transform: `scale(${0.7 + 0.3 * clamp01(sp(f - 78, { damping: 13 }))})`,
          }}
        >
          +12
        </div>
      </div>
      <Burst f={f} at={72} x={984} y={244} count={13} seed={11} life={34} speed={4.6} />

      {/* ——— question card ——— */}
      <div
        style={{
          position: "absolute",
          left: 690,
          top: 330,
          width: 452,
          height: 122,
          borderRadius: 16,
          background: "linear-gradient(180deg, rgba(19,28,48,0.97), rgba(13,20,36,0.95))",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 22px 50px rgba(2,6,16,0.5)",
          padding: "16px 20px",
          ...enterStyle(f, { delay: 58, dur: 22, dir: "up", dist: 30 }),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11.5, letterSpacing: "0.22em", color: "#6EA8FF", fontWeight: 750 }}>Q4 · SANDHANGAN</span>
          <Timer f={f} at={66} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Words
            f={f}
            at={70}
            size={20}
            weight={620}
            per={2}
            rise={14}
            toks={[
              { t: "“ra”" },
              { t: "vs" },
              { t: "“ra tar”" },
              { t: "—" },
              { t: "mana", soft: true },
              { t: "yang", soft: true },
              { t: "tertukar?", soft: true },
            ]}
          />
        </div>
      </div>

      {/* ——— vote bars ——— */}
      <div style={{ position: "absolute", left: 690, top: 498, width: 476 }}>
        <div style={{ ...enterStyle(f, { delay: 84, dur: 16 }), fontSize: 11.5, letterSpacing: "0.28em", color: "#8CA0BD", fontWeight: 700, marginBottom: 5 }}>
          JAWABAN MASUK SERENTAK
        </div>
        {BARS.map((b, i) => (
          <Bar key={b.k} f={f} b={b} i={i} />
        ))}
      </div>

      {/* soft glow under the bars as they land */}
      <LandGlow f={f} />
    </div>
  );
}

function Bar({ f, b, i }: { f: number; b: (typeof BARS)[number]; i: number }): React.JSX.Element {
  const pop = sp(f - 88 - i * 5, { damping: 14, stiffness: 185 });
  const w = ramp(f, b.at, 34, 0.04, b.w, EZ.outQuart);
  const pct = Math.round(w * 100);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 11,
        opacity: clamp01(pop * 1.7),
        transform: `translateX(${(1 - pop) * -22}px)`,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: b.hot ? "linear-gradient(135deg, #4F8DFD, #22D3EE)" : "rgba(28,38,60,0.9)",
          color: b.hot ? "#081226" : "#8CA0BD",
          border: b.hot ? "none" : "1px solid rgba(148,163,184,0.22)",
          flexShrink: 0,
        }}
      >
        {b.k}
      </span>
      <div style={{ position: "relative", width: 350, height: 40, borderRadius: 10, background: "rgba(10,16,29,0.8)", border: "1px solid rgba(148,163,184,0.13)", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: w * 350,
            borderRadius: b.hot ? 10 : "0 10px 10px 0",
            background: b.hot ? "linear-gradient(90deg, rgba(79,141,253,0.95), rgba(34,211,238,0.82))" : "rgba(148,163,184,0.2)",
            boxShadow: b.hot ? "0 0 24px rgba(79,141,253,0.5)" : "none",
          }}
        />
        <span style={{ position: "absolute", right: 12, top: 10, fontSize: 13.5, fontWeight: 700, color: b.hot ? "#081226" : "#7E8CA8", fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </span>
        {b.hot && f > b.at + 20 ? (
          <span style={{ position: "absolute", left: 10, top: 9, fontSize: 12.5, color: "#081226", fontWeight: 800, opacity: clamp01((f - b.at - 20) / 6) }}>
            {counterVal(f, b.at + 20, 10, 17)} murid ✓
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Timer({ f, at }: { f: number; at: number }): React.JSX.Element {
  const t = clamp01((f - at) / 78);
  if (t <= 0) return <span />;
  const total = Math.max(3, 24 - Math.round(t * 21));
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, marginLeft: "auto" }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: t < 0.8 ? "#E9EFFA" : "#F26D6D", fontVariantNumeric: "tabular-nums", width: 22, textAlign: "right" }}>
        {total}s
      </span>
      <svg width={36} height={36} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={t < 0.8 ? "#4F8DFD" : "#F26D6D"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * t}
          transform="rotate(-90 18 18)"
        />
      </svg>
    </span>
  );
}

function LandGlow({ f }: { f: number }): React.JSX.Element | null {
  const a = clamp01((f - 128) / 30) * (1 - clamp01((f - 158) / 22)) * 0.5;
  if (a <= 0.01) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 700,
        top: 520,
        width: 420,
        height: 170,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,212,245,0.14) 0%, rgba(79,212,245,0) 70%)",
        filter: "blur(24px)",
        opacity: a,
      }}
    />
  );
}
