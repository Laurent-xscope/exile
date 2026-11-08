"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  RiQuillPenLine,
  RiPlayCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiRefreshLine,
  RiHashtag,
  RiMessage3Line,
} from "@remixicon/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/base/buttons/button";
import { LetterpressCard3D } from "./letterpress-card-3d";
import { cx } from "@/utils/cx";

export interface LiveDeskAlchemyProps {
  onCreateRoom: () => void;
  isEn?: boolean;
  className?: string;
}

type LessonKey = "stem" | "biology" | "heritage";

interface LessonData {
  id: LessonKey;
  tag: string;
  tagEn: string;
  tabLabel: string;
  tabLabelEn: string;
  rawSheet: {
    manuscriptId: string;
    curriculumCode: string;
    title: string;
    titleEn: string;
    sub: string;
    subEn: string;
    body: string;
    bodyEn: string;
    marginalia: string;
    marginaliaEn: string;
  };
  artifactA: {
    topic: string;
    topicEn: string;
    frontQuestion: string;
    frontQuestionEn: string;
    backPrinciple: string;
    backPrincipleEn: string;
    rationale: string;
    rationaleEn: string;
    application: string;
    applicationEn: string;
  };
  artifactB: {
    question: string;
    questionEn: string;
    options: Array<{
      id: "A" | "B" | "C";
      text: string;
      textEn: string;
      isCorrect: boolean;
      feedback: string;
      feedbackEn: string;
    }>;
  };
  artifactC: {
    roomTitle: string;
    roomTitleEn: string;
    chatExcerpt: {
      studentName: string;
      studentQuery: string;
      studentQueryEn: string;
      copilotAnswer: string;
      copilotAnswerEn: string;
    };
  };
}

