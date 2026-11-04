/* Act 4 — the diagnostics. One radar draws itself, three chips land,
 * the flagged concept expands with the remedial plan attached.
 */
import React from "react";
import { enterStyle, springStyle, Words, sp, EZ, clamp01, ramp } from "../motion";

const AXES: { label: string; v: number; hot?: boolean }[] = [
  { label: "Aksara", v: 0.88 },
  { label: "Sandhangan", v: 0.42, hot: true },
  { label: "Unggah-ungguh", v: 0.62 },
  { label: "Tematik", v: 0.76 },
  { label: "Graf kelas", v: 0.55 },
];

/* the camera pushes onto the chips column (keys f602+): the left column gets
 * faded before the lens crosses it, same treatment as act 2 */
function radarLeftOp(f: number): number {
  if (f < 40) return 1;
  return 1 - EZ.outCubic(clamp01((f - 40) / 16));
}

export function ActRadar({ local }: { local: number }): React.JSX.Element {
  const f = local;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* ——— left column ——— */}
      <div style={{ position: "absolute", inset: 0, opacity: radarLeftOp(f) }}>
      <div style={{ position: "absolute", left: 88, top: 166, ...enterStyle(f, { delay: 2, dur: 18 }) }}>
        <span style={{ fontSize: 11.5, letterSpacing: "0.3em", color: "#C7A6FF", fontWeight: 700, padding: "6px 12px", borderRadius: 7, background: "rgba(30,17,52,0.7)", border: "1px solid rgba(199,166,255,0.3)" }}>
          DIAGNOS AI GEMINI
        </span>
      </div>
      <div style={{ position: "absolute", left: 88, top: 214 }}>
        <Words
          f={f}
          at={6}
          size={54}
          weight={750}
          toks={[
            { t: "Titik" },
            { t: "buta," },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 88, top: 280 }}>
        <Words
          f={f}
          at={14}
          size={54}
          weight={750}
          toks={[
            { t: "ketemu.", accent: true },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 88, top: 372, width: 340 }}>
        <Words
          f={f}
          at={28}
          per={3}
          rise={16}
          size={18}
          weight={470}
          toks={[
            { t: "Guru", soft: true },
            { t: "lihat", soft: true },
            { t: "konsep", soft: true },
            { t: "yang", soft: true },
            { t: "gagal,", soft: true },
            { t: "bukan", soft: true },
            { t: "cuma", soft: true },
            { t: "angka", soft: true },
            { t: "benar–salah.", soft: true },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 88, top: 470, ...enterStyle(f, { delay: 46, dur: 16 }) }}>
        <span style={{ fontSize: 12.5, color: "#5F6E88", fontWeight: 550 }}>analisis per-konsep · bukan skor mentah</span>
      </div>
      </div>

      {/* ——— radar panel ——— */}
      <div
        style={{
          position: "absolute",
          left: 476,
          top: 140,
          width: 380,
          height: 430,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(20,19,42,0.96), rgba(14,17,36,0.94))",
          border: "1px solid rgba(148,163,184,0.16)",
          boxShadow: "0 30px 74px rgba(2,6,16,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          ...springStyle(f, { delay: 4, dir: "up", dist: 32, damping: 15 }),
        }}
      >
        <span style={{ position: "absolute", left: 20, top: 16, fontSize: 11.5, letterSpacing: "0.26em", color: "#8CA0BD", fontWeight: 700 }}>
          PETA KELAS · 28 MURID
        </span>
        <Radar f={f} />
      </div>

      {/* ——— chips column ——— */}
      <Chips f={f} />
    </div>
  );
}

