"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  RiBookOpenLine,
  RiArrowRightLine,
  RiQuillPenLine,
  RiPlayCircleLine,
  RiHashtag,
  RiRefreshLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import { Spinner } from "@/components/base/spinner/spinner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { SettingsButton } from "@/components/settings/settings-modal";
import { UserNav } from "@/components/auth/user-nav";
import { DiagnosticMetricsDashboard } from "@/components/application/diagnostic-metrics-dashboard";
import { useAuth } from "@/lib/auth/use-auth";
import { useExileSettings } from "@/lib/settings/user-settings";
import { soundEffects } from "@/lib/audio/sounds";
import { ExileLogo } from "@/components/brand/exile-logo";
import { cx } from "@/utils/cx";

const ExileProductDemo = dynamic(
  () => import("@/components/remotion/ExileProductDemo"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[16/9] rounded-3xl bg-background-primary-default border border-border-button-default flex flex-col items-center justify-center gap-3 text-text-secondary">
        <Spinner size="md" aria-label="Memuat trailer..." />
      </div>
    ),
  }
);

interface DemoOption {
  label: string;
  text: string;
  isCorrect: boolean;
  rationale: string;
}

interface WorkbenchModule {
  id: "modul-1" | "modul-2" | "modul-3";
  shortTitle: string;
  category: "Anggah-ungguhing Basa" | "Pasang Aksara" | "Tri Hita Karana";
  question: string;
  concept: string;
  options: DemoOption[];
  flashcard: {
    front: string;
    backTitle: string;
    backDetail: string;
  };
}