const LESSONS: Record<LessonKey, LessonData> = {
  stem: {
    id: "stem",
    tag: "Fisika & energi terbarukan",
    tagEn: "Physics & renewable energy",
    tabLabel: "Sains & energi",
    tabLabelEn: "Science & energy",
    rawSheet: {
      manuscriptId: "MS-ENG-2026/04",
      curriculumCode: "Kurikulum Merdeka SMA XII • Fisika Terapan",
      title: "Catatan Kuliah: Konversi Fotovoltaik & Inverter",
      titleEn: "Lecture notes: Photovoltaic Conversion & Inverters",
      sub: "Prinsip pembalikan arus searah DC menuju sinusoidal AC 220V",
      subEn: "Inverting DC direct current into 220V sinusoidal AC waveforms",
      body: "Pada instalasi PLTS atap, foton surya menumbuk kristal silikon dan melepaskan elektron bebas menghasilkan arus DC. Namun jaringan utilitas rumah tangga membutuhkan arus bolak-balik AC 220V/50Hz yang tersinkronisasi murni. Diperlukan modul inverter fotovoltaik dengan teknik modulasi lebar pulsa (PWM) untuk mencegah distorsi harmonik pada motor kulkas dan beban induktif.",
      bodyEn: "In rooftop PV installations, photons excite silicon semiconductors releasing free electrons to generate DC. Domestic household grids require synchronized pure sinusoidal 220V/50Hz AC. A photovoltaic inverter utilizing PWM pulse-width modulation is required to prevent destructive harmonic distortion in refrigerator motors and inductive appliances.",
      marginalia: "Catatan guru: Tekankan bahwa baterai menyimpan DC, bukan AC.",
      marginaliaEn: "Teacher note: Emphasize that chemical batteries store DC, not AC.",
    },
    artifactA: {
      topic: "Konversi daya PLTS",
      topicEn: "Solar PV power conversion",
      frontQuestion: "Mengapa sistem PLTS wajib memakai inverter gelombang sinus murni untuk beban domestik?",
      frontQuestionEn: "Why is a pure sine-wave inverter mandatory for domestic solar PV loads?",
      backPrinciple: "Sinkronisasi fase & eliminasi distorsi total harmonik",
      backPrincipleEn: "Phase synchronization & total harmonic distortion elimination",
      rationale: "Gelombang modifikasi (square wave) memicu lonjakan panas berlebih pada lilitan stator motor induktif.",
      rationaleEn: "Modified square waves induce severe thermal runaways in inductive stator motor coils.",
      application: "Melindungi kompresor pendingin dan pompa air rumah tangga dari keausan prematur.",
      applicationEn: "Shields household refrigeration compressors and water pumps from premature degradation.",
    },
    artifactB: {
      question: "Komponen manakah yang bertugas membalik arus DC dari panel surya menjadi AC berdaya 220V?",
      questionEn: "Which component turns solar direct current (DC) into 220V alternating current (AC)?",
      options: [
        {
          id: "A",
          text: "Inverter fotovoltaik murni",
          textEn: "Pure photovoltaic inverter",
          isCorrect: true,
          feedback: "Tepat! Inverter adalah komponen kunci untuk mensintesis gelombang AC 50Hz berstandar PLN.",
          feedbackEn: "Correct! The inverter synthesizes the 50Hz pure AC wave matching utility grid standards.",
        },
        {
          id: "B",
          text: "Transformator step-up konvensional",
          textEn: "Conventional step-up transformer",
          isCorrect: false,
          feedback: "Kurang tepat. Transformator hanya menaikkan atau menurunkan tegangan AC, tidak membalik DC menjadi AC.",
          feedbackEn: "Incorrect. Transformers scale AC voltage levels, but cannot invert DC into AC.",
        },
        {
          id: "C",
          text: "Solar charge controller MPPT",
          textEn: "MPPT solar charge controller",
          isCorrect: false,
          feedback: "Kurang tepat. MPPT mengoptimalkan pengisian daya DC ke bank baterai, bukan mengubah jenis arus.",
          feedbackEn: "Incorrect. MPPT controllers optimize DC charge transfer into batteries, not current inversion.",
        },
      ],
    },
    artifactC: {
      roomTitle: "Evaluasi Konsep: PLTS & Transisi Energi",
      roomTitleEn: "Concept Evaluation: Solar PV & Grid Sync",
      chatExcerpt: {
        studentName: "Aditya (Siswa)",
        studentQuery: "Apakah frekuensi inverter harus pas 50Hz?",
        studentQueryEn: "Must the inverter frequency match exactly 50Hz?",
        copilotAnswer: "Tepat! Jika frekuensi bergeser di atas toleransi, motor rumah tangga akan berdengung dan kelebihan beban.",
        copilotAnswerEn: "Precisely! If frequency drifts beyond tolerances, household motors hum and overheat.",
      },
    },
  },
  biology: {
    id: "biology",
    tag: "Biologi sel & biokimia",
    tagEn: "Cell biology & biochemistry",
    tabLabel: "Biologi sel",
    tabLabelEn: "Cell biology",
    rawSheet: {
      manuscriptId: "MS-BIO-2026/02",
      curriculumCode: "Kurikulum Merdeka SMA XI • Biologi Eukariotik",
      title: "Catatan Praktikum: Organel & Respirasi Seluler",
      titleEn: "Laboratory notes: Organelles & Cellular Respiration",
      sub: "Jalur metabolisme aerobik dan sintesis molekul ATP pada mitokondria",
      subEn: "Aerobic metabolic pathway and ATP synthesis in mitochondria",
      body: "Mitokondria merupakan organel bermembran ganda yang bertindak sebagai pembangkit tenaga utama sel eukariotik. Membran dalamnya berlipat-lipat membentuk krista untuk memaksimalkan luas permukaan tempat menempelnya enzim transpor elektron dan kompleks ATP sintase. Glikolisis di sitosol dilanjutkan siklus Krebs di matriks menghasilkan gradien proton.",
      bodyEn: "Mitochondria are double-membraned organelles acting as the prime energy powerhouses of eukaryotic cells. The inner membrane folds into cristae to maximize surface area for electron transport complexes and ATP synthase enzymes. Cytosolic glycolysis feeds into the matrix Krebs cycle to power proton gradients.",
      marginalia: "Catatan praktikum: Ingat bahwa eritrosit mamalia dewasa tidak memiliki mitokondria.",
      marginaliaEn: "Lab note: Remember mature mammalian erythrocytes lack mitochondria.",
    },
    artifactA: {
      topic: "Fisiologi membran dalam",
      topicEn: "Inner membrane physiology",
      frontQuestion: "Mengapa lipatan krista membran dalam mitokondria sangat menentukan laju sintesis ATP?",
      frontQuestionEn: "Why are inner mitochondrial cristae folds vital to cellular ATP synthesis rates?",
      backPrinciple: "Ekspansi luas permukaan kompleks kemiosmosis",
      backPrincipleEn: "Surface area expansion for chemiosmotic complexes",
      rationale: "Semakin luas membran dalam, semakin banyak rantai transpor elektron dan pompa proton F0F1 yang dapat beroperasi simultan.",
      rationaleEn: "Greater membrane surface area accommodates higher densities of electron transport chains and F0F1 ATP synthase rotors.",
      application: "Sel otot jantung memiliki densitas krista tertinggi untuk mendukung kontraksi konstan seumur hidup.",
      applicationEn: "Cardiac muscle cells maintain the highest cristae density to power non-stop lifelong contractions.",
    },
    artifactB: {
      question: "Organel manakah yang berperan sebagai produsen utama energi ATP melalui rantai respirasi aerobik?",
      questionEn: "Which organelle acts as the prime producer of cellular ATP through aerobic respiration?",
      options: [
        {
          id: "A",
          text: "Mitokondria",
          textEn: "Mitochondria",
          isCorrect: true,
          feedback: "Tepat! Mitokondria menghasilkan lebih dari 30 ATP per molekul glukosa via fosforilasi oksidatif.",
          feedbackEn: "Correct! Mitochondria yield over 30 ATP per glucose molecule via oxidative phosphorylation.",
        },
        {
          id: "B",
          text: "Badan golgi",
          textEn: "Golgi apparatus",
          isCorrect: false,
          feedback: "Kurang tepat. Badan golgi bertugas memodifikasi, menyortir, dan mengemas glikoprotein untuk sekresi.",
          feedbackEn: "Incorrect. The Golgi apparatus modifies, sorts, and packages glycoproteins for cellular secretion.",
        },
        {
          id: "C",
          text: "Ribosom sitoplasmik",
          textEn: "Cytoplasmic ribosomes",
          isCorrect: false,
          feedback: "Kurang tepat. Ribosom menyintesis rantai polipeptida protein dari cetakan mRNA.",
          feedbackEn: "Incorrect. Ribosomes synthesize polypeptide chains from mRNA templates, rather than ATP.",
        },
      ],
    },
    artifactC: {
      roomTitle: "Kuis Diagnostik: Metabolisme & Sel Hewan",
      roomTitleEn: "Diagnostic Quiz: Cellular Metabolism",
      chatExcerpt: {
        studentName: "Nadia (Siswa)",
        studentQuery: "Mengapa gradien proton penting dalam sintesis ATP?",
        studentQueryEn: "Why is the proton gradient essential for ATP synthesis?",
        copilotAnswer: "Gradien ion H+ menghasilkan gaya gerak proton (PMF) yang memutar rotor mekanik enzim ATP sintase.",
        copilotAnswerEn: "The H+ gradient generates the proton motive force (PMF) that physically turns the ATP synthase rotor.",
      },
    },
  },
  heritage: {
    id: "heritage",
    tag: "Bahasa, sastra & muatan lokal",
    tagEn: "Language, literature & regional heritage",
    tabLabel: "Bahasa & budaya",
    tabLabelEn: "Language & heritage",
    rawSheet: {
      manuscriptId: "MS-SAS-2026/07",
      curriculumCode: "Kurikulum Merdeka SMA X • Sastra & Budaya Nusantara",
      title: "Arsip Naskah: Struktur Estetika Pantun Klasik",
      titleEn: "Manuscript Archive: Aesthetic Structure of Classical Pantun",
      sub: "Korelasi semantik antara bait sampiran dengan amanat filosofis isi",
      subEn: "Semantic correlation between foreshadowing sampiran and moral message",
      body: "Pantun adalah bentuk puisi lisan terikat khas Nusantara yang terdiri atas empat larik berima silang a-b-a-b. Dua baris pertama adalah sampiran yang menggambarkan fenomena alam, flora, fauna, atau keseharian masyarakat. Dua baris berikutnya adalah isi yang menyampaikan pesan moral, nasihat etika, atau kebijaksanaan hidup nenek moyang.",
      bodyEn: "Pantun is a structured oral verse native to the Nusantara archipelago consisting of four lines in an a-b-a-b rhyme scheme. The first two lines form the sampiran reflecting natural phenomena, flora, fauna, or daily village life. The final two lines deliver the core philosophical advice, ethical wisdom, or social commentary.",
      marginalia: "Catatan kurikulum: Pantun diakui UNESCO sebagai Warisan Budaya Takbenda Dunia.",
      marginaliaEn: "Curriculum note: Pantun is inscribed on UNESCO's Intangible Cultural Heritage list.",
    },
    artifactA: {
      topic: "Struktur puitika nusantara",
      topicEn: "Nusantara poetic structure",
      frontQuestion: "Apa fungsi kognitif dan fonetis bait sampiran dalam tradisi mendengarkan pantun?",
      frontQuestionEn: "What is the cognitive and acoustic role of sampiran in oral pantun traditions?",
      backPrinciple: "Penyelarasan asosiasi bunyi & kesiapan penerimaan pesan",
      backPrincipleEn: "Acoustic priming & psychological receptivity",
      rationale: "Sampiran membangun keindahan musikalitas vokal dan rima akhir sehingga pikiran pendengar siap menyerap amanat isi.",
      rationaleEn: "Sampiran primes phonetic vocal harmony and cadenced expectations, preparing listener receptivity for the moral payload.",
      application: "Digunakan dalam musyawarah adat dan diplomasi pernikahan Melayu untuk melembutkan komunikasi antar-keluarga.",
      applicationEn: "Employed in traditional village councils and diplomatic wedding negotiations to soften persuasive dialogues.",
    },
    artifactB: {
      question: "Dalam pantun empat baris, bagian manakah yang memuat pesan moral atau amanat filosofis utama?",
      questionEn: "In a four-line pantun, which specific lines carry the actual core moral message?",
      options: [
        {
          id: "A",
          text: "Baris 3 dan 4 (bagian isi)",
          textEn: "Lines 3 and 4 (content body)",
          isCorrect: true,
          feedback: "Tepat! Dua larik terakhir merupakan 'isi' yang mengikat amanat nasihat dan budi pekerti.",
          feedbackEn: "Correct! The final two lines are the 'isi' holding the ethical wisdom and direct advice.",
        },
        {
          id: "B",
          text: "Baris 1 dan 2 (bagian sampiran)",
          textEn: "Lines 1 and 2 (sampiran couplet)",
          isCorrect: false,
          feedback: "Kurang tepat. Baris 1 dan 2 adalah sampiran (pembayang suasana alam), bukan amanat utama.",
          feedbackEn: "Incorrect. Lines 1 and 2 form the sampiran (natural imagery prelude), not the core message.",
        },
        {
          id: "C",
          text: "Hanya baris kedua saja",
          textEn: "Only the second line",
          isCorrect: false,
          feedback: "Kurang tepat. Baris genap pertama masih bagian dari sampiran pembangun rima.",
          feedbackEn: "Incorrect. The second line remains part of the introductory sampiran rhyme.",
        },
      ],
    },
    artifactC: {
      roomTitle: "Apresiasi Sastra: Pantun & Peribahasa",
      roomTitleEn: "Literary Appreciation: Pantun & Lore",
      chatExcerpt: {
        studentName: "Rizki (Siswa)",
        studentQuery: "Bolehkah pantun berima a-a-a-a seperti syair?",
        studentQueryEn: "Can pantun rhyme a-a-a-a like syair poems?",
        copilotAnswer: "Secara kaidah kanonik, pantun empat larik wajib bersajak silang a-b-a-b. Rima a-a-a-a adalah ciri khas bentuk syair.",
        copilotAnswerEn: "Canonically, four-line pantun strictly follow a-b-a-b. Uniform a-a-a-a rhymes designate the syair form.",
      },
    },
  },
};

