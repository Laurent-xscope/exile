import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const AUTONOMOUS_FRAMES = 390;

export const DashboardAutonomousPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Multi-point spline cursor trajectory (x, y) coordinates
  const cursorX = interpolate(
    frame,
    [0, 45, 90, 140, 160, 200, 215, 260, 310, 350, 390],
    [320, 260, 560, 560, 840, 420, 420, 780, 800, 500, 320],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const cursorY = interpolate(
    frame,
    [0, 45, 90, 140, 160, 200, 215, 260, 310, 350, 390],
    [160, 220, 220, 80, 80, 260, 260, 340, 340, 240, 160],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Click pulse trigger at frames 88, 160, 215, 310
  const clickScale = interpolate(
    frame,
    [
      85, 88, 92,
      157, 160, 164,
      212, 215, 219,
      307, 310, 314,
    ],
    [
      1, 0.8, 1,
      1, 0.8, 1,
      1, 0.8, 1,
      1, 0.78, 1,
    ],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Autonomous active tab switch triggered at frame 160
  const isDiagnosticTabActive = frame >= 160;

  // Spring animation for tab pill indicator
  const tabSlideProgress = spring({
    frame: frame - 160,
    fps,
    config: { damping: 18, mass: 0.6 },
  });

  // KPI Counter count-up interpolation
  const masteryScore = Math.round(
    interpolate(frame, [0, 88, 200, 390], [68, 78, 88, 88], {
      extrapolateRight: "clamp",
    })
  );

  // Live waveform oscillation
  const waveCycle = Math.sin((frame / fps) * Math.PI * 4) * 3;

  // Remedial Button spring recoil
  const buttonSpring = spring({
    frame: frame - 310,
    fps,
    config: { damping: 12, mass: 0.5 },
  });
  const buttonScale = frame >= 310 && frame <= 350 ? 1 + buttonSpring * 0.08 : 1;

  // Toast confirmation notification on remedial click
  const toastY = interpolate(
    frame,
    [312, 330, 370, 390],
    [-80, 20, 20, -80],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "#141312",
        color: "#F3F4F6",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "28px 36px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Ambient background volumetric glow */}
      <div
        style={{
          position: "absolute",
          top: -100,
          left: "25%",
          width: 700,
          height: 400,
          background: "radial-gradient(circle, rgba(220, 86, 71, 0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          right: "10%",
          width: 550,
          height: 350,
          background: "radial-gradient(circle, rgba(212, 155, 53, 0.08) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Action Confirmation Toast */}
      {frame >= 312 && (
        <div
          style={{
            position: "absolute",
            top: toastY,
            right: 40,
            background: "#065F46",
            border: "1px solid #10B981",
            borderRadius: 14,
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 80,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ECFDF5" }}>
            Latihan Remedial Terkirim ke 142 Perangkat Siswa!
          </span>
        </div>
      )}

      {/* Cockpit Window Chrome Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 16,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#10B981" }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: "0.06em",
              marginLeft: 8,
              textTransform: "uppercase",
            }}
          >
            Exile Live Cockpit • Formative Telemetry Stream
          </span>
        </div>

        {/* Autonomous View Switcher Segmented Pill */}
        <div
          style={{
            position: "relative",
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 12,
            padding: 3,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: 12,
            fontWeight: 600,
            overflow: "hidden",
          }}
        >
          {/* Animated Slider Highlight */}
          <div
            style={{
              position: "absolute",
              top: 3,
              bottom: 3,
              left: 3,
              width: "calc(50% - 3px)",
              background: "#DC5647",
              borderRadius: 9,
              transform: `translateX(${tabSlideProgress * 100}%)`,
              transition: "transform 0.05s linear",
              boxShadow: "0 2px 8px rgba(220, 86, 71, 0.4)",
            }}
          />
          <div
            style={{
              position: "relative",
              padding: "6px 14px",
              color: !isDiagnosticTabActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
              zIndex: 2,
            }}
          >
            Grafik Capaian
          </div>
          <div
            style={{
              position: "relative",
              padding: "6px 14px",
              color: isDiagnosticTabActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
              zIndex: 2,
            }}
          >
            Diagnosis Miskonsepsi
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Cards & Live Stream */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Metric Card 1 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: frame >= 45 && frame <= 110 ? "1px solid #DC5647" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 18,
            padding: "16px 18px",
            transition: "border 0.2s ease",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            Rata-rata Capaian Kelas
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#FFFFFF",
              marginTop: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            {masteryScore}%
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>+15.6%</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", marginTop: 4 }}>
            142 siswa terverifikasi di room aktif
          </div>
        </div>

        {/* Metric Card 2 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 18,
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            Waktu Respon Rata-rata
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#FFFFFF",
              marginTop: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            14.2s
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>Siap & Cepat</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", marginTop: 4 }}>
            Batas waktu 20s per soal adaptif
          </div>
        </div>

        {/* Metric Card 3 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 18,
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            Topik Penguatan Terdeteksi
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#DC5647",
              marginTop: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            3 Topik
            <span style={{ fontSize: 12, color: "#DC5647", fontWeight: 600 }}>Perlu Latihan</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", marginTop: 4 }}>
            Tingkat kesalahan pengecoh 42%
          </div>
        </div>
      </div>

      {/* Main Diagnostic Analysis Panel */}
      <div
        style={{
          marginTop: 16,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
              Analisis Tingkat Penguasaan & Diagnosis Konsep
            </div>
            <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.5)", marginTop: 2 }}>
              Tolok ukur empiris literasi sekunder (Undiksha & Balai Bahasa Bali)
            </div>
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 12,
              background: "#DC5647",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              transform: `scale(${buttonScale})`,
              boxShadow: "0 4px 14px rgba(220, 86, 71, 0.4)",
              cursor: "pointer",
            }}
          >
            Kirim Latihan Remedial
          </div>
        </div>

        {/* Progress Item 1 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
              1. Kaidah Tata Santun Bahasa (Alus Sor vs Alus Singgih)
            </span>
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>{68 + waveCycle}% Penguasaan</span>
          </div>
          <div style={{ width: "100%", height: 7, background: "rgba(255, 255, 255, 0.08)", borderRadius: 4 }}>
            <div
              style={{
                width: `${68 + waveCycle}%`,
                height: "100%",
                background: "linear-gradient(90deg, #F59E0B, #DC5647)",
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* Progress Item 2 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
              2. Kaidah Ortografi Pasang Aksara (Gantungan & Adeg-adeg)
            </span>
            <span style={{ color: "#3B82F6", fontWeight: 600 }}>74% Penguasaan</span>
          </div>
          <div style={{ width: "100%", height: 7, background: "rgba(255, 255, 255, 0.08)", borderRadius: 4 }}>
            <div
              style={{
                width: "74%",
                height: "100%",
                background: "#3B82F6",
                borderRadius: 4,
              }}
            />
          </div>
        </div>

        {/* Progress Item 3 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
              3. Sains & Energi Terbarukan (Konversi Daya PLTS Inverter)
            </span>
            <span style={{ color: "#10B981", fontWeight: 600 }}>82% Penguasaan</span>
          </div>
          <div style={{ width: "100%", height: 7, background: "rgba(255, 255, 255, 0.08)", borderRadius: 4 }}>
            <div
              style={{
                width: "82%",
                height: "100%",
                background: "#10B981",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      </div>

      {/* Autonomous Virtual Cursor with Click Compression & Ripple */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          transform: `scale(${clickScale})`,
          pointerEvents: "none",
          zIndex: 99,
          filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.6))",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3L10.5 21L13.5 13.5L21 10.5L3 3Z"
            fill="#FFFFFF"
            stroke="#141312"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {clickScale < 0.95 && (
          <div
            style={{
              position: "absolute",
              top: -6,
              left: -6,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "2px solid #DC5647",
              opacity: 0.8,
              transform: "scale(1.3)",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
