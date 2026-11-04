/* Act 2 — the studio. Paste the syllabus, watch the quiz build itself.
 * The camera dives into the panel (the paste zone), settles back for the
 * fan-out of generated cards, then closes on card one before the cut.
 */
import React from "react";
import { enterStyle, Words, cursorAt, Cursor, sp, EZ, clamp01, ramp, wob } from "../motion";

const CLICK_F = 76;
const CURSOR_WAYS = [
  { f: 24, x: 964, y: 248, dwell: 4 },
  { f: CLICK_F, x: 1063, y: 528, click: true, e: EZ.settle },
  { f: 148, x: 1180, y: 640, e: EZ.settle },
];

/* the "67 syllabus chars" that pour in after the click */
const PASTE_ROWS = [
  { w: 396, hot: true },
  { w: 352, hot: false },
  { w: 404, hot: false },
  { w: 300, hot: false },
];

const CARDS = [
  { id: "Q1 · Sandhangan", target: { x: 700, y: 348 }, rot: -4.2, quick: 0 },
  { id: "Q2 · Aksara", target: { x: 896, y: 322 }, rot: 3.6, quick: 8 },
  { id: "Q3 · Unggah-ungguh", target: { x: 764, y: 452 }, rot: 5.2, quick: 16 },
];

export function ActPaste({ local }: { local: number }): React.JSX.Element {
  const f = local;
  const pasted = f >= CLICK_F;
  const pose = cursorAt(CURSOR_WAYS, f);
  const panelTf = panelIn(f);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* ——— left column ——— */}
      <div style={{ position: "absolute", left: 96, top: 168, ...enterStyle(f, { delay: 2, dur: 20, dir: "up", dist: 18 }), opacity: leftColOp(f) }}>
        <Chip txt="EXILE STUDIO" tone="cool" />
      </div>
      <div style={{ position: "absolute", left: 96, top: 216, opacity: leftColOp(f) }}>
        <Words
          f={f}
          at={6}
          size={58}
          weight={750}
          toks={[
            { t: "Tempel" },
            { t: "silabus," },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 96, top: 286, opacity: leftColOp(f) }}>
        <Words
          f={f}
          at={14}
          size={58}
          weight={750}
          per={2.6}
          toks={[
            { t: "kuis", accent: true },
            { t: "langsung", accent: true },
            { t: "jadi." },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 96, top: 384, width: 430, opacity: leftColOp(f) }}>
        <Words
          f={f}
          at={30}
          per={3}
          rise={18}
          size={19.5}
          weight={480}
          toks={[
            { t: "Teks", soft: true },
            { t: "ditempel,", soft: true },
            { t: "Exile", soft: true },
            { t: "menyusun", soft: true },
            { t: "butir", soft: true },
            { t: "soal,", soft: true },
            { t: "opsi", soft: true },
            { t: "jawab,", soft: true },
            { t: "dan", soft: true },
            { t: "jadwal", soft: true },
            { t: "remedial", soft: true },
            { t: "—", soft: true },
            { t: "tanpa", soft: true },
            { t: "template.", soft: true },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 96, top: 480, display: "flex", gap: 10, opacity: leftColOp(f), ...enterStyle(f, { delay: 52, dur: 18 }) }}>
        <Stat v="12" l="kartu soal" />
        <Stat v="8" l="tipe soal" />
        <Stat v="1" l="klik" />
      </div>

      {/* ——— the studio panel ——— */}
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 132,
          width: 560,
          height: 448,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(16,24,42,0.96) 0%, rgba(12,18,32,0.94) 100%)",
          border: "1px solid rgba(148,163,184,0.17)",
          boxShadow: "0 34px 80px rgba(2,6,16,0.55), inset 0 1px 0 rgba(255,255,255,0.055)",
          transform: `${panelTf ? panelTf : ""}`,
          opacity: panelTf ? 1 : 0,
        }}
      >
        {/* toolbar */}
        <div style={{ position: "relative", height: 44, display: "flex", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "0 18px", gap: 7 }}>
          {[0, 1, 2].map((d) => (
            <div key={d} style={{ width: 9, height: 9, borderRadius: "50%", background: d === 0 ? "#4D5D7D" : "#2C3550" }} />
          ))}
          <span style={{ marginLeft: 10, fontSize: 13.5, color: "#8CA0BD", fontWeight: 600 }}>Exile Studio — Kelas Ganeswara</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#5F6E88" }}>silabus.txt</span>
        </div>

        {/* paste zone */}
        <div style={{ position: "absolute", left: 26, top: 60, right: 26, height: 158, borderRadius: 14 }}>
          {!pasted ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "1.5px dashed rgba(148,163,184,0.24)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  color: "#7E8CA8",
                  fontWeight: 520,
                  opacity: 0.65 + 0.35 * Math.abs(Math.sin(f * 0.06)),
                }}
              >
                Tempel teks silabus di sini…
              </span>
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,28,0.75)", border: "1px solid rgba(110,168,255,0.3)", borderRadius: 14, overflow: "hidden", padding: "16px 20px" }}>
              {PASTE_ROWS.map((r, i) => {
                const s = sp(f - CLICK_F - 2 - i * 4, { damping: 16, stiffness: 180 });
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15, opacity: clamp01(s * 1.8), transform: `translateX(${(1 - s) * -18}px)` }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.hot ? "#6EA8FF" : "#3D4A66" }} />
                    <div
                      style={{
                        height: r.hot ? 16 : 13,
                        width: r.w * clamp01(s * 1.25),
                        borderRadius: 7,
                        background: r.hot ? "linear-gradient(90deg, rgba(110,168,255,0.9), rgba(79,212,245,0.75))" : "rgba(148,163,184,0.24)",
                      }}
                    />
                  </div>
                );
              })}
              <div style={{ position: "absolute", right: 14, bottom: 10, fontSize: 12, color: "#6EA8FF", opacity: clamp01((f - CLICK_F) / 8) * 0.9 * (1 - clamp01((f - 148) / 14)) }}>
                924 huruf · bab terbaca
              </div>
            </div>
          )}
        </div>

        {/* generate button */}
        <GenButton f={f} pasted={pasted} />
      </div>

      {/* generated cards flying out of the button */}
      {CARDS.map((c, i) => (
        <FlightCard
          key={c.id}
          f={f}
          at={112 + c.quick}
          spawn={{ x: 1050, y: 516 }}
          target={c.target}
          rot={c.rot}
          label={c.id}
          checked={i === 0}
        />
      ))}

      {/* sparkle tick on card 1 */}
      {f >= 176 && f < 226 ? <Spark f={f - 176} x={724} y={362} /> : null}

      <Cursor pose={pose} />
    </div>
  );
}

