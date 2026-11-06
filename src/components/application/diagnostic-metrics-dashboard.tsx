"use client";

import React, { useState } from "react";
import {
  RiBarChartGroupedLine,
  RiTableLine,
  RiSparklingLine,
  RiCheckLine,
  RiAlertLine,
  RiTimeLine,
  RiUserVoiceLine,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { Chip } from "@/components/base/badges/chip";

interface CompetencyData {
  id: string;
  topic: string;
  masteryPercent: number;
  studentsAssessed: number;
  primaryWeakPoint: string;
  remedialTarget: string;
  severity: "low" | "medium" | "high";
  trend: string;
}

const METRICS_DATA: CompetencyData[] = [
  {
    id: "COMP-01",
    topic: "Organel sel (mitokondria vs lisosom)",
    masteryPercent: 68,
    studentsAssessed: 142,
    primaryWeakPoint: "Menganggap lisosom pembentuk ATP (seharusnya mitokondria respirasi seluler)",
    remedialTarget: "Latihan komparasi organel 3-soal adaptif",
    severity: "high",
    trend: "+14% setelah feedback",
  },
  {
    id: "COMP-02",
    topic: "Fotosintesis (reaksi terang vs siklus Calvin)",
    masteryPercent: 82,
    studentsAssessed: 138,
    primaryWeakPoint: "Mengira reaksi gelap tidak membutuhkan produk reaksi terang (ATP & NADPH)",
    remedialTarget: "Drill fisiologi kloroplas & stroma",
    severity: "medium",
    trend: "+9% konsisten",
  },
  {
    id: "COMP-03",
    topic: "Transpor membran (difusi vs transpor aktif)",
    masteryPercent: 91,
    studentsAssessed: 156,
    primaryWeakPoint: "Tertukar arah ion pompa Na+/K+ terhadap gradien konsentrasi",
    remedialTarget: "Refleksi kasus transpor membran sel",
    severity: "low",
    trend: "+6% optimal",
  },
  {
    id: "COMP-04",
    topic: "Sintesis protein (transkripsi & translasi)",
    masteryPercent: 74,
    studentsAssessed: 120,
    primaryWeakPoint: "Tertukar fungsi triplet kodon mRNA dengan antikodon tRNA di ribosom",
    remedialTarget: "Simulasi pembacaan kodon ribosom",
    severity: "medium",
    trend: "+18% perbaikan",
  },
];

export function DiagnosticMetricsDashboard({
  className = "",
  showViewToggle = true,
}: {
  className?: string;
  showViewToggle?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"graph" | "table">("graph");
  const [selectedCompId, setSelectedCompId] = useState<string>("COMP-01");

  const activeComp = METRICS_DATA.find((c) => c.id === selectedCompId) || METRICS_DATA[0];

  return (
    <div
      className={cx(
        "rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8 shadow-card space-y-6 transition-all",
        className
      )}
    >
      {/* Header Row: Title & Minimalist Tab Pill (Shadcn style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-separator-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-caption-2-semibold tracking-wider text-text-tertiary">
              Telemetri evaluasi langsung
            </span>
            <Chip variant="caption" color="blue">
              Langsung
            </Chip>
          </div>
          <h3 className="text-title-3-semibold sm:text-title-2-semibold text-text-primary tracking-tight">
            Metrik penguasaan siswa
          </h3>
          <p className="text-body-2-regular text-text-secondary max-w-2xl">
            Hasil agregasi formatif otomatis dari ruang kuis kelas.
          </p>
        </div>

        {/* Minimalist Segmented Pill Toggle */}
        {showViewToggle && (
          <div className="inline-flex items-center p-1 rounded-xl bg-background-secondary-default border border-border-button-default shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={cx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption-1-medium transition-all cursor-pointer",
                viewMode === "graph"
                  ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiBarChartGroupedLine className="size-3.5" />
              <span>Grafik distribusi</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption-1-medium transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-background-primary-default text-text-primary shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <RiTableLine className="size-3.5" />
              <span>Tabel data rinci</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Row (Shadcn Card Aesthetics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-1">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium">Rata-rata penguasaan</span>
            <RiSparklingLine className="size-4 text-accent-700" />
          </div>
          <div className="text-title-2-bold font-mono text-text-primary">78.7%</div>
          <span className="text-caption-2-regular text-emerald-600 dark:text-emerald-400 block">
            +11.8% dari kuis awal
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-1">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium">Total sampel jawaban</span>
            <RiUserVoiceLine className="size-4 text-text-tertiary" />
          </div>
          <div className="text-title-2-bold font-mono text-text-primary">556</div>
          <span className="text-caption-2-regular text-text-secondary block">
            Tersebar di 4 modul
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-1">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium">Topik perlu ulasan</span>
            <RiAlertLine className="size-4 text-amber-500" />
          </div>
          <div className="text-title-2-bold font-mono text-text-primary">4 klaster</div>
          <span className="text-caption-2-regular text-text-secondary block">
            Dirangkum dari hasil kuis
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border-button-default bg-background-secondary-default/50 space-y-1">
          <div className="flex items-center justify-between text-text-tertiary">
            <span className="text-caption-2-medium">Rata-rata respon soal</span>
            <RiTimeLine className="size-4 text-text-tertiary" />
          </div>
          <div className="text-title-2-bold font-mono text-text-primary">14.2s</div>
          <span className="text-caption-2-regular text-text-secondary block">
            Batas timer: 20s
          </span>
        </div>
      </div>

      {/* Main Panel: Graph View OR Table View */}
      {viewMode === "graph" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Minimalist Bar Graph Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-caption-1-medium text-text-secondary">
              <span>Kompetensi materi pelajaran</span>
              <span>Tingkat pemahaman</span>
            </div>

            <div className="space-y-3">
              {METRICS_DATA.map((item) => {
                const isSelected = item.id === selectedCompId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCompId(item.id)}
                    className={cx(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer select-none space-y-2",
                      isSelected
                        ? "border-accent-500 bg-background-secondary-default shadow-xs"
                        : "border-border-button-default bg-background-secondary-default/40 hover:bg-background-secondary-default/80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-body-2-semibold text-text-primary">
                          {item.topic}
                        </span>
                        {item.severity === "high" && (
                          <span className="inline-flex size-2 rounded-full bg-rose-500" title="Prioritas Remedial Tinggi" />
                        )}
                      </div>
                      <span className="font-mono text-body-2-bold text-text-primary tabular-nums">
                        {item.masteryPercent}%
                      </span>
                    </div>

                    {/* Minimalist Progress Track */}
                    <div className="h-2 w-full rounded-full bg-border-button-default overflow-hidden">
                      <div
                        className={cx(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          item.masteryPercent >= 85
                            ? "bg-emerald-500"
                            : item.masteryPercent >= 70
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        )}
                        style={{ width: `${item.masteryPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-caption-2-regular text-text-tertiary pt-0.5">
                      <span>{item.studentsAssessed} siswa teruji</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                        {item.trend}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drill-down Detail Card (Shadcn Clean Card) */}
          <div className="lg:col-span-5 rounded-2xl border border-border-button-default bg-background-secondary-default p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-separator-border">
              <div className="space-y-0.5">
                <span className="text-caption-2-medium text-text-tertiary tracking-wider block">
                  Topik terpilih
                </span>
                <h4 className="text-title-3-semibold text-text-primary">
                  {activeComp.topic}
                </h4>
              </div>
              <span className="font-mono text-headline-bold text-text-primary">
                {activeComp.masteryPercent}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-caption-1-semibold text-amber-600 dark:text-amber-400">
                  <RiAlertLine className="size-4 shrink-0" />
                  <span>Catatan jawaban siswa:</span>
                </div>
                <p className="text-body-2-regular text-text-secondary leading-relaxed pl-5">
                  {activeComp.primaryWeakPoint}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-caption-1-semibold text-blue-600 dark:text-blue-400">
                  <RiCheckLine className="size-4 shrink-0" />
                  <span>Rekomendasi tindak lanjut:</span>
                </div>
                <p className="text-body-2-regular text-text-secondary leading-relaxed pl-5">
                  {activeComp.remedialTarget}
                </p>
              </div>

              <div className="pt-2">
                <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default flex items-center justify-between text-caption-1-medium">
                  <span className="text-text-secondary">Status kurikulum merdeka</span>
                  <span className="text-text-primary font-semibold">Fase d (smp)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Minimalist Clean Table View (Shadcn style data-table) */
        <div className="rounded-2xl border border-border-button-default overflow-hidden bg-background-secondary-default">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-caption-1-regular">
              <thead className="bg-background-primary-default/80 border-b border-separator-border text-text-secondary">
                <tr>
                  <th className="py-3 px-4 text-start font-medium">Topik kompetensi</th>
                  <th className="py-3 px-4 text-start font-medium">Siswa</th>
                  <th className="py-3 px-4 text-start font-medium">Tingkat penguasaan</th>
                  <th className="py-3 px-4 text-start font-medium">Catatan jawaban</th>
                  <th className="py-3 px-4 text-end font-medium">Tren</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator-border">
                {METRICS_DATA.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-background-primary-hover/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      {row.topic}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary font-mono">
                      {row.studentsAssessed}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-border-button-default overflow-hidden">
                          <div
                            className={cx(
                              "h-full rounded-full",
                              row.masteryPercent >= 85
                                ? "bg-emerald-500"
                                : row.masteryPercent >= 70
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            )}
                            style={{ width: `${row.masteryPercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-body-2-bold text-text-primary">
                          {row.masteryPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary max-w-xs truncate" title={row.primaryWeakPoint}>
                      {row.primaryWeakPoint}
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {row.trend}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