const WORKBENCH_MODULES: Record<"modul-1" | "modul-2" | "modul-3", WorkbenchModule> = {
  "modul-1": {
    id: "modul-1",
    shortTitle: "Tingkatan Bahasa Bali",
    category: "Anggah-ungguhing Basa",
    concept: "Alus Sor (ASO) vs Alus Singgih (ASI)",
    question:
      "Ketika berbicara kepada Bapak atau Ibu Guru di sekolah, kata yang tepat digunakan untuk menyebut diri sendiri agar sesuai dengan etika kesantunan berbahasa Bali adalah...",
    options: [
      {
        label: "A",
        text: "Titiang",
        isCorrect: true,
        rationale:
          "Tepat! Kata Alus Sor (ASO) 'Titiang' digunakan untuk merendahkan diri sendiri di hadapan orang yang dihormati seperti guru (prinsip: hormati orang lain, rendahkan diri sendiri).",
      },
      {
        label: "B",
        text: "Icang",
        isCorrect: false,
        rationale:
          "Miskonsepsi: 'Icang' adalah Basa Andap (ragam ngoko/akrab) yang hanya boleh dipakai kepada teman sebaya yang sudah sangat dekat.",
      },
      {
        label: "C",
        text: "Kai",
        isCorrect: false,
        rationale:
          "Keliru: 'Kai' adalah kata ganti orang pertama ragam kasar yang dilarang digunakan dalam komunikasi formal di sekolah.",
      },
      {
        label: "D",
        text: "Iraga",
        isCorrect: false,
        rationale:
          "Pengecoh: 'Iraga' adalah kata ganti jamak (kita/kami), kurang tepat untuk merujuk diri tunggal secara santun di depan guru.",
      },
    ],
    flashcard: {
      front: "Apa kata Alus Singgih (ASI) untuk kata 'berbicara/ngomong' ketika ditujukan kepada Bapak Guru?",
      backTitle: "Ngandika",
      backDetail:
        "Digunakan untuk menghormati orang yang ditinggikan (Guru). Jika untuk diri sendiri saat berbicara ke guru, gunakan kata Alus Sor: 'Matur'.",
    },
  },
  "modul-2": {
    id: "modul-2",
    shortTitle: "Pasang Aksara Bali",
    category: "Pasang Aksara",
    concept: "Aturan Adeg-adeg & Gantungan",
    question:
      "Menurut Pedoman Pasang Aksara Bali Baku, penempatan tanda adeg-adeg (tanda pemati vokal) yang benar dalam penulisan kalimat adalah...",
    options: [
      {
        label: "A",
        text: "Di akhir kata atau akhir kalimat tepat sebelum tanda carik.",
        isCorrect: true,
        rationale:
          "Tepat! Adeg-adeg hanya boleh diletakkan di akhir kata atau akhir kalimat sebelum tanda carik (titik/koma).",
      },
      {
        label: "B",
        text: "Di tengah kata untuk menggantikan gantungan aksara.",
        isCorrect: false,
        rationale:
          "Miskonsepsi: Konsonan mati di tengah kata wajib menggunakan gantungan atau gempelan, tidak boleh menggunakan adeg-adeg.",
      },
      {
        label: "C",
        text: "Di awal kalimat sebelum aksara wianjana.",
        isCorrect: false,
        rationale:
          "Keliru: Adeg-adeg berfungsi mematikan vokal pada aksara sebelumnya, sehingga tidak mungkin diletakkan di awal kalimat.",
      },
      {
        label: "D",
        text: "Di setiap kata yang memuat pengangge suara ulu.",
        isCorrect: false,
        rationale:
          "Pengecoh: Ulu adalah penanda vokal /i/, bukan tanda pemati konsonan.",
      },
    ],
    flashcard: {
      front: "Aksara wianjana apa saja yang bentuk pasangannya ditulis sejajar di sebelah kanan (gempelan)?",
      backTitle: "Pa, Sa, dan Pa Kapal",
      backDetail:
        "Pasangan aksara Pa, Sa, dan Pa Kapal ditulis sejajar di kanan aksara yang dimatikan (disebut gempelan), sedangkan aksara lainnya ditulis menggantung di bawah (gantungan).",
    },
  },
  "modul-3": {
    id: "modul-3",
    shortTitle: "Tri Hita Karana",
    category: "Tri Hita Karana",
    concept: "Pawongan & Demokrasi Adat Subak",
    question:
      "Krama subak mengadakan paruman (musyawarah) untuk menyepakati jadwal giliran air sawah secara adil. Kegiatan ini mencerminkan pengamalan nilai Tri Hita Karana pada pilar...",
    options: [
      {
        label: "A",
        text: "Parahyangan",
        isCorrect: false,
        rationale:
          "Miskonsepsi: Parahyangan berfokus pada hubungan spiritual antara manusia dengan Tuhan (upacara di Pura Ulun Danu / Pura Subak).",
      },
      {
        label: "B",
        text: "Pawongan",
        isCorrect: true,
        rationale:
          "Tepat! Musyawarah mufakat dan gotong royong antarpetani mencerminkan keharmonisan hubungan sesama manusia (Pawongan).",
      },
      {
        label: "C",
        text: "Palemahan",
        isCorrect: false,
        rationale:
          "Pengecoh: Palemahan berfokus pada hubungan manusia dengan kelestarian alam dan saluran irigasi.",
      },
      {
        label: "D",
        text: "Wariga",
        isCorrect: false,
        rationale:
          "Pengecoh: Wariga adalah sistem kalender dan perhitungan hari baik (dewasa ayu), bukan bagian dari Tri Hita Karana.",
      },
    ],
    flashcard: {
      front: "Siapa pemimpin adat yang dipilih krama subak untuk mengatur pembagian air irigasi secara adil?",
      backTitle: "Pekaseh (Kelian Subak)",
      backDetail:
        "Pekaseh dipilih secara demokratis oleh petani (krama) untuk mengatur pembagian air (tektek), memimpin musyawarah, dan menegakkan aturan adat (awig-awig).",
    },
  },
};

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useExileSettings();

  const [pinInput, setPinInput] = useState("");
  const [joiningPin, setJoiningPin] = useState(false);
  const [creatingQuickRoom, setCreatingQuickRoom] = useState(false);

  const [activeModuleKey, setActiveModuleKey] = useState<"modul-1" | "modul-2" | "modul-3">("modul-1");
  const [isFlipped, setIsFlipped] = useState(false);

  const currentModule = WORKBENCH_MODULES[activeModuleKey];

  const handleSwitchWorkbenchModule = (modKey: "modul-1" | "modul-2" | "modul-3") => {
    soundEffects.playClick();
    setActiveModuleKey(modKey);
    setIsFlipped(false);
  };

  const handleStudentJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!cleanPin || cleanPin.length < 4) {
      toast.error("Masukkan minimal 4 digit PIN ruangan kuis.");
      return;
    }

    setJoiningPin(true);
    soundEffects.playClick();

    try {
      const nickname =
        (typeof window !== "undefined" && localStorage.getItem("exile_player_nickname")) ||
        settings.defaultNickname ||
        "Siswa Exile";
      const avatar =
        (typeof window !== "undefined" && localStorage.getItem("exile_player_avatar")) ||
        settings.defaultAvatar ||
        "garuda";

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: cleanPin,
          nickname,
          avatar,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 404 || !res.ok || !data.success) {
        toast.error("Ruang kelas dengan PIN tersebut tidak ditemukan.");
        return;
      }

      if (data.playerId && typeof window !== "undefined") {
        localStorage.setItem("exile_player_id", data.playerId);
        sessionStorage.setItem("exile_player_id", data.playerId);
      }

      toast.success(`Bergabung ke ruangan ${cleanPin}!`);
      router.push(`/play/${cleanPin}`);
    } catch {
      toast.error("Ruang kelas dengan PIN tersebut tidak ditemukan.");
    } finally {
      setJoiningPin(false);
    }
  };

  const handleQuickCreateRoom = async () => {
    soundEffects.playClick();
    if (!user) {
      toast.info("Silakan masuk sebagai pengajar untuk membuat ruang kuis kelas.");
      router.push("/login?next=/studio");
      return;
    }

    setCreatingQuickRoom(true);
    try {
      const hostName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        settings.defaultNickname ||
        "Pengajar Exile";

      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName,
          settings: {
            timePerQuestionSec: settings.defaultQuestionTimeSec,
            streakBonus: settings.streakBonusEnabled,
            shuffleQuestions: settings.shuffleQuestions,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat ruangan.");
      }
      toast.success(`Ruangan berhasil dibuat! PIN: ${data.roomCode}`);
      router.push(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat ruangan.";
      toast.error(msg);
    } finally {
      setCreatingQuickRoom(false);
    }
  };

  const studioHref = user ? "/studio" : "/login?next=/studio";

  return (
    <div className="min-h-screen bg-background-full text-text-primary flex flex-col justify-between transition-colors">
      <header className="border-b border-separator-border bg-background-primary-default/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ExileLogo size={36} showText={false} />
            <div>
              <span className="text-headline-semibold text-text-primary block tracking-tight">
                Exile
              </span>
              <span className="text-caption-2-semibold text-text-secondary block">
                Asesmen Formatif & Analisis Kelas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <SettingsButton />
            <UserNav />
          </div>
        </div>
      </header>

      <section className="py-12 sm:py-16 border-b border-separator-border bg-background-secondary-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <h1 className="text-title-1-semibold sm:text-display-2-bold text-text-primary leading-tight">
                Platform Asesmen Formatif & Diagnostik Miskonsepsi Basa Bali
              </h1>
              <p className="text-body-regular text-text-secondary max-w-2xl text-base sm:text-lg">
                Ubah silabus dan materi ajar menjadi kuis interaktif kelas secara instan. Deteksi kekeliruan siswa antara <strong>Alus Singgih</strong> dan <strong>Alus Sor</strong>, kuasai aturan penulisan <strong>Pasang Aksara</strong>, serta bangun pemahaman mendalam tentang kearifan lokal <strong>Tri Hita Karana</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink
                href={studioHref}
                variant="primary"
                size="medium"
                leadingIcon={RiQuillPenLine}
              >
                Buka Studio Ajar
              </ButtonLink>

              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={handleQuickCreateRoom}
                disabled={creatingQuickRoom}
                leadingIcon={creatingQuickRoom ? undefined : RiPlayCircleLine}
              >
                {creatingQuickRoom ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" aria-hidden />
                    <span>Menyiapkan Ruangan...</span>
                  </span>
                ) : (
                  "Buat Ruang Kuis Instan"
                )}
              </Button>

            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-background-primary-default border border-border-button-default shadow-card space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-title-3-semibold text-text-primary block">
                    Masuk Arena Siswa
                  </span>
                  <span className="text-caption-1-regular text-text-secondary">
                    Bergabung ke kuis langsung dengan PIN guru
                  </span>
                </div>
              </div>

              <form onSubmit={handleStudentJoin} className="space-y-3">
                <InputBase
                  aria-label="Masukkan PIN Ruangan Kuis"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Masukkan 6-digit PIN kelas..."
                  leadingIcon={RiHashtag}
                  fieldClassName="bg-background-secondary-default rounded-xl"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  disabled={joiningPin}
                  trailingIcon={joiningPin ? undefined : RiArrowRightLine}
                  className="w-full justify-center"
                >
                  {joiningPin ? "Menghubungkan..." : "Gabung ke Ruang Kuis"}
                </Button>
              </form>
            </div>

            <div className="p-4 rounded-2xl bg-background-secondary-default border border-border-button-default flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-background-primary-default border border-border-button-default flex items-center justify-center text-accent-700">
                  <RiShieldCheckLine className="size-5" />
                </div>
                <div>
                  <div className="text-body-2-semibold text-text-primary">
                    Portal Khusus Pengajar
                  </div>
                  <div className="text-caption-2-regular text-text-secondary">
                    Kelola materi, bank soal, dan diagnostik otomatis
                  </div>
                </div>
              </div>
              <ButtonLink href={studioHref} variant="secondary" size="small">
                {user ? "Buka Studio" : "Login Guru"}
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section id="telemetry-metrics" className="py-12 sm:py-16 border-b border-separator-border bg-background-secondary-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <DiagnosticMetricsDashboard />
        </div>
      </section>

      <section id="demo-remotion" className="py-12 sm:py-16 border-b border-separator-border bg-background-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-title-2-semibold sm:text-title-1-semibold text-text-primary">
              Trailer Perdana exile.org
            </h2>
          </div>

          <ExileProductDemo />
        </div>
      </section>

      <section
        id="uji-cepat"
        className="py-12 sm:py-16 border-b border-separator-border bg-background-secondary-default"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-title-2-semibold sm:text-title-1-semibold text-text-primary">
                Kartu Belajar Budaya Bali
              </h2>
              <p className="text-body-regular text-text-secondary max-w-2xl">
                Pilih modul di bawah untuk membalik kartu pemahaman konsep.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(["modul-1", "modul-2", "modul-3"] as const).map((modKey) => {
                const mod = WORKBENCH_MODULES[modKey];
                const isActive = activeModuleKey === modKey;
                return (
                  <Button
                    key={modKey}
                    type="button"
                    variant={isActive ? "primary" : "secondary"}
                    size="small"
                    onClick={() => handleSwitchWorkbenchModule(modKey)}
                  >
                    {mod.shortTitle}
                  </Button>
                );
              })}
            </div>
          </div>

            <div className="max-w-2xl mx-auto bg-background-primary-default border border-border-button-default rounded-3xl p-6 space-y-5 flex flex-col justify-between shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-2-semibold text-text-primary">
                  {currentModule.shortTitle}
                </span>
              </div>

              <div
                className="relative min-h-[240px] w-full perspective-1000 cursor-pointer select-none"
                style={{ perspective: "1000px" }}
                onClick={() => {
                  soundEffects.playClick();
                  setIsFlipped((prev) => !prev);
                }}
              >
                <div
                  className="relative min-h-[240px] w-full transition-transform duration-500 preserve-3d"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className="absolute inset-0 backface-hidden rounded-2xl border border-border-button-default bg-background-secondary-default p-5 flex flex-col justify-between shadow-card"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-center justify-between">
                      <Chip variant="caption" color="blue">
                        Pertanyaan Konseptual
                      </Chip>
                      <RiRefreshLine className="size-4 text-text-tertiary" />
                    </div>
                    <div className="my-auto text-center px-2">
                      <p className="text-body-semibold text-text-primary text-base sm:text-lg leading-relaxed">
                        {currentModule.flashcard.front}
                      </p>
                    </div>
                    <span className="text-caption-1-medium text-text-tertiary text-center">
                      Klik kartu untuk membalik & melihat jawaban
                    </span>
                  </div>

                  <div
                    className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border border-border-button-default bg-background-secondary-default p-5 flex flex-col justify-between shadow-card"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <Chip variant="caption" color="lime">
                        Kunci Jawaban & Rasional
                      </Chip>
                      <RiRefreshLine className="size-4 text-text-tertiary" />
                    </div>
                    <div className="my-auto text-center px-2 space-y-1.5">
                      <p className="text-title-3-semibold text-text-primary">
                        {currentModule.flashcard.backTitle}
                      </p>
                      <p className="text-body-2-regular text-text-secondary leading-relaxed">
                        {currentModule.flashcard.backDetail}
                      </p>
                    </div>
                    <span className="text-caption-1-medium text-text-tertiary text-center">
                      Klik untuk membalik kembali
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <ButtonLink
                  href={user ? `/studio?module=${currentModule.id}` : `/login?next=${encodeURIComponent(`/studio?module=${currentModule.id}`)}`}
                  variant="primary"
                  size="small"
                  trailingIcon={RiArrowRightLine}
                >
                  Latih di Studio
                </ButtonLink>
              </div>
            </div>
        </div>
      </section>

      <footer className="border-t border-separator-border py-6 bg-background-primary-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center">
          <p className="text-caption-1-regular text-text-tertiary">
            © 2026 Exile
          </p>
        </div>
      </footer>
    </div>
  );
}
