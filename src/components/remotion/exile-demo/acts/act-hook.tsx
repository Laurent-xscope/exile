/* Act 1 — the hook. 0.0s–4.2s of the film.
 * One idea only: the name lands, the promise lands, three proof chips land.
 * Letters arrive as springs, the sheen sweeps once, echo rings sell the beat.
 */
import React from "react";
import { sp, wob, EZ, clamp01 } from "../motion";

const TITLE = "Exile";

function Token({ ch, i, f }: { ch: string; i: number; f: number }): React.JSX.Element {
  const s = sp(f - 2 - i * 3.6, { damping: 13, stiffness: 190 });
  return (
    <span
      style={{
        display: "inline-block",
        opacity: clamp01(s * 1.8),
        transform: `translateY(${(1 - s) * 48}px) scale(${0.72 + 0.28 * s}) rotate(${(1 - s) * -8}deg)`,
        fontSize: 158,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        background: "linear-gradient(150deg, #F4F8FF 8%, #BBD4FF 48%, #6FB7FF 92%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: "drop-shadow(0 10px 34px rgba(64,120,240,0.35))",
      }}
    >
      {ch}
    </span>
  );
}

export function ActHook({ local }: { local: number }): React.JSX.Element {
  const f = local;
  const chips = ["PIN · tanpa akun", "Diagnos AI Gemini", "Remedial otomatis"];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* echo rings behind the mark — the beat made visible */}
      {[26, 40].map((at, k) => {
        const a = clamp01((f - at) / 42);
        if (a <= 0 || a >= 1) return null;
        const r = 120 + 210 * EZ.outCubic(a);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 640 - r,
              top: 298 - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `1.5px solid rgba(126,176,255,${(0.17 * (1 - a)).toFixed(3)})`,
            }}
          />
        );
      })}

      {/* platform overline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 146,
          display: "flex",
          justifyContent: "center",
          opacity: EZ.outCubic(clamp01((f - 4) / 18)),
          transform: `translateY(${(1 - EZ.outCubic(clamp01((f - 4) / 18))) * -16}px)`,
        }}
      >
        <span style={{ fontSize: 15, letterSpacing: "0.34em", color: "#8CA0BD", fontWeight: 600 }}>
          PLATFORM ASESMEN FORMATIF · BAHASA BALI
        </span>
      </div>

      {/* the wordmark — letters spring in, the whole mark breathes forever */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 212 + wob(f * 1.6, 3, 2.6),
          display: "flex",
          justifyContent: "center",
        }}
      >
        {TITLE.split("").map((ch, i) => (
          <Token key={i} ch={ch} i={i} f={f} />
        ))}
      </div>

      {/* sheen sweep across the mark */}
      <Sheen f={f} at={58} />

      {/* brand underline */}
      <div
        style={{
          position: "absolute",
          left: 640 - 110,
          top: 396,
          width: 220,
          height: 3,
          borderRadius: 3,
          transform: `scaleX(${EZ.settle(clamp01((f - 46) / 26))})`,
          background: "linear-gradient(90deg, rgba(78,141,253,0) 0%, #4F8DFD 50%, rgba(34,211,238,0) 100%)",
        }}
      />

      {/* promise line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 438,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pin f={f} at={64} text="siswa menjawab · AI menandai miskonsepsi" />
      </div>

      {/* proof chips */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 520,
          display: "flex",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {chips.map((c, i) => {
          const s = sp(f - 78 - i * 6, { damping: 13 });
          return (
            <div
              key={c}
              style={{
                opacity: clamp01(s * 1.7),
                transform: `translateY(${(1 - s) * 26}px)`,
                padding: "11px 22px",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                color: "#C9D6EC",
                background: "rgba(18,26,44,0.72)",
                border: "1px solid rgba(148,163,184,0.2)",
                boxShadow: "0 8px 26px rgba(2,6,16,0.4)",
              }}
            >
              {c}
            </div>
          );
        })}
      </div>

      {/* corner urls */}
      <div
        style={{
          position: "absolute",
          left: 92,
          bottom: 44,
          fontSize: 13.5,
          color: "#5F6E88",
          letterSpacing: "0.08em",
          opacity: EZ.outCubic(clamp01((f - 88) / 16)),
        }}
      >
        exile.web.id
      </div>
      <div
        style={{
          position: "absolute",
          right: 92,
          bottom: 44,
          fontSize: 13.5,
          color: "#5F6E88",
          letterSpacing: "0.08em",
          opacity: EZ.outCubic(clamp01((f - 96) / 16)),
        }}
      >
        28-detik tour
      </div>
    </div>
  );
}

function Sheen({ f, at }: { f: number; at: number }): React.JSX.Element | null {
  const t = clamp01((f - at) / 34);
  if (f < at) return null;
  const x = -160 + 920 * EZ.inOutQuart(t);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 190,
        width: 150,
        height: 210,
        pointerEvents: "none",
        background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0) 100%)",
        transform: "rotate(6deg)",
        filter: "blur(5px)",
      }}
    />
  );
}

function Pin({ f, at, text }: { f: number; at: number; text: string }): React.JSX.Element {
  const t = EZ.outCubic(clamp01((f - at) / 24));
  return (
    <span style={{ fontSize: 31, fontWeight: 550, color: "#B9C7DF", opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}>
      {text}
    </span>
  );
}