/* camera dive (keys f128–188) flies the lens over the left column: fade it
 * out before the close-up starts, hand it back once the view is wide again */
function leftColOp(f: number): number {
  if (f < 106) return 1;
  if (f < 176) return 1 - EZ.outCubic(clamp01((f - 106) / 14));
  return EZ.outCubic(clamp01((f - 176) / 18));
}

function panelIn(f: number): string {
  const s = sp(f - 4, { damping: 15 });
  if (s <= 0) return "";
  return `translateY(${(1 - s) * 34}px)`;
}

function GenButton({ f, pasted }: { f: number; pasted: boolean }): React.JSX.Element {
  const press = f >= CLICK_F && f < CLICK_F + 7 ? ramp(f, CLICK_F, 3, 0.9, 1, EZ.outCubic) : 1;
  /* label ↔ state is a true cross-fade: outgoing label fades WHILE it slides,
   * incoming state slides from the other side — never both visible hard-on */
  const swap = pasted ? clamp01((f - CLICK_F - 4) / 10) : 0;
  const labelOp = pasted ? 1 - swap : 1;
  const labelX = pasted ? -16 * EZ.outCubic(swap) : 0;
  const stateOp = swap;
  const stateX = 14 * (1 - swap);
  const done = f > 150;
  const readyS = clamp01((f - 150) / 8);
  return (
    <div
      style={{
        position: "absolute",
        left: 388,
        bottom: 26,
        width: 150,
        height: 48,
        borderRadius: 12,
        transform: `scale(${press})`,
        background: done ? "rgba(52,63,86,0.9)" : "linear-gradient(135deg, #4F8DFD 0%, #22D3EE 100%)",
        border: done ? "1px solid rgba(110,168,255,0.4)" : "none",
        boxShadow: done ? "0 6px 20px rgba(2,6,16,0.35)" : "0 10px 30px rgba(66,140,250,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span style={{ position: "absolute", fontSize: 15.5, fontWeight: 700, color: "#F4F8FF", opacity: labelOp, transform: `translateX(${labelX}px)` }}>Buat Kuis ✦</span>
      {pasted ? (
        <span style={{ position: "absolute", fontSize: 14, fontWeight: 650, color: "#F4F8FF", opacity: stateOp, transform: `translateX(${stateX}px)`, display: "flex", gap: 7, alignItems: "center" }}>
          {done ? (
            <span style={{ opacity: readyS, transform: `translateY(${(1 - readyS) * 9}px)`, display: "inline-block" }}>12 kartu ✓</span>
          ) : (
            <>
              Menyusun
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ opacity: 0.35 + 0.65 * Math.abs(Math.sin((f - CLICK_F - d * 4) * 0.19)), display: "inline-block" }}>·</span>
              ))}
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

function FlightCard({
  f,
  at,
  spawn,
  target,
  rot,
  label,
  checked,
}: {
  f: number;
  at: number;
  spawn: { x: number; y: number };
  target: { x: number; y: number };
  rot: number;
  label: string;
  checked: boolean;
}): React.JSX.Element | null {
  if (f < at) return null;
  const s = sp(f - at, { damping: 15, stiffness: 150 });
  const x = (spawn.x + (target.x - spawn.x) * s) - 100;
  const y = (spawn.y + (target.y - spawn.y) * s) - 38;
  const wobble = wob(f, at, 1.4);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 200,
        height: 76,
        borderRadius: 12,
        background: "linear-gradient(180deg, rgba(21,30,52,0.97), rgba(15,22,40,0.95))",
        border: "1px solid rgba(148,163,184,0.2)",
        boxShadow: "0 16px 40px rgba(2,6,16,0.5)",
        transform: `rotate(${rot + wobble * 0.6}deg) scale(${0.7 + 0.3 * clamp01(s)})`,
        opacity: clamp01(s * 1.6),
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#E9EFFA" }}>{label}</span>
        {checked ? (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(52,211,153,0.18)", border: "1px solid rgba(52,211,153,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#8EF0C1", fontWeight: 800, opacity: clamp01((f - 170) / 8) }}>✓</div>
        ) : (
          <span style={{ fontSize: 11, color: "#5F6E88" }}>4 opsi</span>
        )}
      </div>
      <div style={{ marginTop: 9, height: 11, width: 150 * 0.82, borderRadius: 6, background: "rgba(148,163,184,0.2)" }} />
      <div style={{ marginTop: 7, height: 11, width: 150 * 0.56, borderRadius: 6, background: "rgba(148,163,184,0.12)" }} />
    </div>
  );
}

/* tiny sparkle ring when card one arrives */
function Spark({ f, x, y }: { f: number; x: number; y: number }): React.JSX.Element {
  const a = clamp01(f / 22);
  const r = 10 + 26 * EZ.outCubic(a);
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `1.5px solid rgba(142,240,193,${0.55 * (1 - a)})`,
      }}
    />
  );
}

function Chip({ txt, tone }: { txt: string; tone: "cool" | "warn" | "good" }): React.JSX.Element {
  const color = tone === "good" ? "#8EF0C1" : tone === "warn" ? "#FFD873" : "#8CA6E8";
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.3em",
        color,
        padding: "6px 12px 6px 13px",
        borderRadius: 7,
        border: `1px solid ${color === "#8CA6E8" ? "rgba(140,166,232,0.3)" : "rgba(148,163,184,0.22)"}`,
        background: "rgba(13,20,36,0.65)",
      }}
    >
      {txt}
    </span>
  );
}

function Stat({ v, l }: { v: string; l: string }): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: "#E9EFFA" }}>{v}</span>
      <span style={{ fontSize: 13, color: "#5F6E88", fontWeight: 550 }}>{l}</span>
    </div>
  );
}