function Radar({ f }: { f: number }): React.JSX.Element {
  /* svg is 420 wide, inset -20 into the 380 panel → labels keep their tails
   * ("Sandhangan", "Graf kelas") instead of clipping at the viewBox edge */
  const cx = 210;
  const cy = 196;
  const R = 140;
  const pt = (i: number, rMult: number): [number, number] => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return [cx + Math.cos(a) * R * rMult, cy + Math.sin(a) * R * rMult];
  };
  const ring = (k: number): string =>
    [0, 1, 2, 3, 4].map((i) => pt(i, k).join(",")).join(" ");
  const poly = AXES.map((ax, i) => {
    const s = sp(f - 10 - i * 2.5, { damping: 16, stiffness: 130 });
    return pt(i, ax.v * clamp01(s * 1.18));
  });
  const sweepA = f * 0.06 * (Math.PI / 6) - 1.4;

  return (
    <svg width="420" height="386" viewBox="0 0 420 386" style={{ position: "absolute", left: -20, top: 40 }}>
      {/* rings */}
      {[0.33, 0.66, 1].map((k, i) => (
        <polygon key={i} points={ring(k)} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={1} />
      ))}
      {/* spokes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />;
      })}
      {/* rotating sweep: a short filled trailing wedge under the scan line */}
      <polygon
        points={`${cx},${cy} ${cx + Math.cos(sweepA) * R},${cy + Math.sin(sweepA) * R} ${
          cx + Math.cos(sweepA - 0.42) * R
        },${cy + Math.sin(sweepA - 0.42) * R}`}
        fill="rgba(110,168,255,0.07)"
      />
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(sweepA) * R}
        y2={cy + Math.sin(sweepA) * R}
        stroke="rgba(139,168,255,0.4)"
        strokeWidth={2}
      />
      {/* the class polygon */}
      <polygon
        points={poly.map((p) => p.join(",")).join(" ")}
        fill="rgba(110,168,255,0.12)"
        stroke="rgba(126,178,255,0.85)"
        strokeWidth={2}
      />
      {/* vertices + labels */}
      {AXES.map((ax, i) => {
        const [px, py] = poly[i];
        const hot = ax.hot === true;
        const hotOn = hot && f > 40 + i * 2;
        const pulse = 5 + 2.4 * Math.abs(Math.sin(f * 0.14 + i));
        const [lx, ly] = pt(i, 1.18);
        return (
          <g key={ax.label}>
            {hotOn && hot ? (
              <circle cx={px} cy={py} r={pulse} fill="none" stroke="rgba(242,109,109,0.6)" strokeWidth={1.6} />
            ) : null}
            <circle cx={px} cy={py} r={4.4} fill={hotOn && hot ? "#F26D6D" : "#EAF2FF"} stroke="#0A1322" strokeWidth={1.4} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill={hotOn && hot ? "#F26D6D" : "#8CA0BD"}
            >
              {ax.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Chips({ f }: { f: number }): React.JSX.Element {
  const exp = sp(f - 92, { damping: 16, stiffness: 140 });
  const h1 = ramp(f, 92, 22, 92, 148, EZ.outQuart);
  return (
    <div style={{ position: "absolute", left: 920, top: 196, width: 272, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* chip 1 — the flagged one, expands */}
      <div
        style={{
          width: 272,
          height: h1,
          borderRadius: 15,
          background: "linear-gradient(180deg, rgba(43,24,28,0.96), rgba(30,17,30,0.94))",
          border: "1px solid rgba(242,109,109,0.42)",
          boxShadow: `0 18px 44px rgba(2,6,16,0.5), 0 0 ${22 * clamp01(exp)}px rgba(242,109,109,${0.3 * clamp01(exp)})`,
          padding: "15px 17px",
          overflow: "hidden",
          ...springStyle(f, { delay: 20, dir: "right", dist: 34, damping: 14 }),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: "#FFC9C9" }}>Sandhangan × 12</span>
          <span style={{ fontSize: 11.5, color: "#F26D6D", fontWeight: 700, letterSpacing: "0.08em" }}>⚠ 12/28</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "#C7A0A0", fontWeight: 520 }}>ra vs ra tar — sering tertukar</div>
        {f > 96 ? (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(242,109,109,0.25)", paddingTop: 10, display: "flex", alignItems: "center", gap: 9, opacity: clamp01(exp * 1.4) }}>
            <span style={{ fontSize: 13, fontWeight: 750, color: "#FFD873" }}>Remedi: 8 soal · jumat</span>
            <span style={{ fontSize: 15, color: "#F26D6D", marginLeft: "auto" }}>→</span>
          </div>
        ) : null}
      </div>

      {/* chip 2 */}
      <div
        style={{
          width: 272,
          height: 92,
          borderRadius: 15,
          background: "rgba(17,25,44,0.9)",
          border: "1px solid rgba(148,163,184,0.2)",
          padding: "15px 17px",
          ...springStyle(f, { delay: 34, dir: "right", dist: 34, damping: 14 }),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15.5, fontWeight: 750, color: "#E9EFFA" }}>Unggah-ungguh × 7</span>
          <span style={{ fontSize: 11.5, color: "#8CA0BD" }}>7/28</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "#7E8CA8" }}>alus / lapid masih campur</div>
      </div>

      {/* chip 3 */}
      <div
        style={{
          width: 272,
          height: 92,
          borderRadius: 15,
          background: "rgba(15,33,28,0.9)",
          border: "1px solid rgba(52,211,153,0.35)",
          padding: "15px 17px",
          ...springStyle(f, { delay: 46, dir: "right", dist: 34, damping: 14 }),
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15.5, fontWeight: 750, color: "#C8F7DF" }}>Aksara ✓</span>
          <span style={{ fontSize: 11.5, color: "#8EF0C1" }}>23/28</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "#7EA891" }}>aman, lanjut materi</div>
      </div>
    </div>
  );
}