function TactileSpoilerPin({ isEn }: { isEn?: boolean }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [previewPin, setPreviewPin] = useState<string | null>(null);

  const triggerReveal = () => {
    if (!previewPin) {
      const p1 = Math.floor(100 + Math.random() * 900);
      const p2 = Math.floor(100 + Math.random() * 900);
      setPreviewPin(`${p1} ${p2}`);
    }
    setIsRevealed((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={triggerReveal}
      onPointerEnter={() => {
        if (!previewPin) {
          const p1 = Math.floor(100 + Math.random() * 900);
          const p2 = Math.floor(100 + Math.random() * 900);
          setPreviewPin(`${p1} ${p2}`);
        }
        setIsRevealed(true);
      }}
      className={cx(
        "group relative w-full py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer text-center",
        "bg-background-primary-default hover:bg-background-secondary-hover border border-border-button-default",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring outline-none"
      )}
      aria-label={isEn ? "Reveal room pin code preview" : "Buka kode pin ruangan"}
    >
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span
          className={cx(
            "font-mono text-title-1-bold tracking-wider transition-all duration-300 select-all",
            isRevealed && previewPin
              ? "text-accent-700 filter-none"
              : "text-text-tertiary blur-[2px] group-hover:blur-none"
          )}
        >
          {isRevealed && previewPin ? previewPin : "••• •••"}
        </span>
        <span className="text-[11px] text-text-tertiary transition-opacity group-hover:opacity-100 opacity-60">
          {isRevealed
            ? isEn
              ? "tap to hide"
              : "klik untuk tutup"
            : isEn
            ? "hover or tap to reveal"
            : "arahkan kursor atau sentuh untuk intip"}
        </span>
      </div>
    </button>
  );
}

export function LiveDeskAlchemy({
  onCreateRoom,
  isEn = false,
  className,
}: LiveDeskAlchemyProps) {
  const [activeLessonKey, setActiveLessonKey] = useState<LessonKey>("stem");
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<"A" | "B" | "C" | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const lesson = LESSONS[activeLessonKey];

  // Auto unfold smoothly when user scrolls into stage
  useEffect(() => {
    if (isUnfolded) return;
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          setIsUnfolded(true);
          observer.disconnect();
        }
      },
      { threshold: [0.2] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isUnfolded]);

  const handleLessonChange = (key: LessonKey) => {
    setActiveLessonKey(key);
    setSelectedQuizOption(null);
  };

  const handleToggleUnfold = useCallback(() => {
    setIsUnfolded((prev) => !prev);
    setSelectedQuizOption(null);
  }, []);

  const selectedOptionData = lesson.artifactB.options.find(
    (opt) => opt.id === selectedQuizOption
  );

  return (
    <section
      ref={stageRef}
      aria-label={isEn ? "Live desk alchemy interactive transformation" : "Meja transformasi materi interaktif"}
      className={cx(
        "relative w-full rounded-3xl border border-border-button-default overflow-hidden",
        "bg-background-secondary-default/90 backdrop-blur-sm",
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {/* Tactile desk surface background texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply dark:mix-blend-overlay"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 20%, rgba(120, 80, 40, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(120, 80, 40, 0.4) 0%, transparent 40%),
            repeating-linear-gradient(45deg, rgba(80, 60, 40, 0.25) 0px, rgba(80, 60, 40, 0.25) 1px, transparent 1px, transparent 8px)
          `,
        }}
      />

      {/* Stage desk edge top bar */}
      <div className="relative z-10 px-4 sm:px-6 py-3.5 border-b border-separator-border flex flex-wrap items-center justify-between gap-3 bg-background-primary-default/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-accent-600 animate-pulse" aria-hidden="true" />
          <span className="text-caption-1-semibold text-text-primary tracking-wide">
            {isEn ? "Live Desk Alchemy" : "Meja transformasi materi"}
          </span>
          <span className="hidden sm:inline-block text-caption-2-medium text-text-tertiary">
            • {isEn ? "Raw sheet → Interactive artifacts" : "Naskah mentah → 3 Artifak interaktif"}
          </span>
        </div>

        {/* 3 Real Curriculum Lesson Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background-secondary-default border border-border-button-default">
          {(Object.keys(LESSONS) as LessonKey[]).map((key) => {
            const item = LESSONS[key];
            const isActive = activeLessonKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleLessonChange(key)}
                className={cx(
                  "px-3 py-1 rounded-lg text-caption-2-medium transition-all cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-accent-600",
                  isActive
                    ? "bg-accent-600 text-text-white shadow-xs font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-tertiary-default"
                )}
              >
                {isEn ? item.tabLabelEn : item.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Fold / Unfold Action Toggle */}
        <button
          type="button"
          onClick={handleToggleUnfold}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover text-caption-2-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
        >
          <RiRefreshLine
            className={cx(
              "size-3.5 transition-transform duration-300",
              isUnfolded && "rotate-180"
            )}
            aria-hidden="true"
          />
          <span>
            {isUnfolded
              ? isEn
                ? "Fold back to raw sheet"
                : "Lipat kembali ke naskah"
              : isEn
              ? "Unfold into artifacts"
              : "Olahan artifak"}
          </span>
        </button>
      </div>

      {/* Main Workspace Stage */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 min-h-[520px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isUnfolded ? (
            /* RAW LESSON SHEET (RESTING ON DESK) */
            <motion.div
              key={`raw-${activeLessonKey}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, rotate: -2 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -0.8 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-2xl"
            >
              <div
                className={cx(
                  "relative rounded-2xl bg-background-primary-default border border-border-button-default p-6 sm:p-8 space-y-6",
                  "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-4px_rgba(0,0,0,0.12),0_2px_0_var(--color-border-button-default)]",
                  "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:bg-background-primary-default/40"
                )}
              >
                {/* Paper texture overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply dark:mix-blend-screen rounded-2xl"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(0deg, rgba(80, 50, 20, 0.35) 0px, rgba(80, 50, 20, 0.35) 1px, transparent 1px, transparent 4px),
                      repeating-linear-gradient(90deg, rgba(80, 50, 20, 0.35) 0px, rgba(80, 50, 20, 0.35) 1px, transparent 1px, transparent 4px)
                    `,
                  }}
                />

                {/* Sheet Header & Archival Stamp */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-separator-border">
                  <div className="space-y-1">
                    <span className="inline-block text-caption-2-medium text-text-tertiary">
                      {lesson.rawSheet.curriculumCode}
                    </span>
                    <h3
                      className={cx(
                        "text-title-2-semibold text-text-primary tracking-tight font-display"
                      )}
                    >
                      {isEn ? lesson.rawSheet.titleEn : lesson.rawSheet.title}
                    </h3>
                    <p className="text-body-2-regular text-text-secondary">
                      {isEn ? lesson.rawSheet.subEn : lesson.rawSheet.sub}
                    </p>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="font-mono text-caption-2-medium px-2 py-1 rounded bg-background-secondary-default border border-border-button-default text-text-tertiary block">
                      {lesson.rawSheet.manuscriptId}
                    </span>
                  </div>
                </div>

                {/* Raw Manuscript Excerpt */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-background-secondary-default/70 border border-separator-border text-body-2-regular text-text-primary leading-relaxed">
                    <p>{isEn ? lesson.rawSheet.bodyEn : lesson.rawSheet.body}</p>
                  </div>

                  <div className="flex items-center gap-2 text-caption-2-medium text-text-secondary italic">
                    <span className="size-1.5 rounded-full bg-accent-600 shrink-0" aria-hidden="true" />
                    <span>{isEn ? lesson.rawSheet.marginaliaEn : lesson.rawSheet.marginalia}</span>
                  </div>
                </div>

                {/* Tactile Terracotta Copper Seal Trigger */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-separator-border">
                  <span className="text-caption-2-medium text-text-tertiary text-center sm:text-start">
                    {isEn
                      ? "Raw syllabus note • Ready for live pedagogical synthesis"
                      : "Naskah kurikulum mentah • Siap diolah menjadi artifak hidup"}
                  </span>

                  <button
                    type="button"
                    onClick={handleToggleUnfold}
                    className={cx(
                      "relative group px-5 py-2.5 rounded-full cursor-pointer select-none outline-none",
                      "bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-text-white font-medium text-caption-1-semibold",
                      "shadow-[0_2px_8px_rgba(201,64,48,0.35),0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.25)]",
                      "transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0",
                      "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      "flex items-center gap-2.5 shrink-0"
                    )}
                  >
                    <div className="size-5 rounded-full bg-background-primary-default/20 flex items-center justify-center shrink-0">
                      <RiQuillPenLine className="size-3 text-text-white" aria-hidden="true" />
                    </div>
                    <span>
                      {isEn ? "Tap to unfold into artifacts" : "Sentuh untuk mengolah materi"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* THREE PHYSICAL UNFOLDED ARTIFACTS (FANNING OUT WITH SPRING PHYSICS) */
            <motion.div
              key={`artifacts-${activeLessonKey}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 26,
                mass: 1.1,
              }}
              className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
            >
              {/* ARTIFACT A: PLAYABLE "KARTU 3D" (LETTERPRESS COTTON LINEN) */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption-2-semibold text-text-tertiary tracking-wider">
                    {isEn ? "Artifact A • 3D card" : "Artifak A • Kartu 3D"}
                  </span>
                  <span className="text-caption-2-medium text-accent-700">
                    {isEn ? "Hover/tap to flip" : "Kursor / sentuh balik"}
                  </span>
                </div>

                <LetterpressCard3D
                  minHeightClassName="min-h-[380px]"
                  ariaLabel={isEn ? "Artifact A 3D flashcard" : "Artifak A kartu flashcard 3D"}
                  frontContent={
                    <div className="flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-separator-border">
                        <span className="text-caption-2-semibold px-2.5 py-0.5 rounded-full bg-background-primary-default border border-border-button-default text-text-primary">
                          {isEn ? lesson.artifactA.topicEn : lesson.artifactA.topic}
                        </span>
                        <div className="flex items-center gap-1 text-caption-2-medium text-text-tertiary">
                          <RiRefreshLine className="size-3" aria-hidden="true" />
                          <span>{isEn ? "Front face" : "Sisi soal"}</span>
                        </div>
                      </div>

                      <div className="my-auto py-2">
                        <p
                          className={cx(
                            "text-title-3-semibold text-text-primary leading-snug font-display"
                          )}
                        >
                          {isEn ? lesson.artifactA.frontQuestionEn : lesson.artifactA.frontQuestion}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-separator-border flex items-center justify-between text-caption-2-medium text-text-tertiary">
                        <span>{isEn ? "Click or sweep to reveal rationale" : "Klik atau geser kursor untuk membalik"}</span>
                        <span className="size-1.5 rounded-full bg-accent-600" aria-hidden="true" />
                      </div>
                    </div>
                  }
                  backContent={
                    <div className="flex flex-col justify-between h-full space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-separator-border">
                        <span className="text-caption-2-semibold px-2.5 py-0.5 rounded-full bg-badge-new-background text-badge-new-text border border-border-button-default">
                          {isEn ? "Rationale & rule" : "Rasional ilmiah"}
                        </span>
                        <span className="text-caption-2-medium text-text-tertiary">
                          {isEn ? "Back face" : "Sisi jawaban"}
                        </span>
                      </div>

                      <div className="space-y-2.5 my-auto py-1">
                        <h4
                          className={cx(
                            "text-title-3-semibold text-text-primary font-display"
                          )}
                        >
                          {isEn ? lesson.artifactA.backPrincipleEn : lesson.artifactA.backPrinciple}
                        </h4>

                        <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default space-y-1">
                          <span className="text-caption-2-semibold text-text-primary block">
                            {isEn ? "Governing mechanism:" : "Mekanisme kerja:"}
                          </span>
                          <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                            {isEn ? lesson.artifactA.rationaleEn : lesson.artifactA.rationale}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-background-primary-default border border-border-button-default space-y-1">
                          <span className="text-caption-2-semibold text-text-primary block">
                            {isEn ? "Real-world context:" : "Aplikasi nyata:"}
                          </span>
                          <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                            {isEn ? lesson.artifactA.applicationEn : lesson.artifactA.application}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-separator-border text-center text-caption-2-medium text-text-tertiary">
                        <span>{isEn ? "Click to return to question" : "Klik untuk kembali ke soal"}</span>
                      </div>
                    </div>
                  }
                />
              </div>

              {/* ARTIFACT B: PLAYABLE "KUIS ADAPTIF" (STAMPED QUESTION SHEET) */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption-2-semibold text-text-tertiary tracking-wider">
                    {isEn ? "Artifact B • Adaptive quiz" : "Artifak B • Kuis adaptif"}
                  </span>
                  <span className="text-caption-2-medium text-accent-700">
                    {isEn ? "Interactive quiz card" : "Uji konsep langsung"}
                  </span>
                </div>

                <div
                  className={cx(
                    "relative flex-1 rounded-2xl bg-background-primary-default border border-border-button-default p-5 sm:p-6 flex flex-col justify-between text-start",
                    "shadow-[0_1px_1px_rgba(0,0,0,0.04),0_2.5px_0_var(--color-border-button-default),0_16px_32px_-6px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.05)]",
                    "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:bg-background-primary-default/40"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-separator-border">
                      <span className="text-caption-2-semibold px-2.5 py-0.5 rounded-full bg-background-secondary-default border border-border-button-default text-text-primary">
                        {isEn ? "HOTS evaluation" : "Evaluasi HOTS"}
                      </span>
                      <span className="text-caption-2-medium text-text-tertiary">
                        {isEn ? "Pick an answer" : "Pilih opsi jawaban"}
                      </span>
                    </div>

                    <p
                      className={cx(
                        "text-body-medium sm:text-title-3-semibold text-text-primary leading-snug font-display"
                      )}
                    >
                      {isEn ? lesson.artifactB.questionEn : lesson.artifactB.question}
                    </p>

                    {/* Quiz Options A, B, C */}
                    <div className="space-y-2 pt-1">
                      {lesson.artifactB.options.map((opt) => {
                        const isSelected = selectedQuizOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedQuizOption(opt.id)}
                            className={cx(
                              "w-full text-start p-3 rounded-xl border text-caption-1-medium transition-all cursor-pointer flex items-start gap-2.5 outline-none",
                              "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                              isSelected
                                ? opt.isCorrect
                                  ? "bg-button-ghost-background border-accent-600 text-button-ghost-foreground shadow-xs"
                                  : "bg-background-tertiary-default border-border-button-default text-text-primary shadow-xs"
                                : "bg-background-secondary-default border-border-button-default text-text-primary hover:bg-background-secondary-hover"
                            )}
                          >
                            <span
                              className={cx(
                                "size-6 rounded-lg flex items-center justify-center shrink-0 text-caption-2-semibold transition-colors",
                                isSelected
                                  ? opt.isCorrect
                                    ? "bg-accent-600 text-text-white"
                                    : "bg-text-tertiary text-text-white"
                                  : "bg-background-primary-default text-text-secondary border border-border-button-default"
                              )}
                            >
                              {opt.id}
                            </span>
                            <span className="leading-snug pt-0.5">
                              {isEn ? opt.textEn : opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Immediate concept feedback reveal */}
                  <div className="pt-3 mt-3 border-t border-separator-border">
                    {selectedOptionData ? (
                      <div
                        className={cx(
                          "p-3 rounded-xl border text-caption-2-medium space-y-1 transition-all",
                          selectedOptionData.isCorrect
                            ? "bg-button-ghost-background border-border-button-default text-button-ghost-foreground"
                            : "bg-background-secondary-default border-border-button-default text-text-secondary"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-caption-2-semibold">
                          {selectedOptionData.isCorrect ? (
                            <>
                              <RiCheckLine className="size-4 text-accent-600" aria-hidden="true" />
                              <span>{isEn ? "Concept verified:" : "Penjelasan konsep:"}</span>
                            </>
                          ) : (
                            <>
                              <RiCloseLine className="size-4 text-text-tertiary" aria-hidden="true" />
                              <span>{isEn ? "Pedagogical review:" : "Catatan pemahaman:"}</span>
                            </>
                          )}
                        </div>
                        <p className="leading-relaxed">
                          {isEn ? selectedOptionData.feedbackEn : selectedOptionData.feedback}
                        </p>
                      </div>
                    ) : (
                      <p className="text-caption-2-medium text-text-tertiary text-center">
                        {isEn ? "Select an option above to see concept diagnosis" : "Pilih opsi di atas untuk melihat diagnosis konsep"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ARTIFACT C: TACTILE "RUANG KUIS" CLASSROOM TICKET */}
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-caption-2-semibold text-text-tertiary tracking-wider">
                    {isEn ? "Artifact C • Quiz room ticket" : "Artifak C • Tiket ruang kuis"}
                  </span>
                  <span className="text-caption-2-medium text-accent-700">
                    {isEn ? "Instant arena" : "Arena langsung"}
                  </span>
                </div>

                <div
                  className={cx(
                    "relative flex-1 rounded-2xl bg-background-primary-default border border-border-button-default p-5 sm:p-6 flex flex-col justify-between text-start",
                    "shadow-[0_1px_1px_rgba(0,0,0,0.04),0_2.5px_0_var(--color-border-button-default),0_16px_32px_-6px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.05)]",
                    "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:bg-background-primary-default/40"
                  )}
                >
                  <div className="space-y-4">
                    {/* Ticket Header & Perforated Accent */}
                    <div className="flex items-center justify-between pb-3 border-b border-separator-border">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-accent-600" aria-hidden="true" />
                        <span className="text-caption-2-semibold text-text-primary">
                          {isEn ? "Live classroom arena" : "Arena kelas aktif"}
                        </span>
                      </div>
                      <span className="font-mono text-caption-2-medium text-text-tertiary">
                        {isEn ? "Ready" : "Siap mulai"}
                      </span>
                    </div>

                    {/* Room Title */}
                    <div>
                      <h4
                        className={cx(
                          "text-title-3-semibold text-text-primary leading-snug font-display"
                        )}
                      >
                        {isEn ? lesson.artifactC.roomTitleEn : lesson.artifactC.roomTitle}
                      </h4>
                      <p className="text-caption-2-medium text-text-secondary mt-1">
                        {isEn ? "Formative assessment with synchronized student pacing" : "Asesmen formatif terpadu dengan sinkronisasi siswa"}
                      </p>
                    </div>

                    {/* Tactile Masked Spoiler PIN Ticket Badge */}
                    <div className="p-3.5 rounded-xl bg-background-secondary-default border border-border-button-default space-y-1.5">
                      <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <RiHashtag className="size-3.5" aria-hidden="true" />
                          <span>{isEn ? "Room pin code:" : "Kode pin ruangan:"}</span>
                        </span>
                        <span>{isEn ? "6-digit access" : "Akses 6 digit"}</span>
                      </div>
                      <TactileSpoilerPin isEn={isEn} />
                    </div>

                    {/* Student Discussion Preview */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-caption-2-semibold text-text-tertiary">
                        <RiMessage3Line className="size-3.5" aria-hidden="true" />
                        <span>{isEn ? "Class chat & Copilot preview:" : "Simulasi obrolan kelas & Copilot:"}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-background-secondary-default/70 border border-separator-border space-y-1 text-caption-2-medium">
                        <p className="text-text-primary font-medium">
                          {lesson.artifactC.chatExcerpt.studentName}:{" "}
                          <span className="font-normal text-text-secondary">
                            &quot;{isEn ? lesson.artifactC.chatExcerpt.studentQueryEn : lesson.artifactC.chatExcerpt.studentQuery}&quot;
                          </span>
                        </p>
                        <p className="text-accent-700">
                          Exile Copilot:{" "}
                          <span className="font-normal text-text-secondary">
                            {isEn ? lesson.artifactC.chatExcerpt.copilotAnswerEn : lesson.artifactC.chatExcerpt.copilotAnswer}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Launch Button */}
                  <div className="pt-4 border-t border-separator-border">
                    <Button
                      type="button"
                      variant="primary"
                      size="medium"
                      onClick={onCreateRoom}
                      leadingIcon={RiPlayCircleLine}
                      className="w-full justify-center shadow-xs"
                    >
                      {isEn ? "Buat Ruang Kuis" : "Buat Ruang Kuis"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desk Footer Status */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-t border-separator-border bg-background-primary-default/50 flex flex-wrap items-center justify-between text-caption-2-medium text-text-tertiary gap-2">
        <span>
          {isEn
            ? "Concept: raw educational sheet physically transforms into tactile interactive learning tools."
            : "Konsep: naskah belajar fisik terurai menjadi artifak interaktif taktil di atas meja ajar."}
        </span>
        <span className="hidden sm:inline-block">
          {isEn ? "3D cardstock & letterpress textures" : "Tekstur letterpress & karton berserat"}
        </span>
      </div>
    </section>
  );
}
